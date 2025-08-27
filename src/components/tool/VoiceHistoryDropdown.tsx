
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceHistory } from "@/hooks/useVoiceHistory";
import { useToast } from "@/hooks/use-toast";

interface VoiceHistoryDropdownProps {
  onVoiceSelect: (voiceId: string) => void;
  selectedVoiceId?: string;
}

export const VoiceHistoryDropdown = ({ onVoiceSelect, selectedVoiceId }: VoiceHistoryDropdownProps) => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { projects: voices, loading, error, retentionInfo } = useVoiceHistory();

  // Show error message if there's an error loading
  useEffect(() => {
    if (error) {
      toast({
        title: "Failed to load voice history",
        description: error,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const playVoice = async (voice: any) => {
    try {
      if (playingVoice === voice.id) {
        setPlayingVoice(null);
        return;
      }

      if (voice.audio_url) {
        const audio = new Audio(voice.audio_url);
        setPlayingVoice(voice.id);
        
        audio.onended = () => {
          setPlayingVoice(null);
        };
        
        audio.onerror = () => {
          setPlayingVoice(null);
          toast({
            title: "Playback failed",
            description: "Could not play this audio",
            variant: "destructive"
          });
        };
        
        await audio.play();
      } else {
        toast({
          title: "No audio available",
          description: "This voice doesn't have audio data",
          variant: "destructive"
        });
      }
    } catch (error) {
      setPlayingVoice(null);
      toast({
        title: "Playback failed",
        description: "Could not play voice sample",
        variant: "destructive"
      });
    }
  };


  if (loading) {
    return <div className="text-sm text-gray-500">Loading voice history...</div>;
  }

  if (voices.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500 mb-1">No voice history yet</p>
          <p className="text-xs text-gray-400 mb-2">Generate voices to see them here</p>
          <p className="text-xs text-blue-600">Retention: {retentionInfo}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-blue-600 mb-2">
        Voice History • {retentionInfo} • {voices.length} entries
      </div>
      
      <Select value={selectedVoiceId} onValueChange={onVoiceSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select from voice history" />
        </SelectTrigger>
        <SelectContent>
          {voices.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              <div className="flex items-center justify-between w-full">
                <span className="truncate">{voice.title}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {voice.word_count} words • {voice.language}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedVoiceId && (
        <div className="space-y-2">
          {voices.filter(v => v.id === selectedVoiceId).map(voice => (
            <Card key={voice.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{voice.title}</p>
                    <p className="text-xs text-gray-500">
                      {voice.language} • {voice.word_count} words
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {new Date(voice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-1 flex-shrink-0">
                    {voice.audio_url && (
                      <Button
                        onClick={() => playVoice(voice)}
                        variant="outline"
                        size="sm"
                        title="Play audio"
                      >
                        {playingVoice === voice.id ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
