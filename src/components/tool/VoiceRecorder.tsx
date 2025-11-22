import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Trash2, Loader2, CheckCircle, Mic2 } from "lucide-react";
import { toast } from "sonner";
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
  const [status, setStatus] = useState<"idle" | "recording" | "stopping" | "completed" | "saved">("idle");
  const [duration, setDuration] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const durationRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const audioUrlRef = useRef<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
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
    setStatus("idle");
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (audioRef.current) audioRef.current.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [cleanup]);

  const createDenoisedPipeline = (audioCtx: AudioContext, src: MediaStreamAudioSourceNode) => {
    const highPass = audioCtx.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = 120;

    const lowPass = audioCtx.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 8000;

    const clarityBoost = audioCtx.createBiquadFilter();
    clarityBoost.type = "peaking";
    clarityBoost.frequency.value = 3000;
    clarityBoost.gain.value = 6;

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -40;
    compressor.knee.value = 20;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    src.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(clarityBoost);
    clarityBoost.connect(compressor);

    return compressor;
  };

  const startVisualizer = (analyser: AnalyserNode, color1 = "#f97316", color2 = "#fdba74") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { width, height } = canvas;
      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 1.2;
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const visualizePlayback = (audioElement: HTMLAudioElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const src = audioCtx.createMediaElementSource(audioElement);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    startVisualizer(analyser, "#f97316", "#fdba74");

    audioElement.onended = () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  };

  const startRecording = async () => {
    onRecordingStart?.();
    reset();

    try {
      setStatus("recording");
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

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const src = audioCtx.createMediaStreamSource(stream);
      const denoisedOutput = createDenoisedPipeline(audioCtx, src);

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const dest = audioCtx.createMediaStreamDestination();
      denoisedOutput.connect(analyser);
      analyser.connect(dest);

      startVisualizer(analyser, "#f97316", "#fdba74");

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/wav";
      const recorder = new MediaRecorder(dest.stream, {
        mimeType: mime,
        audioBitsPerSecond: 192000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        if (durationRef.current >= minimumDuration) {
          setAudioBlob(blob);
          setRecordedDuration(durationRef.current);
          setStatus("completed");
          toast.success("Recording Completed", {
            description: `Successfully recorded ${durationRef.current} seconds of audio.`
          });
        } else {
          toast.error("Recording Too Short", {
            description: `Please record at least ${minimumDuration} seconds.`
          });
          reset();
        }
      };

      recorder.start(100);
      startTimeRef.current = Date.now();

      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        durationRef.current = elapsed;
      }, 500);

      toast.success("Recording Started ", {
        description: "Speak clearly into your microphone."
      });
    } catch (err: any) {
      console.error(err);
      if (err.name === "NotAllowedError") {
        setShowPermissionDialog(true);
      } else {
        toast.error("Microphone Error", {
          description: err.message || "Failed to access microphone."
        });
      }
      setStatus("idle");
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      durationRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setStatus("stopping");
      mediaRecorderRef.current.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  };

  const playRecording = () => {
    if (!audioBlob) return;
    if (!audioRef.current) {
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      visualizePlayback(audio);
      audio.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        ?.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const confirmRecording = async () => {
    if (!audioBlob || isSaving) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const generateVoiceName = () => {
        const istDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        const d = new Date(istDate);

        const randomCode = Array.from({ length: 4 }, () =>
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
            Math.floor(Math.random() * 62)
          ]
        ).join("");

        const dateStr = `${d.getDate().toString().padStart(2, "0")}${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}${d.getFullYear().toString().slice(-2)}`;
        const timeStr = `${d.getHours().toString().padStart(2, "0")}${d
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        return `Recorded_${randomCode}_${dateStr}_${timeStr}_Voice`;
      };

      const voiceName = generateVoiceName();
      const fileName = `${voiceName}.webm`;
      const path = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("user-voices")
        .upload(path, audioBlob);
      if (uploadError) throw uploadError;

      await supabase.from("user_voices").update({ is_selected: false }).eq("user_id", user.id);

      const { error: insertError } = await supabase.from("user_voices").insert([
        {
          user_id: user.id,
          name: voiceName,
          audio_url: path,
          duration: recordedDuration.toString(),
          language: selectedLanguage,
          is_selected: true,
        },
      ]);
      if (insertError) throw insertError;

      onRecordingComplete(audioBlob);
      toast.success("Voice Saved! ✨", {
        description: `${recordedDuration}s recording saved successfully.`
      });
      setStatus("saved");
    } catch (err: any) {
      toast.error("Failed to Save", {
        description: err.message || "Could not save your recording."
      });
      setIsSaving(false);
    }
  };

  const confirmDelete = () => {
    reset();
    setShowDeleteDialog(false);
    toast.success("Recording Deleted", {
      description: "Your recording has been removed."
    });
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <>
      <Card>
        <CardContent className="p-4 text-center space-y-4">
          <div className="flex justify-center">
            {status !== "recording" ? (
              <Button
                onClick={startRecording}
                disabled={disabled || status === "stopping" || status === "saved"}
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white rounded-full w-20 h-20 animate-pulse"
              >
                <Mic className="h-8 w-8" />
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                size="lg"
                className="bg-gray-700 hover:bg-gray-600 text-white rounded-full w-20 h-20"
              >
                <Square className="h-8 w-8" />
              </Button>
            )}
          </div>

          <div className="flex flex-col items-center">
            <p className="text-2xl font-mono font-bold">{formatTime(duration)}</p>
            <p className="text-sm text-muted-foreground">
              {status === "recording"
                ? "Recording..."
                : status === "stopping"
                ? "Finalizing..."
                : status === "completed"
                ? "Ready to review"
                : "Tap mic to start recording"}
            </p>

            <canvas
              ref={canvasRef}
              width={350}
              height={80}
              className="w-full max-w-md h-[80px] mt-3 rounded-md bg-gray-50 shadow-inner"
            />
          </div>

          {status === "completed" && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex justify-center gap-2">
                <Button onClick={playRecording} variant="outline" size="sm" disabled={isSaving}>
                  {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  size="sm"
                  disabled={isSaving}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
              <Button onClick={confirmRecording} className="w-full max-w-xs mx-auto" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? "Saving..." : "Continue"}
              </Button>
            </div>
          )}

          {status === "saved" && (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Voice Saved Successfully!</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
                <Button
                  onClick={playRecording}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-40 md:w-48 flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>

                <Button
                  onClick={startRecording}
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-40 md:w-48 flex items-center justify-center"
                >
                  <Mic2 className="h-4 w-4 mr-2" />
                  Record Another
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-lg w-[95vw] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your current voice sample.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MicrophonePermissionDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog} />
    </>
  );
};