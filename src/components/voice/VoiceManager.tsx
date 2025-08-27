import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Upload, Trash2, Play, Pause, Volume2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { VoiceStorageService, StoredVoice } from '@/services/voiceStorageService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceManagerProps {
  onVoiceSelect?: (voiceId: string, voiceType: 'user' | 'prebuilt') => void;
  selectedVoiceId?: string;
}

interface PrebuiltVoice {
  id: string;
  name: string;
  description: string;
  voice_id: string;
  required_plan: string;
  category: string;
  audio_preview_url?: string;
}

export function VoiceManager({ onVoiceSelect, selectedVoiceId }: VoiceManagerProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [userVoices, setUserVoices] = useState<StoredVoice[]>([]);
  const [prebuiltVoices, setPrebuiltVoices] = useState<PrebuiltVoice[]>([]);
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
      
      // Load prebuilt voices from Supabase
      const { data, error } = await supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setPrebuiltVoices(data || []);
      
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

  const canAccessVoice = (requiredPlan: string, userPlan: string) => {
    if (requiredPlan === 'free') return true;
    if (requiredPlan === 'pro') return userPlan !== 'free';
    if (requiredPlan === 'premium') return userPlan === 'premium';
    return false;
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
                const canAccess = canAccessVoice(voice.required_plan, profile!.plan);
                const isSelected = selectedVoiceId === voice.voice_id;
                
                return (
                  <div
                    key={voice.id}
                    className={`p-4 border rounded-lg ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${!canAccess ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{voice.name}</h3>
                      <Badge variant="outline">
                        {voice.required_plan.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{voice.description}</p>
                    
                    <div className="flex items-center space-x-2">
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
                      <h3 className="font-medium">{voice.name}</h3>
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => handleVoiceSelect(voice.id, 'user')}
                          variant={isSelected ? "default" : "outline"}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </Button>
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