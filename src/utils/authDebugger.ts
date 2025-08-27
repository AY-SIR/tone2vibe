
import { supabase } from '@/integrations/supabase/client';

export class AuthDebugger {
  static async debugCurrentSession() {
    try {
      console.group('🔍 Auth Debug Session');
      
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', session);
      console.log('Session error:', sessionError);
      
      // Check user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', user);
      console.log('User error:', userError);
      
      // Check profile if user exists
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('User profile:', profile);
        console.log('Profile error:', profileError);
      }
      
      // Check local storage
      console.log('Local storage keys:', Object.keys(localStorage));
      console.log('Cookie consent:', localStorage.getItem('cookie-consent'));
      
      console.groupEnd();
    } catch (error) {
      console.error('Auth debug error:', error);
    }
  }
  
  static async testProfileFetch(userId: string) {
    try {
      console.group('🔍 Profile Fetch Test');
      console.log('Testing profile fetch for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      console.log('Profile data:', data);
      console.log('Profile error:', error);
      
      console.groupEnd();
    } catch (error) {
      console.error('Profile fetch test error:', error);
    }
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).AuthDebugger = AuthDebugger;
}
