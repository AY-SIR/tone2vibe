import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Home } from 'lucide-react';
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
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setIsTokenValid(false);
        setIsVerifying(false);
        toast.error('Invalid reset link');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('verify_password_reset_token', {
          p_token: token
        });

        if (error || !data) {
          console.error('Token verification error:', error);
          setIsTokenValid(false);
          setIsVerifying(false);
          toast.error('Invalid or expired reset link');
          return;
        }

        const result = typeof data === 'string' ? JSON.parse(data) : data;

        if (!result.success) {
          setIsTokenValid(false);
          setIsVerifying(false);
          toast.error(result.error || 'Invalid or expired reset link');
          return;
        }

        setUserId(result.user_id);
        setUserEmail(result.email);
        setIsTokenValid(true);
        setIsVerifying(false);
        toast.success('Reset link verified! Set your new password.');

      } catch (err) {
        console.error('Verification exception:', err);
        setIsTokenValid(false);
        setIsVerifying(false);
        toast.error('Failed to verify reset link');
      }
    };

    verifyToken();
  }, [searchParams]);

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

    if (!userId || !userEmail) {
      toast.error('Session expired. Please request a new reset link.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: password
      });

      if (error) {
        console.error('Password update failed:', error);
        toast.error(error.message || 'Failed to update password.');
        setIsLoading(false);
        return;
      }

      toast.success('Password updated successfully!');
      setResetComplete(true);

      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);

    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

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
          <CardContent className="space-y-3">
            <Button onClick={() => navigate('/', { replace: true })} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/?auth=open&view=forgot-password', { replace: true })}
              className="w-full"
            >
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <CardTitle className="text-2xl">Password Reset Complete!</CardTitle>
            <CardDescription>
              Your password has been updated. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Redirecting to home page...</p>
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
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  tabIndex={-1}
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
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  tabIndex={-1}
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
