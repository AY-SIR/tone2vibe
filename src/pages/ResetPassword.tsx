// src/pages/ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Chrome as Home } from 'lucide-react';
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
  const [resetComplete, setResetComplete] = useState(false);

  // ----------------------
  // Verify reset token
  // ----------------------
  useEffect(() => {
    const verifyResetToken = async () => {
      try {
        const hash = window.location.hash.substring(1); // Supabase puts tokens in hash
        const params = new URLSearchParams(hash);

        const accessToken = params.get('access_token') || '';
        const refreshToken = params.get('refresh_token') || '';
        const type = (params.get('type') || '').toLowerCase();

        console.log('Reset link params:', { accessToken, refreshToken, type });

        if (!accessToken || !refreshToken || type !== 'recovery') {
          toast.error('Invalid or expired reset link.');
          setIsTokenValid(false);
          setIsVerifying(false);
          return;
        }

        // Temporarily set session just for password reset
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError || !sessionData.session) {
          console.error('Session error:', sessionError);
          toast.error('Reset link is invalid or expired.');
          setIsTokenValid(false);
          setIsVerifying(false);
          return;
        }

        // Clean URL so tokens don't remain
        window.history.replaceState({}, document.title, window.location.pathname);

        toast.success('Reset link verified! Set your new password.');
        setIsTokenValid(true);
      } catch (error) {
        console.error('Unexpected verification error:', error);
        toast.error('Failed to process reset link.');
        setIsTokenValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyResetToken();
  }, []);

  // ----------------------
  // Password validation
  // ----------------------
  const validatePassword = (pwd: string) => {
    const errors = [];
    if (pwd.length < 8) errors.push('at least 8 characters');
    if (!/[a-z]/.test(pwd)) errors.push('one lowercase letter');
    if (!/[A-Z]/.test(pwd)) errors.push('one uppercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('one number');
    return errors;
  };
  const passwordRequirements = validatePassword(password);

  // ----------------------
  // Update password
  // ----------------------
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Password update failed:', updateError);
        toast.error(updateError.message || 'Failed to update password.');
        return;
      }

      toast.success('Password updated successfully!');
      setResetComplete(true);

      // Sign out and redirect to main page after success
      await supabase.auth.signOut();
      setTimeout(() => navigate('/', { replace: true }), 2000);
    } catch (error) {
      console.error('Unexpected update error:', error);
      toast.error('Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------
  // Loading state
  // ----------------------
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8 space-y-4">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Verifying Reset Link</h1>
            <p className="text-muted-foreground">Please wait...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----------------------
  // Invalid token
  // ----------------------
  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is expired, invalid, or already used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/', { replace: true })} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----------------------
  // Success state
  // ----------------------
  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <CardTitle className="text-2xl">Password Reset Complete!</CardTitle>
            <CardDescription>
              You will be redirected to the main page shortly.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ----------------------
  // Reset form
  // ----------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>Enter and confirm your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
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
        </CardContent>
      </Card>
    </div>
  );
}
