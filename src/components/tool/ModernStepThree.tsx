// src/components/tool/ModernStepThree.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mic, Lock, Play, Pause, Search, CheckCircle, Clock, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/tool/VoiceRecorder";
import { VoiceHistoryDropdown } from "@/components/tool/VoiceHistoryDropdown";
import { PrebuiltVoiceService, type PrebuiltVoice } from "@/services/prebuiltVoiceService";

const sampleParagraphs: { [key: string]: string } = {
    "hi-IN": "सूरज की हल्की किरणें आज बहुत सुंदर हैं। बच्चे पार्क में खेल रहे हैं और लोग बाजार में अपने कामों में व्यस्त हैं।",
    "en-US": "This morning, the city streets are lively. People are heading to work, and street vendors are setting up their stalls.",
    "es-ES": "Hoy el parque de la ciudad está lleno de vida. Los niños juegan y el aroma de las flores frescas llena el aire.",
    "fr-FR": "Aujourd'hui, le parc de la ville est animé. Les enfants jouent et le parfum des fleurs fraîches emplit l'air.",
};

interface ModernStepThreeProps {
  onNext: () => void;
  onPrevious: () => void;
  onVoiceRecorded: (blob: Blob) => void;
  onProcessingStart: (step: string) => void;
  onProcessingEnd: () => void;
  onVoiceSelect: (voiceId: string) => void;
  selectedVoiceId: string;
  selectedLanguage: string;
}

type VoiceSelection = {
  type: 'record' | 'upload' | 'history' | 'prebuilt';
  id: string;
  name: string;
};

