import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Github, Mail, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Mic } from "lucide-react";


interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot'>('login');

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const signupNameRef = useRef<HTMLInputElement>(null);
  const forgotEmailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (activeTab === 'login') loginEmailRef.current?.focus();
      if (activeTab === 'signup') signupNameRef.current?.focus();
      if (activeTab === 'forgot') forgotEmailRef.current?.focus();
    }
  }, [open, activeTab]);

  const resetState = () => {
    setConfirmationSent(false);
    setResetEmailSent(false);
    setLoginEmail('');
    setLoginPassword('');
    setSignupName('');
    setSignupEmail('');
    setSignupPassword('');
    setConfirmPassword('');
    setForgotEmail('');
    setAcceptedTerms(false);
    setActiveTab('login');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    if (!/\S+@\S+\.\S+/.test(loginEmail)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email.", variant: "destructive" });
      return;
    }

    setLoginLoading(true);
    try {
      // Check if email is banned first
      const { data: bannedEmail } = await supabase
        .from('banned_emails')
        .select('email')
        .eq('email', loginEmail)
        .single();

      if (bannedEmail) {
        toast({
          title: "Account Restricted",
          description: "This email is permanently restricted. The associated account was previously deleted.",
          variant: "destructive",
        });
        setLoginLoading(false);
        return;
      }

      const { error } = await signIn(loginEmail, loginPassword);
      if (error) throw error;

      onSuccess?.();
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      // Show user-friendly error messages
      let errorMessage = "Please check your credentials and try again.";
      
      if (error.message.includes('verify your email')) {
        errorMessage = "Please check your email and verify your account before signing in.";
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Please verify your email address. Check your inbox for a confirmation email.";
      }
      
      toast({
        title: "Sign In Required",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword || !confirmPassword) return;

    if (!acceptedTerms) {
      toast({
        title: "Terms and Privacy",
        description: "Please accept the Terms and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(signupEmail)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email.", variant: "destructive" });
      return;
    }

    if (signupPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setSignupLoading(true);
    try {
      // Check if email is banned first
      const { data: bannedEmail } = await supabase
        .from('banned_emails')
        .select('email')
        .eq('email', signupEmail)
        .single();

      if (bannedEmail) {
        toast({
          title: "Email Restricted",
          description: "This email cannot be used for signup. This account was previously deleted and is permanently restricted.",
          variant: "destructive",
        });
        setSignupLoading(false);
        return;
      }

      const { data, error } = await signUp(signupEmail, signupPassword);
      if (error) {
        if (error.message.includes('banned_email')) {
          toast({
            title: "Email Restricted",
            description: "This email cannot be used for signup. This account was previously deleted and is permanently restricted.",
            variant: "destructive",
          });
          setSignupLoading(false);
          return;
        }
        throw error;
      }

      setConfirmationSent(true);
    } catch (error: any) {
      console.log('Signup error details:', error);
      
      // Show user-friendly error messages
      let errorMessage = "Unable to create account. Please try again.";
      
      if (error.message.includes('already registered') || 
          error.message.includes('already exists') || 
          error.message.includes('User already registered') ||
          error.message.includes('already been registered') ||
          error.message.includes('duplicate') ||
          error.message.includes('signup_disabled') ||
          error.status === 422) {
        errorMessage = "This email is already registered. Please sign in instead or use a different email.";
        // Reset signup form
        setSignupName('');
        setSignupEmail('');
        setSignupPassword('');
        setConfirmPassword('');
        setAcceptedTerms(false);
        // Switch to login tab and pre-fill email
        setTimeout(() => {
          setActiveTab('login');
          setLoginEmail(signupEmail);
        }, 100);
      } else if (error.message.includes('password')) {
        errorMessage = "Password must be at least 6 characters long.";
      } else if (error.message.includes('email') || error.message.includes('invalid')) {
        errorMessage = "Please enter a valid email address.";
      } else if (error.message.includes('rate limit')) {
        errorMessage = "Too many attempts. Please wait a moment before trying again.";
      }
      
      toast({
        title: "Account Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSignupLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email.", variant: "destructive" });
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin + '/reset-password'
      });
      if (error) throw error;

      setResetEmailSent(true);
    } catch (error: any) {
      toast({
        title: "Reset Password",
        description: "Unable to send reset email. Please check your email address and try again.",
        variant: "destructive",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetState();
    }}>
      <DialogContent className="sm:max-w-md font-modern animate-fade-in data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out transition-all duration-300">
        <DialogHeader>
  <DialogTitle className="flex items-center justify-center text-black">
    <div className="flex items-center justify-center w-8 h-8 bg-white/70 rounded-lg">
      <Mic className="h-5 w-5 text-black" />
    </div>
    <span className="ml-2">Tone2Vibe</span>
  </DialogTitle>
</DialogHeader>



        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "signup" | "forgot")} className="w-full">
          {/* Only Login and Sign Up triggers */}
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="text-black">Login</TabsTrigger>
            <TabsTrigger value="signup" className="text-black">Sign Up</TabsTrigger>
          </TabsList>

          {/* LOGIN TAB */}
          <TabsContent key="login" value="login" className="space-y-4 mt-6 data-[state=inactive]:hidden">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginEmail" className="text-black">Email</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="border-gray-300 focus:border-black"
                  required
                  ref={loginEmailRef}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginPassword" className="text-black">Password</Label>
                <div className="relative">
                  <Input
                    id="loginPassword"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="border-gray-300 focus:border-black pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-gray-600 hover:text-black p-0"
                  onClick={() => setActiveTab('forgot')}
                >
                  Forgot password?
                </Button>
              </div>
              <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white" disabled={loginLoading}>
                {loginLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
              </Button>
            </form>

            {/* SOCIAL BUTTONS */}
            <div className="relative mt-4">
              <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div title="Coming Soon">
                <Button variant="outline" className="border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed opacity-50 w-full" disabled>
                  <Mail className="mr-2 h-4 w-4" /> Google
                </Button>
              </div>
              <div title="Coming Soon">
                <Button variant="outline" className="border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed opacity-50 w-full" disabled>
                  <Github className="mr-2 h-4 w-4" /> GitHub
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* SIGNUP TAB */}
          <TabsContent key="signup" value="signup" className="space-y-4 mt-6 data-[state=inactive]:hidden">
            {confirmationSent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <div>
                  <h3 className="font-semibold text-black">Check your email</h3>
                  <p className="text-gray-600 mt-2">We've sent a confirmation link to <strong>{signupEmail}</strong></p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signupName" className="text-black">Full Name</Label>
                  <Input
                    id="signupName"
                    type="text"
                    placeholder="Enter your full name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="border-gray-300 focus:border-black"
                    required
                    ref={signupNameRef}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupEmail" className="text-black">Email</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="Enter your email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="border-gray-300 focus:border-black"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPassword" className="text-black">Password</Label>
                  <div className="relative">
                    <Input
                      id="signupPassword"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="border-gray-300 focus:border-black pr-10"
                      required
                      minLength={6}
                    />
                    <Button type="button" variant="ghost" size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}>
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-black">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-gray-300 focus:border-black pr-10"
                      required
                      minLength={6}
                    />
                    <Button type="button" variant="ghost" size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {/* Privacy Policy and Terms Checkbox */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="terms"
                      className="text-sm text-gray-600 leading-normal cursor-pointer"
                    >
                      I agree to the{' '}
                      <a
  href="/terms"
  target="_blank"
  rel="noopener noreferrer"
  className="text-black hover:underline font-medium"
>
  Terms of Service
</a>{' '}
and{' '}
<a
  href="/privacy"
  target="_blank"
  rel="noopener noreferrer"
  className="text-black hover:underline font-medium"
>
  Privacy Policy
</a>

                    </label>
                  </div>
                </div>
                
                <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white" disabled={signupLoading || !acceptedTerms}>
                  {signupLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : "Create Account"}
                </Button>
              </form>
            )}
          </TabsContent>

          {/* FORGOT PASSWORD TAB (No Trigger) */}
          <TabsContent key="forgot" value="forgot" className="space-y-4 mt-6 data-[state=inactive]:hidden">
            {resetEmailSent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <div>
                  <h3 className="font-semibold text-black">Check your email</h3>
                  <p className="text-gray-600 mt-2">We've sent a password reset link to <strong>{forgotEmail}</strong></p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResetEmailSent(false);
                    setForgotEmail('');
                    setActiveTab('login');
                  }}
                  className="border-gray-300 hover:bg-gray-100 text-black w-full"
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgotEmail" className="text-black">Email</Label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="border-gray-300 focus:border-black"
                    required
                    ref={forgotEmailRef}
                  />
                </div>
                <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white" disabled={forgotLoading}>
                  {forgotLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending reset link...</> : "Send Reset Link"}
                </Button>
                <div className="text-center">
                  <Button variant="link" onClick={() => setActiveTab('login')} className="text-gray-600 hover:text-black">Back to Login</Button>
                </div>
              </form>
            )}
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
