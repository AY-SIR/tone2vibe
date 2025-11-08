import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface TwoFactorManageProps {
  lastUsed?: string;
  onDisabled: () => void;
}

export const TwoFactorManage = ({ lastUsed, onDisabled }: TwoFactorManageProps) => {
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleDisable = async () => {
    const codeLength = useBackupCode ? 8 : 6;

    if (!password || disableCode.length !== codeLength) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: `Please enter your password and ${
          useBackupCode ? "8-character backup code" : "6-digit 2FA code"
        }`,
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("disable-2fa", {
        body: { code: disableCode, password, isBackupCode: useBackupCode },
      });

      if (error) throw error;
      if (data?.error || !data?.success) {
        throw new Error(data?.error || "Failed to disable 2FA");
      }

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled",
      });

      // Refresh session to update AuthContext immediately
      await supabase.auth.refreshSession();

      // Clear 2FA verification keys
      if (user?.id) {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith(`2fa_verified:${user.id}:`)) {
            sessionStorage.removeItem(key);
            i--;
          }
        }
      }

      setShowDisableDialog(false);
      setPassword("");
      setDisableCode("");
      setUseBackupCode(false);
      onDisabled();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Disable 2FA",
        description: error.message || "Please check your password and code",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">2FA is enabled</span>
          </div>
          {lastUsed && (
            <div className="text-sm text-muted-foreground">
              Last used: {new Date(lastUsed).toLocaleDateString()}
            </div>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDisableDialog(true)}
            className="w-full sm:w-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Disable 2FA
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication</AlertDialogTitle>
            <AlertDialogDescription>
              To disable 2FA, please enter your password and the authentication
              code from your app or backup code.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Password</Label>
              <Input
                id="disable-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {useBackupCode ? "Backup Code" : "Authentication Code"}
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={useBackupCode ? 8 : 6}
                  value={disableCode}
                  onChange={setDisableCode}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>

                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>

                  {useBackupCode && (
                    <InputOTPGroup>
                      <InputOTPSlot index={6} />
                      <InputOTPSlot index={7} />
                    </InputOTPGroup>
                  )}
                </InputOTP>
              </div>

              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setDisableCode("");
                }}
                disabled={loading}
                className="text-xs mx-auto block"
              >
                {useBackupCode
                  ? "Use authenticator code instead"
                  : "Use backup code instead"}
              </Button>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPassword("");
                setDisableCode("");
                setUseBackupCode(false);
              }}
              disabled={loading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDisable();
              }}
              disabled={
                loading || !password || disableCode.length !== (useBackupCode ? 8 : 6)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Disabling..." : "Disable 2FA"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
