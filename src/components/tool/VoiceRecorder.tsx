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
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'stopping' | 'completed'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  // Get supported MIME type
  const getSupportedMimeType = () => {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav'
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return 'audio/webm'; // Fallback
  };

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    try {
      setRecordingStatus('recording');
      recordedChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      const supportedMimeType = getSupportedMimeType();

      console.log('Using MIME type:', supportedMimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped. Chunks:', recordedChunksRef.current.length);
        console.log('Recording duration:', recordingDuration);

        if (recordedChunksRef.current.length > 0) {
          const finalBlob = new Blob(recordedChunksRef.current, { type: supportedMimeType });
          console.log('Created blob:', finalBlob.size, 'bytes');

          // Only set audio blob if duration is sufficient
          if (recordingDuration >= minimumDuration) {
            setAudioBlob(finalBlob);
            setRecordingStatus('completed');
            toast({
              title: "Recording completed",
              description: `${recordingDuration}s recorded successfully`,
            });
          } else {
            setRecordingStatus('idle');
            toast({
              title: "Recording too short",
              description: `Please record for at least ${minimumDuration} seconds`,
              variant: "destructive"
            });
          }
        } else {
          setRecordingStatus('idle');
          toast({
            title: "Recording failed",
            description: "No audio data was captured",
            variant: "destructive"
          });
        }

        cleanup();
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setRecordingStatus('idle');
        toast({
          title: "Recording error",
          description: "An error occurred during recording",
          variant: "destructive"
        });
        cleanup();
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
        setIsRecording(true);
        setRecordingDuration(0);

        // Start duration counter
        intervalRef.current = setInterval(() => {
          setRecordingDuration(prev => {
            const newDuration = prev + 1;
            console.log('Recording duration:', newDuration);
            return newDuration;
          });
        }, 1000);
      };

      mediaRecorderRef.current = mediaRecorder;

      // Start recording with smaller timeslice for better data availability
      mediaRecorder.start(250);

      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });

    } catch (error) {
      console.error('Recording start error:', error);
      setRecordingStatus('idle');
      cleanup();

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          toast({
            title: "Microphone access denied",
            description: "Please allow microphone access and try again",
            variant: "destructive"
          });
        } else if (error.name === 'NotFoundError') {
          toast({
            title: "No microphone found",
            description: "Please connect a microphone and try again",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Recording failed",
            description: `Error: ${error.message}`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Recording failed",
          description: "Please check microphone permissions",
          variant: "destructive"
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      setRecordingStatus('stopping');
      setIsRecording(false);

      // Stop the media recorder - this will trigger the onstop event
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      // Stop the interval immediately
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
          };

          audio.onerror = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
            toast({
              title: "Playback failed",
              description: "Could not play the recording",
              variant: "destructive"
            });
          };

          audio.play();
          setIsPlaying(true);
        } catch (error) {
          toast({
            title: "Playback failed",
            description: "Could not create audio URL",
            variant: "destructive"
          });
        }
      }
    }
  };

  const confirmRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
      saveRecordingToHistory();
      toast({
        title: "Voice sample saved",
        description: "Ready to use for synthesis and saved to history",
      });
    }
  };

  const saveRecordingToHistory = async () => {
    if (!audioBlob) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('history').insert({
          user_id: user.id,
          title: `Recording-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}`,
          original_text: 'User Voice Recording',
          language: 'en-US',
          words_used: 0,
          audio_url: `data:${audioBlob.type};base64,${base64Audio}`,
          voice_settings: {
            type: 'recorded',
            has_voice_recording: true,
            recording_duration: recordingDuration
          }
        });
      }
    } catch (error) {
      console.error('Error saving recording to history:', error);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingDuration(0);
    setIsPlaying(false);
    setRecordingStatus('idle');

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    cleanup();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioBlob(file);
        setRecordingStatus('completed');
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

  const getRecordingStatusMessage = () => {
    switch (recordingStatus) {
      case 'recording':
        return "Recording...";
      case 'stopping':
        return "Finalizing...";
      case 'completed':
        return "Recording ready";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Recording Controls */}
        <div className="flex justify-center">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={disabled || recordingStatus === 'stopping'}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16 disabled:opacity-50"
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

        {/* Recording Duration and Status */}
        {(isRecording || recordingDuration > 0 || recordingStatus !== 'idle') && (
          <div className="text-center">
            <p className="text-2xl font-mono font-bold">
              {formatTime(recordingDuration)}
            </p>
            <p className="text-sm text-gray-500">
              {getRecordingStatusMessage()}
            </p>
            {recordingStatus === 'stopping' && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mx-auto mt-2"></div>
            )}
          </div>
        )}

        {/* Audio Playback */}
        {audioBlob && recordingStatus === 'completed' && (
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
              disabled={isRecording}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Audio File
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 text-center">
          {recordingStatus === 'idle' && !audioBlob && (
            <p>Record at least {minimumDuration} seconds of clear speech</p>
          )}
          {recordingStatus === 'recording' && (
            <p>Speak clearly. Minimum {minimumDuration}s required.</p>
          )}
        </div>

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 border-t pt-2">
            <p>Status: {recordingStatus}</p>
            <p>Duration: {recordingDuration}s</p>
            <p>Audio: {audioBlob ? `${Math.round(audioBlob.size / 1024)}KB` : 'None'}</p>
            <p>MIME: {getSupportedMimeType()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
