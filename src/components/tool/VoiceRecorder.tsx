import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Trash2, Loader as Loader2, CircleCheck as CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  minimumDuration?: number; // in seconds
  selectedLanguage: string;
}

export const VoiceRecorder = ({
  onRecordingComplete,
  onRecordingStart,
  disabled = false,
  minimumDuration = 10, // default minimum changed to 10
  selectedLanguage,
}: VoiceRecorderProps) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'stopping' | 'completed' | 'saved'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const durationRef = useRef(0);
  const recordingStartTimeRef = useRef<number>(0);
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
    recordingStartTimeRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setRecordedDuration(0);
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
    onRecordingStart?.();
    reset();
    try {
      setStatus('recording');
      recordedChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          sampleSize: 24
        }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest);

      const mime = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mime)) throw new Error("Recording not supported");

      const recorder = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 320000 });
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
        const elapsedSeconds = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setDuration(elapsedSeconds);
      }, 500);

      toast({ title: "Recording started..." });
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({ title: "Microphone access denied", description: "Allow microphone access.", variant: "destructive" });
      setStatus('idle');
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      durationRef.current = recordingStartTimeRef.current > 0
        ? Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
        : 0;

      setStatus('stopping');
      mediaRecorderRef.current.stop();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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

    if (isPlaying) audioRef.current.pause(), setIsPlaying(false);
    else audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

 // Replace the confirmRecording function in VoiceRecorder.tsx

const confirmRecording = async () => {
  if (!audioBlob || isSaving) return;

  setIsSaving(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const fileName = `user-voice-${user.id}-${Date.now()}.webm`;
    // FIXED: Store as simple path format
    const storagePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-voices')
      .upload(storagePath, audioBlob);

    if (uploadError) throw uploadError;

    // Deselect all previous voices
    await supabase
      .from('user_voices')
      .update({ is_selected: false })
      .eq('user_id', user.id);

    const audioDuration = Math.floor(recordedDuration);
    const voiceName = `Recorded Voice ${new Date().toLocaleDateString('en-CA')}`;

    // FIXED: Store storage path, not public URL
    const { error: insertError } = await supabase
      .from('user_voices')
      .insert([{
        user_id: user.id,
        name: voiceName,
        audio_url: storagePath, // Store path only
        duration: audioDuration.toString(),
        language: selectedLanguage,
        is_selected: true,
      }]);

    if (insertError) throw insertError;

    onRecordingComplete(audioBlob);

    toast({
      title: "Voice saved successfully!",
      description: `Recorded ${audioDuration}s`
    });

    setStatus('saved');

  } catch (err: any) {
    console.error("Save error:", err);
    toast({
      title: "Failed to save voice",
      description: err.message,
      variant: "destructive"
    });
    setIsSaving(false);
  }
};

  const handleDeleteClick = () => setShowDeleteDialog(true);
  const confirmDelete = () => { reset(); setShowDeleteDialog(false); toast({ title: "Recording deleted", description: "Your voice sample has been removed." }); };

  const formatTime = (sec: number) => `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`;

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

          {status === 'completed' && audioBlob && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex justify-center gap-2">
                <Button onClick={playRecording} variant="outline" size="sm" className="w-24" disabled={isSaving}>
                  {isPlaying ? <Pause className="h-4 w-4 mr-2"/> : <Play className="h-4 w-4 mr-2"/>}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button onClick={handleDeleteClick} variant="destructive" size="sm" className="w-24" disabled={isSaving}>
                  <Trash2 className="h-4 w-4 mr-2"/> Delete
                </Button>
              </div>
              <Button onClick={confirmRecording} className="w-full max-w-xs mx-auto" disabled={isSaving || status!=='completed'}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {isSaving ? 'Saving Voice...' : 'Continue'}
              </Button>
            </div>
          )}

          {status === 'saved' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-center gap-2 text-green-600">

                <p className="font-medium">Voice Saved Successfully!</p>
              </div>
              {audioBlob && (
                <div className="flex justify-center gap-2">
                  <Button onClick={playRecording} variant="outline" size="sm" className="w-48">
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this voice recording? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
