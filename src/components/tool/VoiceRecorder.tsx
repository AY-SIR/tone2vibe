import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Upload, Trash2, Loader2 } from "lucide-react";
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
  const [isSaving, setIsSaving] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'stopping' | 'completed'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const hasProcessedStopRef = useRef(false);

  const { toast } = useToast();

  const getSupportedMimeType = () => {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav'
    ];
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    }
    return 'audio/webm';
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    mediaRecorderRef.current = null;
    hasProcessedStopRef.current = false;
  }, []);

  const resetRecording = useCallback(() => {
    setIsRecording(false);
    setRecordingDuration(0);
    setAudioBlob(null);
    setIsPlaying(false);
    setRecordingStatus('idle');
    recordedChunksRef.current = [];
    cleanup();
  }, [cleanup]);

  const startRecording = async () => {
    try {
      resetRecording();
      setRecordingStatus('recording');
      hasProcessedStopRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100 }
      });

      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        if (hasProcessedStopRef.current) return;
        hasProcessedStopRef.current = true;

        if (recordedChunksRef.current.length === 0) {
          setRecordingStatus('idle');
          toast({ title: "Recording failed", description: "No audio captured", variant: "destructive" });
          return;
        }

        const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });

        if (recordingDuration >= minimumDuration) {
          setAudioBlob(finalBlob);
          setRecordingStatus('completed');
          toast({ title: "Recording completed", description: `${recordingDuration}s recorded successfully` });
        } else {
          setRecordingStatus('idle');
          toast({ title: "Recording too short", description: `Record at least ${minimumDuration}s`, variant: "destructive" });
          recordedChunksRef.current = [];
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setRecordingStatus('idle');
        setIsRecording(false);
        cleanup();
        toast({ title: "Recording error", description: "An error occurred during recording", variant: "destructive" });
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setRecordingDuration(0);
        intervalRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      toast({ title: "Recording started", description: "Speak clearly into your microphone" });

    } catch (error: any) {
      console.error('Recording start error:', error);
      setRecordingStatus('idle');
      setIsRecording(false);
      cleanup();

      if (error.name === 'NotAllowedError') {
        toast({ title: "Microphone access denied", description: "Allow microphone access", variant: "destructive" });
      } else if (error.name === 'NotFoundError') {
        toast({ title: "No microphone found", description: "Connect a microphone", variant: "destructive" });
      } else {
        toast({ title: "Recording failed", description: error.message || "Check microphone permissions", variant: "destructive" });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording && recordingStatus === 'recording') {
      setRecordingStatus('stopping');
      setIsRecording(false);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
    }
  };

  const playRecording = () => {
    if (!audioBlob) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setIsPlaying(false); URL.revokeObjectURL(audioUrl); toast({ title: "Playback failed", description: "Could not play recording", variant: "destructive" }); };
      audio.play();
      setIsPlaying(true);
    }
  };

  const confirmRecording = async () => {
    if (!audioBlob || isSaving) return;
    setIsSaving(true);
    try {
      onRecordingComplete(audioBlob);
      await saveRecordingToHistory();
      toast({ title: "Voice sample saved", description: "Ready to use for synthesis" });
    } catch (error) {
      console.error(error);
      toast({ title: "Save failed", description: "Failed to save recording", variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  // ✅ New saveRecordingToHistory using Supabase Storage
  const saveRecordingToHistory = async () => {
    if (!audioBlob) return;

    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not logged in');

    const filePath = `recordings/${user.id}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from('voice-recordings')
      .upload(filePath, audioBlob, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const publicUrl = supabase.storage.from('voice-recordings').getPublicUrl(filePath).publicUrl;

    const { error: insertError } = await supabase.from('history').insert({
      user_id: user.id,
      title: `Recording-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}`,
      original_text: 'User Voice Recording',
      language: 'en-US',
      words_used: 0,
      audio_url: publicUrl,
      voice_settings: {
        type: 'recorded',
        has_voice_recording: true,
        recording_duration: recordingDuration
      }
    });

    if (insertError) throw insertError;
  };

  const deleteRecording = () => {
    if (isSaving) return;
    setAudioBlob(null); setRecordingDuration(0); setIsPlaying(false); setRecordingStatus('idle');
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    recordedChunksRef.current = [];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioBlob(file);
      setRecordingStatus('completed');
      toast({ title: "Audio file uploaded", description: "File ready for processing" });
    } else {
      toast({ title: "Invalid file type", description: "Please upload an audio file", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60); const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2,'0')}`;
  };

  const getRecordingStatusMessage = () => {
    switch (recordingStatus) {
      case 'recording': return "Recording in progress...";
      case 'stopping': return "Processing recording...";
      case 'completed': return `Recording completed (${formatTime(recordingDuration)})`;
      default: return "";
    }
  };

  const isRecordingControlsDisabled = disabled || recordingStatus === 'stopping' || isSaving;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-center">
          {!isRecording ? (
            <Button onClick={startRecording} disabled={isRecordingControlsDisabled} size="lg"
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16 disabled:opacity-50">
              <Mic className="h-6 w-6" />
            </Button>
          ) : (
            <Button onClick={stopRecording} disabled={recordingStatus === 'stopping'} size="lg"
              className="bg-gray-500 hover:bg-gray-600 text-white rounded-full w-16 h-16 disabled:opacity-50">
              <Square className="h-6 w-6" />
            </Button>
          )}
        </div>

        {(isRecording || recordingDuration > 0 || recordingStatus !== 'idle') && (
          <div className="text-center">
            {isRecording && <p className="text-2xl font-mono font-bold">{formatTime(recordingDuration)}</p>}
            <p className="text-sm text-gray-500">{getRecordingStatusMessage()}</p>
            {recordingStatus === 'stopping' && <div className="flex justify-center mt-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
            {isRecording && recordingDuration < minimumDuration && (
              <p className="text-xs text-amber-600 mt-1">Record at least {minimumDuration - recordingDuration} more seconds</p>
            )}
          </div>
        )}

        {audioBlob && recordingStatus === 'completed' && (
          <div className="space-y-3">
            <div className="flex justify-center space-x-2">
              <Button onClick={playRecording} variant="outline" size="sm" disabled={isSaving}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isPlaying ? "Pause" : "Play"}
              </Button>
              <Button onClick={deleteRecording} variant="outline" size="sm" disabled={isSaving}><Trash2 className="h-4 w-4" />Delete</Button>
            </div>

            <div className="flex justify-center">
              <Button onClick={confirmRecording} disabled={isSaving} className="bg-gray-900 hover:bg-gray-600 text-white">
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Use This Recording"}
              </Button>
            </div>
          </div>
        )}

        {showUploadOption && (
          <div className="border-t pt-4">
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full" disabled={isRecording || isSaving}>
              <Upload className="h-4 w-4 mr-2" />Upload Audio File
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          {recordingStatus === 'idle' && !audioBlob && <p>Record at least {minimumDuration} seconds of clear speech</p>}
          {recordingStatus === 'recording' && <p>Speak clearly. Minimum {minimumDuration}s required.</p>}
          {recordingStatus === 'completed' && audioBlob && <p>Recording ready. Play to review or use for synthesis.</p>}
        </div>
      </CardContent>
    </Card>
  );
};
