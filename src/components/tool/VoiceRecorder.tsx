import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Trash2, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
  minimumDuration?: number; // in seconds
}

export const VoiceRecorder = ({
  onRecordingComplete,
  disabled = false,
  minimumDuration = 5,
}: VoiceRecorderProps) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'stopping' | 'completed' | 'saved'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const durationRef = useRef(0);
  const audioUrlRef = useRef<string>("");
  const { toast } = useToast();

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    durationRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setIsPlaying(false);
    setStatus('idle');
    setIsSaving(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [cleanup]);

  const startRecording = async () => {
    reset();
    try {
      setStatus('recording');
      recordedChunksRef.current = [];
      durationRef.current = 0;

      // --- STEP 1: Get High-Quality Audio Stream with noise reduction ---
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000, // Higher sample rate for better quality
          echoCancellation: true, // Enable to remove echo/reverb
          noiseSuppression: true, // Enable to remove background noise
          autoGainControl: true, // Normalize volume levels
        },
      });
      streamRef.current = stream;

      // --- STEP 2: Boost Volume with Web Audio API ---
      const audioContext = new AudioContext();
      // Ensure the context is active to prevent silent recordings
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.5; // Boost volume by 50%
      const dest = audioContext.createMediaStreamDestination();
      // Connect pipeline: Mic Source -> Gain (Volume) -> Final Destination
      source.connect(gainNode);
      gainNode.connect(dest);

      // --- STEP 3: Record the Processed Stream at High Bitrate ---
      const mime = 'audio/webm;codecs=opus';
      const recorder = new MediaRecorder(dest.stream, MediaRecorder.isTypeSupported(mime) ? { mimeType: mime, audioBitsPerSecond: 256000 } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) {
            toast({ title: "Recording failed", description: "No audio data captured. Please check microphone permissions.", variant: "destructive" });
            reset();
            cleanup();
            return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: mime });
        if (durationRef.current >= minimumDuration) {
          setAudioBlob(blob);
          setStatus('completed');
          toast({ title: "Recording completed" });
        } else {
          toast({ title: "Recording too short", description: `Record at least ${minimumDuration}s`, variant: "destructive" });
          reset();
        }
        cleanup();
      };

      recorder.start(100);

      intervalRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);

      toast({ title: "Recording started..." });
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({ title: "Microphone access denied", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
      setStatus('idle');
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setStatus('stopping');
      setTimeout(() => {
         mediaRecorderRef.current?.stop();
      }, 250);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (!audioBlob) return;

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }

    const url = URL.createObjectURL(audioBlob);
    audioUrlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => setIsPlaying(false);
    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
      toast({ title: "Playback failed", variant: "destructive" });
    };

    audio.play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.error("Playback promise error:", err);
        setIsPlaying(false);
        toast({ title: "Playback failed", variant: "destructive" });
      });
  };

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const getAudioDuration = (blob: Blob) => {
    return new Promise<number>((resolve, reject) => {
      const audio = document.createElement('audio');
      const url = URL.createObjectURL(blob);
      audio.src = url;

      const cleanupAudio = () => {
        URL.revokeObjectURL(url);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
      };

      const onLoaded = () => {
        const duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        cleanupAudio();
        resolve(duration > 0 ? duration : minimumDuration);
      };

      const onError = (e: Event) => {
        cleanupAudio();
        reject(e);
      };

      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', onError);
    });
  };

  const confirmRecording = async () => {
    if (!audioBlob || isSaving) return;
    setIsSaving(true);

    try {
      onRecordingComplete(audioBlob);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileName = `user-voice-${user.id}-${Date.now()}.webm`;
      const filePath = `${user.id}/user-voices/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('user-voices').upload(filePath, audioBlob);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('user-voices').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL");

      await supabase.from('user_voices').update({ is_selected: false }).eq('user_id', user.id);

      const audioDuration = Math.ceil(await getAudioDuration(audioBlob));

      const voiceName = `Recorded Voice ${new Date().toISOString().split('T')[0]}`;

      const { error: insertError } = await supabase.from('user_voices').insert({
        name: voiceName,
        audio_url: publicUrl,
        duration: audioDuration,
        is_selected: true,
      } as any);

      if (insertError) throw insertError;

      toast({ title: "Voice saved successfully!" });
      setStatus('saved');
    } catch (err: any) {
      console.error("Save error:", err);
      toast({ title: "Failed to save voice", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecording = () => reset();

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4 text-center">
        {/* Record / Stop Button */}
        <div className="flex justify-center">
          {status !== 'recording' ? (
            <Button onClick={startRecording} disabled={disabled || status === 'stopping' || status === 'saved'} size="lg" className="bg-red-600 hover:bg-red-700 text-white rounded-full w-20 h-20">
              <Mic className="h-8 w-8" />
            </Button>
          ) : (
            <Button onClick={stopRecording} size="lg" className="bg-gray-700 hover:bg-gray-600 text-white rounded-full w-20 h-20">
              <Square className="h-8 w-8" />
            </Button>
          )}
        </div>

        {/* Duration / Status */}
        <div className="h-12 flex flex-col items-center justify-center">
          {status !== 'saved' && (
            <>
              <p className="text-2xl font-mono font-bold">{formatTime(duration)}</p>
              <p className="text-sm text-muted-foreground h-5">
                {status === 'recording' ? `Recording... (min: ${minimumDuration}s)` :
                  status === 'stopping' ? "Finalizing..." :
                  status === 'completed' ? "Recording ready for review" :
                  "Record a voice sample"}
              </p>
              {status === 'stopping' && <Loader2 className="h-4 w-4 animate-spin mx-auto mt-1" />}
            </>
          )}
        </div>

        {/* Review Buttons */}
        {status === 'completed' && audioBlob && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex justify-center gap-2">
              <Button onClick={isPlaying ? pauseRecording : playRecording} variant="outline" size="sm" className="w-24" disabled={isSaving}>
                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button onClick={deleteRecording} variant="destructive" size="sm" className="w-24" disabled={isSaving}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
            <Button onClick={confirmRecording} className="w-full max-w-xs mx-auto" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isSaving ? 'Saving Voice...' : 'Use This Recording'}
            </Button>
          </div>
        )}

        {/* Saved State */}
        {status === 'saved' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <p className="font-medium">Voice Saved Successfully!</p>
            </div>

            {audioBlob && (
              <div className="flex justify-center gap-2">
                <Button onClick={isPlaying ? pauseRecording : playRecording} variant="outline" size="sm" className="w-48">
                    {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {isPlaying ? "Pause Playback" : "Play Saved Voice"}
                </Button>
              </div>
            )}

            <Button onClick={startRecording} variant="outline">Record another</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};