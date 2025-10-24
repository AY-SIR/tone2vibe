
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, RotateCcw, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LiveAudioPreviewProps {
  extractedText: string;
  selectedLanguage: string;
  voiceRecording: Blob | null;
  speed: number[];
  pitch: number[];
  tone: string;
  expression: string;
  pauseLength: number[];
  onSpeedChange: (value: number[]) => void;
  onPitchChange: (value: number[]) => void;
  onToneChange: (value: string) => void;
  onExpressionChange: (value: string) => void;
  onPauseLengthChange: (value: number[]) => void;
  isGenerating: boolean;
  onRegeneratePreview: () => void;
}

export function LiveAudioPreview({
  extractedText,
  selectedLanguage,
  voiceRecording,
  speed,
  pitch,
  tone,
  expression,
  pauseLength,
  onSpeedChange,
  onPitchChange,
  onToneChange,
  onExpressionChange,
  onPauseLengthChange,
  isGenerating,
  onRegeneratePreview
}: LiveAudioPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([0.8]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const { toast } = useToast();

  const tones = [
    { value: "neutral", label: "Neutral" },
    { value: "warm", label: "Warm" },
    { value: "professional", label: "Professional" },
    { value: "friendly", label: "Friendly" },
    { value: "authoritative", label: "Authoritative" }
  ];

  const expressions = [
    { value: "natural", label: "Natural" },
    { value: "cheerful", label: "Cheerful" },
    { value: "calm", label: "Calm" },
    { value: "excited", label: "Excited" },
    { value: "serious", label: "Serious" }
  ];

  // Generate preview when settings change
  useEffect(() => {
    if (extractedText && voiceRecording) {
      generatePreview();
    }
  }, [speed, pitch, tone, expression, pauseLength]);

  const generatePreview = async () => {
    if (isGeneratingPreview) return;
    
    setIsGeneratingPreview(true);
    try {
      // Get a short preview text (first 100 characters)
      const previewText = extractedText.substring(0, 100) + "...";
      
      // Use existing generate-voice function for preview (no word deduction for samples)
      const { data, error } = await supabase.functions.invoke('generate-voice', {
        body: {
          text: previewText,
          voice_settings: {
            voice: 'alloy',
            speed: 1.0,
            pitch: 0,
            volume: 1.0
          },
          is_sample: true // Mark as sample to avoid word deduction
        }
      }).catch((err) => {
        console.warn('Network error calling edge function:', err);
        return { data: null, error: 'Network connection failed' };
      });

      if (error) {
        console.warn('Preview generation warning:', error);
        toast({
          title: "Preview unavailable",
          description: "Preview generation is temporarily unavailable. You can still generate the full audio.",
          variant: "default"
        });
        return;
      }

      if (data && typeof data === 'object' && 'arrayBuffer' in data) {
        // Handle binary audio data
        const arrayBuffer = data as ArrayBuffer;
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        // Clean up previous URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        
        setPreviewUrl(url);
      } else if (data && typeof data === 'string') {
        // Handle base64 audio data
        const audioDataUrl = `data:audio/mpeg;base64,${data}`;
        setPreviewUrl(audioDataUrl);
      } else {
        console.warn('Unexpected preview response format:', data);
        toast({
          title: "Preview unavailable",
          description: "Preview generation returned unexpected format.",
          variant: "default"
        });
      }
    } catch (error) {
      console.warn('Preview generation error:', error);
      toast({
        title: "Preview unavailable",
        description: "Preview is currently unavailable. You can still generate the full audio.",
        variant: "default"
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !previewUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((error) => {
        console.warn('Audio playback failed:', error);
        toast({
          title: "Playback failed",
          description: "Could not play audio preview. Please try regenerating.",
          variant: "default"
        });
      });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value[0];
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPreviewText = () => {
    const words = extractedText.split(' ');
    return words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : '');
  };

  const handleRegeneratePreview = async () => {
    await generatePreview();
    onRegeneratePreview();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
          <Volume2 className="h-4 w-4 md:h-5 md:w-5" />
          <span>Live Audio Preview</span>
          <Badge variant="secondary" className="text-xs">Real-time</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6">
        {/* Audio Player */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Preview Audio</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegeneratePreview}
              disabled={isGenerating || isGeneratingPreview}
              className="text-xs"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              {isGeneratingPreview ? 'Generating...' : 'Regenerate'}
            </Button>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayback}
              disabled={!previewUrl || isGenerating || isGeneratingPreview}
              className="flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-gray-500" />
              <Slider
                value={volume}
                onValueChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.1}
                className="w-16"
              />
            </div>
          </div>
          
          {previewUrl && (
            <>
              <audio
                ref={audioRef}
                src={previewUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                preload="metadata"
              />
              {duration === 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                  <span>Preparing preview...</span>
                </div>
              )}
            </>
          )}
        </div>

        <Separator />

        {/* Real-time Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Voice Controls</h3>
          
          {/* Speed Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm">Speed</label>
              <span className="text-sm text-gray-500">{speed[0].toFixed(1)}x</span>
            </div>
            <Slider
              value={speed}
              onValueChange={onSpeedChange}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Pitch Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm">Pitch</label>
              <span className="text-sm text-gray-500">{pitch[0].toFixed(1)}x</span>
            </div>
            <Slider
              value={pitch}
              onValueChange={onPitchChange}
              min={0.5}
              max={1.5}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Pause Length Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm">Pause Length</label>
              <span className="text-sm text-gray-500">{pauseLength[0].toFixed(1)}x</span>
            </div>
            <Slider
              value={pauseLength}
              onValueChange={onPauseLengthChange}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        <Separator />

        {/* Tone and Expression Controls */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Voice Tone</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {tones.map((t) => (
                <Button
                  key={t.value}
                  variant={tone === t.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToneChange(t.value)}
                  className="text-xs"
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Expression</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {expressions.map((exp) => (
                <Button
                  key={exp.value}
                  variant={expression === exp.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onExpressionChange(exp.value)}
                  className="text-xs"
                >
                  {exp.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview Text */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Preview Text</label>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 max-h-20 overflow-y-auto">
            {getPreviewText()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
