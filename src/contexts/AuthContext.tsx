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
import { toast } from "sonner"; // ✅ Sonner
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
  total_words_used: number;
  word_balance: number;
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
  signUp: (email: string, password: string, opt?: { fullName?: string }) =>
    Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const profileChannelRef = useRef<any>(null);

  const welcomeToastShown = useRef(false); // To prevent repeated toasts
  const lastLoginAtRef = useRef<string | null>(null); // REAL change detection

  const { expiryData, dismissPopup } = usePlanExpiry(user, profile);
  const showExpiryPopup = expiryData?.show_popup || false;

  // ===================================================
  // LOAD & SYNC PROFILE
  // ===================================================
  const loadUserProfile = useCallback(async (u: User) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", u.id)
        .single();

      if (data) {
        const balance = Math.max(0, data.words_limit - data.words_used);

        setProfile({
          ...data,
          word_balance: data.word_balance ?? balance,
        });

        setLocationData({
          country: data.country || "India",
          currency: "INR",
        });
      }
    } catch {
      toast.error("Unable to load profile.");
    }
  }, []);

  // ===================================================
  // AUTH + SESSION HANDLER
  // ===================================================
  useEffect(() => {
    const aborter = new AbortController();

    const handleSession = async (sess: Session | null) => {
      if (aborter.signal.aborted) return;

      const userObj = sess?.user ?? null;

      setSession(sess);
      setUser(userObj);

      if (userObj) await loadUserProfile(userObj);

      setInitialized(true);
      setLoading(false);
    };

    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // On auth change
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      welcomeToastShown.current = false; // Reset toast lock
      handleSession(session);
    });

    return () => {
      aborter.abort();
      listener.subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  // ===================================================
  // REALTIME PROFILE LISTENING
  // ===================================================
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
            const newP = payload.new as Profile;
            const balance = Math.max(0, newP.words_limit - newP.words_used);

            setProfile({
              ...newP,
              word_balance: newP.word_balance ?? balance,
            });
          }
        )
        .subscribe();
    }

    return () => {
      if (profileChannelRef.current) profileChannelRef.current.unsubscribe();
    };
  }, [user?.id]);

  // ===================================================
  // 🎉 SHOW TOAST ONLY ON REAL LOGIN (NOT PAGE RELOAD)
  // ===================================================
  useEffect(() => {
    if (!initialized || loading || !profile) return;

    const currLogin = profile.last_login_at;
    const prevLogin = lastLoginAtRef.current;

    // If last_login_at is SAME → refresh, NOT login
    if (currLogin === prevLogin) return;

    // Update ref with new last_login_at
    lastLoginAtRef.current = currLogin;

    // Prevent duplicate firing
    if (welcomeToastShown.current) return;
    welcomeToastShown.current = true;

    // New account
    if (profile.login_count === 1) {
      setTimeout(() => {
        toast.success("Account created! Welcome 🎉");
        launchConfetti();
      }, 100);
      return;
    }

    // Real login (NOT reload)
    if (profile.login_count > 1) {
      setTimeout(() => toast.success("Welcome back 👋"), 100);
    }
  }, [profile?.last_login_at, initialized, loading, profile]);

  // ===================================================
  // AUTH FUNCTIONS
  // ===================================================
  const signUp = async (email: string, password: string, opt?: { fullName?: string }) => {
    try {
      const { data } = await supabase.functions.invoke("signup", {
        body: { email, password, fullName: opt?.fullName },
      });

      const parsed = typeof data === "string" ? JSON.parse(data) : data;

      if (!parsed?.success)
        return { data: null, error: new Error(parsed?.error || "Signup failed") };

      return { data: parsed, error: null };
    } catch (e) {
      return { data: null, error: new Error("Signup failed. Try again.") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error?.message.includes("Email not confirmed"))
        return { data, error: new Error("Please verify your email.") };

      return { data, error };
    } catch {
      return { data: null, error: new Error("Login failed.") };
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
      toast.error("Google login failed.");
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      welcomeToastShown.current = false;
      lastLoginAtRef.current = null;

      setUser(null);
      setSession(null);
      setProfile(null);
      setLocationData(null);

      return { error };
    } catch {
      toast.error("Logout failed.");
      return { error: new Error("Logout failed") };
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) await loadUserProfile(user);
  }, [user, loadUserProfile]);

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user?.id) return;
    try {
      await supabase.from("profiles").update(data).eq("user_id", user.id);
    } catch {
      toast.error("Profile update failed.");
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading: loading || !initialized,
    locationData,
    planExpiryActive: showExpiryPopup,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile,
  };

  const ready =
    initialized &&
    !loading &&
    (!user || (user && profile !== null));

  return (
    <AuthContext.Provider value={value}>
      {!ready ? (
        <LoadingScreen />
      ) : (
        <>
          {children}

          <PlanExpiryPopup
            isOpen={showExpiryPopup}
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
