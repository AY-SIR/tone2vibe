import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verify token existence (basic check only)
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      toast.error('Invalid reset link');
      navigate('/');
      return;
    }
    setTokenValid(true);
    setLoading(false);
  }, [searchParams, navigate]);

  // Password validation function
  const validatePassword = (password: string) => {
    const requirements = [];
    if (password.length < 8) requirements.push('at least 8 characters');
    if (!/[a-z]/.test(password)) requirements.push('one lowercase letter');
    if (!/[A-Z]/.test(password)) requirements.push('one uppercase letter');
    if (!/[0-9]/.test(password)) requirements.push('one digit');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) requirements.push('one special character');
    return requirements;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) return toast.error('Please fill in all fields');

    const requirements = validatePassword(newPassword);
    if (requirements.length > 0)
      return toast.error(`Password must include: ${requirements.join(', ')}`);

    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

    setSubmitting(true);

    try {
      const token = searchParams.get('token');
      if (!token) {
        toast.error('Invalid reset token');
        setSubmitting(false);
        return;
      }

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: { token, newPassword },
      });

      if (error) {
        toast.error('Failed to reset password. Please try again.');
        setSubmitting(false);
        return;
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result?.error) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }

      toast.success('Password reset successfully! You can now sign in.');
      setTimeout(() => navigate('/?auth=open'), 500);
    } catch (err: any) {
      console.error('Password reset error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!tokenValid) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <CheckCircle className="h-12 w-12 mx-auto text-gray-900 mb-4" />
          <h2 className="text-2xl font-bold">Reset Your Password</h2>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={submitting}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={submitting}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && validatePassword(newPassword).length > 0 && (
              <p className="text-xs text-destructive">
                Required: {validatePassword(newPassword).join(', ')}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={submitting}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={submitting}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password
          </Button>
        </form>
      </div>
    </div>
  );
}
