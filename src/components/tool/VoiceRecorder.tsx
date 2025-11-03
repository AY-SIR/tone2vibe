import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic, Square, Play, Pause, Trash2,
  Loader as Loader2, CircleCheck as CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MicrophonePermissionDialog } from "@/components/common/MicrophonePermissionDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onRecordingStart?: () => void;
  disabled?: boolean;
  minimumDuration?: number;
  selectedLanguage: string;
}

export const VoiceRecorder = ({
  onRecordingComplete,
  onRecordingStart,
  disabled = false,
  minimumDuration = 10,
  selectedLanguage,
}: VoiceRecorderProps) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'stopping' | 'completed' | 'saved'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [volume, setVolume] = useState(0);
  const [plan, setPlan] = useState<'free' | 'pro' | 'premium'>('free');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const durationRef = useRef(0);
  const recordingStartTimeRef = useRef<number>(0);
  const audioUrlRef = useRef<string>("");
  const { toast } = useToast();

  // 🟢 Fetch user plan securely from Supabase
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("user_profiles")
          .select("plan")
          .eq("user_id", user.id)
          .single();

        if (error || !data?.plan) setPlan("free");
        else setPlan(data.plan);
      } catch {
        setPlan("free");
      }
    };
    fetchPlan();
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    streamRef.current = null;
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setRecordedDuration(0);
    setIsPlaying(false);
    setStatus('idle');
    setIsSaving(false);
    setVolume(0);

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

  // 🎙️ Start Recording
  const startRecording = async () => {
    onRecordingStart?.();
    reset();

    try {
      setStatus('recording');
      recordedChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      if (audioContext.state === "suspended") await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);

      // 🧠 Voice enhancement filter (Pro + Premium)
      let inputNode: AudioNode = source;
      if (plan === "pro" || plan === "premium") {
        const lowCut = audioContext.createBiquadFilter();
        lowCut.type = "highpass";
        lowCut.frequency.value = 100;

        const clarityBoost = audioContext.createBiquadFilter();
        clarityBoost.type = "peaking";
        clarityBoost.frequency.value = 2500;
        clarityBoost.gain.value = 4;

        source.connect(lowCut);
        lowCut.connect(clarityBoost);
        inputNode = clarityBoost;
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const dest = audioContext.createMediaStreamDestination();
      inputNode.connect(analyser);
      analyser.connect(dest);

      // 🎛️ Visualization
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(avg);
        if (status === 'recording') requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 🧩 Bitrate based on plan
      const bitrate =
        plan === "premium" ? 192000 :
        plan === "pro" ? 128000 :
        48000;

      const mime = 'audio/webm;codecs=opus';
      const recorder = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: bitrate });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const finalDuration = durationRef.current;
        cleanup();

        if (recordedChunksRef.current.length === 0) {
          toast({ title: "Recording failed", description: "No audio data captured.", variant: "destructive" });
          reset();
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: mime });

        if (finalDuration >= minimumDuration) {
          setAudioBlob(blob);
          setRecordedDuration(finalDuration);
          setStatus('completed');
          toast({ title: "Recording completed" });
        } else {
          toast({ title: "Recording too short", description: `Record at least ${minimumDuration}s`, variant: "destructive" });
          reset();
        }
      };

      recorder.start(100);
      recordingStartTimeRef.current = Date.now();
      setDuration(0);

      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setDuration(elapsed);
        durationRef.current = elapsed;
      }, 500);

      toast({ title: `Recording started (${plan.toUpperCase()})` });
    } catch (err) {
      console.error("Error starting recording:", err);
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "NotFoundError")) {
        setShowPermissionDialog(true);
      } else {
        toast({
          title: "Recording Error",
          description: "Unable to start recording. Please check microphone access.",
          variant: "destructive",
        });
      }
      setStatus('idle');
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      durationRef.current = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      setStatus('stopping');
      mediaRecorderRef.current.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const playRecording = () => {
    if (!audioBlob) return;
    if (!audioRef.current) {
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // 💾 Save recording securely to Supabase
  const confirmRecording = async () => {
    if (!audioBlob || isSaving) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileName = `voice-${user.id}-${Date.now()}.webm`;
      const path = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('user-voices').upload(path, audioBlob);
      if (uploadError) throw uploadError;

      await supabase.from('user_voices').update({ is_selected: false }).eq('user_id', user.id);

      const voiceName = `Voice ${new Date().toLocaleDateString('en-CA')}`;
      const { error: insertError } = await supabase.from('user_voices').insert([{
        user_id: user.id,
        name: voiceName,
        audio_url: path,
        duration: recordedDuration.toString(),
        language: selectedLanguage,
        is_selected: true,
      }]);
      if (insertError) throw insertError;

      onRecordingComplete(audioBlob);
      toast({ title: "Voice saved!", description: `${recordedDuration}s recorded.` });
      setStatus('saved');
    } catch (err: any) {
      toast({
        title: "Failed to save voice",
        description: err.message,
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const confirmDelete = () => { reset(); setShowDeleteDialog(false); toast({ title: "Recording deleted" }); };
  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // 🧠 UI
  return (
    <>
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

          <div className="flex flex-col items-center space-y-1">
            <p className="text-2xl font-mono font-bold">{formatTime(duration)}</p>
            <p className="text-sm text-muted-foreground">
              {status === 'recording' ? `Recording... (${plan.toUpperCase()})` :
               status === 'stopping' ? "Finalizing..." :
               status === 'completed' ? "Ready to review" :
               "Tap mic to start recording"}
            </p>

            {status === 'recording' && (
              <div className="w-full max-w-sm bg-gray-200 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-green-500 h-2 transition-all duration-100"
                  style={{ width: `${Math.min(volume / 1.5, 100)}%` }}
                />
              </div>
            )}
          </div>

          {status === 'completed' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex justify-center gap-2">
                <Button onClick={playRecording} variant="outline" size="sm" className="w-24" disabled={isSaving}>
                  {isPlaying ? <Pause className="h-4 w-4 mr-2"/> : <Play className="h-4 w-4 mr-2"/>}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button onClick={() => setShowDeleteDialog(true)} variant="destructive" size="sm" className="w-24" disabled={isSaving}>
                  <Trash2 className="h-4 w-4 mr-2"/> Delete
                </Button>
              </div>
              <Button onClick={confirmRecording} className="w-full max-w-xs mx-auto" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {isSaving ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          )}

          {status === 'saved' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Voice Saved Successfully!</p>
              </div>
              <Button onClick={playRecording} variant="outline" size="sm" className="w-48">
                {isPlaying ? <Pause className="h-4 w-4 mr-2"/> : <Play className="h-4 w-4 mr-2"/>}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button onClick={startRecording} variant="outline">Record another</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this voice recording?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permission Dialog */}
      <MicrophonePermissionDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog} />
    </>
  );
};
