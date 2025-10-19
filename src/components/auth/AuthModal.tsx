import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Eye, EyeOff, Mic, CheckCircle, ArrowLeft } from "lucide-react";
import { IndiaOnlyAlert } from "@/components/common/IndiaOnlyAlert";
import { LocationCacheService } from "@/services/locationCache";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FcGoogle } from "react-icons/fc";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ViewType = 'choice' | 'signin' | 'signup' | 'forgot-password';

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [redirectPath, setRedirectPath] = useState('/tool');

  // --- States for Sign In ---
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // --- States for Sign Up ---
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // --- Common States ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isIndianUser, setIsIndianUser] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<ViewType>('choice');
  const [resetEmail, setResetEmail] = useState('');
  const { signUp, signIn } = useAuth();

  // --- Loading States ---
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const isAuthLoading = isEmailLoading || isGoogleLoading;

  // --- Field Clearing Functions ---
  const clearSignInFields = () => {
    setSignInEmail('');
    setSignInPassword('');
  };

  const clearSignUpFields = () => {
    setSignUpFullName('');
    setSignUpEmail('');
    setSignUpPassword('');
    setSignUpConfirmPassword('');
    setAgreeToTerms(false);
  };

  const clearAllFields = () => {
    clearSignInFields();
    clearSignUpFields();
    setResetEmail('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Handle URL parameters
  useEffect(() => {
    const shouldOpen = searchParams.get('auth') === 'open';
    const view = searchParams.get('view');
    if (shouldOpen) {
      onOpenChange(true);
      if (view === 'forgot-password') setCurrentView('forgot-password');
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('auth');
      newSearchParams.delete('view');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, onOpenChange, setSearchParams]);

  // Initialize form when modal opens
  useEffect(() => {
    if (open) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '/tool') setRedirectPath(currentPath);
      clearAllFields();
      setCurrentView('choice');
      LocationCacheService.getLocation().then(location => setIsIndianUser(location.isIndian));
    }
  }, [open]);

  const validatePassword = (password: string) => {
    const requirements = [];
    if (password.length < 8) requirements.push('at least 8 characters');
    if (!/[a-z]/.test(password)) requirements.push('one lowercase letter');
    if (!/[A-Z]/.test(password)) requirements.push('one uppercase letter');
    if (!/[0-9]/.test(password)) requirements.push('one digit');
    return requirements;
  };

  // --- Event Handlers ---
  const handleSignInKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAuthLoading) {
      e.preventDefault();
      e.stopPropagation();
      handleSignIn();
    }
  };

  const handleSignUpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAuthLoading) {
      e.preventDefault();
      e.stopPropagation();
      handleSignUp();
    }
  };

  const handleForgotPasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isResetLoading) {
      e.preventDefault();
      e.stopPropagation();
      handleForgotPassword();
    }
  };

  // --- Sign In ---
  const handleSignIn = async () => {
    if (!signInEmail || !signInPassword) return toast.error('Please fill in all fields');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signInEmail)) return toast.error('Please enter a valid email address');

    setIsEmailLoading(true);
    try {
      const { data, error } = await signIn(signInEmail.trim().toLowerCase(), signInPassword);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error("Invalid email or password. If you signed up with Google, please use 'Continue with Google'.", { duration: 6000 });
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email address first. Check your inbox for the confirmation link.', { duration: 8000 });
        } else {
          toast.error(error.message || 'Sign in failed. Please try again.');
        }
        return;
      }
      if (data.user) {
        toast.success('Welcome back!');
        onOpenChange(false);
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsEmailLoading(false);
      clearSignInFields();
    }
  };

  // --- Sign Up ---
  const handleSignUp = async () => {
    if (!signUpEmail || !signUpPassword || !signUpFullName.trim()) {
      return toast.error('Please fill in all required fields');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpEmail)) {
      return toast.error('Please enter a valid email address');
    }

    const passwordRequirements = validatePassword(signUpPassword);
    if (passwordRequirements.length > 0) {
      return toast.error(`Password must include: ${passwordRequirements.join(', ')}`);
    }

    if (signUpPassword !== signUpConfirmPassword) {
      return toast.error('Passwords do not match');
    }

    if (!agreeToTerms) {
      return toast.error('You must agree to the Terms of Service and Privacy Policy');
    }

    setIsEmailLoading(true);

    try {
      // Check if user already exists in profiles table
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', signUpEmail.trim().toLowerCase())
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profiles:', profileError);
        toast.error('Unable to check existing email. Please try again.');
        return;
      }

      if (existingProfile) {
        toast.error('This email is already registered. Please sign in or use forgot password.');
        setCurrentView('signin');
        return;
      }

      // Indian-only check
      const location = await LocationCacheService.getLocation();
      if (!location.isIndian) {
        toast.error('Signup is only available in India');
        return;
      }

      // Call signup Edge Function
      const { data, error } = await supabase.functions.invoke('signup', {
        body: {
          email: signUpEmail.trim().toLowerCase(),
          password: signUpPassword,
          fullName: signUpFullName.trim()
        }
      });

      if (error) {
        console.error('Signup error:', error);
        if (error.message?.includes('User already exists')) {
          toast.error('This email is already registered. Please sign in or use forgot password.');
          setCurrentView('signin');
        } else {
          toast.error(error.message || 'Signup failed. Please try again.');
        }
        return;
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (result?.error) {
        if (result.error.includes('User already exists')) {
          toast.error('This email is already registered. Please sign in or use forgot password.');
          setCurrentView('signin');
        } else {
          toast.error(result.error || 'Signup failed. Please try again.');
        }
        return;
      }

      // Success
      toast.success('Account created successfully! Please check your email to verify your account before signing in.', { duration: 10000 });
      onOpenChange(false);
      clearSignUpFields();

    } catch (err) {
      console.error('Signup error:', err);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsEmailLoading(false);
    }
  };

  // --- Google Sign In ---
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });
      if (error) throw new Error(error.message);
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error("Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  // --- Forgot Password ---
  const handleForgotPassword = async () => {
    if (!resetEmail) return toast.error('Please enter your email address');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) return toast.error('Please enter a valid email address');

    setIsResetLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', { body: { email: resetEmail.trim().toLowerCase() } });
      if (error) {
        console.error('Reset email error:', error);
        toast.error('Failed to send reset email. Please try again.');
        return;
      }
      toast.success('If an account exists with this email, a password reset link has been sent. Please check your inbox.', { duration: 8000 });
      setCurrentView('choice');
    } catch (err) {
      console.error('Forgot password exception:', err);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsResetLoading(false);
      setResetEmail('');
    }
  };

  const goBack = () => {
    clearAllFields();
    setCurrentView('choice');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto no-scrollbar border-0 rounded-xl sm:max-w-[425px] w-[90%] mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentView !== 'choice' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="p-1 h-8 w-8"
                disabled={isAuthLoading || isResetLoading}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="w-8 h-8 bg-white/70 rounded-lg flex items-center justify-center shadow-sm">
              <Mic className="h-5 w-5 text-black" />
            </div>
            Tone2Vibe
          </DialogTitle>
          <DialogDescription>
            {currentView === 'choice' && 'Hello! Choose how you want to continue.'}
            {currentView === 'signin' && 'Welcome back! Sign in to your account.'}
            {currentView === 'signup' && 'Create your account to get started.'}
            {currentView === 'forgot-password' && 'Reset your password'}
          </DialogDescription>
        </DialogHeader>

        {!isIndianUser && <IndiaOnlyAlert />}

        {isIndianUser && (
          <>
            {/* CHOICE VIEW */}
            {currentView === 'choice' && (
              <div className="space-y-4 pt-4">
                <Button
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-3 text-base font-medium hover:bg-accent"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FcGoogle className="h-5 w-5" />
                  )}
                  {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">OR</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-3 text-base font-medium hover:bg-accent"
                  onClick={() => setCurrentView('signin')}
                >
                  <Mail className="h-5 w-5" />
                  Continue with Email
                </Button>

                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm font-semibold text-primary"
                      onClick={() => setCurrentView('signup')}
                    >
                      Sign up
                    </Button>
                  </p>
                </div>
              </div>
            )}

            {/* SIGN IN VIEW */}
            {currentView === 'signin' && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      onKeyDown={handleSignInKeyDown}
                      className="pl-10"
                      disabled={isAuthLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      onKeyDown={handleSignInKeyDown}
                      className="pl-10 pr-10"
                      disabled={isAuthLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isAuthLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 h-auto text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setCurrentView('forgot-password')}
                    disabled={isAuthLoading}
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button
                  onClick={handleSignIn}
                  className="w-full"
                  disabled={isAuthLoading}
                >
                  {isEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>

                <div className="text-center pt-2">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm font-semibold text-primary"
                      onClick={() => {
                        clearAllFields();
                        setCurrentView('signup');
                      }}
                      disabled={isAuthLoading}
                    >
                      Sign up
                    </Button>
                  </p>
                </div>
              </div>
            )}

            {/* SIGN UP VIEW */}
            {currentView === 'signup' && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signUpFullName}
                      onChange={(e) => setSignUpFullName(e.target.value)}
                      onKeyDown={handleSignUpKeyDown}
                      className="pl-10"
                      disabled={isAuthLoading}
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      onKeyDown={handleSignUpKeyDown}
                      className="pl-10"
                      disabled={isAuthLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      onKeyDown={handleSignUpKeyDown}
                      className="pl-10 pr-10"
                      disabled={isAuthLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isAuthLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signUpPassword && validatePassword(signUpPassword).length > 0 && (
                    <p className="text-xs text-destructive">Required: {validatePassword(signUpPassword).join(', ')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <div className="relative">
                    <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      onKeyDown={handleSignUpKeyDown}
                      className="pl-10 pr-10"
                      disabled={isAuthLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isAuthLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signUpConfirmPassword && signUpPassword !== signUpConfirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => setAgreeToTerms(!!checked)}
                    disabled={isAuthLoading}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I agree to the{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      Terms
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      Privacy Policy
                    </a>
                  </Label>
                </div>

                <Button
                  onClick={handleSignUp}
                  className="w-full"
                  disabled={isAuthLoading || !agreeToTerms}
                >
                  {isEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>

                <div className="text-center pt-2">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm font-semibold text-primary"
                      onClick={() => {
                        clearAllFields();
                        setCurrentView('signin');
                      }}
                      disabled={isAuthLoading}
                    >
                      Sign in
                    </Button>
                  </p>
                </div>
              </div>
            )}

            {/* FORGOT PASSWORD VIEW */}
            {currentView === 'forgot-password' && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      onKeyDown={handleForgotPasswordKeyDown}
                      className="pl-10"
                      disabled={isResetLoading}
                      autoComplete="email"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter your email to receive a password reset link.
                  </p>
                </div>

                <Button
                  onClick={handleForgotPassword}
                  className="w-full"
                  disabled={isResetLoading}
                >
                  {isResetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}