import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mic, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MicrophonePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGranted?: () => void; // optional callback for when permission is granted
}

export function MicrophonePermissionDialog({
  open,
  onOpenChange,
  onGranted,
}: MicrophonePermissionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnableMic = async () => {
    setError(null);
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted
      stream.getTracks().forEach((track) => track.stop());
      setLoading(false);
      onOpenChange(false);
      if (onGranted) onGranted();
    } catch (err) {
      console.error("Microphone permission error:", err);
      setLoading(false);
      setError("Unable to access microphone. Please allow permission manually.");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
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
              To record your voice, please allow microphone access in your browser settings or click below to enable it directly.
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm text-left space-y-2">
              <p className="font-semibold">Manual method:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Click the lock/info icon in the address bar</li>
                <li>Find "Microphone" permissions</li>
                <li>Select "Allow"</li>
                <li>Refresh the page</li>
              </ol>
            </div>
            {error && (
              <p className="text-red-600 text-sm font-medium mt-2">{error}</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleEnableMic}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enabling...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Turn On Microphone
              </>
            )}
          </Button>

          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
