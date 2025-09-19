
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Clock, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceHistory } from "@/hooks/useVoiceHistory";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { supabase } from "@/integrations/supabase/client";

interface VoiceHistoryDropdownProps {
  onVoiceSelect: (voiceId: string) => void;
  selectedVoiceId?: string;
  filterType?: 'generated' | 'recorded' | 'all';
}

export const VoiceHistoryDropdown = ({ onVoiceSelect, selectedVoiceId, filterType = 'all' }: VoiceHistoryDropdownProps) => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [voiceToDelete, setVoiceToDelete] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { projects: voices, loading, error, retentionInfo, refreshHistory } = useVoiceHistory();

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

  const handleDelete = async (voiceId: string) => {
    setVoiceToDelete(voiceId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!voiceToDelete) return;

    try {
      const { error } = await supabase
        .from('history')
        .delete()
        .eq('id', voiceToDelete)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Voice deleted",
        description: "Voice history entry has been removed",
      });

      refreshHistory();
      setDeleteDialogOpen(false);
      setVoiceToDelete(null);
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Could not delete voice history entry",
        variant: "destructive"
      });
    }
  };

  // Filter projects based on type
  const filteredProjects = voices.filter((project) => {
    if (filterType === 'all') return true;
    
    const type = project.voice_settings?.type;
    
    if (filterType === 'generated') {
      const isAI = type === "generated" || type === "ai_generated" || type === "cloned";
      const isFromGeneration = !type && project.audio_url && project.original_text;
      return isAI || isFromGeneration;
    }
    
    if (filterType === 'recorded') {
      const isUserRecorded = type === "recorded" || type === "user_recorded" || type === "uploaded";
      const hasVoiceRecording = project.voice_settings?.has_voice_recording === true;
      return isUserRecorded || hasVoiceRecording;
    }
    
    return true;
  });

  if (loading) {
    return <div className="text-sm text-gray-500">Loading voice history...</div>;
  }

  if (filteredProjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500 mb-1">No {filterType === 'all' ? 'voice' : filterType} history found</p>
          <p className="text-xs text-gray-400 mb-2">
            {filterType === 'generated' && 'Create AI-generated voices to see them here'}
            {filterType === 'recorded' && 'Upload or record voice samples to see them here'}
            {filterType === 'all' && 'Generate voices to see your history'}
          </p>
          <p className="text-xs text-blue-600">Retention: {retentionInfo(filterType)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-blue-600 mb-2">
        Voice History • {retentionInfo(filterType)} • {filteredProjects.length} entries
      </div>
      
      <Select value={selectedVoiceId} onValueChange={onVoiceSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select from voice history" />
        </SelectTrigger>
        <SelectContent>
          {filteredProjects.map((voice) => (
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
          {filteredProjects.filter(v => v.id === selectedVoiceId).map(voice => (
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
                    <Button
                      onClick={() => handleDelete(voice.id)}
                      variant="outline"
                      size="sm"
                      title="Delete voice"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Voice History"
        description="Are you sure you want to delete this voice history entry? This action cannot be undone."
        itemName="this voice entry"
      />
    </div>
  );
};
