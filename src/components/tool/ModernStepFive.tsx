import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Play, Pause, Volume2, Clock, FileAudio, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  onBack,
  onStartOver,
  onNextGeneration,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleNextGeneration = async () => {
    setIsRefreshing(true);
    
    // Show loading screen for better UX
    toast({
      title: "✨ Preparing Next Generation",
      description: "Setting up your next voice generation...",
      duration: 2000,
    });
    
    // Navigate back to tool page instead of reloading
    setTimeout(() => {
      if (onNextGeneration) {
        onNextGeneration();
      } else if (onStartOver) {
        onStartOver();
      } else {
        // Navigate to the tool page instead of reloading
        window.location.href = '/tool';
      }
    }, 1500);
  };

  useEffect(() => {
    if (audioUrl || audioData) {
      const audioElement = new Audio();
      
      if (audioData) {
        // Convert base64 to blob URL
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

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadAudio = async (format: 'mp3' | 'wav' | 'ogg' = 'mp3') => {
    try {
      let audioBlob: Blob;
      
      if (audioData) {
        // Convert base64 to blob
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        audioBlob = new Blob([byteArray], { type: `audio/${format}` });
      } else {
        // Fetch from URL
        const response = await fetch(audioUrl);
        audioBlob = await response.blob();
      }

      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Your audio file (${format.toUpperCase()}) is downloading.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download the audio file.",
        variant: "destructive"
      });
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold"> Full Audio Generated Successfully!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your complete voice generation is ready with full analytics tracking and history saved.
        </p>
      </div>

      {/* Audio Summary */}
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

      {/* Audio Player */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Volume2 className="w-5 h-5" />
            Your Generated Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Player Controls */}
          <div className="flex items-center gap-4">
         <Button
  onClick={togglePlayPause}
  size="lg"
  className="px-5 py-3 rounded-lg"
  disabled={!audio}
>
  {isPlaying ? (
    <Pause className="w-5 h-5" />
  ) : (
    <Play className="w-5 h-5" />
  )}
</Button>

            
            <div className="flex-1">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(totalDuration)}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-100"
                  style={{
                    width: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%'
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Content */}
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

      {/* Download Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Download className="w-5 h-5" />
            Download Your Audio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={() => downloadAudio('mp3')}
              variant="default"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download MP3
            </Button>
            <Button
              onClick={() => downloadAudio('wav')}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download WAV
            </Button>
            <Button
              onClick={() => downloadAudio('ogg')}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download OGG
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation - No Back Button, Only Next Generation */}
      <div className="flex justify-center">
        {isRefreshing ? (
          <div className="flex items-center space-x-3 px-8 py-3 bg-blue-50 rounded-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-700 font-medium">Refreshing .....</span>
          </div>
        ) : (
          <Button
            onClick={handleNextGeneration}
            size="lg"
            className="px-8 py-3 text-lg font-semibold  bg-gradient-to-r from-gray-700 to-black
           hover:from-gray-900 hover:to-black
           text-white rounded-lg transition-colors"
          >
            Next Generation
          </Button>
        )}
      </div>
    </div>
  );
};

export default ModernStepFive;