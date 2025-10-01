
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
[span_0](start_span)import { Button } from "@/components/ui/button";[span_0](end_span)
[span_1](start_span)import { Input } from "@/components/ui/input";[span_1](end_span)
[span_2](start_span)import { Label } from "@/components/ui/label";[span_2](end_span)
[span_3](start_span)import { Checkbox } from "@/components/ui/checkbox";[span_3](end_span)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
[span_4](start_span)import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";[span_4](end_span)
import { toast } from "sonner";
[span_5](start_span)import { Loader2, Mail, Lock, User, Eye, EyeOff, Mic, CheckCircle, ArrowLeft } from "lucide-react";[span_5](end_span)
import { IndiaOnlyAlert } from "@/components/common/IndiaOnlyAlert";
[span_6](start_span)import { LocationCacheService } from "@/services/locationCache";[span_6](end_span)
import { useAuth } from '@/contexts/AuthContext';
[span_7](start_span)import { supabase } from '@/integrations/supabase/client';[span_7](end_span)
import { FcGoogle } from "react-icons/fc";

interface AuthModalProps {
  open: boolean;
  [span_8](start_span)onOpenChange: (open: boolean) => void;[span_8](end_span)
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // --- States for Sign In ---
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // --- States for Sign Up ---
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  [span_9](start_span)const [agreeToTerms, setAgreeToTerms] = useState(false);[span_9](end_span)

