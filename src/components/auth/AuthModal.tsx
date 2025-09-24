import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Eye, EyeOff, Mic, CheckCircle, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { AuthError } from '@supabase/supabase-js';
import { IndiaOnlyAlert } from "@/components/common/IndiaOnlyAlert";
import { LocationCacheService } from "@/services/locationCache";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isIndianUser, setIsIndianUser] = useState<boolean>(true);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [currentView, setCurrentView] = useState<'auth' | 'forgot-password'>('auth');
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setResetEmail('');
      setAgreeToTerms(false);
      setIsClosing(false);
      setCurrentView('auth');
      LocationCacheService.getLocation().then(location => {
        setIsIndianUser(location.isIndian);
      });
    }
  }, [open]);

  const handleSubmit = async (type: 'signin' | 'signup') => {
    if (!email || !password) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (type === 'signup') {
      if (!fullName.trim()) {
        toast.error('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        return;
      }
      if (!agreeToTerms) {
        toast.error('You must agree to the Terms of Service and Privacy Policy.');
        return;
      }
    }

    setIsLoading(true);

    if (type === 'signup') {
      const location = await LocationCacheService.getLocation();
      if (!location.isIndian) {
        toast.error(`Signup failed: Service is only available in India. Your location: ${location.country || 'Unknown'}`);
        setIsLoading(false);
        return;
      }
    }

    try {
      if (type === 'signup') {
        const redirectUrl = `${window.location.origin}/email-confirmed`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: fullName.trim(), display_name: fullName.trim() }
          }
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('This email is already registered. Please sign in to your existing account instead.');
            setIsLoading(false);
            return;
          }
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            toast.error('This email is already registered. Please sign in to your existing account instead.');
            setIsLoading(false);
            return;
          }
          throw error;
        }

        if (data.user && !data.user.email_confirmed_at) {
          toast.success('Account created successfully! Please check your email and click the confirmation link to activate your account.', {
            duration: 5000,
          });
          onOpenChange(false);
        } else if (data.user && data.user.email_confirmed_at) {
          const location = await LocationCacheService.getLocation();
          await LocationCacheService.saveUserLocation(data.user.id, location);
          toast.success('Account created and confirmed successfully!');
          navigate("/tool", { replace: true });
          onOpenChange(false);
        }
      } else { // Signin
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password. Please check your credentials and try again.');
          } else if (error.message.includes('Email not confirmed')) {
            toast.error('Please confirm your email address first. Check your inbox for the confirmation email and click the link.');
          } else {
            toast.error('Sign in failed. Please try again.');
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          const location = await LocationCacheService.getLocation();
          await LocationCacheService.saveUserLocation(data.user.id, location);
        }
        toast.success('Welcome back!');
        navigate("/tool", { replace: true });
        onOpenChange(false);
      }
    } catch (error) {
      const authError = error as AuthError;
      if (authError.message.includes('Email not confirmed')) {
        toast.error('Please confirm your email address first. Check your inbox for the confirmation email and click the link.');
      } else if (authError.message.includes('Invalid login credentials')) {
        toast.error('Invalid credentials. Please try again.');
      } else if (authError.message.includes('User already registered')) {
        toast.error('This email is already registered. Please sign in to your existing account instead.');
      } else if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        toast.error('This email is already registered. Please sign in to your existing account instead.');
      } else {
        toast.error('Authentication failed. Please try again.');
        console.error('Auth error:', authError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          toast.error('Too many reset attempts. Please wait a few minutes before trying again.');
        } else if (error.message.includes('not found')) {
          toast.error('No account found with this email address. Please check your email or sign up for a new account.');
        } else {
          toast.error('Failed to send reset email. Please try again.');
        }
        console.error('Reset password error:', error);
      } else {
        toast.success('Password reset email sent! Check your inbox and spam folder for the reset link.');
        setCurrentView('auth');
        setResetEmail('');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      console.error('Reset password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="z-[9999]">
      <DialogContent
        className={`sm:max-w-[425px] max-h-[90vh] overflow-auto transition-all duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
          isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentView === 'forgot-password' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('auth')}
                className="p-1 h-8 w-8"
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
              ? 'Sign in to your account or create a new one'
              : 'Reset your password'
            }
          </DialogDescription>
        </DialogHeader>

        {!isIndianUser && <IndiaOnlyAlert />}

        {isIndianUser ? (
          currentView === 'auth' ? (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Sign In Form */}
              <TabsContent value="signin">
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('signin'); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
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
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In <LogIn className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Form */}
              <TabsContent value="signup">
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('signup'); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <CheckCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                      id="agreeToTerms"
                      checked={agreeToTerms}
                      onCheckedChange={(checked) => setAgreeToTerms(!!checked)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="agreeToTerms" className="text-sm">
                      I agree to the <a href="/terms" className="text-primary underline">Terms of Service</a> and <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || !agreeToTerms}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up <UserPlus className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            // Forgot Password Form
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  We'll send you a link to reset your password.
                </p>
              </div>
              <Button onClick={handleForgotPassword} className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Email
              </Button>
            </div>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
