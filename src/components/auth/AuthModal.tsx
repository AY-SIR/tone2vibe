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
import { Loader2, Mail, Lock, User, Eye, EyeOff, Mic, CheckCircle, LogIn, UserPlus } from "lucide-react";
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

  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setAgreeToTerms(false);
      setIsClosing(false);
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
        const redirectUrl = `${window.location.origin}/email-confirmation`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: fullName.trim(), display_name: fullName.trim() }
          }
        });
        if (error) throw error;
        if (data.user) {
          const location = await LocationCacheService.getLocation();
          await LocationCacheService.saveUserLocation(data.user.id, location);
        }
        toast.success('Account created successfully!');
        setTimeout(() => {
          navigate("/tool", { replace: true });
          setIsClosing(true);
          setTimeout(() => onOpenChange(false), 300);
        }, 2000);
      } else { // Signin
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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
        toast.error('Please confirm your email address to continue.');
      } else if (authError.message.includes('Invalid login credentials')) {
        toast.error('Invalid credentials. Please try again.');
      } else {
        toast.error('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[425px] max-h-[90vh] overflow-auto transition-all duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/70 rounded-lg flex items-center justify-center shadow-sm">
              <Mic className="h-5 w-5 text-black" />
            </div>
            Tone2Vibe
          </DialogTitle>
          <DialogDescription>
            Sign in to your account or create a new one
          </DialogDescription>
        </DialogHeader>

        {!isIndianUser && <IndiaOnlyAlert />}

        {isIndianUser ? (
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
                    <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 " disabled={isLoading} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 " disabled={isLoading} />
                    <button type="button" className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
                    <Input id="fullName" type="text" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" disabled={isLoading} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={isLoading} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" disabled={isLoading} />
                    <button type="button" className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <CheckCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-10" disabled={isLoading} />
                    <button type="button" className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="agreeToTerms" checked={agreeToTerms} onCheckedChange={(checked) => setAgreeToTerms(!!checked)} disabled={isLoading} />
                  <Label htmlFor="agreeToTerms">
                    I agree to the <a href="/terms" className="text-gray-500 underline">Terms of Service</a> and <a href="/privacy" className="text-gray-500 underline">Privacy Policy</a>.
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || !agreeToTerms}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up <UserPlus className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}