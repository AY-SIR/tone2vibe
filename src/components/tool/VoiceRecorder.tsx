
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
  minimumDuration?: number;
  showUploadOption?: boolean;
}

export const VoiceRecorder = ({ 
  onRecordingComplete, 
  disabled = false, 
  minimumDuration = 5,
  showUploadOption = false 
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });
    } catch (error) {
      toast({
        title: "Recording failed",
        description: "Please check microphone permissions",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (recordingDuration < minimumDuration) {
        toast({
          title: "Recording too short",
          description: `Please record for at least ${minimumDuration} seconds`,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Recording completed",
        description: `${recordingDuration}s recorded successfully`,
      });
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.play();
        setIsPlaying(true);
      }
    }
  };

  const confirmRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
      toast({
        title: "Voice sample saved",
        description: "Ready to use for synthesis",
      });
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingDuration(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioBlob(file);
        toast({
          title: "Audio file uploaded",
          description: "File ready for processing",
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an audio file",
          variant: "destructive"
        });
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Recording Controls */}
        <div className="flex justify-center">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={disabled}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16"
            >
              <Mic className="h-6 w-6" />
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              size="lg"
              className="bg-gray-500 hover:bg-gray-600 text-white rounded-full w-16 h-16"
            >
              <Square className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Recording Duration */}
        {(isRecording || recordingDuration > 0) && (
          <div className="text-center">
            <p className="text-2xl font-mono font-bold">
              {formatTime(recordingDuration)}
            </p>
            {isRecording && (
              <p className="text-sm text-gray-500 animate-pulse">Recording...</p>
            )}
          </div>
        )}

        {/* Audio Playback */}
        {audioBlob && !isRecording && (
          <div className="space-y-3">
            <div className="flex justify-center space-x-2">
              <Button
                onClick={playRecording}
                variant="outline"
                size="sm"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button
                onClick={deleteRecording}
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
            
           <div className="flex justify-center">
  <Button
    onClick={confirmRecording}
    className="bg-gray-900 hover:bg-gray-600 text-white"
  >
    Use This Recording
  </Button>
</div>


          </div>
        )}

        {/* File Upload Option */}
        {showUploadOption && (
          <div className="border-t pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Audio File
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 text-center">
          {!audioBlob && !isRecording && (
            <p>Record at least {minimumDuration} seconds of clear speech</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
