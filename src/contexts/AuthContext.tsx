
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// Helpers
const getVerificationKey = (userId: string, accessToken?: string): string =>
  `2fa_verified:${userId}:${accessToken?.slice(0, 16) ?? "no-token"}`;

const clearAllVerificationKeys = (userId: string): void => {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(`2fa_verified:${userId}:`)) keys.push(key);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
};

const logError = (context: string, error: any): void => {
  if (process.env.NODE_ENV === "development") {
    console.error(`[Auth Error - ${context}]:`, error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [checking2FA, setChecking2FA] = useState(false);
  const profileChannelRef = useRef<any>(null);
  const { expiryData } = usePlanExpiry(user, profile);

  const loadUserProfile = useCallback(async (user: User) => {
    try {
      const { data, error } = await supabase
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
        setLocationData({ country: data.country || "India", currency: "INR" });
      } else if (error?.code === "PGRST116") {
        setProfile(null);
        setLocationData({ country: "India", currency: "INR" });
      } else if (error) logError("loadUserProfile", error);
    } catch (err) {
      logError("loadUserProfile", err);
    }
  }, []);

  const check2FAStatus = useCallback(
    async (userId: string, accessToken?: string): Promise<boolean> => {
      setChecking2FA(true);
      try {
        const verifiedKey = getVerificationKey(userId, accessToken);
        const isVerified =
          typeof window !== "undefined" &&
          sessionStorage.getItem(verifiedKey) === "true";
        if (isVerified) {
          setNeeds2FA(false);
          setChecking2FA(false);
          return false;
        }

        const { data: settings, error } = await supabase
          .from("user_2fa_settings")
          .select("enabled")
          .eq("user_id", userId)
          .maybeSingle();

        if (error && error.code !== "PGRST116") logError("check2FAStatus", error);
        const requires2FA = !!settings?.enabled;
        setNeeds2FA(requires2FA);
        setChecking2FA(false);
        return requires2FA;
      } catch (err) {
        logError("check2FAStatus", err);
        setChecking2FA(false);
        return false;
      }
    },
    []
  );

  // Core auth handler
  useEffect(() => {
    let mounted = true;

    const handleSession = async (currentSession: Session | null) => {
      if (!mounted) return;
      const currentUser = currentSession?.user ?? null;

      if (!currentUser) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setLocationData(null);
        setNeeds2FA(false);
        setChecking2FA(false);
        setLoading(false);
        return;
      }

      const requires2FA = await check2FAStatus(
        currentUser.id,
        currentSession?.access_token
      );
      const verifiedKey = getVerificationKey(
        currentUser.id,
        currentSession?.access_token
      );
      const alreadyVerified =
        typeof window !== "undefined" &&
        sessionStorage.getItem(verifiedKey) === "true";

      if (!requires2FA || alreadyVerified) {
        setUser(currentUser);
        setSession(currentSession);
        await loadUserProfile(currentUser);
      } else {
        // Don’t show logged-in state yet
        setUser(null);
        setSession(null);
      }

      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [check2FAStatus, loadUserProfile]);

  // Realtime profile updates
  useEffect(() => {
    if (profileChannelRef.current) {
      try {
        profileChannelRef.current.unsubscribe();
      } catch {}
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
      if (profileChannelRef.current) {
        try {
          profileChannelRef.current.unsubscribe();
        } catch {}
      }
    };
  }, [user?.id]);

  const signUp = async (
    email: string,
    password: string,
    options?: { fullName?: string }
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke("signup", {
        body: { email, password, fullName: options?.fullName },
      });
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (!parsed?.success)
        return {
          data: null,
          error: new Error(parsed?.error || "Signup failed."),
        };
      return { data: parsed, error: null };
    } catch (err) {
      return {
        data: null,
        error: new Error("Network error. Please try again."),
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { data, error };
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
      if (data.words_used !== undefined && profile) {
        data.word_balance = Math.max(0, profile.words_limit - data.words_used);
      }
      await supabase.from("profiles").update(data).eq("user_id", user.id);
    } catch (err) {
      logError("updateProfile", err);
    }
  };

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
