
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Trash2, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
  minimumDuration?: number;
}

export const VoiceRecorder = ({
  onRecordingComplete,
  disabled = false,
  minimumDuration = 5,
}: VoiceRecorderProps) => {
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'stopping' | 'completed' | 'saved'>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationRef = useRef(0);

  const { toast } = useToast();

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    intervalRef.current = null;
    streamRef.current = null;
    mediaRecorderRef.current = null;
    durationRef.current = 0;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingDuration(0);
    setIsPlaying(false);
    setRecordingStatus('idle');
    setIsSaving(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    cleanup();
  }, [cleanup]);

  const startRecording = async () => {
    resetRecording();
    try {
      setRecordingStatus('recording');
      recordedChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, noiseSuppression: false } 
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus', 
        audioBitsPerSecond: 256000 
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm;codecs=opus' });

        if (durationRef.current >= minimumDuration) {
          setAudioBlob(finalBlob);
          setRecordingStatus('completed');
          toast({ title: "Recording completed" });
        } else {
          setRecordingStatus('idle');
          toast({ title: "Recording too short", description: `Please record for at least ${minimumDuration} seconds`, variant: "destructive" });
        }
        cleanup();
      };

      mediaRecorder.start(100); // 100ms chunking for smooth capture
      toast({ title: "Recording started..." });

      intervalRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      toast({ title: "Microphone access denied", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setRecordingStatus('stopping');
      mediaRecorderRef.current.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const playRecording = () => {
    if (!audioBlob) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        toast({ title: "Playback failed", variant: "destructive" });
      };
      audio.play();
      setIsPlaying(true);
    }
  };

  const getAudioDuration = (blob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(blob);
      audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
      audio.addEventListener('error', (e) => reject(e));
    });
  };

  const confirmRecording = async () => {
    if (!audioBlob || isSaving) return;
    setIsSaving(true);

    try {
      onRecordingComplete(audioBlob);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      const fileName = `user-voice-${user.id}-${Date.now()}.webm`;
      const filePath = `${user.id}/user-voices/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-voices')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('user-voices')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL for the recording.");

      await supabase
        .from('user_voices')
        .update({ is_selected: false })
        .eq('user_id', user.id);

      const actualDuration = await getAudioDuration(audioBlob);

      const { error: insertError } = await supabase.from('user_voices').insert({
        user_id: user.id,
        name: `Recorded Voice ${new Date().toLocaleDateString()}`,
        audio_blob: audioBlob,
        audio_url: publicUrl,
        duration: Math.ceil(actualDuration).toString(),
        is_selected: true,
      });

      if (insertError) throw insertError;

      toast({ title: "Voice saved successfully!" });
      setRecordingStatus('saved');

    } catch (error: any) {
      console.error('Error saving voice:', error);
      toast({ title: "Failed to save voice", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecording = () => {
    resetRecording();
    toast({ title: "Recording deleted" });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingStatusMessage = () => {
    switch (recordingStatus) {
      case 'recording': return `Recording... (min: ${minimumDuration}s)`;
      case 'stopping': return "Finalizing...";
      case 'completed': return "Recording ready for review";
      default: return "Record a voice sample";
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4 text-center">
        <div className="flex justify-center">
          {recordingStatus !== 'recording' ? (
            <Button onClick={startRecording} disabled={disabled || recordingStatus === 'stopping' || recordingStatus === 'saved'} size="lg" className="bg-red-600 hover:bg-red-700 text-white rounded-full w-20 h-20">
              <Mic className="h-8 w-8" />
            </Button>
          ) : (
            <Button onClick={stopRecording} size="lg" className="bg-gray-700 hover:bg-gray-600 text-white rounded-full w-20 h-20">
              <Square className="h-8 w-8" />
            </Button>
          )}
        </div>

        <div className="h-12 flex flex-col items-center justify-center">
          {recordingStatus !== 'saved' ? (
            <>
              <p className="text-2xl font-mono font-bold">{formatTime(recordingDuration)}</p>
              <p className="text-sm text-muted-foreground h-5">
                {getRecordingStatusMessage()}
              </p>
              {recordingStatus === 'stopping' && <Loader2 className="h-4 w-4 animate-spin mx-auto mt-1" />}
            </>
          ) : null}
        </div>

        {recordingStatus === 'completed' && audioBlob && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex justify-center gap-2">
              <Button onClick={playRecording} variant="outline" size="sm" className="w-24" disabled={isSaving}>
                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button onClick={deleteRecording} variant="destructive" size="sm" className="w-24" disabled={isSaving}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
            <Button onClick={confirmRecording} className="w-full max-w-xs mx-auto" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving Voice...' : 'Use This Recording'}
            </Button>
          </div>
        )}

        {recordingStatus === 'saved' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <p className="font-medium">Voice Saved Successfully!</p>
            </div>
            {audioBlob && (
              <div className="flex justify-center gap-2">
                 <Button onClick={playRecording} variant="outline" size="sm" className="w-40">
                    {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {isPlaying ? "Pause" : "Play Saved Voice"}
                 </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
