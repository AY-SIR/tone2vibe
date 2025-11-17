"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner"; // ✅ Sonner toast
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { PlanExpiryPopup } from "@/components/common/PlanExpiryPopup";
import { usePlanExpiry } from "@/hooks/usePlanExpiryGuard";
import { launchConfetti } from "@/utils/confetti";

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
  country: string;
  email: string;
  company: string;
  preferred_language: string;
  created_at: string;
  last_word_purchase_at: string | null;
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
  planExpiryActive: boolean;
  signUp: (email: string, password: string, options?: { fullName?: string }) =>
    Promise<{ data: any; error: any | null }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<{ error: any | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const profileChannelRef = useRef<any>(null);
  const { expiryData, dismissPopup } = usePlanExpiry(user, profile);

  // Prevent toast spam (strict mode + rerender safe)
  const welcomeToastShown = useRef(false); 

  const shouldShowPopup = expiryData?.show_popup || false;

  // ===============================
  // LOAD USER PROFILE
  // ===============================
  const loadUserProfile = useCallback(async (user: User) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile({
          ...data,
          ip_address: data.ip_address ?? "",
          word_balance:
            data.word_balance ??
            Math.max(0, data.words_limit - data.words_used),
        });

        setLocationData({
          country: data.country || "India",
          currency: "INR",
        });
      }
    } catch {
      toast.error("Failed to load profile. Try again.");
    }
  }, []);

  // ===============================
  // SESSION + AUTH STATE HANDLING
  // ===============================
  useEffect(() => {
    const aborter = new AbortController();

    const handleSession = async (session: Session | null) => {
      if (aborter.signal.aborted) return;

      const currentUser = session?.user ?? null;

      setSession(session);
      setUser(currentUser);

      if (currentUser) await loadUserProfile(currentUser);

      setLoading(false);
      setInitialized(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      welcomeToastShown.current = false; // Reset on new session change
      handleSession(session);
    });

    return () => {
      aborter.abort();
      listener.subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  // ===============================
  // REALTIME PROFILE UPDATES
  // ===============================
  useEffect(() => {
    if (profileChannelRef.current) {
      profileChannelRef.current.unsubscribe();
      profileChannelRef.current = null;
    }

    if (user?.id) {
      profileChannelRef.current = supabase
        .channel("profile-updates-" + user.id)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as Profile;
            setProfile((prev) => ({
              ...prev,
              ...updated,
              word_balance:
                updated.word_balance ??
                Math.max(0, updated.words_limit - updated.words_used),
            }));
          }
        )
        .subscribe();
    }

    return () => {
      if (profileChannelRef.current) profileChannelRef.current.unsubscribe();
    };
  }, [user?.id]);

  // ===============================
  // 🎉 WELCOME / RETURN TOAST — SINGLE TIME ONLY
  // ===============================
  useEffect(() => {
    if (!initialized || loading || !profile) return;
    if (welcomeToastShown.current) return;
    welcomeToastShown.current = true; // ensure only once

    setTimeout(() => {
      if (profile.login_count === 1) {
        toast.success("Account Created! Welcome to Tone2Vibe 🎉");
        launchConfetti();
      } else if (profile.login_count > 1) {
        toast.success("Welcome back 👋");
      }
    }, 200);
  }, [initialized, loading, profile]);

  // ===============================
  // AUTH ACTIONS
  // ===============================

  const signUp = async (email: string, password: string, options?: { fullName?: string }) => {
    try {
      const { data } = await supabase.functions.invoke("signup", {
        body: { email, password, fullName: options?.fullName },
      });

      const res = typeof data === "string" ? JSON.parse(data) : data;

      if (!res?.success) {
        return { data: null, error: new Error(res?.error || "Signup failed") };
      }

      return { data: res, error: null };
    } catch {
      return { data: null, error: new Error("Signup failed. Try again.") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error?.message.includes("Email not confirmed")) {
        return { data, error: new Error("Please verify your email.") };
      }

      return { data, error };
    } catch {
      return { data: null, error: new Error("Login failed. Try again.") };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
    } catch {
      toast.error("Google Sign-in failed. Try again.");
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      welcomeToastShown.current = false;
      setUser(null);
      setSession(null);
      setProfile(null);
      setLocationData(null);

      return { error };
    } catch {
      toast.error("Logout failed. Refresh the page.");
      return { error: new Error("Logout failed") };
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) loadUserProfile(user);
  }, [user, loadUserProfile]);

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user?.id) return;
    try {
      await supabase.from("profiles").update(data).eq("user_id", user.id);
    } catch {
      toast.error("Profile update failed. Try again.");
    }
  };

  // ===============================
  // CONTEXT VALUE
  // ===============================
  const value: AuthContextType = {
    user,
    session,
    profile,
    loading: loading || !initialized,
    locationData,
    planExpiryActive: shouldShowPopup,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile,
  };

  const ready = initialized && !loading && (!user || (user && profile));

  return (
    <AuthContext.Provider value={value}>
      {!ready ? (
        <LoadingScreen />
      ) : (
        <>
          {children}

          <PlanExpiryPopup
            isOpen={shouldShowPopup}
            onClose={dismissPopup}
            daysUntilExpiry={expiryData?.days_until_expiry || 0}
            plan={expiryData?.plan || ""}
            expiresAt={expiryData?.expires_at || ""}
            isExpired={expiryData?.is_expired || false}
          />
        </>
      )}
    </AuthContext.Provider>
  );
};
