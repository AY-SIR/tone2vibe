import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Verify2FA() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session, signOut } = useAuth();

  useEffect(() => {
    // Wait a moment for auth state to settle
    const timer = setTimeout(() => {
      if (!user) {
        navigate("/", { replace: true });
      } else {
        setIsCheckingAuth(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa', {
        body: { code, isBackupCode: useBackup },
      });

      if (error) throw error;

      if (data?.success) {
        // Mark this session as 2FA-verified to prevent redirect loop
        try {
          if (user && session?.access_token) {
            const tokenPart = session.access_token.slice(0, 16);
            const verifiedKey = `2fa_verified:${user.id}:${tokenPart}`;
            sessionStorage.setItem(verifiedKey, 'true');
          }
        } catch {}
        toast({
          title: "Success",
          description: "2FA verification successful",
        });
        navigate("/tool", { replace: true });
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data.message || "Invalid code. Please try again.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Invalid code. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  // Show loading while checking auth state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication Required
          </CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Continue
            </Button>
            
            {!useBackup && (
              <Button
                variant="link"
                onClick={() => setUseBackup(true)}
                className="text-sm"
              >
                Use backup code instead
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel & Sign Out
            </Button>
          </div>

          {useBackup && (
            <p className="text-sm text-muted-foreground text-center">
              Enter one of your 8-character backup codes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
