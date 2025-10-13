import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, FileAudio, Copy, Check, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AudioDownloadDropdown } from '@/components/tool/AudioDownloadDropdown';
import { ModernAudioPlayer } from '@/components/tool/ModernAudioPlayer'; // Import the new player

interface ModernStepFiveProps {
  audioUrl: string;
  audioData?: string;
  audioMimeType: 'audio/mpeg' | 'audio/webm'; // Prop to specify audio format
  extractedText: string;
  selectedLanguage: string;
  wordCount: number;
  duration?: number;
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
  onNextGeneration,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || !profile) return;
    // Analytics are handled by the backend during generation.
  }, [user?.id, profile?.plan]);

  const formatTime = (timeInSeconds: number = 0) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{wordCount}</div>
              <div className="text-sm text-muted-foreground">Words Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatTime(duration)}
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
        <CardContent>
          <ModernAudioPlayer
            srcUrl={audioUrl}
            srcData={audioData}
            mimeType={audioMimeType}
            trackTitle="Generated Voice Output"
          />
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
              isWebM={audioMimeType === 'audio/webm'}
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
            className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-gray-700 to-black hover:from-gray-900 hover:to-black text-white rounded-lg transition-colors"
          >
            Next Generation
          </Button>
        )}
      </div>
    </div>
  );
};

export default ModernStepFive;