export default function ModernStepThree({
  onNext,
  onPrevious,
  onVoiceRecorded,
  onVoiceSelect,
  selectedLanguage,
}: ModernStepThreeProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [voiceMethod, setVoiceMethod] = useState<"record" | "upload" | "prebuilt">("record");
  const [selectedVoice, setSelectedVoice] = useState<VoiceSelection | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [prebuiltVoices, setPrebuiltVoices] = useState<PrebuiltVoice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<PrebuiltVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const canUsePrebuilt = profile?.plan !== "free";

  const clearSelection = () => {
    setSelectedVoice(null);
    onVoiceRecorded(new Blob());
    onVoiceSelect('');
  };

  useEffect(() => {
    const loadPrebuiltVoices = async () => {
      if (voiceMethod !== 'prebuilt' || !canUsePrebuilt) return;
      setLoadingVoices(true);
      try {
        const voices = await PrebuiltVoiceService.getVoicesForPlan(profile?.plan || 'free');
        setPrebuiltVoices(voices);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load prebuilt voices.", variant: "destructive" });
      } finally {
        setLoadingVoices(false);
      }
    };
    loadPrebuiltVoices();
  }, [voiceMethod, canUsePrebuilt, profile?.plan, toast]);

  useEffect(() => {
    let filtered = prebuiltVoices;
    if (selectedLanguage) {
      filtered = filtered.filter(voice => (voice as any).language === selectedLanguage);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(term) ||
        (v.category?.toLowerCase().includes(term)) ||
        (v.gender?.toLowerCase().includes(term)) ||
        (v.accent?.toLowerCase().includes(term))
      );
    }
    setFilteredVoices(filtered);
  }, [selectedLanguage, searchTerm, prebuiltVoices]);

  const handleVoiceRecorded = (blob: Blob) => {
    clearSelection();
    setSelectedVoice({ type: 'record', id: `rec-${Date.now()}`, name: 'New Recording' });
    onVoiceRecorded(blob);
    toast({ title: "Voice Recorded", description: "Your voice is ready for generation." });
  };

  const handleHistoryVoiceSelect = async (voiceId: string) => {
    clearSelection();

    const { data: voice, error } = await supabase
      .from('user_voices')
      .select('*')
      .eq('id', voiceId)
      .single();

    if (error || !voice) {
      toast({
        title: "Error",
        description: "Failed to load selected voice",
        variant: "destructive"
      });
      return;
    }

    let blob: Blob | null = null;
    if (voice.audio_blob) {
      blob = new Blob([voice.audio_blob], { type: 'audio/wav' });
    } else if (voice.audio_url) {
      try {
        const response = await fetch(voice.audio_url);
        blob = await response.blob();
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to load voice audio",
          variant: "destructive"
        });
        return;
      }
    }

    if (blob) {
      setSelectedVoice({ type: 'history', id: voiceId, name: voice.name });
      onVoiceRecorded(blob);
      toast({ title: "Voice Selected", description: `Using your saved voice: "${voice.name}".` });
    }
  };

  const handlePrebuiltSelect = (voiceId: string) => {
    clearSelection();
    const voice = prebuiltVoices.find((v) => v.voice_id === voiceId);
    setSelectedVoice({ type: 'prebuilt', id: voiceId, name: voice?.name || 'Prebuilt Voice' });
    onVoiceSelect(voiceId);
    toast({ title: "Voice Selected", description: `Selected "${voice?.name}" voice.` });
  };

  const playPrebuiltSample = async (voiceId: string) => {
    if (currentAudio) currentAudio.pause();
    const voice = prebuiltVoices.find(v => v.voice_id === voiceId);
    if (!voice?.audio_preview_url) return;
    try {
      const audio = new Audio(voice.audio_preview_url);
      setCurrentAudio(audio);
      setPlayingVoiceId(voiceId);
      setIsPlaying(true);
      audio.onended = () => { setIsPlaying(false); setPlayingVoiceId(null); setCurrentAudio(null); };
      audio.onerror = () => { setIsPlaying(false); setPlayingVoiceId(null); toast({ title: "Playback Error", variant: "destructive" }); };
      await audio.play();
    } catch (error) {
      setIsPlaying(false);
      setPlayingVoiceId(null);
      toast({ title: "Playback Error", variant: "destructive" });
    }
  };

  const currentParagraph = sampleParagraphs[selectedLanguage] || sampleParagraphs["en-US"];

  return (
    <div className="space-y-6">
      <Tabs value={voiceMethod} onValueChange={(value) => setVoiceMethod(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="record"><Mic className="h-4 w-4 mr-2" />Record</TabsTrigger>
          <TabsTrigger value="prebuilt" disabled={!canUsePrebuilt}>
            {canUsePrebuilt ? <Crown className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            Prebuilt
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5" />
                <span>Record Your Voice</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Sample Text to Read:</h4>
                <p className="text-sm leading-relaxed">{currentParagraph}</p>
              </div>
              <VoiceRecorder onRecordingComplete={handleVoiceRecorded} />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Read the text naturally at a normal pace</p>
                <p>• Ensure good audio quality and minimal background noise</p>
                <p>• Recording should be at least 10 seconds long</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Tabs defaultValue="recorded">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="recorded">
                <Clock className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="uploaded" disabled>
                <Lock className="h-4 w-4 mr-2" />
                Upload (Soon)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recorded" className="p-4 space-y-4">
              <div className="flex items-center mb-4">
                <Clock className="w-6 h-6 text-gray-700 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Your Voice History</h3>
              </div>

              <VoiceHistoryDropdown
                onVoiceSelect={handleHistoryVoiceSelect}
                selectedVoiceId={selectedVoice?.type === 'history' ? selectedVoice.id : ''}
              />

              <div className="text-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/terms")}
                >
                  Learn More About History
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="uploaded" className="p-4 text-center text-muted-foreground">
              <p>Coming Soon</p>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="prebuilt" className="space-y-4">
          {canUsePrebuilt ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5" />
                  <span>Prebuilt Voices</span>
                  <Badge>Paid</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingVoices ? <p className="text-center p-4">Loading voices...</p> : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search voices in this language..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {filteredVoices.length > 0 ? (
                        filteredVoices.map((voice) => (
                          <div key={voice.id} onClick={() => handlePrebuiltSelect(voice.voice_id)}
                               className={`border rounded-lg p-3 cursor-pointer transition-colors ${selectedVoice?.id === voice.voice_id ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium">{voice.name}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">{voice.description}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {voice.category && <Badge variant="outline" className="text-xs">{voice.category}</Badge>}
                                  {voice.gender && <Badge variant="outline" className="text-xs">{voice.gender}</Badge>}
                                  {voice.accent && <Badge variant="outline" className="text-xs">{voice.accent}</Badge>}
                                </div>
                              </div>
                              <Button variant="outline" size="icon" className="h-8 w-8"
                                      onClick={(e) => { e.stopPropagation(); playPrebuiltSample(voice.voice_id); }}
                                      disabled={isPlaying && playingVoiceId !== voice.voice_id}>
                                {playingVoiceId === voice.voice_id && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-sm text-muted-foreground p-6">
                          No prebuilt voices found for the selected language or search term.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">Prebuilt Voices Locked</h3>
                <p className="text-sm text-muted-foreground mb-4">Upgrade to Pro or Premium to access our collection of prebuilt AI voices.</p>
                <Button variant="outline" onClick={() => window.open("/payment", "_blank")}>
                  <Crown className="h-4 w-4 mr-2" /> Upgrade Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {selectedVoice && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{selectedVoice.name}</strong> is selected and ready.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>Previous</Button>
        <Button onClick={onNext} disabled={!selectedVoice} size="lg" className="px-8">
          Continue to Generate
        </Button>
      </div>
    </div>
  );
}