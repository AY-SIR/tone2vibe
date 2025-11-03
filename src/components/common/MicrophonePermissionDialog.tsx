import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mic, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface MicrophonePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MicrophonePermissionDialog({
  open,
  onOpenChange,
}: MicrophonePermissionDialogProps) {
  const [status, setStatus] = useState<
    "checking" | "granted" | "denied" | "prompt"
  >("checking");
  const [loading, setLoading] = useState(false);

  // Check permission whenever the dialog opens
  useEffect(() => {
    if (!open) return;

    const checkPermission = async () => {
      setStatus("checking");

      try {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });

        if (result.state === "granted") {
          setStatus("granted");
          setTimeout(() => onOpenChange(false), 1500);
        } else if (result.state === "denied") {
          setStatus("denied");
        } else {
          setStatus("prompt");
        }

        // Listen for changes (user manually allows in browser)
        result.onchange = () => {
          if (result.state === "granted") {
            setStatus("granted");
            setTimeout(() => onOpenChange(false), 1500);
          }
        };
      } catch (err) {
        console.error("Permission check failed:", err);
        setStatus("denied");
      }
    };

    checkPermission();
  }, [open, onOpenChange]);

  // Try again button handler
  const handleRetry = async () => {
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setStatus("granted");
      setTimeout(() => onOpenChange(false), 1500);
    } catch (err) {
      console.error("Microphone access error:", err);
      setStatus("denied");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {status === "granted" ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <AlertDialogTitle className="text-xl font-semibold">
                Microphone Access Granted
              </AlertDialogTitle>
              <AlertDialogDescription>
                You can now record your voice.
              </AlertDialogDescription>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <Mic className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <AlertDialogTitle className="text-center text-xl">
                Microphone Access Required
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center space-y-3">
                <p>
                  To record your voice, please allow microphone access in your
                  browser settings or click below to enable it.
                </p>
                <div className="bg-muted p-3 rounded-lg text-sm text-left space-y-2">
                  <p className="font-semibold">How to enable manually:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Click the lock/info icon in the address bar</li>
                    <li>Find “Microphone” permissions</li>
                    <li>Select “Allow”</li>
                    <li>Refresh the page</li>
                  </ol>
                </div>
              </AlertDialogDescription>
            </>
          )}
        </AlertDialogHeader>

        {/* Footer */}
        {status !== "granted" && (
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleRetry}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>

            <AlertDialogAction onClick={() => onOpenChange(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
