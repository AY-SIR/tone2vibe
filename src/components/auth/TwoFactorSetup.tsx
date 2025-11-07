import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { Card } from "@/components/ui/card";
import { Shield, Download, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TwoFactorSetup = ({ open, onOpenChange, onSuccess }: TwoFactorSetupProps) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Prefetch QR/secret in background to reduce Step 1 → 2 delay (avoid blocking UI)
  useEffect(() => {
    if (open && step === 1 && !qrCode) {
      (async () => {
        try {
          const { data } = await supabase.functions.invoke('generate-2fa-secret');
          if (data) {
            setQrCode(data.qrCode);
            setSecret(data.secret);
          }
        } catch { /* silent */ }
      })();
    }
  }, [open, step, qrCode]);


  const handleGenerateQR = async () => {
    if (qrCode && secret) {
      setStep(2);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-2fa-secret');
      if (error) throw error;
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep(2);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to generate QR code" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enable-2fa', {
        body: { code: verificationCode },
      });
      
      if (error) throw error;
      
      setBackupCodes(data.backupCodes);
      setStep(4);
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

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast({
      title: "Copied!",
      description: "Backup codes copied to clipboard",
    });
  };

  const handleDownloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    onSuccess();
    onOpenChange(false);
    setStep(1);
    setVerificationCode("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Set Up Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4: Secure your account with 2FA
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication adds an extra layer of security to your account. 
              You'll need the Google Authenticator app to continue.
            </p>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Benefits:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Protects against password theft</li>
                <li>Prevents unauthorized access</li>
                <li>Secure backup codes provided</li>
              </ul>
            </div>
            <Button onClick={handleGenerateQR} disabled={loading} className="w-full">
              {loading ? "Generating..." : "Continue"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your Google Authenticator app:
            </p>
            <Card className="p-4 flex justify-center">
              {qrCode && <img src={qrCode} alt="QR Code" className="w-48 h-48" />}
            </Card>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Or enter this key manually:
              </p>
              <div className="flex items-center gap-2 justify-center">
                <code onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(secret);
                    toast({ title: "Copied!", description: "Secret key copied to clipboard" });
                  } catch {
                    toast({ variant: "destructive", title: "Copy failed", description: "Please copy manually" });
                  }
                }}
                className="cursor-pointer bg-muted px-3 py-2 rounded text-sm font-mono">{secret}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(secret);
                      toast({
                        title: "Copied!",
                        description: "Secret key copied to clipboard",
                      });
                    } catch {
                      try {
                        const ta = document.createElement('textarea');
                        ta.value = secret;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        toast({ title: "Copied!", description: "Secret key copied" });
                      } catch {
                        toast({ variant: "destructive", title: "Copy failed", description: "Please copy manually" });
                      }
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={() => setStep(3)} className="w-full">
              I've Scanned the QR Code
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app:
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
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
            <Button 
              onClick={handleVerifyCode} 
              disabled={verificationCode.length !== 6 || loading} 
              className="w-full"
            >
              {loading ? "Verifying..." : "Verify & Enable 2FA"}
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">2FA Successfully Enabled!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Save these backup codes in a secure place. Each code can only be used once.
            </p>
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                {backupCodes.map((code, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="truncate">{code}</span>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(code);
                        toast({ title: "Copied!", description: `Code ${i + 1} copied` });
                      } catch {
                        toast({ variant: "destructive", title: "Copy failed", description: "Please copy manually" });
                      }
                    }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyBackupCodes} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" onClick={handleDownloadBackupCodes} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            <Button onClick={handleComplete} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};