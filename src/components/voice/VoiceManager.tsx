
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Upload, Trash2, Play, Pause, Volume2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { VoiceStorageService, StoredVoice } from '@/services/voiceStorageService';
import { VoiceCollectionService, VoiceCollection } from '@/services/voiceCollectionService';
import { useToast } from '@/hooks/use-toast';

interface VoiceManagerProps {
  onVoiceSelect?: (voiceId: string, voiceType: 'user' | 'prebuilt') => void;
  selectedVoiceId?: string;
}

export function VoiceManager({ onVoiceSelect, selectedVoiceId }: VoiceManagerProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [userVoices, setUserVoices] = useState<StoredVoice[]>([]);
  const [prebuiltVoices, setPrebuiltVoices] = useState<VoiceCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      loadVoices();
    }
  }, [user, profile]);

  const loadVoices = async () => {
    try {
      setLoading(true);
      
      // Load user's custom voices
      const userVoiceList = await VoiceStorageService.getUserVoices(user!.id);
      setUserVoices(userVoiceList);
      
      // Load prebuilt voices based on user's plan
      const prebuiltVoiceList = await VoiceCollectionService.getVoicesForPlan(profile!.plan);
      setPrebuiltVoices(prebuiltVoiceList);
      
    } catch (error) {
      console.error('Error loading voices:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load voice collections.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceSelect = (voiceId: string, voiceType: 'user' | 'prebuilt') => {
    if (onVoiceSelect) {
      onVoiceSelect(voiceId, voiceType);
    }
  };

  const playVoicePreview = async (voice: StoredVoice | VoiceCollection) => {
    try {
      if (playingVoice === voice.id) {
        setPlayingVoice(null);
        return;
      }

      let audioUrl: string | null = null;
      
      if ('audio_blob' in voice) {
        // User voice
        audioUrl = await VoiceStorageService.getVoiceAudioUrl(voice as StoredVoice);
      } else {
        // Prebuilt voice
        audioUrl = (voice as VoiceCollection).audio_preview_url || null;
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        setPlayingVoice(voice.id);
        
        audio.onended = () => setPlayingVoice(null);
        audio.onerror = () => {
          setPlayingVoice(null);
          toast({
            title: "Playback Error",
            description: "Could not play voice preview.",
            variant: "destructive",
          });
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing voice preview:', error);
      setPlayingVoice(null);
      toast({
        title: "Playback Error",
        description: "Could not play voice preview.",
        variant: "destructive",
      });
    }
  };

  const deleteUserVoice = async (voiceId: string) => {
    try {
      const success = await VoiceStorageService.deleteVoice(voiceId);
      if (success) {
        setUserVoices(prev => prev.filter(v => v.id !== voiceId));
        toast({
          title: "Voice Deleted",
          description: "Voice has been successfully deleted.",
        });
      }
    } catch (error) {
      console.error('Error deleting voice:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete voice.",
        variant: "destructive",
      });
    }
  };

  const getPlanBadgeColor = (requiredPlan: string, userPlan: string) => {
    if (requiredPlan === 'free') return 'bg-green-100 text-green-800';
    if (requiredPlan === 'pro') return userPlan === 'free' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800';
    if (requiredPlan === 'premium') return userPlan === 'premium' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
            <span>Loading voices...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Volume2 className="h-5 w-5" />
          <span>Voice Manager</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="prebuilt" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prebuilt">Prebuilt Voices</TabsTrigger>
            <TabsTrigger value="custom">My Voices ({userVoices.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="prebuilt" className="space-y-4">
            <div className="grid gap-4">
              {prebuiltVoices.map((voice) => {
                const canAccess = VoiceCollectionService.canAccessVoice(voice, profile!.plan);
                const isSelected = selectedVoiceId === voice.voice_id;
                
                return (
                  <div
                    key={voice.id}
                    className={`p-4 border rounded-lg ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${!canAccess ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{voice.name}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPlanBadgeColor(voice.required_plan, profile!.plan)}>
                          {voice.required_plan.toUpperCase()}
                        </Badge>
                        {voice.category && (
                          <Badge variant="outline">
                            {voice.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{voice.description}</p>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => playVoicePreview(voice)}
                        disabled={!canAccess || !voice.audio_preview_url}
                      >
                        {playingVoice === voice.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => handleVoiceSelect(voice.voice_id, 'prebuilt')}
                        disabled={!canAccess}
                        variant={isSelected ? "default" : "outline"}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                      
                      {!canAccess && (
                        <span className="text-sm text-gray-500">
                          Upgrade to {voice.required_plan} plan
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="custom" className="space-y-4">
            {userVoices.length === 0 ? (
              <div className="text-center py-8">
                <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No custom voices recorded yet</p>
                <p className="text-sm text-gray-400">
                  Record your own voice to create personalized audio
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {userVoices.map((voice) => {
                  const isSelected = selectedVoiceId === voice.id;
                  
                  return (
                    <div
                      key={voice.id}
                      className={`p-4 border rounded-lg ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{voice.custom_name || voice.name}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{voice.language}</Badge>
                          {voice.duration && (
                            <Badge variant="secondary">{voice.duration}</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => playVoicePreview(voice)}
                        >
                          {playingVoice === voice.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          onClick={() => handleVoiceSelect(voice.id, 'user')}
                          variant={isSelected ? "default" : "outline"}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUserVoice(voice.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Created: {new Date(voice.created_at).toLocaleDateString()}
                        {voice.file_size && (
                          <span className="ml-4">
                            Size: {(voice.file_size / 1024).toFixed(1)}KB
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
