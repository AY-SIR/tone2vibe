
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Play, Pause, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VoiceStorageService } from '@/services/voiceStorageService';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceRecordingSampleProps {
  sampleText: string;
  language: string;
  onRecordingComplete?: (voiceId: string) => void;
}

export function VoiceRecordingSample({ sampleText, language, onRecordingComplete }: VoiceRecordingSampleProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

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

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playRecording = () => {
    if (audioBlob) {
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
  };

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const saveRecording = async () => {
    if (!audioBlob || !user) return;

    setIsUploading(true);
    try {
      const voiceName = `Voice Sample ${new Date().toLocaleDateString()}`;
      const duration = `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}`;

      const voiceId = await VoiceStorageService.storeVoice(
        user.id,
        voiceName,
        audioBlob,
        language,
        duration
      );

      if (voiceId) {
        toast({
          title: "Recording Saved",
          description: "Your voice sample has been saved successfully.",
        });

        if (onRecordingComplete) {
          onRecordingComplete(voiceId);
        }

        setAudioBlob(null);
        setRecordingTime(0);
      } else {
        throw new Error('Failed to save recording');
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Save Error",
        description: "Failed to save your recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="h-5 w-5" />
          <span>Record Voice Sample</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Please read the following text clearly:
          </p>
          <p className="text-gray-800 leading-relaxed">{sampleText}</p>
        </div>

        <div className="flex items-center justify-center space-x-4">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={isUploading}
              className="flex items-center space-x-2"
            >
              <Mic className="h-4 w-4" />
              <span>Start Recording</span>
            </Button>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-red-500">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
              </div>
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <Square className="h-4 w-4" />
                <span>Stop</span>
              </Button>
            </div>
          )}
        </div>

        {audioBlob && (
          <div className="flex items-center justify-center space-x-4 pt-4 border-t">
            <Button
              onClick={isPlaying ? stopPlaying : playRecording}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Play</span>
                </>
              )}
            </Button>

            <Button
              onClick={saveRecording}
              disabled={isUploading}
              className="flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Save Recording</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => setAudioBlob(null)}
              variant="outline"
              disabled={isUploading}
            >
              Discard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
