// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { PlanExpiryPopup } from "@/components/common/PlanExpiryPopup";
import { usePlanExpiry } from "@/hooks/usePlanExpiryGuard";

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
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const { expiryData, dismissPopup } = usePlanExpiry(user, profile);
  const profileChannelRef = useRef<any>(null);

  const shouldShowPopup = expiryData.show_popup;

  // Create default free tier profile
  const createDefaultProfile = useCallback(async (userId: string, userEmail: string) => {
    try {
      const defaultProfile = {
        user_id: userId,
        full_name: userEmail.split('@')[0] || 'User',
        avatar_url: '',
        plan: 'free',
        words_limit: 1000, // Free tier limit
        words_used: 0,
        plan_words_used: 0,
        word_balance: 0,
        total_words_used: 0,
        upload_limit_mb: 10,
        plan_expires_at: null,
        last_login_at: new Date().toISOString(),
        ip_address: null,
        country: null,
        email: userEmail,
        company: '',
        preferred_language: 'en',
        last_word_purchase_at: '',
        login_count: 1,
        plan_start_date: new Date().toISOString(),
        plan_end_date: null,
      };

      const { data, error } = await supabase
        .from("profiles")
        .insert([defaultProfile])
        .select()
        .single();

      if (error) {
        console.error("Failed to create default profile:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Exception creating default profile:", err);
      return null;
    }
  }, []);

  // Load user profile with auto-creation for new users
  const loadUserProfile = useCallback(async (userId: string, userEmail?: string, retries = 3) => {
    if (!userId) return;

    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (data && !error) {
          // Calculate word balance if not already calculated
const calculatedWordBalance = Math.max(0, data.words_limit - data.words_used);

          const updatedProfile = {
            ...data,
            ip_address: (data.ip_address as string | null) || null,
word_balance: data.word_balance != null ? data.word_balance : calculatedWordBalance,
          };

          setProfile(updatedProfile);

          if (data.country) {
            const location = { country: data.country, currency: "INR" };
            setLocationData(location);
            try {
              localStorage.setItem(
                `user_location_${userId}`,
                JSON.stringify(location)
              );
            } catch {}
          }
          return;
        }

        if (error && error.code === "PGRST116") {
          // Profile doesn't exist, create default profile
          console.log(`Profile not found for user ${userId}, creating default profile...`);

          if (userEmail) {
            const newProfile = await createDefaultProfile(userId, userEmail);
            if (newProfile) {
              const updatedProfile = {
                ...newProfile,
                ip_address: (newProfile.ip_address as string | null) || null,
              };
              setProfile(updatedProfile);
              console.log("Default profile created successfully");
              return;
            }
          }
        }

        if (error && error.code !== "PGRST116") {
          console.error("Critical profile load error:", error);
          return;
        }

        console.warn(
          `Profile for user ${userId} not found. Attempt ${i + 1}/${retries}. Retrying...`
        );
        if (i < retries - 1) {
          await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
        }
      } catch (err) {
        console.error("Exception during profile load:", err);
        return;
      }
    }

    // If all retries failed and we have user email, try to create default profile
    if (userEmail) {
      console.log("All retries failed, attempting to create default profile...");
      const newProfile = await createDefaultProfile(userId, userEmail);
      if (newProfile) {
        const updatedProfile = {
          ...newProfile,
          ip_address: (newProfile.ip_address as string | null) || null,
        };
        setProfile(updatedProfile);
        console.log("Default profile created after retries");
        return;
      }
    }

    console.error(`Failed to load or create profile for user ${userId} after ${retries} attempts.`);
  }, [createDefaultProfile]);

  // Handle session + user
  useEffect(() => {
    let mounted = true;

    const handleSession = async (currentSession: Session | null) => {
      if (!mounted) return;

      const currentUser = currentSession?.user ?? null;
      setSession(currentSession);
      setUser(currentUser);

      if (currentUser) {
        // Pass user email for profile creation if needed
        await loadUserProfile(currentUser.id, currentUser.email);
      } else {
        setProfile(null);
        setLocationData(null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session).finally(() => {
        if (mounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        handleSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  // Listen to profile updates
  useEffect(() => {
    if (profileChannelRef.current) {
      profileChannelRef.current.unsubscribe?.();
    }

    if (user?.id) {
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
          (payload) => {
            const newProfile = payload.new as Profile;
            const calculatedWordBalance = Math.max(0, newProfile.words_limit - newProfile.words_used);
            setProfile({
              ...newProfile,
              word_balance: newProfile.word_balance || calculatedWordBalance,
            });

            // If plan was downgraded to free, refresh the profile to get updated data
            if (newProfile.plan === 'free' && profile?.plan !== 'free') {
              console.log('Plan downgraded to free, refreshing profile...');
              loadUserProfile(user.id, user.email);
            }
          }
        )
        .subscribe();
      profileChannelRef.current = channel;
    }

    return () => {
      profileChannelRef.current?.unsubscribe?.();
    };
  }, [user?.id, profile?.plan, loadUserProfile]);

  // Track login IP
  useEffect(() => {
    const trackLoginIP = async () => {
      if (!session?.access_token || !user?.id) return;
      if (localStorage.getItem(`ip_tracked_${user.id}`)) return;

      try {
        const { data } = await supabase.functions.invoke("track-login-ip", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (data?.country) {
          const location = { country: data.country, currency: "INR" };
          setLocationData(location);
          localStorage.setItem(`ip_tracked_${user.id}`, "true");
          localStorage.setItem(
            `user_location_${user.id}`,
            JSON.stringify(location)
          );
          await loadUserProfile(user.id, user.email);
        }
      } catch (err) {
        console.error("IP tracking failed:", err);
      }
    };
    trackLoginIP();
  }, [session?.access_token, user?.id, user?.email, loadUserProfile]);

  // ------------------------
  // Auth Actions
  // ------------------------
  const signUp = async (
    email: string,
    password: string,
    options?: { emailRedirectTo?: string; fullName?: string }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: options?.emailRedirectTo,
          data: {
            full_name: options?.fullName || "",
          },
        },
      });

      // ✅ FIX: Profile creation is removed from here.
      // The `loadUserProfile` function, which runs after email confirmation,
      // is now the single source of truth for creating a new user's profile.
      // This prevents the race condition and duplicate profile creation.

      return { data, error };
    } catch (err) {
      console.error("Exception during signUp:", err);
      return { data: null, error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (err) {
      console.error("Exception during signIn:", err);
      return { data: null, error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setLocationData(null);

        // Clear localStorage
        if (user?.id) {
          localStorage.removeItem(`ip_tracked_${user.id}`);
          localStorage.removeItem(`user_location_${user.id}`);
        }
      }
      return { error };
    } catch (err) {
      console.error("Exception during signOut:", err);
      return { error: err as Error };
    }
  };

  const refreshProfile = async () => {
    if (user?.id) await loadUserProfile(user.id, user.email);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user?.id) return;

    try {
      // If updating words_used, recalculate word_balance
      if (data.words_used !== undefined && profile) {
        data.word_balance = Math.max(0, profile.words_limit - data.words_used);
      }

      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("user_id", user.id);

      if (!error) {
        await loadUserProfile(user.id, user.email);
      } else {
        console.error("Failed to update profile:", error);
      }
    } catch (err) {
      console.error("Exception during profile update:", err);
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    session,
    profile,
    loading: loading || !authInitialized,
    locationData,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    updateProfile,
  };

  // More robust ready check
  const isReady = authInitialized && !loading && (!user || (user && profile !== null));

  return (
    <AuthContext.Provider value={value}>
      {!isReady ? (
        <LoadingScreen />
      ) : (
        <>
          {children}
          <PlanExpiryPopup
            isOpen={shouldShowPopup}
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