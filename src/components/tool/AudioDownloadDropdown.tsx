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
  const [convertingFormat, setConvertingFormat] = useState<AudioFormat | null>(null);
  const { toast } = useToast();

  const handleDownload = async (format: AudioFormat) => {
    setConverting(true);
    setConvertingFormat(format);
    
    try {
      // Fetch the audio file
      const response = await fetch(audioUrl);
      const blob = await response.blob();

      let finalBlob = blob;
      let extension = format;

      // Convert if source is WebM or format is different
      if (isWebM || format !== 'mp3') {
        finalBlob = await audioFormatConverter.convertAudio(blob, format);
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
        title: "Download Complete",
        description: `Downloaded as ${extension.toUpperCase()} format`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not convert or download audio",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
      setConvertingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={converting}>
          {converting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Converting {convertingFormat?.toUpperCase()}...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 " />

            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleDownload('wav')} disabled={converting}>
          {converting && convertingFormat === 'wav' ? (
            <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Converting WAV...</>
          ) : (
            'Download as WAV'
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('mp3')} disabled={converting}>
          {converting && convertingFormat === 'mp3' ? (
            <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Converting MP3...</>
          ) : (
            'Download as MP3'
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('flac')} disabled={converting}>
          {converting && convertingFormat === 'flac' ? (
            <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Converting FLAC...</>
          ) : (
            'Download as FLAC'
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
