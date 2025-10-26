import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, FileAudio, Copy, Check, Download, Loader2, Sparkles } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ModernStepFiveProps {
  audioUrl: string;
  audioData?: string;
  audioMimeType?: string;
  extractedText: string;
  selectedLanguage: string;
  wordCount: number;
  duration?: number;
  durationSeconds?: number;
  onNextGeneration?: () => void;
}

export const ModernStepFive: React.FC<ModernStepFiveProps> = ({
  audioUrl,
  audioData,
  audioMimeType,
  extractedText,
  selectedLanguage,
  wordCount,
  duration,
  durationSeconds,
  onNextGeneration,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // State for duration and a ref for the audio element
  const [actualDuration, setActualDuration] = useState(durationSeconds || duration || 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (timeInSeconds: number = 0) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Reset duration when audioUrl changes
  useEffect(() => {
    setActualDuration(0);
  }, [audioUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Text copied to clipboard." });
    } catch {
      toast({ title: "Copy Failed", description: "Unable to copy.", variant: "destructive" });
    }
  };

  const handleNextGeneration = () => {
    setIsRefreshing(true);
    toast({
      title: "Preparing Next Generation",
      description: "Setting up your next voice generation...",
      duration: 2000
    });
    setTimeout(() => {
      if (onNextGeneration) onNextGeneration();
      else window.location.href = '/tool';
    }, 1500);
  };

  const handleConvertAndDownload = async (format: string) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to download audio.", variant: "destructive" });
      return;
    }

    setDownloading(format);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required");

      toast({ title: "Converting Audio", description: `Converting to ${format.toUpperCase()}...` });

      const buildStreamUrl = async (rawUrl: string) => {
        try {
          const u = new URL(rawUrl);
          const pathParts = u.pathname.split("/");
          const bucket = pathParts.includes("user-generates") ? "user-generates" : "user-voices";
          const idx = pathParts.indexOf(bucket);
          const storagePath = idx > -1 ? pathParts.slice(idx + 1).join("/") : rawUrl;

          const issueRes = await fetch(`${supabase.supabaseUrl}/functions/v1/issue-audio-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ bucket, storagePath, ttlSeconds: 3600 })
          });
          const issueJson = await issueRes.json();
          if (!issueRes.ok || !issueJson?.token) throw new Error(issueJson?.error || 'Token issue failed');
          return `${supabase.supabaseUrl}/functions/v1/stream-audio?token=${issueJson.token}`;
        } catch {
          return rawUrl;
        }
      };

      const streamUrl = await buildStreamUrl(audioUrl);

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/convert-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ audioUrl: streamUrl, format, sourceType: "generated" }),
      });

      if (!response.ok) {
        let errorMsg = "Conversion failed";
        try { const errorJson = await response.json(); errorMsg = errorJson.error || errorMsg; } catch {}
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `voice_${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: "Download Complete", description: `Audio downloaded as ${format.toUpperCase()}.` });

    } catch (error: any) {
      console.error("Download error:", error);
      toast({ title: "Download Failed", description: error.message || "Failed to download audio.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    const formats = ["mp3", "wav", "flac"];
    toast({ title: "Batch Download Started", description: "Downloading multiple formats..." });
    for (const format of formats) {
      await handleConvertAndDownload(format);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  };

  const formats = [
    { value: "mp3", label: "MP3", desc: "Universal format", icon: <FileAudio className="w-5 h-5" /> },
    { value: "wav", label: "WAV", desc: "Lossless quality", icon: <Volume2 className="w-5 h-5" /> },
    { value: "flac", label: "FLAC", desc: "Compressed lossless", icon: <Download className="w-5 h-5" /> },
    { value: "ogg", label: "OGG", desc: "Open source", icon: <Sparkles className="w-5 h-5" /> },
    { value: "aac", label: "AAC", desc: "Modern codec", icon: <Check className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Success Message */}
      <div className="text-center space-y-2 sm:space-y-3 py-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-pulse">
          <Check className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent px-4">
          Audio Generated Successfully!
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-md mx-auto px-4">
          Your complete voice generation is ready with full analytics tracking and history saved.
        </p>
      </div>

      {/* Analytics Card - Only for Pro and Premium */}
      {['pro', 'premium'].includes(profile?.plan || '') && (
        <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50/50 to-emerald-50/30">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileAudio className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              Your Generated Audio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center p-3">
                <div className="text-xl sm:text-2xl font-bold text-primary">{wordCount}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Words Processed</div>
              </div>
              <div className="text-center p-3">
                <div className="text-xl sm:text-2xl font-bold text-primary">{formatTime(actualDuration)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Duration</div>
              </div>
              <div className="text-center p-3">
                <Badge variant="secondary" className="text-xs mb-1">{selectedLanguage}</Badge>
                <div className="text-xs sm:text-sm text-muted-foreground">Language</div>
              </div>
              <div className="text-center p-3">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs mb-1">
                  Tracked
                </Badge>
                <div className="text-xs sm:text-sm text-muted-foreground">Analytics</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio Player */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            Audio Player
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <audio
            ref={audioRef}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                setActualDuration(audioRef.current.duration);
              }
            }}
            controls
            className="w-full"
            controlsList="nodownload noplaybackrate"
          >
            <source src={audioUrl} type={audioMimeType || 'audio/mpeg'} />
            {audioData && <source src={`data:${audioMimeType || 'audio/mpeg'};base64,${audioData}`} />}
            Your browser does not support the audio element.
          </audio>
          {!actualDuration && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
              <span>Loading audio...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Original Text */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg gap-2">
            <span className="truncate">Original Text</span>
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1.5 sm:gap-2 flex-shrink-0 text-xs sm:text-sm">
              {copied ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-3 sm:p-4 max-h-32 sm:max-h-40 overflow-y-auto">
            <p className="text-xs sm:text-sm leading-relaxed">{extractedText}</p>
          </div>
        </CardContent>
      </Card>

      {/* Download & Conversion */}
      <Card className="border-2 border-gray-100">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Download className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            Download in Multiple Formats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center px-2">
            Choose a format to download, or get all popular formats at once
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {formats.slice(0, 3).map((format) => (
              <Button
                key={format.value}
                onClick={() => handleConvertAndDownload(format.value)}
                disabled={!!downloading}
                variant="outline"
                size="lg"
                className="flex flex-col h-auto py-3 sm:py-4 gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  {downloading === format.value ? (
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                  ) : (
                    format.icon
                  )}
                  <div className="font-semibold text-sm sm:text-base">{format.label}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">{format.desc}</div>
                </div>
              </Button>
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!downloading}
                  className="gap-2 text-xs sm:text-sm"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      <span className="hidden sm:inline">Converting {downloading.toUpperCase()}...</span>
                      <span className="sm:hidden">Converting...</span>
                    </>
                  ) : (
                    <>
                      More Formats
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 sm:w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Additional Formats
                </div>
                {formats.slice(3).map((format) => (
                  <DropdownMenuItem
                    key={format.value}
                    onClick={() => handleConvertAndDownload(format.value)}
                    disabled={!!downloading}
                    className="flex items-center gap-2 sm:gap-3 py-2 cursor-pointer"
                  >
                    {format.icon}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{format.label}</div>
                      <div className="text-xs text-muted-foreground">{format.desc}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {downloading && (
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-blue-600 animate-pulse px-2">
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
              <span className="text-center">Converting to {downloading.toUpperCase()}...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Generation */}
      <div className="flex justify-center pt-2 sm:pt-4 pb-4">
        {isRefreshing ? (
          <div className="flex items-center space-x-2 sm:space-x-3 px-6 sm:px-8 py-2.5 sm:py-3 bg-blue-50 rounded-lg">
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-blue-600" />
            <span className="text-sm sm:text-base text-blue-700 font-medium">Refreshing...</span>
          </div>
        ) : (
          <Button
            onClick={handleNextGeneration}
            size="lg"
            className="px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold bg-gradient-to-r from-gray-700 to-black hover:from-gray-900 hover:to-black text-white rounded-lg transition-all shadow-lg hover:shadow-xl w-full sm:w-auto"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Next Generation
          </Button>
        )}
      </div>
    </div>
  );
};

export default ModernStepFive;