  // --- Common & Forgot Password States ---
  [span_10](start_span)const [isLoading, setIsLoading] = useState(false);[span_10](end_span)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isIndianUser, setIsIndianUser] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<'auth' | 'forgot-password'>('auth');
  const [resetEmail, setResetEmail] = useState('');
  [span_11](start_span)const { signUp, signIn, signInWithGoogle } = useAuth();[span_11](end_span)

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

  const handleTabChange = () => {
    clearSignInFields();
    clearSignUpFields();
    setShowPassword(false);
    setShowConfirmPassword(false);
  };
  
  // Handle URL parameters
  useEffect(() => {
    const shouldOpen = searchParams.get('auth') === 'open';
    const view = searchParams.get('view');
    if (shouldOpen) {
      onOpenChange(true);
      if (view === 'forgot-password') {
        setCurrentView('forgot-password');
      }
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('auth');
      newSearchParams.delete('view');
  
      [span_12](start_span)setSearchParams(newSearchParams, { replace: true });[span_12](end_span)
    }
  }, [searchParams, onOpenChange, setSearchParams]);

  // Initialize form when modal opens
  useEffect(() => {
    if (open) {
      clearSignInFields();
      clearSignUpFields();
      setResetEmail('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      if (currentView !== 'forgot-password') {
        setCurrentView('auth');
      }
      LocationCacheService.getLocation().then(location => setIsIndianUser(location.isIndian));
    }
  }, [open, currentView]);

  const validatePassword = (password: string) => {
    const requirements = [];
    [span_13](start_span)if (password.length < 8) requirements.push('at least 8 characters');[span_13](end_span)
    if (!/[a-z]/.test(password)) requirements.push('one lowercase letter');
    if (!/[A-Z]/.test(password)) requirements.push('one uppercase letter');
    [span_14](start_span)if (!/[0-9]/.test(password)) requirements.push('one digit');[span_14](end_span)
    return requirements;
  };

  // --- Event Handlers ---
  const handleSignInKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      [span_15](start_span)e.stopPropagation();[span_15](end_span)
      handleSignIn();
    }
  };

  const handleSignUpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      [span_16](start_span)e.stopPropagation();[span_16](end_span)
      handleSignUp();
    }
  };

  const handleForgotPasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      [span_17](start_span)e.stopPropagation();[span_17](end_span)
      handleForgotPassword();
    }
  };

  const handleSignIn = async () => {
    if (!signInEmail || !signInPassword) {
      toast.error('Please fill in all fields');
      [span_18](start_span)return;[span_18](end_span)
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signInEmail)) {
      toast.error('Please enter a valid email address');
      [span_19](start_span)return;[span_19](end_span)
    }

    setIsLoading(true);
    try {
      console.log('Attempting sign in for:', signInEmail);
      [span_20](start_span)const { data, error } = await signIn(signInEmail.trim().toLowerCase(), signInPassword);[span_20](end_span)
      if (error) {
        console.error('Sign in error:', error);
        [span_21](start_span)if (error.message.includes('Invalid login credentials')) {[span_21](end_span)
          toast.error('Invalid email or password. Please check your credentials.');
        [span_22](start_span)} else if (error.message.includes('Email not confirmed')) {[span_22](end_span)
          toast.error('Please confirm your email address first. Check your inbox for the confirmation link.');
        [span_23](start_span)} else if (error.message.includes('Too many requests')) {[span_23](end_span)
          toast.error('Too many login attempts. Please wait a moment and try again.');
        } else {
          [span_24](start_span)toast.error('Sign in failed. Please try again.');[span_24](end_span)
        }
        clearSignInFields();
        return;
      }

      if (data.user) {
        console.log('Sign in successful for user:', data.user.email);
        [span_25](start_span)toast.success('Welcome back!');[span_25](end_span)
        clearSignInFields();
        onOpenChange(false);
        navigate('/tool', { replace: true });
      }

    } catch (err) {
      console.error('Unexpected sign in error:', err);
      [span_26](start_span)toast.error('An unexpected error occurred. Please try again.');[span_26](end_span)
      clearSignInFields();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUpEmail || !signUpPassword || !signUpFullName.trim()) {
      toast.error('Please fill in all required fields');
      [span_27](start_span)return;[span_27](end_span)
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpEmail)) {
      toast.error('Please enter a valid email address');
      [span_28](start_span)return;[span_28](end_span)
    }

    const passwordRequirements = validatePassword(signUpPassword);
    if (passwordRequirements.length > 0) {
      toast.error(`Password must include: ${passwordRequirements.join(', ')}`);
      [span_29](start_span)return;[span_29](end_span)
    }

    if (signUpPassword !== signUpConfirmPassword) {
      toast.error('Passwords do not match');
      [span_30](start_span)return;[span_30](end_span)
    }

    if (!agreeToTerms) {
      toast.error('You must agree to the Terms of Service and Privacy Policy');
      [span_31](start_span)return;[span_31](end_span)
    }

    setIsLoading(true);
    try {
      const location = await LocationCacheService.getLocation();
      [span_32](start_span)if (!location.isIndian) {[span_32](end_span)
        toast.error('Signup is only available in India');
        clearSignUpFields();
        return;
      }

      console.log('Attempting sign up for:', signUpEmail);
      [span_33](start_span)const { data, error } = await signUp(signUpEmail.trim().toLowerCase(), signUpPassword, {[span_33](end_span)
        emailRedirectTo: `${window.location.origin}/email-confirmation`,
        fullName: signUpFullName.trim(),
      });
      [span_34](start_span)if (error) {[span_34](end_span)
        console.error('Sign up error:', error);
        [span_35](start_span)if (error.message.includes('User already registered')) {[span_35](end_span)
          toast.error('This email is already registered. Please sign in instead.');
        [span_36](start_span)} else if (error.message.includes('Signup not allowed')) {[span_36](end_span)
          toast.error('New signups are currently disabled. Please contact support.');
        [span_37](start_span)} else if (error.message.includes('Password should be')) {[span_37](end_span)
          toast.error('Password does not meet security requirements. Please choose a stronger password.');
        } else {
          [span_38](start_span)toast.error('Signup failed. Please try again.');[span_38](end_span)
        }
        clearSignUpFields();
        return;
      }

      [span_39](start_span)if (data.user) {[span_39](end_span)
        console.log('Sign up successful for user:', data.user.email);
        [span_40](start_span)if (data.user.identities && data.user.identities.length === 0) {[span_40](end_span)
          toast.error('This email is already registered. Please sign in instead.');
          [span_41](start_span)clearSignUpFields();[span_41](end_span)
          return;
        }

        toast.success('Account created! Please check your email to complete registration.', {
          duration: 8000
        });
        [span_42](start_span)clearSignUpFields();[span_42](end_span)
        onOpenChange(false);
      }

    } catch (err) {
      console.error('Unexpected sign up error:', err);
      [span_43](start_span)toast.error('An unexpected error occurred. Please try again.');[span_43](end_span)
      clearSignUpFields();
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email address');
      [span_44](start_span)return;[span_44](end_span)
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast.error('Please enter a valid email address');
      [span_45](start_span)return;[span_45](end_span)
    }

    setIsLoading(true);
    try {
      console.log('Sending reset email to:', resetEmail);
      [span_46](start_span)const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {[span_46](end_span)
        redirectTo: `${window.location.origin}/reset-password`
      });
      [span_47](start_span)if (error) {[span_47](end_span)
        console.error('Reset password error:', error);
        [span_48](start_span)if (error.message.includes('rate limit')) {[span_48](end_span)
          toast.error('Too many reset attempts. Please wait before trying again.');
        } else {
          [span_49](start_span)toast.error('Failed to send reset email. Please try again.');[span_49](end_span)
        }
        setResetEmail('');
        return;
      }

      toast.success('Password reset email sent! Please check your Email', {
        duration: 8000
      [span_50](start_span)});[span_50](end_span)
      [span_51](start_span)setCurrentView('auth');[span_51](end_span)
      setResetEmail('');

    } catch (err) {
      console.error('Unexpected reset password error:', err);
      [span_52](start_span)toast.error('An unexpected error occurred. Please try again.');[span_52](end_span)
      setResetEmail('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentView === 'forgot-password' && (
              <Button
                variant="ghost"
                [span_53](start_span)size="sm"[span_53](end_span)
                onClick={() => setCurrentView('auth')}
                className="p-1 h-8 w-8"
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
              [span_54](start_span)</Button>[span_54](end_span)
            )}
            <div className="w-8 h-8 bg-white/70 rounded-lg flex items-center justify-center shadow-sm">
              <Mic className="h-5 w-5 text-black" />
            </div>
            Tone2Vibe
          </DialogTitle>
          <DialogDescription>
            {currentView === 'auth'
              ? 'Hello! Access your account or get started.'
              [span_55](start_span): ''}[span_55](end_span)
          </DialogDescription>
        </DialogHeader>

        {!isIndianUser && <IndiaOnlyAlert />}

        {isIndianUser && (
          currentView === 'auth' ?
          (
            <Tabs defaultValue="signin" className="w-full" onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" disabled={isLoading}>Sign In</TabsTrigger>
                <TabsTrigger value="signup" disabled={isLoading}>Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                [span_56](start_span)<div className="space-y-4 pt-4">[span_56](end_span)
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      [span_57](start_span)<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />[span_57](end_span)
                      <Input
                        id="signin-email"
                        type="email"
                        [span_58](start_span)placeholder="Enter your email"[span_58](end_span)
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        onKeyDown={handleSignInKeyDown}
                        [span_59](start_span)className="pl-10"[span_59](end_span)
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      [span_60](start_span)<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />[span_60](end_span)
                      <Input
                        id="signin-password"
                        type={showPassword ? [span_61](start_span)"text" : "password"}[span_61](end_span)
                        placeholder="Enter your password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        [span_62](start_span)onKeyDown={handleSignInKeyDown}[span_62](end_span)
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        [span_63](start_span)disabled={isLoading}[span_63](end_span)
                      >
                        {showPassword ? [span_64](start_span)<EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}[span_64](end_span)
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 h-auto text-sm text-muted-foreground hover:text-foreground"
                      [span_65](start_span)onClick={() => setCurrentView('forgot-password')}[span_65](end_span)
                      disabled={isLoading}
                    >
                      Forgot password?
                    [span_66](start_span)</Button>[span_66](end_span)
                  </div>

                  <Button
                    onClick={handleSignIn}
                    className="w-full"
                    disabled={isLoading}
                  > [span_67](start_span)
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </div>
                {/* Google Login */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 mb-2 mt-2"
                  onClick={() => {
                    setIsLoading(true);[span_67](end_span)
                    [span_68](start_span)signInWithGoogle();[span_68](end_span)
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? [span_69](start_span)(
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FcGoogle className="h-4 w-4" />
                  )}
                  {isLoading ? 'Signing in...' : 'Continue with Google'}[span_69](end_span)
                </Button>
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    [span_70](start_span)<Label htmlFor="signup-name">Full Name</Label>[span_70](end_span)
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        [span_71](start_span)id="signup-name"[span_71](end_span)
                        type="text"
                        placeholder="Enter your full name"
                        value={signUpFullName}
                        [span_72](start_span)onChange={(e) => setSignUpFullName(e.target.value)}[span_72](end_span)
                        onKeyDown={handleSignUpKeyDown}
                        className="pl-10"
                        disabled={isLoading}
                        [span_73](start_span)autoComplete="name"[span_73](end_span)
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    [span_74](start_span)<Label htmlFor="signup-email">Email</Label>[span_74](end_span)
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        [span_75](start_span)id="signup-email"[span_75](end_span)
                        type="email"
                        placeholder="Enter your email"
                        value={signUpEmail}
                        [span_76](start_span)onChange={(e) => setSignUpEmail(e.target.value)}[span_76](end_span)
                        onKeyDown={handleSignUpKeyDown}
                        className="pl-10"
                        disabled={isLoading}
                        [span_77](start_span)autoComplete="email"[span_77](end_span)
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    [span_78](start_span)<Label htmlFor="signup-password">Password</Label>[span_78](end_span)
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? [span_79](start_span)"text" : "password"}[span_79](end_span)
                        placeholder="Create a strong password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        [span_80](start_span)onKeyDown={handleSignUpKeyDown}[span_80](end_span)
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        [span_81](start_span)onClick={() => setShowPassword(!showPassword)}[span_81](end_span)
                        [span_82](start_span)disabled={isLoading}[span_82](end_span)
                      >
                        {showPassword ? [span_83](start_span)<EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}[span_83](end_span)
                      </button>
                    </div>
                    {signUpPassword && validatePassword(signUpPassword).length > 0 && (
                      [span_84](start_span)<p className="text-xs text-destructive">[span_84](end_span)
                        Required: {validatePassword(signUpPassword).join(', ')}
                      </p>
                    )}
                  </div>

                  [span_85](start_span)<div className="space-y-2">[span_85](end_span)
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <div className="relative">
                      <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        [span_86](start_span)id="signup-confirm"[span_86](end_span)
                        type={showConfirmPassword ? [span_87](start_span)"text" : "password"}[span_87](end_span)
                        placeholder="Confirm your password"
                        value={signUpConfirmPassword}
                        onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                        [span_88](start_span)onKeyDown={handleSignUpKeyDown}[span_88](end_span)
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        [span_89](start_span)onClick={() => setShowConfirmPassword(!showConfirmPassword)}[span_89](end_span)
                        [span_90](start_span)disabled={isLoading}[span_90](end_span)
                      >
                        {showConfirmPassword ? [span_91](start_span)<EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}[span_91](end_span)
                      </button>
                    </div>
                    {signUpConfirmPassword && signUpPassword !== signUpConfirmPassword && (
                      [span_92](start_span)<p className="text-xs text-destructive">Passwords do not match</p>[span_92](end_span)
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={agreeToTerms}
                      onCheckedChange={(checked) => setAgreeToTerms(!!checked)}
                      disabled={isLoading}
                    [span_93](start_span)/>[span_93](end_span)
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" className="text-primary underline">
                        [span_94](start_span)Terms[span_94](end_span)
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" target="_blank" className="text-primary underline">
                        [span_95](start_span)Privacy Policy[span_95](end_span)
                      </a>
                    </Label>
                  </div>

                  <Button
                    [span_96](start_span)onClick={handleSignUp}[span_96](end_span)
                    className="w-full"
                    disabled={isLoading || [span_97](start_span)!agreeToTerms}[span_97](end_span)
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                [span_98](start_span)</div>[span_98](end_span)
                 {/* Google Login */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 mb-2 mt-2"
                  onClick={() => {
                    [span_99](start_span)setIsLoading(true);[span_99](end_span)
                    [span_100](start_span)signInWithGoogle();[span_100](end_span)
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? [span_101](start_span)(
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FcGoogle className="h-4 w-4" />
                  )}
                  {isLoading ? 'Signing in...' : 'Continue with Google'}[span_101](end_span)
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                [span_102](start_span)<Label htmlFor="reset-email ">Email Address</Label>[span_102](end_span)
                <div className="relative py-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    [span_103](start_span)type="email"[span_103](end_span)
                    placeholder="Enter your email address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onKeyDown={handleForgotPasswordKeyDown}
                    [span_104](start_span)className="pl-10"[span_104](end_span)
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                <p className="text-sm text-gray-500 ">
                  [span_105](start_span)Enter your email to receive a password reset link.[span_105](end_span)
                </p>

              </div>

              <Button
                onClick={handleForgotPassword}
                className="w-full"
                disabled={isLoading}
              >
                [span_106](start_span){isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}[span_106](end_span)
                Send Reset Link
              </Button>

            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
                    }
