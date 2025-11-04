import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoModal({ open, onOpenChange }: VideoModalProps) {
  const [loading, setLoading] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-black">
        {/* ✅ Hidden accessibility elements */}
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Tone2Vibe Demo Video</DialogTitle>
            <DialogDescription>
              A demonstration video showcasing the features and performance of Tone2Vibe.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Video container */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}
            <iframe
              src=""
              title="Tone2Vibe Demo"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setLoading(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
