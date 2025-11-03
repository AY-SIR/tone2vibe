import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, FileAudio, Copy, Check, Download, Loader2, Sparkles, Play, Pause, SkipForward } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const SUPABASE_URL = "https://msbmyiqhohtjdfbjmxlf.supabase.co";

interface ModernStepFiveProps {
  audioUrl: string;
  extractedText: string;
  selectedLanguage: string;
  wordCount: number;
  onNextGeneration?: () => void;
}

const cleanStoragePath = (rawPath: string, bucket: string): string => {
  if (!rawPath) return '';

  let path = rawPath.trim();

  if (
    !path.includes('http') &&
    !path.includes('/storage/') &&
    !path.startsWith('/') &&
    path.split('/').length === 2
  ) {
    return path;
  }

  path = path.replace(/^https?:\/\/[^\/]+/, '');
  path = path.replace(/^\/storage\/v1\/object\/(public|sign)\//, '');
  path = path.replace(/^\/+/, '');
  path = path.replace(new RegExp(`^${bucket}/`), '');
  path = path.replace(/\?.*$/, '');
  path = path.replace(/^\/+/, '');

  return path;
};

export const ModernStepFive: React.FC<ModernStepFiveProps> = ({
  audioUrl,
  extractedText,
  selectedLanguage,
  wordCount,
  onNextGeneration,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actualDuration, setActualDuration] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [secureAudioUrl, setSecureAudioUrl] = useState<string>('');

  // Custom audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ LocalStorage Key
  const storageKey = `audioDuration_${audioUrl}`;

  // ✅ Load duration from localStorage on mount
  useEffect(() => {
    const savedDuration = localStorage.getItem(storageKey);
    if (savedDuration) {
      setActualDuration(parseFloat(savedDuration));
    }
  }, [storageKey]);

  // ✅ FIXED: Get secure audio URL on mount with proper cleanup and faster loading
  useEffect(() => {
    let blobUrl: string | null = null;
    let isMounted = true;

    const getSecureUrl = async () => {
      if (!audioUrl) return;

      try {
        // Show immediate loading feedback
        setAudioReady(false);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        if (audioUrl.includes('stream-audio?token=')) {
          const audioResponse = await fetch(audioUrl, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (!audioResponse.ok) {
            throw new Error('Failed to fetch audio');
          }

          const audioBlob = await audioResponse.blob();
          blobUrl = URL.createObjectURL(audioBlob);

          if (isMounted) {
            setSecureAudioUrl(blobUrl);
            setAudioReady(true);
          }
          return;
        }

        const storagePath = cleanStoragePath(audioUrl, 'user-generates');

        const issueResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/issue-audio-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              bucket: 'user-generates',
              storagePath: storagePath,
              ttlSeconds: 24 * 3600
            })
          }
        );

        if (!issueResponse.ok) {
          throw new Error('Failed to get audio token');
        }

        const { token } = await issueResponse.json();
        const streamUrl = `${SUPABASE_URL}/functions/v1/stream-audio?token=${token}`;

        const audioResponse = await fetch(streamUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!audioResponse.ok) {
          throw new Error('Failed to fetch audio');
        }

        const audioBlob = await audioResponse.blob();
        blobUrl = URL.createObjectURL(audioBlob);

        if (isMounted) {
          setSecureAudioUrl(blobUrl);
          setAudioReady(true);
        }

      } catch (error) {
        console.error('Failed to get secure audio URL:', error);
        if (isMounted) {
          setAudioReady(false);
          toast({
            title: "Audio Loading Error",
            description: "Could not load audio. Please refresh the page.",
            variant: "destructive"
          });
        }
      }
    };

    getSecureUrl();

    return () => {
      isMounted = false;
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [audioUrl, toast]);

  // ✅ FIXED: Setup audio event listeners with proper dependencies
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setActualDuration(audio.duration);
      localStorage.setItem(storageKey, audio.duration.toString());
    };
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioReady, storageKey]);

  const formatTime = (timeInSeconds: number = 0) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  };

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

  // ✅ FIXED: Clear cached duration and use proper navigation
  const handleNextGeneration = () => {
    setIsRefreshing(true);
    localStorage.removeItem(storageKey);

    toast({
      title: "Preparing Next Generation",
      description: "Setting up your next voice generation...",
      duration: 2000
    });

    setTimeout(() => {
      try {
        if (onNextGeneration) {
          onNextGeneration();
        } else {
          navigate('/tool');
        }
      } catch (error) {
        console.error('Navigation error:', error);
        toast({
          title: "Navigation Error",
          description: "Please try again.",
          variant: "destructive"
        });
        setIsRefreshing(false);
      }
    }, 1500);
  };

  // ✅ FIXED: Race condition prevention with ref
  const handleConvertAndDownload = async (format: string) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to download audio.", variant: "destructive" });
      return;
    }

    // ✅ Prevent multiple simultaneous downloads
    if (downloading) return;

    // ✅ Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setDownloading(format);
    setConversionProgress(0);

    toast({
      title: "Converting Audio",
      description: `Converting to ${format.toUpperCase()}...`
    });

    progressIntervalRef.current = setInterval(() => {
      setConversionProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.random() * 15;
      });
    }, 400);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required");

      let downloadUrl = audioUrl;

      if (!audioUrl.includes('stream-audio?token=')) {
        const storagePath = cleanStoragePath(audioUrl, 'user-generates');

        const issueResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/issue-audio-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              bucket: 'user-generates',
              storagePath: storagePath,
              ttlSeconds: 3600
            })
          }
        );

        if (!issueResponse.ok) {
          throw new Error('Failed to get download token');
        }

        const { token } = await issueResponse.json();
        downloadUrl = `${SUPABASE_URL}/functions/v1/stream-audio?token=${token}`;
      }

      setConversionProgress(50);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/convert-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          audioUrl: downloadUrl,
          format,
          sourceType: "generated"
        }),
      });

      if (!response.ok) {
        let errorMsg = "Conversion failed";
        try {
          const errorJson = await response.json();
          errorMsg = errorJson.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      setConversionProgress(90);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `voice_${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setConversionProgress(100);

      toast({
        title: "Download Complete",
        description: `Audio downloaded as ${format.toUpperCase()}.`
      });

    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download audio.",
        variant: "destructive"
      });
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setDownloading(null);
      setTimeout(() => setConversionProgress(0), 1000);
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

      {/* Analytics Card */}
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
                <div className="text-xl sm:text-2xl font-bold text-primary">
                  {actualDuration > 0 ? formatTime(actualDuration) : '--:--'}
                </div>
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

      {/* Custom Audio Player */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            Audio Player
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!audioReady ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary/20 animate-pulse"></div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Preparing your audio...</p>
                <p className="text-xs text-muted-foreground">This may take a moment</p>
              </div>
              <Progress value={undefined} className="w-48 h-1" />
            </div>
          ) : (
            <>
              <audio ref={audioRef} src={secureAudioUrl} className="hidden" />

              {/* Progress Bar */}
              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  max={actualDuration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  disabled={!audioReady}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(actualDuration)}</span>
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center">
                  <Button
                    onClick={togglePlayPause}
                    size="sm"
                    className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
                    disabled={!audioReady}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                    )}
                  </Button>
                </div>

                <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-32"
                />
                <span className="text-xs text-muted-foreground w-10">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </>
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
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg mb-4">
            <Download className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            Download in Multiple Formats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* Show conversion progress when downloading */}
          {downloading && conversionProgress > 0 && (
            <Card className="border-blue-200 bg-blue-50/50 mb-4">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-900 font-medium">Converting to {downloading.toUpperCase()}...</span>
                    <span className="text-blue-700 font-semibold">{Math.round(conversionProgress)}%</span>
                  </div>
                  <Progress value={conversionProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {formats.slice(0, 3).map((format) => (
              <Button
                key={format.value}
                onClick={() => handleConvertAndDownload(format.value)}
                disabled={!!downloading || !audioReady}
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
                  disabled={!!downloading || !audioReady}
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
            <Loader2 className="h-4 w-4 sm:h-5 sm:h-5 animate-spin text-blue-600" />
            <span className="text-sm sm:text-base text-blue-700 font-medium">Refreshing...</span>
          </div>
        ) : (
          <Button
            onClick={handleNextGeneration}
            size="lg"
            className="px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold bg-gradient-to-r from-gray-700 to-black hover:from-gray-900 hover:to-black text-white rounded-lg transition-all shadow-lg hover:shadow-xl w-full sm:w-auto"
          >
          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 mr-2 " />

            Next Generation
<SkipForward className="w-4 h-4 sm:w-5 sm:h-5 mr-2 rotate-180" />

          </Button>
        )}
      </div>
    </div>
  );
};

export default ModernStepFive;