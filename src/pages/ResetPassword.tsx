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
    console.log('Starting reset token verification...');

    try {
      // First, ensure we're signed out completely
      await supabase.auth.signOut();
      
      // Get URL parameters
      const currentUrl = window.location.href;
      console.log('Current URL:', currentUrl);
      
      // Parse URL for tokens - try hash first, then query params
      const url = new URL(currentUrl);
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const queryParams = url.searchParams;
      
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const type = hashParams.get('type') || queryParams.get('type');
      const errorCode = hashParams.get('error_code') || queryParams.get('error_code');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

      console.log('Found parameters:', {
        accessToken: accessToken ? 'EXISTS' : 'MISSING',
        refreshToken: refreshToken ? 'EXISTS' : 'MISSING', 
        type: type || 'NONE',
        errorCode: errorCode || 'NONE',
        urlHash: url.hash || 'NONE',
        urlSearch: url.search || 'NONE'
      });

      // Check for explicit errors
      if (errorCode || errorDescription) {
        console.error('URL contains error:', errorCode, errorDescription);
        toast.error(errorDescription || 'Reset link contains an error');
        setIsTokenValid(false);
        return;
      }

      // Verify we have the required recovery parameters
      if (!type || type !== 'recovery') {
        console.error('Invalid or missing type parameter. Expected "recovery", got:', type);
        toast.error('This is not a valid password reset link. Please request a new one.');
        setIsTokenValid(false);
        return;
      }

      if (!accessToken || !refreshToken) {
        console.error('Missing required tokens. AccessToken:', !!accessToken, 'RefreshToken:', !!refreshToken);
        toast.error('Reset link is missing required security tokens. Please request a new reset link.');
        setIsTokenValid(false);
        return;
      }

      console.log('Valid recovery parameters found. Setting up session...');
      
      // Clear URL to prevent issues
      window.history.replaceState({}, document.title, window.location.pathname);

      // Set session for password reset (this does NOT log the user in)
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error('Session setup failed:', sessionError);
        
        if (sessionError.message.includes('expired') || sessionError.message.includes('invalid')) {
          toast.error('This reset link has expired. Reset links are only valid for 1 hour.');
        } else if (sessionError.message.includes('used') || sessionError.message.includes('consumed')) {
          toast.error('This reset link has already been used. Please request a new one.');
        } else {
          toast.error('Reset link is invalid. Please request a new password reset link.');
        }
        setIsTokenValid(false);
        return;
      }

      // Verify user exists and session is valid
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData?.user) {
        console.error('User verification failed:', userError);
        toast.error('Could not verify reset session. Please request a new reset link.');
        setIsTokenValid(false);
        return;
      }

      console.log('Reset session verified for user email:', userData.user.email);
      toast.success('Reset link verified! Please set your new password below.');
      setIsTokenValid(true);

    } catch (error) {
      console.error('Unexpected error during token verification:', error);
      toast.error('Failed to process reset link. Please try requesting a new one.');
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
      toast.error(`Password must contain: ${passwordRequirements.join(', ')}`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Verify we still have a valid session
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Session expired during reset:', userError);
        toast.error('Reset session has expired. Please request a new password reset link.');
        setIsTokenValid(false);
        setIsLoading(false);
        return;
      }

      console.log('Updating password for user:', user.email);

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (updateError) {
        console.error('Password update failed:', updateError);
        
        if (updateError.message.includes('same_password')) {
          toast.error('New password must be different from your current password');
        } else if (updateError.message.includes('session_not_found')) {
          toast.error('Reset session expired. Please request a new reset link.');
          setIsTokenValid(false);
        } else {
          toast.error(`Failed to update password: ${updateError.message}`);
        }
        setIsLoading(false);
        return;
      }

      console.log('Password updated successfully');
      
      // IMPORTANT: Sign out completely after password reset
      // This ensures no auto-login happens
      await supabase.auth.signOut();
      
      // Clear any stored session data
      localStorage.clear();
      sessionStorage.clear();
      
      setResetSuccess(true);
      toast.success('Password reset complete! Please sign in with your new password.');

    } catch (error) {
      console.error('Unexpected error during password update:', error);
      toast.error('Something went wrong. Please try again.');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHome = () => {
    // Make sure we're signed out before going home
    supabase.auth.signOut().then(() => {
      navigate('/', { replace: true });
    });
  };

  const handleSignIn = () => {
    // Make sure we're signed out before opening sign in
    supabase.auth.signOut().then(() => {
      navigate('/?auth=open', { replace: true });
    });
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
