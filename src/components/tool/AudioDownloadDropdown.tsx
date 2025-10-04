// src/components/tool/AudioDownloadDropdown.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Loader2 } from "lucide-react";
import { audioFormatConverter, type AudioFormat } from "@/utils/audioFormatConverter";
import { useToast } from "@/hooks/use-toast";

interface AudioDownloadDropdownProps {
  audioUrl: string;
  fileName: string;
  isWebM?: boolean;
}

export const AudioDownloadDropdown = ({ audioUrl, fileName, isWebM = false }: AudioDownloadDropdownProps) => {
  const [converting, setConverting] = useState(false);
  const { toast } = useToast();

  const handleDownload = async (format: AudioFormat) => {
    setConverting(true);
    try {
      // Fetch the audio file
      const response = await fetch(audioUrl);
      const blob = await response.blob();

      let finalBlob = blob;
      let extension = 'mp3';

      // Convert if source is WebM
      if (isWebM) {
        finalBlob = await audioFormatConverter.convertAudio(blob, format);
        extension = format;
      } else {
        // For non-WebM files, just download as-is or convert if needed
        if (format !== 'mp3') {
          finalBlob = await audioFormatConverter.convertAudio(blob, format);
          extension = format;
        }
      }

      // Download the file
      const downloadUrl = URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${fileName.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download Started",
        description: `Downloading as ${extension.toUpperCase()} format`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not convert or download audio",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={converting}>
          {converting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleDownload('wav')}>
          Download as WAV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('mp3')}>
          Download as MP3
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('flac')}>
          Download as FLAC
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
