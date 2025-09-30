import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Mic } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type UserVoice = {
  id: string;
  name: string;
  created_at: string;
  audio_url: string | null;
};

interface VoiceHistoryDropdownProps {
  onVoiceSelect: (voiceId: string) => void;
  selectedVoiceId?: string;
}

export const VoiceHistoryDropdown = ({ onVoiceSelect, selectedVoiceId }: VoiceHistoryDropdownProps) => {
  const [voices, setVoices] = useState<UserVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const getLimitForPlan = () => {
    switch (profile?.plan) {
      case "premium": return 90;
      case "pro": return 30;
      case "free":
      default: return 3;
    }
  };

  const fetchUserVoices = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const limit = getLimitForPlan();
      const { data, error } = await supabase
        .from("user_voices")
        .select("id, name, created_at, audio_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setVoices(data || []);
    } catch (err) {
      toast({
        title: "Oops!",
        description: "Couldn't load your saved voices. Please try again later.",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserVoices();
  }, [user, profile?.plan]);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  };

  const playVoice = async (voice: UserVoice) => {
    if (!voice.audio_url) {
      toast({
        title: "Audio not available",
        description: "This voice does not have audio to play.",
        variant: "default",
      });
      return;
    }

    if (playingVoiceId === voice.id) {
      stopPlayback();
      return;
    }

    stopPlayback();

    const audio = new Audio(voice.audio_url);
    audioRef.current = audio;
    setPlayingVoiceId(voice.id);

    audio.onended = stopPlayback;
    audio.onerror = () => {
      stopPlayback();
      toast({
        title: "Playback issue",
        description: "Could not play this audio. Please try again later.",
        variant: "default",
      });
    };

    await audio.play();
  };

  if (loading) {
    return <div className="text-sm text-gray-500 p-4 text-center">Loading your voices...</div>;
  }

  if (voices.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <Mic className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500 mb-1">No saved voices found</p>
          <p className="text-xs text-gray-400">Record or upload a voice to see it here.</p>
        </CardContent>
      </Card>
    );
  }

  const selectedVoiceDetails = voices.find(v => v.id === selectedVoiceId);

  return (
    <div className="space-y-3">
      <div className="text-xs text-blue-600 mb-2">
        Showing your last {voices.length} saved voices ({profile?.plan} plan).
      </div>

      <Select value={selectedVoiceId} onValueChange={onVoiceSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select from your saved voices" />
        </SelectTrigger>
        <SelectContent>
          {voices.map((voice) => (
            <SelectItem
  key={voice.id}
  value={voice.id}
  className={!voice.audio_url ? "text-gray-400 cursor-not-allowed" : ""}
>
  <div className="flex items-center justify-between w-full">
    {/* Voice Name on Left */}
    <span className="truncate flex-1">{voice.name}</span>

    {/* Date + Time on Right */}
    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
      {voice.created_at ? new Date(voice.created_at).toLocaleString() : "No date"}
    </span>
  </div>
</SelectItem>

          ))}
        </SelectContent>
      </Select>

      {selectedVoiceDetails && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedVoiceDetails.name}</p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(selectedVoiceDetails.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-1 flex-shrink-0">
                <Button
                  onClick={() => playVoice(selectedVoiceDetails)}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title={selectedVoiceDetails.audio_url ? "Play/Pause audio" : "Audio not available"}
                  disabled={!selectedVoiceDetails.audio_url}
                >
                  {playingVoiceId === selectedVoiceDetails.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
