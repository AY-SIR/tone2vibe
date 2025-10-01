// src/contexts/AuthContext.tsx
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
  signUp: (email: string, password: string, options?: { emailRedirectTo?: string; fullName?: string }) => Promise<{ data: any; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: Error | null }>;
  signInWithGoogle: () => Promise<void>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const { expiryData, dismissPopup } = usePlanExpiry(user, profile);
  const profileChannelRef = useRef<any>(null);

  const SESSION_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours
  const shouldShowPopup = expiryData.show_popup;

  // -----------------------
  // Create default profile
  // -----------------------
  const createDefaultProfile = useCallback(async (userId: string, userEmail: string) => {
    try {
      const defaultProfile = {
        user_id: userId,
        full_name: userEmail.split("@")[0] || "User",
        avatar_url: "",
        plan: "free",
        words_limit: 1000,
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
        company: "",
        preferred_language: "en",
        created_at: new Date().toISOString(),
        last_word_purchase_at: "",
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

  // -----------------------
  // Load profile
  // -----------------------
  const loadUserProfile = useCallback(
    async (userId: string, userEmail?: string) => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (data) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ login_count: (data.login_count || 0) + 1, last_login_at: new Date().toISOString() })
            .eq("user_id", userId);

          if (updateError) console.error("Failed to increment login_count:", updateError);

          const calculatedWordBalance = Math.max(0, data.words_limit - data.words_used);
          setProfile({ ...data, word_balance: data.word_balance ?? calculatedWordBalance } as Profile);

          if (data.country) {
            setLocationData({ country: data.country, currency: "INR" });
          }
          return;
        }

        if (error?.code === "PGRST116" && userEmail) {
          const newProfile = await createDefaultProfile(userId, userEmail);
          if (newProfile) setProfile({ ...newProfile, ip_address: newProfile.ip_address as string } as Profile);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    },
    [createDefaultProfile]
  );

  // -----------------------
  // Handle session
  // -----------------------
  useEffect(() => {
    let mounted = true;
    let sessionTimeout: any = null;

    const handleSession = async (currentSession: Session | null) => {
      if (!mounted) return;

      const currentUser = currentSession?.user ?? null;
      setSession(currentSession);
      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser.id, currentUser.email);

        if (sessionTimeout) clearTimeout(sessionTimeout);
        sessionTimeout = setTimeout(() => {
          supabase.auth.signOut();
        }, SESSION_EXPIRY_MS);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      mounted = false;
      if (sessionTimeout) clearTimeout(sessionTimeout);
      subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  // -----------------------
  // Listen to profile updates
  // -----------------------
  useEffect(() => {
    if (profileChannelRef.current) profileChannelRef.current.unsubscribe?.();

    if (user?.id) {
      const channel = supabase
        .channel(`profile-updates-${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const newProfile = payload.new as Profile;
            const calculatedWordBalance = Math.max(0, newProfile.words_limit - newProfile.words_used);
            setProfile({ ...newProfile, word_balance: newProfile.word_balance ?? calculatedWordBalance });
          }
        )
        .subscribe();
      profileChannelRef.current = channel;
    }

    return () => profileChannelRef.current?.unsubscribe?.();
  }, [user?.id]);

  // -----------------------
  // Auth Actions
  // -----------------------
  const signUp = async (email: string, password: string, options?: { emailRedirectTo?: string; fullName?: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: options?.emailRedirectTo, data: { full_name: options?.fullName || "" } },
      });
      return { data, error };
    } catch (err) {
      console.error("Exception during signUp:", err);
      return { data: null, error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return { data, error };
    } catch (err) {
      console.error("Exception during signIn:", err);
      return { data: null, error: err as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/tool' } });
    } catch (err) {
      console.error('Google sign in failed:', err);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setLocationData(null);
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
      if (data.words_used !== undefined && profile) {
        data.word_balance = Math.max(0, profile.words_limit - data.words_used);
      }
      const { error } = await supabase.from("profiles").update(data).eq("user_id", user.id);
      if (!error) await loadUserProfile(user.id, user.email);
    } catch (err) {
      console.error("Exception during profile update:", err);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading: loading || !authInitialized,
    locationData,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile,
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
