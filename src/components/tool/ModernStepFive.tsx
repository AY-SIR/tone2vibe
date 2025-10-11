import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, FileAudio, Copy, Check, RotateCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyticsService } from '@/services/analyticsService';
import { AudioDownloadDropdown } from './AudioDownloadDropdown';

interface ModernStepFiveProps {
  audioUrl: string;
  audioData?: string;
  extractedText: string;
  selectedLanguage: string;
  wordCount: number;
  duration?: number;
  onBack?: () => void;
  onStartOver?: () => void;
  onNextGeneration?: () => void;
}

export const ModernStepFive: React.FC<ModernStepFiveProps> = ({
  audioUrl,
  audioData,
  extractedText,
  selectedLanguage,
  wordCount,
  duration,
  onNextGeneration,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || !profile) return;
    // Analytics tracking removed - handled by backend during generation
  }, [user?.id, profile?.plan]);

  useEffect(() => {
    if (audioUrl || audioData) {
      const audioElement = new Audio();

      if (audioData) {
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mpeg' });
        audioElement.src = URL.createObjectURL(blob);
      } else {
        audioElement.src = audioUrl;
      }

      audioElement.addEventListener('loadedmetadata', () => {
        setTotalDuration(audioElement.duration);
      });

      audioElement.addEventListener('timeupdate', () => {
        setCurrentTime(audioElement.currentTime);
      });

      audioElement.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      setAudio(audioElement);

      return () => {
        audioElement.pause();
        if (audioData) {
          URL.revokeObjectURL(audioElement.src);
        }
      };
    }
  }, [audioUrl, audioData]);

  const togglePlayPause = () => {
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Removed downloadAudio function - now using AudioDownloadDropdown component

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Text copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy text to clipboard.",
        variant: "destructive"
      });
    }
  };

  const handleNextGeneration = async () => {
    setIsRefreshing(true);
    toast({
      title: "Preparing Next Generation",
      description: "Setting up your next voice generation...",
      duration: 2000,
    });

    setTimeout(() => {
      if (onNextGeneration) {
        onNextGeneration();
      } else {
        window.location.href = '/tool';
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">Audio Generated Successfully!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your complete voice generation is ready with full analytics tracking and history saved.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileAudio className="w-5 h-5" />
            Your Generated Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{wordCount}</div>
              <div className="text-sm text-muted-foreground">Words Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatTime(totalDuration)}
              </div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
            <div className="text-center">
              <Badge variant="secondary">{selectedLanguage}</Badge>
              <div className="text-sm text-muted-foreground mt-1">Language</div>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Tracked
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Analytics</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Volume2 className="w-5 h-5" />
            Audio Player
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
            <div className="flex items-center justify-between mb-6">
              <Button
                onClick={togglePlayPause}
                size="lg"
                className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={!audio}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </Button>
              <div className="flex items-center space-x-3 text-sm font-medium">
                <span className="text-primary">{formatTime(currentTime)}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{formatTime(totalDuration)}</span>
              </div>
            </div>

            {/* Modern progress bar with glow effect */}
            <div className="relative w-full h-3 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 shadow-lg"
                style={{
                  width: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%',
                  boxShadow: '0 0 10px hsl(var(--primary) / 0.5)'
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Original Text</span>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 max-h-40 overflow-y-auto">
            <p className="text-sm leading-relaxed">{extractedText}</p>
          </div>
        </CardContent>
      </Card>

         <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Download className="w-5 h-5" />
            Download Your Audio
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-4 text-center ">
        <div className="flex items-center space-x-2 border rounded-lg px-4 py-2 ">

  <p className="text-sm text-black font-semibold">
    Download in
  </p>
  <AudioDownloadDropdown
    audioUrl={audioUrl}
    fileName={`voice_${Date.now()}`}
    isWebM={false}
  />
</div>

        </CardContent>
       <p className="text-center mb-2 text-sm text-muted-foreground">
  Download available in different formats: 
  <span className="inline font-medium">.mp3</span> 
  <span className="inline font-medium">.flac</span> 
  <span className="inline font-medium">.wav</span>
</p>

      </Card>

      <div className="flex justify-center">
        {isRefreshing ? (
          <div className="flex items-center space-x-3 px-8 py-3 bg-blue-50 rounded-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-700 font-medium">Refreshing...</span>
          </div>
        ) : (
          <Button
            onClick={handleNextGeneration}
            size="lg"
            className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-gray-700 to-black
            hover:from-gray-900 hover:to-black text-white rounded-lg transition-colors"
          >
            Next Generation
          </Button>
        )}
      </div>
    </div>
  );
};

export default ModernStepFive;
