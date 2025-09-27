// src/pages/ResetPassword.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Chrome as Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [resetComplete, setResetComplete] = useState(false);

  useEffect(() => {
    const verifyResetToken = async () => {
      try {
        console.log('Starting reset password verification...');
        
        // Get tokens from URL hash or search params
        const currentUrl = window.location.href;
        const url = new URL(currentUrl);
        
        let accessToken = '';
        let refreshToken = '';
        let type = '';
        
        // Check URL hash first (most common for Supabase)
        if (url.hash) {
          const hashParams = new URLSearchParams(url.hash.substring(1));
          accessToken = hashParams.get('access_token') || '';
          refreshToken = hashParams.get('refresh_token') || '';
          type = hashParams.get('type') || '';
        }
        
        // If not found, check query params
        if (!accessToken && url.search) {
          accessToken = url.searchParams.get('access_token') || '';
          refreshToken = url.searchParams.get('refresh_token') || '';
          type = url.searchParams.get('type') || '';
        }

        console.log('URL Parameters:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type: type
        });

        // Check if we have the required parameters
        if (!accessToken || !refreshToken || type !== 'recovery') {
          console.error('Missing or invalid reset parameters');
          toast.error('Invalid or expired reset link. Please request a new password reset.');
          setIsTokenValid(false);
          setIsVerifying(false);
          return;
        }

        // Clean URL immediately to prevent issues
        window.history.replaceState({}, document.title, window.location.pathname);

        console.log('Setting session with reset tokens...');

        // Set the session with the tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (sessionError || !sessionData.session) {
          console.error('Failed to set reset session:', sessionError);
          
          if (sessionError?.message?.includes('expired')) {
            toast.error('Reset link has expired. Please request a new one.');
          } else if (sessionError?.message?.includes('invalid')) {
            toast.error('Reset link is invalid. Please request a new one.');
          } else {
            toast.error('Unable to verify reset link. Please try again.');
          }
          
          setIsTokenValid(false);
          setIsVerifying(false);
          return;
        }

        console.log('Reset session verified successfully');
        toast.success('Reset link verified! Please set your new password.');
        setIsTokenValid(true);
        setIsVerifying(false);

      } catch (error) {
        console.error('Unexpected error during verification:', error);
        toast.error('Failed to process reset link. Please try again.');
        setIsTokenValid(false);
        setIsVerifying(false);
      }
    };

    verifyResetToken();
  }, []);

  const validatePassword = (pwd: string) => {
    const errors = [];
    if (pwd.length < 8) errors.push('at least 8 characters');
    if (!/[a-z]/.test(pwd)) errors.push('one lowercase letter');
    if (!/[A-Z]/.test(pwd)) errors.push('one uppercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('one number');
    return errors;
  };

  const passwordRequirements = validatePassword(password);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast.error('Please enter a new password');
      return;
    }

    const validationErrors = validatePassword(password);
    if (validationErrors.length > 0) {
      toast.error(`Password must include: ${validationErrors.join(', ')}`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Updating password...');

      // Update password using current session
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Password update failed:', updateError);
        
        if (updateError.message.includes('same_password')) {
          toast.error('New password must be different from your current password');
        } else {
          toast.error('Failed to update password. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      console.log('Password updated successfully');
      
      setResetComplete(true);
      toast.success('Password updated successfully! Please sign in with your new password.');

    } catch (error) {
      console.error('Unexpected error during password update:', error);
      toast.error('Something went wrong. Please try again.');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHome = async () => {
    await supabase.auth.signOut(); // Ensure we're signed out
    navigate('/', { replace: true });
  };

  const handleSignIn = async () => {
    await supabase.auth.signOut(); // Ensure we're signed out
    navigate('/?auth=open', { replace: true });
  };

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8 space-y-4">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Verifying Reset Link</h1>
            <p className="text-muted-foreground">Please wait while we verify your password reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <CardTitle className="text-2xl">Password Reset Complete!</CardTitle>
            <CardDescription>
              Your password has been successfully updated. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleSignIn} className="w-full">
              Sign In Now
            </Button>
            <Button variant="ghost" onClick={handleGoHome} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is expired, invalid, or has already been used.
              Password reset links are only valid for 1 hour.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGoHome} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>
            Enter and confirm your new strong password below.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  disabled={isLoading}
                  required
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
              {password && passwordRequirements.length > 0 && (
                <p className="text-xs text-destructive">
                  Missing: {passwordRequirements.join(', ')}
                </p>
              )}
              {password && passwordRequirements.length === 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Password meets all requirements
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  disabled={isLoading}
                  required
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
              {confirmPassword && password === confirmPassword && password && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                isLoading ||
                !password ||
                !confirmPassword ||
                password !== confirmPassword ||
                passwordRequirements.length > 0
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={handleGoHome}
              className="text-sm text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              <Home className="mr-2 h-3 w-3" />
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}