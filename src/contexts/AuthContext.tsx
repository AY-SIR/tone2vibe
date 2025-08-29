import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { LocationService, LocationData } from '@/services/locationService';
import { GeoRestrictionService } from '@/services/geoRestrictionService';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  plan: string;
  words_limit: number;
  words_used: number; // Legacy field - kept for compatibility
  plan_words_used: number; // New field for plan-specific word usage
  word_balance: number; // Purchased words that never expire
  total_words_used: number; // Total words ever used
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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  locationData: LocationData | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ data: any; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession()

        // Check if user has verified email before setting session
        if (session?.user && !session.user.email_confirmed_at) {
          console.log('User email not verified, signing out...');
          await supabase.auth.signOut();
          return;
        }

        setSession(session)

        if (session) {
          setUser(session.user)
        }
      } catch (error) {
        console.error("Session error:", error);
      } finally {
        setLoading(false);
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email_confirmed_at);
      
      // Check email verification on auth state change
      if (session?.user && !session.user.email_confirmed_at && event !== 'SIGNED_OUT') {
        console.log('User email not verified during state change, signing out...');
        await supabase.auth.signOut();
        return;
      }

      setUser(session?.user || null);
      setSession(session || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      
      // Load saved location if available
      const savedLocation = localStorage.getItem(`user_location_${user.id}`);
      if (savedLocation) {
        const locationData = JSON.parse(savedLocation);
        setLocationData(locationData);
      }
      
      // Set up real-time subscription for profile updates
      const profileChannel = supabase
        .channel('profile-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Profile updated in real-time:', payload.new);
            setProfile(payload.new as any);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(profileChannel);
      };
    } else {
      setProfile(null);
    }
  }, [user]);

  useEffect(() => {
    if (session?.access_token) {
      trackLoginIP();
    }
  }, [session]);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Check geo restrictions before allowing signup
      const geoCheck = await GeoRestrictionService.checkCountryAccess();
      
      if (!geoCheck.isAllowed) {
        return { 
          data: null,
          error: new Error(geoCheck.message)
        };
      }

      // First check if email already exists in database
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser && !checkError) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmed`,
          data: {
            full_name: fullName,
            email: email
          }
        }
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('already registered') || 
            error.message.includes('User already registered') ||
            error.message.includes('signup_disabled') ||
            error.status === 422) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw error;
      }

      // Force correct currency based on user's country
      if (geoCheck.countryCode && data.user) {
        const forcedCurrency = GeoRestrictionService.getForcedCurrency(geoCheck.countryCode);
        localStorage.setItem(`user_currency_${data.user.id}`, forcedCurrency);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Signup failed') 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Check geo restrictions before allowing login
      const geoCheck = await GeoRestrictionService.checkCountryAccess();
      
      if (!geoCheck.isAllowed) {
        return { 
          data: null,
          error: new Error(geoCheck.message)
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for a confirmation email.');
        }
        throw error;
      }

      // Check if user email is verified
      if (data.user && !data.user.email_confirmed_at) {
        // Sign out the user immediately if email not verified
        await supabase.auth.signOut();
        throw new Error('Please verify your email address before signing in. Check your inbox for a confirmation email.');
      }

      // Force correct currency based on user's country
      if (geoCheck.countryCode && data.user) {
        const forcedCurrency = GeoRestrictionService.getForcedCurrency(geoCheck.countryCode);
        localStorage.setItem(`user_currency_${data.user.id}`, forcedCurrency);
      }

      // Track login IP only on first login (check localStorage)
      if (data.user) {
        const hasTrackedIP = localStorage.getItem(`ip_tracked_${data.user.id}`);
        if (!hasTrackedIP) {
          setTimeout(() => {
            trackLoginIP();
          }, 1000);
        } else {
          // Load saved location data from localStorage
          const savedLocation = localStorage.getItem(`user_location_${data.user.id}`);
          if (savedLocation) {
            const locationData = JSON.parse(savedLocation);
            setLocationData(locationData);
          }
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Signin error:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Sign in failed') 
      };
    }
  };

  const trackLoginIP = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('track-login-ip', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (data && !error && user) {
        console.log('IP tracking completed:', data);
        
        // Update location data
        if (data.country) {
          const locationData = {
            country: data.country,
            currency: data.country === 'India' ? 'INR' : 'USD'
          };
          setLocationData(locationData);

          // Save to localStorage to avoid future IP calls
          localStorage.setItem(`ip_tracked_${user.id}`, 'true');
          localStorage.setItem(`user_location_${user.id}`, JSON.stringify(locationData));
        }

        // Reload profile to get updated data
        loadUserProfile();
      }
    } catch (error) {
      console.error('IP tracking error:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, this is handled by the trigger
          console.log('Profile not found, will be created by trigger');
          return;
        }
        console.error('Profile loading error:', error);
        return;
      }

      if (data) {
        setProfile({
          ...data,
          ip_address: (data.ip_address as string) || null
        } as Profile);
        
        // Set location data from profile if available
        if (data.country) {
          setLocationData({
            country: data.country,
            currency: data.country === 'India' ? 'INR' : 'USD'
          });
        }
      }
    } catch (error) {
      console.error('Load profile error:', error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all state and localStorage
      setUser(null);
      setSession(null);
      setProfile(null);
      setLocationData(null);
      
      // Clear saved location data on sign out
      if (user) {
        localStorage.removeItem(`ip_tracked_${user.id}`);
        localStorage.removeItem(`user_location_${user.id}`);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Signout error:', error);
      return { error: error instanceof Error ? error : new Error('Sign out failed') };
    }
  };

  const refreshProfile = async () => {
    await loadUserProfile();
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) throw new Error('No user found');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      await loadUserProfile();
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    locationData,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
