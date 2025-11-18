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
import { toast } from "sonner";
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

const LOGIN_TRACKING_KEY = 'last_login_tracked';
const WELCOME_SHOWN_KEY = 'welcome_toast_shown';
const INITIAL_LOGIN_DATA_KEY = 'initial_login_data';
const USER_WELCOMED_KEY = 'user_welcomed_';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const profileChannelRef = useRef<any>(null);

  const { expiryData, dismissPopup } = usePlanExpiry(user, profile);
  const showExpiryPopup = expiryData?.show_popup || false;

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

  const updateLoginTracking = useCallback(async (userId: string) => {
    try {
      const lastTracked = sessionStorage.getItem(LOGIN_TRACKING_KEY);
      const now = Date.now();

      if (lastTracked && (now - parseInt(lastTracked)) < 30000) {
        return;
      }

      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      await supabase.rpc('update_user_login', {
        p_user_id: userId,
        p_ip_address: ip
      });

      sessionStorage.setItem(LOGIN_TRACKING_KEY, now.toString());
    } catch (error) {
      // Silent fail for login tracking
    }
  }, []);

  useEffect(() => {
    const aborter = new AbortController();
    let hasProcessedSession = false;

    const handleSession = async (sess: Session | null, event?: string) => {
      if (aborter.signal.aborted) return;

      const userObj = sess?.user ?? null;

      setSession(sess);
      setUser(userObj);

      if (userObj) {
        if (event === 'SIGNED_IN' && !hasProcessedSession) {
          hasProcessedSession = true;
          await updateLoginTracking(userObj.id);
        }

        await loadUserProfile(userObj);
      }

      setInitialized(true);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        hasProcessedSession = false;
        sessionStorage.removeItem(LOGIN_TRACKING_KEY);
        sessionStorage.removeItem(WELCOME_SHOWN_KEY);
        sessionStorage.removeItem(INITIAL_LOGIN_DATA_KEY);
      }

      handleSession(session, event === 'SIGNED_IN' ? 'SIGNED_IN' : undefined);
    });

    return () => {
      aborter.abort();
      listener.subscription?.unsubscribe();
    };
  }, [loadUserProfile, updateLoginTracking]);

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

  useEffect(() => {
    if (!initialized || loading || !profile || !user) return;

    const currentLoginAt = profile.last_login_at;
    const currentLoginCount = profile.login_count;
    const userWelcomedKey = `${USER_WELCOMED_KEY}${user.id}_${currentLoginCount}`;

    const hasBeenWelcomed = localStorage.getItem(userWelcomedKey);
    if (hasBeenWelcomed === 'true') {
      return;
    }

    const storedData = sessionStorage.getItem(INITIAL_LOGIN_DATA_KEY);
    const welcomeShown = sessionStorage.getItem(WELCOME_SHOWN_KEY);

    let initialData: { loginAt: string | null; loginCount: number | null } | null = null;

    if (storedData) {
      try {
        initialData = JSON.parse(storedData);
      } catch (e) {
        initialData = null;
      }
    }

    if (!initialData) {
      sessionStorage.setItem(INITIAL_LOGIN_DATA_KEY, JSON.stringify({
        loginAt: currentLoginAt,
        loginCount: currentLoginCount
      }));
      return;
    }

    if (
      currentLoginAt === initialData.loginAt &&
      currentLoginCount === initialData.loginCount
    ) {
      return;
    }

    if (currentLoginCount !== initialData.loginCount) {
      if (welcomeShown === 'true') return;

      sessionStorage.setItem(WELCOME_SHOWN_KEY, 'true');
      localStorage.setItem(userWelcomedKey, 'true');

      sessionStorage.setItem(INITIAL_LOGIN_DATA_KEY, JSON.stringify({
        loginAt: currentLoginAt,
        loginCount: currentLoginCount
      }));

      if (currentLoginCount === 1) {
        setTimeout(() => {
          toast.success("Account created! Welcome 🎉");
          launchConfetti();
        }, 100);
        return;
      }

      if (currentLoginCount > 1) {
        setTimeout(() => {
          toast.success("Welcome back 👋");
        }, 100);
      }
    }
  }, [profile?.last_login_at, profile?.login_count, initialized, loading, profile, user]);

  const signUp = async (email: string, password: string, opt?: { fullName?: string }) => {
    try {
      const supabaseUrl = supabase.supabaseUrl;
      const supabaseAnonKey = supabase.supabaseKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase configuration missing");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email,
          password,
          fullName: opt?.fullName
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || `Signup failed (${response.status})`;
        return {
          data: null,
          error: new Error(errorMessage)
        };
      }

      if (data.success === false) {
        return {
          data: null,
          error: new Error(data.error || "Signup failed")
        };
      }

      return { data, error: null };

    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('fetch')) {
        return {
          data: null,
          error: new Error("Network error. Please check your connection.")
        };
      }

      return {
        data: null,
        error: new Error(error?.message || "Signup failed. Please try again.")
      };
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

      sessionStorage.removeItem(LOGIN_TRACKING_KEY);
      sessionStorage.removeItem(WELCOME_SHOWN_KEY);
      sessionStorage.removeItem(INITIAL_LOGIN_DATA_KEY);

      if (user?.id) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(`${USER_WELCOMED_KEY}${user.id}`)) {
            localStorage.removeItem(key);
          }
        });
      }

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