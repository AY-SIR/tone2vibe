import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Verify2FA() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, session, signOut } = useAuth();

  const redirectTarget = searchParams.get("redirect") || "/tool";

  useEffect(() => {
    const checkAuth = async () => {
      if (!user) {
        navigate(`/?auth=open&redirect=${encodeURIComponent(redirectTarget)}`, {
          replace: true,
        });
        return;
      }

      const { data: settings } = await supabase
        .from("user_2fa_settings")
        .select("enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!settings?.enabled) {
        navigate(redirectTarget, { replace: true });
        return;
      }

      if (session?.access_token) {
        const key = `2fa_verified:${user.id}:${session.access_token.slice(0, 16)}`;
        if (sessionStorage.getItem(key) === "true") {
          navigate(redirectTarget, { replace: true });
          return;
        }
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [user, session, navigate, redirectTarget]);

  const handleVerify = async () => {
    if (!useBackup && code.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Enter a 6-digit authenticator code.",
      });
      return;
    }

    if (useBackup && code.length < 8) {
      toast({
        variant: "destructive",
        title: "Invalid Backup Code",
        description: "Backup code must be 8 characters.",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-2fa", {
        body: { code: code.trim(), isBackupCode: useBackup },
      });

      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;

      if (result?.success) {
        // Mark verified
        if (user && session?.access_token) {
          const key = `2fa_verified:${user.id}:${session.access_token.slice(0, 16)}`;
          sessionStorage.setItem(key, "true");
        }

        // 🔄 refresh session to trigger context update
        await supabase.auth.refreshSession();

        toast({ title: "Success", description: "2FA verification successful!" });
        navigate(redirectTarget, { replace: true });
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: result?.error || "Invalid code, try again.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: err?.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10">
        <Card className="w-full max-w-md mx-4 border-primary/20">
          <CardContent className="py-8 flex flex-col items-center gap-4">
            <Shield className="h-10 w-10 text-primary animate-pulse" />
            <p className="text-sm text-muted-foreground">
              Checking authentication...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-center gap-2 text-lg sm:text-xl text-center sm:text-left">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>Two-Factor Authentication Required</span>
          </CardTitle>
          <CardDescription>
            {useBackup
              ? "Enter your 8-character backup code"
              : "Enter the 6-digit code from your authenticator app"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            {!useBackup ? (
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
            ) : (
              <input
                type="text"
                placeholder="Enter backup code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border p-2 text-center rounded font-mono"
                maxLength={8}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleVerify}
              disabled={loading || (useBackup ? code.length < 8 : code.length !== 6)}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Continue
            </Button>

            <Button
              variant="link"
              onClick={() => {
                setUseBackup(!useBackup);
                setCode("");
              }}
              className="text-sm"
            >
              {useBackup
                ? "Use authenticator code instead"
                : "Use backup code instead"}
            </Button>

            <Button
              variant="ghost"
              onClick={handleCancel}
              className="text-sm text-muted-foreground"
            >
              Cancel & Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
