// src/components/auth/AuthModal.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Eye, EyeOff, Mic, CheckCircle, ArrowLeft } from "lucide-react";
import { IndiaOnlyAlert } from "@/components/common/IndiaOnlyAlert";
import { LocationCacheService } from "@/services/locationCache";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client'; // Keep for resetPasswordForEmail
import { FcGoogle } from "react-icons/fc";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isIndianUser, setIsIndianUser] = useState<boolean>(true);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [currentView, setCurrentView] = useState<'auth' | 'forgot-password'>('auth');
  const [resetEmail, setResetEmail] = useState('');
  const { signUp, signIn, signInWithGoogle } = useAuth();

  // Handle URL parameters
  useEffect(() => {
    const shouldOpen = searchParams.get('auth') === 'open';
    const view = searchParams.get('view');
    if (shouldOpen) {
      onOpenChange(true);
      if (view === 'forgot-password') {
        setCurrentView('forgot-password');
      }
      // Clean up URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('auth');
      newSearchParams.delete('view');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, onOpenChange, setSearchParams]);

  // Initialize form when modal opens
  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setResetEmail('');
      setAgreeToTerms(false);
      if (currentView !== 'forgot-password') {
        setCurrentView('auth');
      }
      LocationCacheService.getLocation().then(location => setIsIndianUser(location.isIndian));
    }
  }, [open, currentView]);

  const clearAllFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setAgreeToTerms(false);
    setResetEmail('');
  };

  const validatePassword = (password: string) => {
    const requirements = [];
    if (password.length < 8) requirements.push('at least 8 characters');
    if (!/[a-z]/.test(password)) requirements.push('one lowercase letter');
    if (!/[A-Z]/.test(password)) requirements.push('one uppercase letter');
    if (!/[0-9]/.test(password)) requirements.push('one digit');
    return requirements;
  };

  // Add keyboard event handlers
  const handleSignInKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      e.stopPropagation();
      handleSignIn();
    }
  };

  const handleSignUpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      e.stopPropagation();
      handleSignUp();
    }
  };

  const handleForgotPasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      e.stopPropagation();
      handleForgotPassword();
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting sign in for:', email);
      const { data, error } = await signIn(email.trim().toLowerCase(), password);
      if (error) {
        console.error('Sign in error:', error);
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please check your credentials.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email address first. Check your inbox for the confirmation link.');
        } else if (error.message.includes('Too many requests')) {
          toast.error('Too many login attempts. Please wait a moment and try again.');
        } else {
          toast.error('Sign in failed. Please try again.');
        }
        clearAllFields();
        return;
      }

      if (data.user) {
        console.log('Sign in successful for user:', data.user.email);
        toast.success('Welcome back!');
        clearAllFields();
        onOpenChange(false);
        navigate('/tool', { replace: true });
      }

    } catch (err) {
      console.error('Unexpected sign in error:', err);
      toast.error('An unexpected error occurred. Please try again.');
      clearAllFields();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !fullName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const passwordRequirements = validatePassword(password);
    if (passwordRequirements.length > 0) {
      toast.error(`Password must include: ${passwordRequirements.join(', ')}`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!agreeToTerms) {
      toast.error('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);

    try {
      const location = await LocationCacheService.getLocation();
      if (!location.isIndian) {
        toast.error('Signup is only available in India');
        clearAllFields();
        return;
      }

      console.log('Attempting sign up for:', email);
      const { data, error } = await signUp(email.trim().toLowerCase(), password, {
        emailRedirectTo: `${window.location.origin}/email-confirmation`,
        fullName: fullName.trim(),
      });
      if (error) {
        console.error('Sign up error:', error);
        if (error.message.includes('User already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else if (error.message.includes('Signup not allowed')) {
          toast.error('New signups are currently disabled. Please contact support.');
        } else if (error.message.includes('Password should be')) {
          toast.error('Password does not meet security requirements. Please choose a stronger password.');
        } else {
          toast.error('Signup failed. Please try again.');
        }
        clearAllFields();
        return;
      }

      if (data.user) {
        console.log('Sign up successful for user:', data.user.email);
        if (data.user.identities && data.user.identities.length === 0) {
          toast.error('This email is already registered. Please sign in instead.');
          clearAllFields();
          return;
        }

        toast.success('Account created! Please check your email to complete registration.', {
          duration: 8000
        });
        clearAllFields();
        onOpenChange(false);
      }

    } catch (err) {
      console.error('Unexpected sign up error:', err);
      toast.error('An unexpected error occurred. Please try again.');
      clearAllFields();
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Sending reset email to:', resetEmail);
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) {
        console.error('Reset password error:', error);
        if (error.message.includes('rate limit')) {
          toast.error('Too many reset attempts. Please wait before trying again.');
        } else {
          toast.error('Failed to send reset email. Please try again.');
        }
        setResetEmail('');
        return;
      }

      toast.success('Password reset email sent! Please check your Email', {
        duration: 8000
      });
      setCurrentView('auth');
      setResetEmail('');

    } catch (err) {
      console.error('Unexpected reset password error:', err);
      toast.error('An unexpected error occurred. Please try again.');
      setResetEmail('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh]  overflow-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentView === 'forgot-password' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('auth')}
                className="p-1 h-8 w-8"
                disabled={isLoading}
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
            {currentView === 'auth'
              ? 'Hello! Access your account or get started.'
              : ''}
          </DialogDescription>
        </DialogHeader>

        {!isIndianUser && <IndiaOnlyAlert />}

        {isIndianUser && (
          currentView === 'auth' ?
          (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" disabled={isLoading}>Sign In</TabsTrigger>
                <TabsTrigger value="signup" disabled={isLoading}>Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={handleSignInKeyDown}
                        className="pl-10"
                        disabled={isLoading}
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleSignInKeyDown}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
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
                      disabled={isLoading}
                    >
                      Forgot password?
                    </Button>
                  </div>

                  <Button
                    onClick={handleSignIn}
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </div>
                {/* Google Login */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 mb-2 mt-2"
                  onClick={() => {
                    setIsLoading(true);
                    // The page will redirect, so we don't need a try/finally block
                    // to set loading back to false.
                    signInWithGoogle();
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FcGoogle className="h-4 w-4" />
                  )}
                  {isLoading ? 'Signing in...' : 'Continue with Google'}
                </Button>
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        onKeyDown={handleSignUpKeyDown}
                        className="pl-10"
                        disabled={isLoading}
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={handleSignUpKeyDown}
                        className="pl-10"
                        disabled={isLoading}
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleSignUpKeyDown}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {password && validatePassword(password).length > 0 && (
                      <p className="text-xs text-destructive">
                        Required: {validatePassword(password).join(', ')}
                      </p>
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
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={handleSignUpKeyDown}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>

                  
                       <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={agreeToTerms}
                      onCheckedChange={(checked) => setAgreeToTerms(!!checked)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" className="text-primary underline">
                        Terms
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" target="_blank" className="text-primary underline">
                        Privacy Policy
                      </a>
                    </Label>
                  </div>

                  <Button
                    onClick={handleSignUp}
                    className="w-full"
                    disabled={isLoading || !agreeToTerms}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </div>
                 {/* Google Login */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 mb-2 mt-2"
                  onClick={() => {
                    setIsLoading(true);
                    // The page will redirect, so we don't need a try/finally block
                    // to set loading back to false.
                    signInWithGoogle();
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FcGoogle className="h-4 w-4" />
                  )}
                  {isLoading ? 'Signing in...' : 'Continue with Google'}
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email ">Email Address</Label>
                <div className="relative py-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onKeyDown={handleForgotPasswordKeyDown}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                <p className="text-sm text-gray-500 ">
                  Enter your email to receive a password reset link.
                </p>

              </div>

              <Button
                onClick={handleForgotPassword}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>

            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
        }
    
