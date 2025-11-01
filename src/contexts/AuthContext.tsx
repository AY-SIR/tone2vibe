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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const { expiryData, dismissPopup } = usePlanExpiry(user, profile);
  const profileChannelRef = useRef<any>(null);

  const shouldShowPopup = expiryData?.show_popup || false;

  // Load or create user profile
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
          ip_address: (data.ip_address as string) ?? '',  
          word_balance: data.word_balance ?? Math.max(0, data.words_limit - data.words_used),  
        });  
        setLocationData({ country: "India", currency: "INR" });  
      } else if (error?.code === "PGRST116") {  
        setProfile(null);  
        setLocationData({ country: "India", currency: "INR" });  
      }
    } catch (err) {  
      console.error("Error loading profile:", err);  
    }
  }, []);

  // Session handling
  useEffect(() => {
    let mounted = true;

    const handleSession = async (currentSession: Session | null) => {  
      if (!mounted) return;  
      const currentUser = currentSession?.user ?? null;  
      setSession(currentSession);  
      setUser(currentUser);  
      if (currentUser) await loadUserProfile(currentUser);  
    };  

    supabase.auth.getSession().then(({ data: { session } }) => {  
      handleSession(session).finally(() => {  
        if (mounted) setLoading(false);  
        setAuthInitialized(true);  
      });  
    });  

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {  
      handleSession(session);  
    });  

    return () => {  
      mounted = false;  
      subscription?.unsubscribe();  
    };
  }, [loadUserProfile]);

  // Realtime profile updates
  useEffect(() => {
    if (profileChannelRef.current) profileChannelRef.current.unsubscribe();
    if (user?.id) {
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
    }
    return () => profileChannelRef.current?.unsubscribe();
  }, [user?.id]);

  // Auth actions
  const signUp = async (email: string, password: string, options?: { fullName?: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke("signup", {
        body: { email, password, fullName: options?.fullName }
      });

      // Parse the response
      let parsedData;
      try {
        parsedData = typeof data === "string" ? JSON.parse(data) : data;
      } catch (parseError) {
        if (error) return { data: null, error: new Error("Network error. Please check your connection and try again.") };
        return { data: null, error: new Error("Unexpected server response. Please try again.") };
      }

      if (!parsedData || !parsedData.success) {
        const errorMessage = parsedData?.error || "Signup failed. Please try again.";
        return { data: null, error: new Error(errorMessage) };
      }

      return { data: parsedData, error: null };
    } catch (err) {
      console.error("Signup exception:", err);
      return { data: null, error: new Error("Network error. Please check your connection and try again.") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error && error.message.includes("Email not confirmed")) {
        return { data, error: new Error("Please confirm your email before signing in.") };
      }
      return { data, error };
    } catch (err) {
      console.error("SignIn error:", err);
      return { data: null, error: err as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/tool",
          queryParams: { access_type: "offline", prompt: "consent" }
        },
      });
    } catch (err) {
      console.error("Google sign in failed:", err);
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
      console.error("SignOut error:", err);
      return { error: err as Error };
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
      const { error } = await supabase.from("profiles").update(data).eq("user_id", user.id);
      if (error) console.error("Profile update error:", error);
    } catch (err) {
      console.error("Profile update exception:", err);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading: loading || !authInitialized,
    locationData,
    planExpiryActive: shouldShowPopup,
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
