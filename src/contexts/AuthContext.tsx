"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
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
  signUp: (email: string, password: string, options?: { fullName?: string }) => Promise<{ data: any; error: any | null }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any | null }>;
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

// Utility to get verification key
const getVerificationKey = (userId: string, accessToken?: string): string => {
  const tokenPart = accessToken ? accessToken.slice(0, 16) : 'no-token';
  return `2fa_verified:${userId}:${tokenPart}`;
};

// Utility to clear all 2FA verification keys for a user
const clearAllVerificationKeys = (userId: string): void => {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(`2fa_verified:${userId}:`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Silent fail - session storage may not be available
  }
};

// Safe error logger (only in development)
const logError = (context: string, error: any): void => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Auth Error - ${context}]:`, error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [checking2FA, setChecking2FA] = useState(false);
  const profileChannelRef = useRef<any>(null);

  const { expiryData, dismissPopup } = usePlanExpiry(user, profile);

  // Only show popup if 2FA check is complete, not required, and user is verified
  const shouldShowPopup = !checking2FA && !needs2FA && (expiryData?.show_popup || false);

  // Load or create user profile
  const loadUserProfile = useCallback(async (user: User): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile({
          ...data,
          ip_address: (data.ip_address as string | null) ?? '',
          word_balance: data.word_balance ?? Math.max(0, data.words_limit - data.words_used),
        });
        setLocationData({ country: data.country || "India", currency: "INR" });
      } else if (error?.code === "PGRST116") {
        setProfile(null);
        setLocationData({ country: "India", currency: "INR" });
      } else if (error) {
        logError('loadUserProfile', error);
      }
    } catch (err) {
      logError('loadUserProfile', err);
    }
  }, []);

  // Check 2FA status
  const check2FAStatus = useCallback(async (userId: string, accessToken?: string): Promise<boolean> => {
    setChecking2FA(true);

    try {
      // Check if already verified in this session
      const verifiedKey = getVerificationKey(userId, accessToken);
      const isVerified = typeof window !== 'undefined' && sessionStorage.getItem(verifiedKey) === 'true';

      if (isVerified) {
        setNeeds2FA(false);
        setChecking2FA(false);
        return false;
      }

      // Check if 2FA is enabled in database
      const { data: settings, error } = await supabase
        .from('user_2fa_settings')
        .select('enabled')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logError('check2FAStatus', error);
      }

      const requires2FA = !!settings?.enabled;
      setNeeds2FA(requires2FA);
      setChecking2FA(false);
      return requires2FA;
    } catch (err) {
      logError('check2FAStatus', err);
      setNeeds2FA(false);
      setChecking2FA(false);
      return false;
    }
  }, []);

  // Session handling
  useEffect(() => {
    let mounted = true;

    const handleSession = async (currentSession: Session | null): Promise<void> => {
      if (!mounted) return;

      const currentUser = currentSession?.user ?? null;

      // Set user and session immediately
      setUser(currentUser);
      setSession(currentSession);

      if (currentUser) {
        // Load profile first
        await loadUserProfile(currentUser);

        // Then check 2FA status (but don't redirect here)
        await check2FAStatus(currentUser.id, currentSession?.access_token);
      } else {
        // User logged out
        setProfile(null);
        setLocationData(null);
        setNeeds2FA(false);
        setChecking2FA(false);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);

      // Manage session cookie
      if (session?.access_token) {
        try {
          document.cookie = `auth_session=${session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;
        } catch {
          // Cookie setting may fail in some contexts
        }
      } else {
        try {
          document.cookie = 'auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
        } catch {
          // Cookie deletion may fail in some contexts
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUserProfile, check2FAStatus]);

  // Realtime profile updates
  useEffect(() => {
    if (profileChannelRef.current) {
      try {
        profileChannelRef.current.unsubscribe();
      } catch {
        // Ignore unsubscribe errors
      }
    }

    if (user?.id) {
      try {
        const channel = supabase
          .channel(`profile-updates-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              const newProfile = payload.new as Profile;
              setProfile(prev => ({
                ...prev,
                ...newProfile,
                word_balance: newProfile.word_balance ?? Math.max(0, newProfile.words_limit - newProfile.words_used),
              }));
            }
          )
          .subscribe();
        profileChannelRef.current = channel;
      } catch (err) {
        logError('realtimeProfile', err);
      }
    }

    return () => {
      if (profileChannelRef.current) {
        try {
          profileChannelRef.current.unsubscribe();
        } catch {
          // Ignore unsubscribe errors
        }
      }
    };
  }, [user?.id]);

  // Auth actions
  const signUp = async (
    email: string,
    password: string,
    options?: { fullName?: string }
  ): Promise<{ data: any; error: any | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke("signup", {
        body: { email, password, fullName: options?.fullName }
      });

      let parsedData;
      try {
        parsedData = typeof data === "string" ? JSON.parse(data) : data;
      } catch {
        if (error) {
          logError('signUp', error);
          return { data: null, error: new Error("Network error. Please check your connection and try again.") };
        }
        return { data: null, error: new Error("Unexpected server response. Please try again.") };
      }

      if (!parsedData || !parsedData.success) {
        const errorMessage = parsedData?.error || "Signup failed. Please try again.";
        return { data: null, error: new Error(errorMessage) };
      }

      return { data: parsedData, error: null };
    } catch (err) {
      logError('signUp', err);
      return { data: null, error: new Error("Network error. Please check your connection and try again.") };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ data: any; error: any | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        logError('signIn', error);
        if (error.message.includes("Email not confirmed")) {
          return { data, error: new Error("Please confirm your email before signing in.") };
        }
        return { data, error };
      }

      // Create session cookie on successful login
      if (data?.session) {
        try {
          document.cookie = `auth_session=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;
        } catch {
          // Cookie setting may fail
        }
      }

      return { data, error };
    } catch (err) {
      logError('signIn', err);
      return { data: null, error: err as Error };
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: "offline", prompt: "consent" }
        },
      });
    } catch (err) {
      logError('signInWithGoogle', err);
      throw err;
    }
  };

  const signOut = async (): Promise<{ error: any | null }> => {
    try {
      // CRITICAL: Clear all 2FA verification keys for this user
      if (user?.id) {
        clearAllVerificationKeys(user.id);
      }

      // Delete session cookie
      try {
        document.cookie = 'auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
      } catch {
        // Cookie deletion may fail
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        logError('signOut', error);
      }

      // Clear all state
      setUser(null);
      setSession(null);
      setProfile(null);
      setLocationData(null);
      setNeeds2FA(false);
      setChecking2FA(false);

      return { error };
    } catch (err) {
      logError('signOut', err);
      return { error: err as Error };
    }
  };

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (user) await loadUserProfile(user);
  }, [user, loadUserProfile]);

  const updateProfile = async (data: Partial<Profile>): Promise<void> => {
    if (!user?.id) return;

    try {
      if (data.words_used !== undefined && profile) {
        data.word_balance = Math.max(0, profile.words_limit - data.words_used);
      }

      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("user_id", user.id);

      if (error) {
        logError('updateProfile', error);
      }
    } catch (err) {
      logError('updateProfile', err);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading: loading || !authInitialized,
    locationData,
    planExpiryActive: shouldShowPopup,
    needs2FA,
    checking2FA,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile
  };

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