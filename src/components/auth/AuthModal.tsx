// src/components/auth/AuthModal.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

  useEffect(() => {
    const shouldOpen = searchParams.get('auth') === 'open';
    const view = searchParams.get('view');
    if (shouldOpen) {
      onOpenChange(true);
      if (view === 'forgot-password') {
        setCurrentView('forgot-password');
      }
      searchParams.delete('auth');
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, onOpenChange, setSearchParams]);

  useEffect(() => {
    if (open) {
      if (currentView !== 'forgot-password') {
        setCurrentView('auth');
      }
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setResetEmail('');
      setAgreeToTerms(false);
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

  const handleSubmit = async (type: 'signin' | 'signup') => {
    if (!email || !password) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (type === 'signup') {
      if (!fullName.trim()) {
        toast.error('Please enter your full name.');
        return;
      }
      const passwordRequirements = validatePassword(password);
      if (passwordRequirements.length > 0) {
        toast.error(`Password must include: ${passwordRequirements.join(', ')}.`);
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }
      if (!agreeToTerms) {
        toast.error('You must agree to the Terms of Service and Privacy Policy.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (type === 'signup') {
        const location = await LocationCacheService.getLocation();
        if (!location.isIndian) {
          toast.error('Signup failed: Service is only available in India.');
          setIsLoading(false);
          return;
        }

        // Call signUp directly
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/email-confirmation`,
            data: { full_name: fullName.trim() }
          }
        });

        if (error) {
          const authError = error as AuthError;
          // Handle existing user error properly
          if (authError.message.toLowerCase().includes('user already registered') || 
              authError.message.toLowerCase().includes('already been registered')) {
            toast.error('An account with this email already exists. Please sign in instead.', {
              duration: 5000
            });
          } else if (authError.message.toLowerCase().includes('weak password')) {
            toast.error('Password is too weak. Please choose a stronger one.');
          } else {
            toast.error(`Signup failed: ${authError.message}`);
          }
          setIsLoading(false);
          return;
        }

        // Check if user was created or already exists
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          // User already exists but not confirmed
          toast.error('An account with this email already exists. Please sign in or check your email for a confirmation link.', {
            duration: 6000
          });
        } else if (data.user) {
          // New user created successfully
          toast.success('Account created! Please check your email to complete registration.', { 
            duration: 8000 
          });
          onOpenChange(false);
        }

      } else { // Signin
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('invalid login credentials')) {
            toast.error('Invalid email or password. Please check your credentials.');
          } else if (errorMessage.includes('email not confirmed')) {
            toast.error('Please confirm your email address first. Check your inbox for the confirmation link.');
          } else {
            toast.error(`Sign in failed: ${error.message}`);
          }
          setIsLoading(false);
          return;
        }

        toast.success('Welcome back!');
        navigate("/tool", { replace: true });
        onOpenChange(false);
      }
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    } finally {
      if (type === 'signin') {
        setIsLoading(false);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('user not found')) {
          toast.error('No account found with this email address.');
        } else if (errorMessage.includes('rate limit')) {
          toast.error('Too many attempts. Please wait a moment before trying again.');
        } else {
          toast.error(`Failed to send reset email: ${error.message}`);
        }
      } else {
        toast.success('Password reset email sent! Please check your inbox and spam folder.', { 
          duration: 8000 
        });
        setCurrentView('auth');
        setResetEmail('');
      }
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentView === 'forgot-password' && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('auth')} className="p-1 h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="w-8 h-8 bg-white/70 rounded-lg flex items-center justify-center shadow-sm">
              <Mic className="h-5 w-5 text-black" />
            </div>
            Tone2Vibe
          </DialogTitle>
          <DialogDescription>
            {currentView === 'auth' ? 'Hello! Access your account or get started.' : 'Enter your email to get a reset link.'}
          </DialogDescription>
        </DialogHeader>

        {!isIndianUser && <IndiaOnlyAlert />}

        {isIndianUser && (currentView === 'auth' ? (
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('signin'); }} className="space-y-4 pt-4">
                 <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={isLoading} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" disabled={isLoading} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="link" className="px-0 h-auto text-sm text-muted-foreground hover:text-foreground" onClick={() => setCurrentView('forgot-password')}>
                      Forgot password?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('signup'); }} className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="fullName" type="text" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" disabled={isLoading} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={isLoading} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" disabled={isLoading} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {password && validatePassword(password).length > 0 && (
                      <p className="text-xs text-destructive">Required: {validatePassword(password).join(', ')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-10" disabled={isLoading} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="agreeToTerms" checked={agreeToTerms} onCheckedChange={(checked) => setAgreeToTerms(!!checked)} disabled={isLoading} />
                    <Label htmlFor="agreeToTerms" className="text-sm">I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">Terms</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Privacy Policy</a>.</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || !agreeToTerms}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="reset-email" type="email" placeholder="Enter your email address" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="pl-10" disabled={isLoading} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </form>
        ))}
      </DialogContent>
    </Dialog>
  );
}
