import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { IndiaOnlyService } from "@/services/indiaOnlyService";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { PlanExpiryPopup } from "@/components/common/PlanExpiryPopup";
import { usePlanExpiry } from "@/hooks/usePlanExpiryGuard";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  plan: string;
  words_limit: number;
  words_used: number;
  plan_words_used: number;
  word_balance: number;
  total_words_used: number;
  upload_limit_mb: number;
  plan_expires_at: string | null;
  last_login_at: string | null;
  ip_address: string | null;
  country: string | null;
  updated_at: string;
  email: string;
  company: string;
  preferred_language: string;
  created_at: string;
  last_word_purchase_at: string;
  login_count: number;
  plan_start_date: string | null;
  plan_end_date: string | null;
}

interface LocationData {
  country: string;
  currency: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  locationData: LocationData | null;
  signUp: (
    email: string,
    password: string,
    options?: { emailRedirectTo?: string; fullName?: string }
  ) => Promise<{ data: any; error: Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ data: any; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth error");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  const { expiryData, dismissPopup } = usePlanExpiry(user, profile);
  const { toast } = useToast();

  const authSubscriptionRef = useRef<any>(null);
  const profileChannelRef = useRef<any>(null);

  /** -------------------
   * Load User Profile
   * ------------------- */
  const loadUserProfile = async (userId?: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        console.debug("Profile not found:", error);
        return;
      }

      setProfile({
        ...data,
        ip_address: (data.ip_address as string | null) || null,
      });

      if (data.country) {
        const location = {
          country: data.country,
          currency: "INR", // Only INR now
        };
        setLocationData(location);
        try {
          localStorage.setItem(`user_location_${userId}`, JSON.stringify(location));
        } catch {}
      }
    } catch (err) {
      console.error("Load profile error:", err);
    }
  };

  /** -------------------
   * Initialize Auth Session
   * ------------------- */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(data?.session || null);
        setUser(data?.session?.user || null);
      } catch (err) {
        console.error("Session init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setUser(newSession?.user || null);
      setSession(newSession || null);
      setLoading(false);
    });

    authSubscriptionRef.current = authListener?.subscription;

    return () => {
      mounted = false;
      if (authSubscriptionRef.current) {
        try {
          authSubscriptionRef.current.unsubscribe?.();
        } catch {
          supabase.removeChannel?.(authSubscriptionRef.current);
        }
      }
    };
  }, []);

  /** -------------------
   * Profile Subscription
   * ------------------- */
  useEffect(() => {
    if (profileChannelRef.current) {
      try {
        supabase.removeChannel?.(profileChannelRef.current);
      } catch {
        profileChannelRef.current.unsubscribe?.();
      }
      profileChannelRef.current = null;
    }

    if (!user) {
      setProfile(null);
      setLocationData(null);
      return;
    }

    loadUserProfile(user.id);

    try {
      const savedLocation = localStorage.getItem(`user_location_${user.id}`);
      if (savedLocation) setLocationData(JSON.parse(savedLocation));
    } catch {}

    const channel = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => setProfile(payload.new as Profile)
      )
      .subscribe();

    profileChannelRef.current = channel;

    return () => {
      if (profileChannelRef.current) {
        try {
          supabase.removeChannel?.(profileChannelRef.current);
        } catch {
          profileChannelRef.current.unsubscribe?.();
        }
      }
    };
  }, [user?.id]);

  /** -------------------
   * Track IP & Location
   * ------------------- */
  useEffect(() => {
    const trackLoginIP = async () => {
      if (!session?.access_token || !user) return;
      if (localStorage.getItem(`ip_tracked_${user.id}`)) return;

      try {
        const { data } = await supabase.functions.invoke("track-login-ip", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (data?.country) {
          const location = {
            country: data.country,
            currency: "INR", // Only INR now
          };
          setLocationData(location);
          localStorage.setItem(`ip_tracked_${user.id}`, "true");
          localStorage.setItem(`user_location_${user.id}`, JSON.stringify(location));
          await loadUserProfile(user.id);
        }
      } catch (err) {
        console.error("IP tracking failed:", err);
      }
    };
    trackLoginIP();
  }, [session?.access_token, user?.id]);

  /** -------------------
   * Auth Actions
   * ------------------- */
  const signUp = async (
    email: string,
    password: string,
    options?: { emailRedirectTo?: string; fullName?: string }
  ) => {
    try {
      const geoCheck = await IndiaOnlyService.checkIndianAccess();
      if (!geoCheck.isAllowed)
        return { data: null, error: new Error(geoCheck.message) };

      // Check if email already exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        return {
          data: null,
          error: new Error("An account with this email already exists. Please sign in."),
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            options?.emailRedirectTo || `${window.location.origin}/email-confirmation`,
          data: {
            full_name: options?.fullName || "",
            name: options?.fullName || "",
          },
        },
      });

      if (error) {
        const msg = error.message || "";
        if (
          msg.includes("already registered") ||
          msg.includes("User already registered")
        ) {
          return {
            data: null,
            error: new Error("This email is already registered. Please sign in."),
          };
        }
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Signup failed"),
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const geoCheck = await IndiaOnlyService.checkIndianAccess();
      if (!geoCheck.isAllowed)
        return { data: null, error: new Error(geoCheck.message) };

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("Invalid login credentials"))
          return { data: null, error: new Error("Invalid email or password.") };
        if (msg.includes("Email not confirmed"))
          return {
            data: null,
            error: new Error("Please verify your email before signing in."),
          };
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Sign in failed"),
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      const uid = user?.id;
      setUser(null);
      setSession(null);
      setProfile(null);
      setLocationData(null);

      if (uid) {
        localStorage.removeItem(`ip_tracked_${uid}`);
        localStorage.removeItem(`user_location_${uid}`);
        localStorage.removeItem(`user_currency_${uid}`);
      }

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error("Sign out failed"),
      };
    }
  };

  const refreshProfile = async () => {
    if (user?.id) await loadUserProfile(user.id);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) throw new Error("No user found");
    try {
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("user_id", user.id);
      if (error) throw error;
      await loadUserProfile(user.id);
    } catch (err) {
      console.error("Profile update error:", err);
      throw err;
    }
  };

  /** -------------------
   * Context Value
   * ------------------- */
  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    locationData,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          {children}
          <PlanExpiryPopup
            isOpen={expiryData.show_popup}
            onClose={dismissPopup}
            daysUntilExpiry={expiryData.days_until_expiry || 0}
            plan={expiryData.plan || ""}
            expiresAt={expiryData.expires_at || ""}
            isExpired={expiryData.is_expired || false}
          />
        </>
      )}
    </AuthContext.Provider>
  );
};
