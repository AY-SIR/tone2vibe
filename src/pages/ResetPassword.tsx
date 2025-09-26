// src/pages/ResetPassword.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [passwordRequirements, setPasswordRequirements] = useState<string[]>([]);
  const [resetSuccess, setResetSuccess] = useState(false);

  const validatePassword = (pwd: string) => {
    const requirements = [];
    if (pwd.length < 8) requirements.push('at least 8 characters');
    if (!/[a-z]/.test(pwd)) requirements.push('one lowercase letter');
    if (!/[A-Z]/.test(pwd)) requirements.push('one uppercase letter');
    if (!/[0-9]/.test(pwd)) requirements.push('one number');
    setPasswordRequirements(requirements);
    return requirements.length === 0;
  };

  const verifyResetToken = useCallback(async () => {
    setIsVerifying(true);

    try {
      // Get the full URL including hash parameters
      const fullUrl = window.location.href;
      const url = new URL(fullUrl);

      // Try to get tokens from hash first (Supabase default)
      const hashParams = new URLSearchParams(url.hash.substring(1));
      let accessToken = hashParams.get('access_token');
      let refreshToken = hashParams.get('refresh_token');
      let type = hashParams.get('type');
      let errorCode = hashParams.get('error_code');
      let errorDescription = hashParams.get('error_description');

      // If not in hash, try query parameters (alternative)
      if (!accessToken) {
        accessToken = url.searchParams.get('access_token');
        refreshToken = url.searchParams.get('refresh_token');
        type = url.searchParams.get('type');
        errorCode = url.searchParams.get('error_code');
        errorDescription = url.searchParams.get('error_description');
      }

      console.log('Reset token verification:', {
        accessToken: accessToken ? 'present' : 'missing',
        refreshToken: refreshToken ? 'present' : 'missing',
        type,
        errorCode,
        errorDescription
      });

      // Check for errors first
      if (errorCode) {
        console.error('Reset link error:', errorCode, errorDescription);
        toast.error(errorDescription || "This password reset link has expired or is invalid.");
        setIsTokenValid(false);
        setIsVerifying(false);
        return;
      }

      // Check if we have the necessary tokens for a recovery flow
      if (type === 'recovery' && accessToken && refreshToken) {
        console.log('Setting session with tokens...');

        // Set the session temporarily for password reset
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Session error:', error);
          toast.error("This reset link is invalid, expired, or has already been used. Please request a new one.");
          setIsTokenValid(false);
        } else {
          console.log('Session set successfully for password reset:', data);

          // Clear URL parameters to prevent refresh issues
          window.history.replaceState({}, document.title, window.location.pathname);

          toast.success("Reset link verified! Please set your new password below.");
          setIsTokenValid(true);
        }
      } else {
        console.error('Missing required parameters:', { type, accessToken: !!accessToken, refreshToken: !!refreshToken });
        toast.error("No valid password reset token found. Please use the link from your reset email.");
        setIsTokenValid(false);
      }
    } catch (error) {
      console.error('Token verification error:', error);
      toast.error("Could not verify the reset link. Please try again or request a new reset link.");
      setIsTokenValid(false);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    verifyResetToken();
  }, [verifyResetToken]);

  useEffect(() => {
    if (password) {
      validatePassword(password);
    } else {
      setPasswordRequirements([]);
    }
  }, [password]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword(password)) {
      toast.error(`Your password must contain: ${passwordRequirements.join(', ')}.`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Please make sure both passwords are identical.");
      return;
    }

    setIsLoading(true);

    try {
      // Check if user is authenticated (has valid session)
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Your reset session has expired. Please request a new password reset link.");
        setIsTokenValid(false);
        setIsLoading(false);
        return;
      }

      console.log('Updating password for user:', user.id);

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('Password update error:', error);

        if (error.message.includes('session_not_found')) {
          toast.error("Your reset session has expired. Please request a new password reset link.");
          setIsTokenValid(false);
        } else if (error.message.includes('same_password')) {
          toast.error("Please choose a different password from your current one.");
        } else {
          toast.error(error.message || "Could not update your password. Please try again.");
        }
      } else {
        console.log('Password updated successfully');
        
        // Set success state
        setResetSuccess(true);
        
        toast.success("Password reset complete! You can now sign in with your new password.", {
          duration: 5000,
        });

        // IMPORTANT: Sign out the user immediately after password reset
        // This ensures they must log in again with the new password
        await supabase.auth.signOut();

        // Clear any session data
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      }
    } catch (error) {
      console.error('Unexpected error during password reset:', error);
      toast.error("Something went wrong. Please try again or request a new reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToHome = () => {
    navigate('/', { replace: true });
  };

  const handleSignIn = () => {
    navigate('/?auth=open', { replace: true });
  };

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

  if (resetSuccess) {
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
            <Button variant="ghost" onClick={handleGoToHome} className="w-full">
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
            <Button onClick={handleGoToHome} className="w-full">
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
            Enter and confirm your new strong password below. Make sure it meets all requirements.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
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
              onClick={handleGoToHome}
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
