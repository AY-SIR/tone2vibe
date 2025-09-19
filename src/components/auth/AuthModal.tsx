
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Eye, EyeOff, MapPin } from "lucide-react";
import { AuthError } from '@supabase/supabase-js';
import { IndiaOnlyAlert } from "@/components/common/IndiaOnlyAlert";
import { IndiaOnlyService } from "@/services/indiaOnlyService";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isIndianUser, setIsIndianUser] = useState<boolean | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(true);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setFullName('');
      setAgreeToTerms(false);
      setIsClosing(false);

      const checkIndianAccess = async () => {
        try {
          const access = await IndiaOnlyService.checkIndianAccess();
          setIsIndianUser(access.isAllowed);
          if (!access.isAllowed) {
            toast.error(access.message, { duration: 5000 });
          }
        } catch (error) {
          setIsIndianUser(false);
          toast.error('This service is only available in India.');
        } finally {
          setCheckingLocation(false);
        }
      };

      checkIndianAccess();
    }
  }, [open]);

  const handleSubmit = async (type: 'signin' | 'signup') => {
    if (isIndianUser === false) {
      toast.error('This service is only available in India.');
      return;
    }

    if (!email || !password) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (type === 'signup') {
      if (!fullName) {
        toast.error('Please enter your full name.');
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
        const redirectUrl = `${window.location.origin}/email-confirmation`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: fullName }
          }
        });

        if (error) throw error;

        toast.success('Please check your email to confirm your account.');

        setTimeout(() => {
          setIsClosing(true);
          setTimeout(() => {
            onOpenChange(false);
          }, 300);
        }, 3000);

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        toast.success('Successfully signed in!');
        onOpenChange(false);
      }
    } catch (error) {
      const authError = error as AuthError;
      if (authError.message.includes('Email not confirmed')) {
        toast.error('Please check your email and confirm your account before signing in.');
      } else if (authError.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please check your credentials.');
      } else {
        toast.error(authError.message || 'An error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[425px] transition-all duration-300 ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            Welcome
          </DialogTitle>
          <DialogDescription>
            Sign in to your account or create a new one (India Only)
          </DialogDescription>
        </DialogHeader>

        {!checkingLocation && isIndianUser === false && <IndiaOnlyAlert />}

        {checkingLocation ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Verifying location...</span>
          </div>
        ) : isIndianUser ? (
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Sign In */}
            <TabsContent value="signin" className="space-y-4">
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

              <Button onClick={() => handleSubmit('signin')} className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup" className="space-y-4">
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

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="agreeToTerms" 
                  checked={agreeToTerms} 
                  onCheckedChange={(checked) => setAgreeToTerms(!!checked)} 
                  disabled={isLoading}
                />
                <Label htmlFor="agreeToTerms">
                  I agree to the <a href="/terms" className="text-blue-500 underline">Terms of Service</a> and <a href="/privacy" className="text-blue-500 underline">Privacy Policy</a>.
                </Label>
              </div>

              <Button onClick={() => handleSubmit('signup')} className="w-full" disabled={isLoading || !agreeToTerms}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              This service is only available in India.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
