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
import { useToast } from "@/hooks/use-toast";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { PlanExpiryPopup } from "@/components/common/PlanExpiryPopup";
import { usePlanExpiry } from "@/hooks/usePlanExpiryGuard";
import { launchConfetti } from "@/utils/confetti"; // 🎉

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
  const { toast } = useToast();

  const welcomeShownRef = useRef(false); // 🚫 Prevent duplicate welcome toasts

  const shouldShowPopup = expiryData?.show_popup || false;

  // Load profile safely
  const loadUserProfile = useCallback(
    async (user: User) => {
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
        toast({
          title: "Profile Error",
          description: "Could not load your profile.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Session handler
  useEffect(() => {
    const controller = new AbortController();

    const handleSession = async (current: Session | null) => {
      if (controller.signal.aborted) return;

      const currentUser = current?.user ?? null;
      setSession(current);
      setUser(currentUser);

      if (currentUser) await loadUserProfile(currentUser);

      setLoading(false);
      setInitialized(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_ev, session) => {
      welcomeShownRef.current = false; // Reset only on auth change
      handleSession(session);
    });

    return () => {
      controller.abort();
      subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  // Real-time profile updates
  useEffect(() => {
    if (profileChannelRef.current) {
      profileChannelRef.current.unsubscribe();
      profileChannelRef.current = null;
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

      profileChannelRef.current = channel;
    }

    return () => {
      if (profileChannelRef.current) {
        profileChannelRef.current.unsubscribe();
        profileChannelRef.current = null;
      }
    };
  }, [user?.id]);

  // 🎉 Production-Ready Welcome & Confetti Logic
  useEffect(() => {
    if (!initialized || loading || !profile || welcomeShownRef.current) return;

    // Mark as handled
    welcomeShownRef.current = true;

    // New user (first login)
    if (profile.login_count === 1) {
      toast({
        title: "Account Created!",
        description: "Welcome to Tone2Vibe 🎉",
      });

      setTimeout(() => launchConfetti(), 350);
      return;
    }

    // Returning user
    if (profile.login_count > 1) {
      toast({
        title: "Welcome back!",
        description: "Glad to see you again 👋",
      });
    }
  }, [initialized, loading, profile, toast]);

  // Auth actions
  const signUp = async (email, password, options) => {
    try {
      const { data } = await supabase.functions.invoke("signup", {
        body: { email, password, fullName: options?.fullName },
      });

      const parsed = typeof data === "string" ? JSON.parse(data) : data ?? {};

      if (!parsed.success)
        return { data: null, error: new Error(parsed.error || "Signup failed") };

      return { data: parsed, error: null };
    } catch {
      return { data: null, error: new Error("Signup failed. Please try again.") };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error?.message.includes("Email not confirmed")) {
        return {
          data,
          error: new Error("Please confirm your email before signing in."),
        };
      }

      return { data, error };
    } catch {
      return { data: null, error: new Error("Sign-in failed. Please try again.") };
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
      toast({
        title: "Google Sign-In Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      welcomeShownRef.current = false; // reset after logout
      setUser(null);
      setSession(null);
      setProfile(null);
      setLocationData(null);

      return { error };
    } catch {
      toast({
        title: "Logout Error",
        description: "Please refresh the page.",
        variant: "destructive",
      });
      return { error: new Error("Logout failed") };
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) await loadUserProfile(user);
  }, [user, loadUserProfile]);

  const updateProfile = async (data) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch {
      toast({
        title: "Profile Update Failed",
        description: "Unable to update your profile.",
        variant: "destructive",
      });
    }
  };

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

  const isReady =
    initialized && !loading && (!user || (user && profile !== null));

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
