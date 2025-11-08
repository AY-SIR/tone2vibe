"use client";

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
import { usePlanExpiry } from "@/hooks/usePlanExpiryGuard";

// ---------- Types ----------
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
  needs2FA: boolean;
  checking2FA: boolean;
  signUp: (
    email: string,
    password: string,
    options?: { fullName?: string }
  ) => Promise<{ data: any; error: any | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ data: any; error: any | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<{ error: any | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

// ---------- Context ----------
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// ---------- Helpers ----------
const getVerificationKey = (userId: string, token?: string) =>
  `2fa_verified:${userId}:${token?.slice(0, 16) ?? "no-token"}`;

const clearAllVerificationKeys = (userId: string) => {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(`2fa_verified:${userId}:`))
        sessionStorage.removeItem(key);
    }
  } catch {}
};

const logError = (where: string, err: any) => {
  if (process.env.NODE_ENV === "development") {
    console.error(`[Auth Error - ${where}]`, err);
  }
};

// ---------- Provider ----------
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const hasCachedSession =
    typeof window !== "undefined" &&
    sessionStorage.getItem("has-session") === "true";
  const [loading, setLoading] = useState(!hasCachedSession);

  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [checking2FA, setChecking2FA] = useState(false);
  const { expiryData } = usePlanExpiry(user, profile);
  const profileChannelRef = useRef<any>(null);

  // ---------- Load user profile ----------
  const loadUserProfile = useCallback(async (u: User) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", u.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) {
        setProfile(null);
        setLocationData({ country: "India", currency: "INR" });
        return;
      }

      setProfile({
        ...data,
        word_balance:
          data.word_balance ??
          Math.max(0, data.words_limit - data.words_used),
      });
      setLocationData({ country: data.country || "India", currency: "INR" });
    } catch (err) {
      logError("loadUserProfile", err);
    }
  }, []);

  // ---------- 2FA Check ----------
  const check2FAStatus = useCallback(
    async (uid: string, token?: string) => {
      setChecking2FA(true);
      try {
        const verifiedKey = getVerificationKey(uid, token);
        const isVerified =
          sessionStorage.getItem(verifiedKey) === "true";
        if (isVerified) {
          setNeeds2FA(false);
          setChecking2FA(false);
          return false;
        }

        const { data } = await supabase
          .from("user_2fa_settings")
          .select("enabled")
          .eq("user_id", uid)
          .maybeSingle();

        const enabled = !!data?.enabled;
        setNeeds2FA(enabled);
        setChecking2FA(false);
        return enabled;
      } catch (err) {
        logError("check2FAStatus", err);
        setChecking2FA(false);
        return false;
      }
    },
    []
  );

  // ---------- Session Handler ----------
  useEffect(() => {
    let mounted = true;

    const handleSession = async (sess: Session | null) => {
      if (!mounted) return;
      const currentUser = sess?.user ?? null;

      if (!currentUser) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setNeeds2FA(false);
        setChecking2FA(false);
        setLoading(false);
        sessionStorage.removeItem("has-session");
        return;
      }

      sessionStorage.setItem("has-session", "true");
      const requires2FA = await check2FAStatus(
        currentUser.id,
        sess?.access_token
      );

      const verifiedKey = getVerificationKey(
        currentUser.id,
        sess?.access_token
      );
      const alreadyVerified = sessionStorage.getItem(verifiedKey) === "true";

      if (!requires2FA || alreadyVerified) {
        setUser(currentUser);
        setSession(sess);
        await loadUserProfile(currentUser);
      } else {
        setUser(null);
        setSession(null);
      }

      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => handleSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        if (!mounted) return;

        // Ignore harmless refreshes if user known
        if (event === "TOKEN_REFRESHED" && user) {
          setSession(sess);
          return;
        }

        // Handle logins / first load / user updates
        if (
          ["SIGNED_IN", "INITIAL_SESSION", "USER_UPDATED"].includes(event) ||
          (event === "TOKEN_REFRESHED" && !user)
        ) {
          await handleSession(sess);
          return;
        }

        // Handle logout
        if (event === "SIGNED_OUT") {
          await handleSession(null);
          return;
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [check2FAStatus, loadUserProfile]);

  // ---------- Realtime Profile Updates ----------
  useEffect(() => {
    if (profileChannelRef.current)
      profileChannelRef.current.unsubscribe?.();

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
            setProfile((prev) => ({
              ...prev,
              ...newProfile,
              word_balance:
                newProfile.word_balance ??
                Math.max(
                  0,
                  newProfile.words_limit - newProfile.words_used
                ),
            }));
          }
        )
        .subscribe();
      profileChannelRef.current = channel;
    }
    return () => {
      profileChannelRef.current?.unsubscribe?.();
    };
  }, [user?.id]);

  // ---------- Auth Actions ----------
  const signUp = async (email: string, password: string, opt?: { fullName?: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke("signup", {
        body: { email, password, fullName: opt?.fullName },
      });
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (!parsed?.success)
        return { data: null, error: new Error(parsed?.error || "Signup failed.") };
      return { data: parsed, error: null };
    } catch {
      return { data: null, error: new Error("Network error.") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { data, error };
      await supabase.auth.refreshSession(); // ensures context syncs instantly
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    } catch (err) {
      logError("signInWithGoogle", err);
    }
  };

  const signOut = async () => {
    try {
      if (user?.id) clearAllVerificationKeys(user.id);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setNeeds2FA(false);
      return { error: null };
    } catch (err) {
      logError("signOut", err);
      return { error: err };
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) await loadUserProfile(user);
  }, [user, loadUserProfile]);

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user?.id) return;
    try {
      if (data.words_used !== undefined && profile)
        data.word_balance = Math.max(0, profile.words_limit - data.words_used);
      await supabase.from("profiles").update(data).eq("user_id", user.id);
    } catch (err) {
      logError("updateProfile", err);
    }
  };

  // ---------- Return Provider ----------
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        locationData,
        planExpiryActive: !!expiryData?.show_popup,
        needs2FA,
        checking2FA,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
