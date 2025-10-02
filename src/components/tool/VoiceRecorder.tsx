import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Trash2, Loader as Loader2, CircleCheck as CheckCircle } from "lucide-react";
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
  minimumDuration = 3,
}: VoiceRecorderProps) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'stopping' | 'completed' | 'saved'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const audioUrlRef = useRef<string>("");

  const ffmpegRef = useRef<any>(null);
  const fetchFileRef = useRef<any>(null);

  const { toast } = useToast();

  // Load FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpegPkg = await import("@ffmpeg/ffmpeg");
        ffmpegRef.current = new ffmpegPkg.FFmpeg({ log: true });
        fetchFileRef.current = ffmpegPkg.fetchFile;
        await ffmpegRef.current.load();
        setIsFFmpegLoaded(true);
        console.log("FFmpeg loaded successfully");
      } catch (err) {
        console.error("Failed to load FFmpeg:", err);
        toast({ title: "FFmpeg failed to load", variant: "destructive" });
      }
    };
    loadFFmpeg();
  }, [toast]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
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
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [cleanup]);

  const startRecording = async () => {
    reset();
    try {
      setStatus('recording');
      recordedChunksRef.current = [];
      setDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);

      const highPass = audioContext.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 100;

      const lowPass = audioContext.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 15000;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.2;

      source.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(gainNode);

      const dest = audioContext.createMediaStreamDestination();
      gainNode.connect(dest);

      const mime = 'audio/webm;codecs=opus';
      const recorder = new MediaRecorder(dest.stream, MediaRecorder.isTypeSupported(mime) ? { mimeType: mime, audioBitsPerSecond: 256000 } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) {
          toast({ title: "Recording failed", variant: "destructive" });
          reset();
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const tempAudio = document.createElement('audio');
        tempAudio.src = URL.createObjectURL(blob);
        tempAudio.onloadedmetadata = () => {
          const recordedDuration = tempAudio.duration;
          if (recordedDuration >= minimumDuration) {
            setAudioBlob(blob);
            setStatus('completed');
            toast({ title: "Recording completed" });
          } else {
            toast({ title: "Recording too short", variant: "destructive" });
            reset();
          }
        };
      };

      recorder.start(100);

      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      toast({ title: "Recording started..." });

    } catch (err) {
      console.error(err);
      toast({ title: "Microphone access denied", variant: "destructive" });
      setStatus('idle');
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setStatus('stopping');
      mediaRecorderRef.current.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const convertWebMtoMP3 = async (webmBlob: Blob): Promise<Blob> => {
    if (!ffmpegRef.current || !fetchFileRef.current) throw new Error("FFmpeg not loaded yet");
    if (!isFFmpegLoaded) throw new Error("FFmpeg not loaded yet");

    ffmpegRef.current.FS('writeFile', 'input.webm', await fetchFileRef.current(webmBlob));
    await ffmpegRef.current.run('-i', 'input.webm', '-ar', '44100', '-ac', '2', '-b:a', '192k', 'output.mp3');
    const mp3Data = ffmpegRef.current.FS('readFile', 'output.mp3');
    ffmpegRef.current.FS('unlink', 'input.webm');
    ffmpegRef.current.FS('unlink', 'output.mp3');

    return new Blob([mp3Data.buffer], { type: 'audio/mpeg' });
  };

  const confirmRecording = async () => {
    if (!audioBlob || isSaving) return;

    if (!isFFmpegLoaded) {
      toast({ title: "FFmpeg is still loading, please wait...", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const mp3Blob = await convertWebMtoMP3(audioBlob);
      onRecordingComplete(mp3Blob);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileName = `voice-${user.id}-${Date.now()}.mp3`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('user-voices').upload(filePath, mp3Blob, { contentType: 'audio/mpeg' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('user-voices').getPublicUrl(filePath);
      if (!urlData || !urlData.publicUrl) throw new Error("Failed to get public URL");

      toast({ title: "Voice saved successfully!" });
      setStatus('saved');
      setAudioBlob(mp3Blob);

    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to save voice", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const playRecording = () => {
    if (!audioBlob) return;

    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const url = URL.createObjectURL(audioBlob);
    audioUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => toast({ title: "Playback failed", variant: "destructive" });

    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => reset();

  const formatTime = (sec: number) => `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`;

  return (
    <Card>
      <CardContent className="p-4 space-y-4 text-center">
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

        <div className="h-12 flex flex-col items-center justify-center">
          <p className="text-2xl font-mono font-bold">{formatTime(duration)}</p>
          <p className="text-sm text-muted-foreground h-5">
            {status === 'recording' ? "Recording..." :
             status === 'stopping' ? "Finalizing..." :
             status === 'completed' ? "Recording ready" : "Record a voice sample"}
          </p>
          {status === 'stopping' && <Loader2 className="h-4 w-4 animate-spin mx-auto mt-1" />}
        </div>

        {status === 'completed' && audioBlob && (
          <div className="space-y-3">
            <div className="flex justify-center gap-2">
              <Button onClick={isPlaying ? pauseRecording : playRecording} variant="outline" size="sm" className="w-24">
                {isPlaying ? <Pause className="h-4 w-4 mr-2"/> : <Play className="h-4 w-4 mr-2"/>}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button onClick={deleteRecording} variant="destructive" size="sm" className="w-24">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
            <Button onClick={confirmRecording} className="w-full max-w-xs mx-auto">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isSaving ? 'Saving...' : 'Use This Recording'}
            </Button>
          </div>
        )}

        {status === 'saved' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <p className="font-medium">Voice Saved Successfully!</p>
            </div>
            {audioBlob && (
              <div className="flex justify-center gap-2">
                <Button onClick={isPlaying ? pauseRecording : playRecording} variant="outline" size="sm" className="w-48">
                  {isPlaying ? <Pause className="h-4 w-4 mr-2"/> : <Play className="h-4 w-4 mr-2"/>}
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
