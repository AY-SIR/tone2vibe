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
  signUp: (email: string, password: string, options?: { emailRedirectTo?: string; fullName?: string }) => Promise<{ data: any; error: any | null }>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const { expiryData, dismissPopup } = usePlanExpiry(user, profile);
  const profileChannelRef = useRef<any>(null);

  const shouldShowPopup = expiryData.show_popup;

  // -----------------------
  // Create default profile
  // -----------------------
  const createDefaultProfile = useCallback(async (user: User) => {
    try {
      const defaultProfile = {
        user_id: user.id,
        full_name: user.user_metadata.full_name || user.email?.split("@")[0] || "User",
        avatar_url: user.user_metadata.avatar_url || "",
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
        email: user.email!,
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
  // Load user profile
  // -----------------------
  const loadUserProfile = useCallback(
    async (user: User) => {
      if (!user.id) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ login_count: (data.login_count || 0) + 1, last_login_at: new Date().toISOString() })
            .eq("user_id", user.id);

          if (updateError) console.error("Failed to increment login_count:", updateError);

          const calculatedWordBalance = Math.max(0, data.words_limit - data.words_used);
          setProfile({ ...data, word_balance: data.word_balance ?? calculatedWordBalance } as Profile);

          if (data.country) {
            setLocationData({ country: data.country, currency: "INR" });
          }
          return;
        }

        if (error?.code === "PGRST116" && user.email) {
          const newProfile = await createDefaultProfile(user);
          if (newProfile) setProfile({ ...newProfile } as Profile);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    },
    [createDefaultProfile]
  );

  // -----------------------
  // Handle session initialization and changes (including expiration)
  // -----------------------
  useEffect(() => {
    let mounted = true;

    // This function handles all session updates.
    const handleSession = async (currentSession: Session | null) => {
      if (!mounted) return;

      const currentUser = currentSession?.user ?? null;
      setSession(currentSession);
      setUser(currentUser);

      if (currentUser) {
        // If there is a user, load their profile.
        await loadUserProfile(currentUser);
      } else {
        // **THIS IS THE KEY PART FOR EXPIRATION**
        // If the session is null (due to sign out or expiration), clear all user-specific state.
        setProfile(null);
        setLocationData(null);
      }
    };

    // Check for an active session when the component mounts.
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session).finally(() => {
        if (mounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
      });
    });

    // Listen for any auth state changes. This is the magic part.
    // It fires on SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
    // When the session auto-expires, Supabase detects it and fires a SIGNED_OUT event,
    // which results in the 'session' object passed here being null.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // console.log(`Auth event: ${_event}`, session); // Uncomment for debugging
      handleSession(session);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  // -----------------------
  // Listen to profile updates using Realtime
  // -----------------------
  useEffect(() => {
    if (profileChannelRef.current) {
        profileChannelRef.current.unsubscribe();
    }

    if (user?.id) {
        const channel = supabase
            .channel(`profile-updates-${user.id}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    const newProfile = payload.new as Profile;
                    const calculatedWordBalance = Math.max(0, newProfile.words_limit - newProfile.words_used);
                    setProfile(prevProfile => ({ ...prevProfile, ...newProfile, word_balance: newProfile.word_balance ?? calculatedWordBalance }));
                }
            )
            .subscribe();

        profileChannelRef.current = channel;
    }

    return () => {
        profileChannelRef.current?.unsubscribe();
    };
  }, [user?.id]);

  // -----------------------
  // Auth actions
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
      // While onAuthStateChange will also clear state, setting it here provides a faster UI update.
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

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserProfile(user);
    }
  }, [user, loadUserProfile]);

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user?.id) return;
    try {
      if (data.words_used !== undefined && profile) {
        data.word_balance = Math.max(0, profile.words_limit - data.words_used);
      }
      const { error } = await supabase.from("profiles").update(data).eq("user_id", user.id);
      if (error) {
        console.error("Error updating profile:", error);
      }
      // The realtime subscription should handle the update, but a manual refresh can be a fallback.
      // await refreshProfile();
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