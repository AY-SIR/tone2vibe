import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mic } from "lucide-react";

interface MicrophonePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MicrophonePermissionDialog({
  open,
  onOpenChange,
}: MicrophonePermissionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[95vw] max-w-lg rounded-lg">
          
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
              To record your voice, please allow microphone access in your browser settings.
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm text-left space-y-2">
              <p className="font-semibold">How to enable:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Click the lock/info icon in the address bar</li>
                <li>Find "Microphone" permissions</li>
                <li>Select "Allow"</li>
                <li>Refresh the page</li>
              </ol>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} // ✅ <-- added missing closing brace
