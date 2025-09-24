import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    verifyResetToken();
  }, [searchParams]);

  const verifyResetToken = async () => {
    try {
      setIsVerifying(true);
      
      // Get tokens from URL hash or search params
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hashParams.get('access_token') || searchParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      const type = hashParams.get('type') || searchParams.get('type');
      const error_code = hashParams.get('error_code') || searchParams.get('error_code');
      const error_description = hashParams.get('error_description') || searchParams.get('error_description');

      console.log('Reset password params:', { 
        type, 
        hasAccessToken: !!access_token, 
        hasRefreshToken: !!refresh_token,
        errorCode: error_code 
      });

      // Check for errors
      if (error_code) {
        console.error('Password reset error:', error_code, error_description);
        setIsValid(false);
        toast({
          title: "Reset Link Error",
          description: error_description || "This reset link has expired. Please request a new one.",
          variant: "destructive"
        });
        return;
      }

      // Verify this is a password recovery request
      if ((type === 'recovery' || type === 'password_recovery') && access_token && refresh_token) {
        // Set the session for password reset
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token
        });

        if (error) {
          console.error('Error setting session for password reset:', error);
          setIsValid(false);
          toast({
            title: "Invalid Reset Link",
            description: "Your password has been updated successfully. You can now sign in with your new password.",
            variant: "destructive"
          });
        } else if (data.session) {
  console.log('Password reset session established successfully');
  setIsValid(true);
  // Show a toast to confirm verification is complete
  toast({
    title: "Reset Link Verified",
    description: "You can now set your new password below.",
  });
  // Do NOT navigate away. The user needs to see the form.
}
      } else {
        setIsValid(false);
        toast({
          title: "Invalid Reset Link",
          description: "Failed to update password. Please try again or request a new reset link.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setIsValid(false);
      toast({
        title: "Verification Failed",
        description: "Unable to verify reset link. Please request a new password reset email.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in both password fields.",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password reset error:', error);
        
        if (error.message.includes('session_not_found')) {
          toast({
            title: "Session Expired",
            description: "Your reset session has expired. Please request a new password reset link.",
            variant: "destructive"
          });
        } else if (error.message.includes('weak_password')) {
          toast({
            title: "Weak Password",
            description: "Please choose a stronger password with at least 6 characters.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Reset Failed",
            description: "Failed to reset password. Please try again or request a new reset link.",
            variant: "destructive"
          });
        }
      } else if (data.user) {
        console.log('Password reset successful');
        toast({
          title: "Password Reset Successful!",
          description: "Your password has been updated. You can now sign in with your new password.",
        });
        
        // Sign out to ensure clean state
        await supabase.auth.signOut();
        
        // Redirect to home page after success
        setTimeout(() => {
          navigate('/?auth=open', { replace: true });
        }, 2000);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: "Unexpected Error",
        description: "Something went wrong. Please try again or request a new reset link.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const requestNewResetLink = async () => {
    const email = prompt('Enter your email address to get a new password reset link:');
    if (!email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Request Failed",
          description: error.message.includes('rate limit') 
            ? "Too many requests. Please wait a few minutes before trying again."
            : "Failed to send reset email. Please check your email address and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Reset Email Sent",
          description: "A new password reset email has been sent. Check your inbox and spam folder.",
        });
      }
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Unable to send reset email. Please check your internet connection and try again.",
        variant: "destructive"
      });
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <div className="space-y-3">
              <h1 className="text-2xl font-bold">Verifying Reset Link</h1>
              <p className="text-muted-foreground">
                Please wait while we verify your password reset link...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div className="space-y-3">
              <h1 className="text-2xl font-bold">Invalid Reset Link</h1>
              <p className="text-muted-foreground">
                This password reset link is invalid or has expired.
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={requestNewResetLink} className="w-full">
                Request New Reset Link
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <p className="text-muted-foreground">
            Enter your new password below
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && password.length < 6 && (
                <p className="text-xs text-destructive">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <div className="relative">
                <CheckCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                  required
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Button 
              variant="link" 
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground"
            >
              Back to Sign In
            </Button>
            
            <div className="text-xs text-muted-foreground">
              <p>Having trouble? <button onClick={requestNewResetLink} className="text-primary underline">Request a new reset link</button></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}