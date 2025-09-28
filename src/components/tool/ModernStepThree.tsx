import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mic, Upload, Crown, Lock, Play, Pause, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { VoiceRecorder } from "@/components/tool/VoiceRecorder";
import { VoiceHistoryDropdown } from "@/components/tool/VoiceHistoryDropdown";
import { PrebuiltVoiceService, type PrebuiltVoice } from "@/services/prebuiltVoiceService";
import { UploadLimitService } from "@/services/uploadLimitService";

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

export default function ModernStepThree({
  onNext,
  onPrevious,
  onVoiceRecorded,
  onProcessingStart,
  onProcessingEnd,
  onVoiceSelect,
  selectedVoiceId,
  selectedLanguage,
}: ModernStepThreeProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [voiceMethod, setVoiceMethod] = useState<"record" | "upload" | "prebuilt">("record");
  const [hasVoiceData, setHasVoiceData] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [sampleParagraphs, setSampleParagraphs] = useState<{ [key: string]: string }>({});
  const [prebuiltVoices, setPrebuiltVoices] = useState<PrebuiltVoice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<PrebuiltVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const canUsePrebuilt = profile?.plan !== "free";
  const uploadLimit = UploadLimitService.getUploadLimit(profile?.plan || 'free');

  useEffect(() => {
    const paragraphs = {
      "en-US":
        "Hello, this is a sample paragraph for voice recording. Please read this text clearly and naturally to create your voice sample. Make sure to speak at a normal pace with clear pronunciation.",
      "hi-IN":
        "नमस्ते, यह वॉयस रिकॉर्डिंग के लिए एक नमूना पैराग्राफ है। कृपया इस टेक्स्ट को स्पष्ट और प्राकृतिक तरीके से पढ़ें ताकि आपका वॉयस सैंपल बन सके।",
      "es-ES":
        "Hola, este es un párrafo de muestra para la grabación de voz. Por favor, lee este texto con claridad y naturalidad para crear tu muestra de voz.",
      "fr-FR":
        "Bonjour, ceci est un paragraphe d'exemple pour l'enregistrement vocal. Veuillez lire ce texte clairement et naturellement pour créer votre échantillon vocal.",
      "de-DE":
        "Hallo, das ist ein Beispielparagraph für die Sprachaufnahme. Bitte lesen Sie diesen Text klar und natürlich vor, um Ihr Stimmbeispiel zu erstellen.",
    };
    setSampleParagraphs(paragraphs);
  }, []);

  useEffect(() => {
    const loadPrebuiltVoices = async () => {
      if (!canUsePrebuilt) return;

      setLoadingVoices(true);
      try {
        const voices = await PrebuiltVoiceService.getVoicesForPlan(profile?.plan || 'free');
        setPrebuiltVoices(voices);
        setFilteredVoices(voices);
      } catch (error) {
        console.error('Error loading prebuilt voices:', error);
        toast({
          title: "Error Loading Voices",
          description: "Failed to load prebuilt voices. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingVoices(false);
      }
    };

    loadPrebuiltVoices();
  }, [canUsePrebuilt, profile?.plan, toast]);

  // Filter voices based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVoices(prebuiltVoices);
    } else {
      const filtered = prebuiltVoices.filter(voice =>
        voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.gender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.accent?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVoices(filtered);
    }
  }, [searchTerm, prebuiltVoices]);


  const handleVoiceRecorded = (blob: Blob) => {
    setHasVoiceData(true);
    onVoiceRecorded(blob);
    toast({
      title: "Voice Recorded",
      description: "Your voice sample has been recorded successfully.",
    });
  };

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["audio/mp3", "audio/wav", "audio/mpeg", "audio/wave", "audio/x-wav"];
    const maxSize = UploadLimitService.getUploadLimit(profile?.plan || 'free') * 1024 * 1024; // Convert MB to bytes

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an MP3 or WAV file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `Please upload a file smaller than ${UploadLimitService.getUploadLimit(profile?.plan || 'free')}MB.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert file to blob properly
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });

      setHasVoiceData(true);
      onVoiceRecorded(blob);
      toast({
        title: "Audio Uploaded",
        description: `Successfully uploaded ${file.name}`,
      });

      // Clear the input
      event.target.value = '';
    } catch (error) {
      console.error('Error processing audio file:', error);
      toast({
        title: "Upload Error",
        description: "Failed to process the audio file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrebuiltSelect = (voiceId: string) => {
    onVoiceSelect(voiceId);
    setHasVoiceData(true);
    const voice = prebuiltVoices.find((v) => v.voice_id === voiceId);
    toast({
      title: "Voice Selected",
      description: `Selected ${voice?.name} voice.`,
    });
  };

  const playPrebuiltSample = async (voiceId: string) => {
    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const voice = prebuiltVoices.find(v => v.voice_id === voiceId);
    if (!voice?.audio_preview_url) return;

    try {
      const audio = new Audio(voice.audio_preview_url);
      setCurrentAudio(audio);
      setPlayingVoiceId(voiceId);
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        setPlayingVoiceId(null);
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setPlayingVoiceId(null);
        setCurrentAudio(null);
        toast({
          title: "Playback Error",
          description: "Unable to play voice sample.",
          variant: "destructive",
        });
      };

      await audio.play();
    } catch (error) {
      setIsPlaying(false);
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      toast({
        title: "Playback Error",
        description: "Unable to play voice sample.",
        variant: "destructive",
      });
    }
  };

  const currentParagraph = sampleParagraphs[selectedLanguage] || sampleParagraphs["en-US"];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Voice Selection</h2>
        <p className="text-muted-foreground">
          Choose how you want to create your voice for the audio generation
        </p>
      </div>

      <Tabs value={voiceMethod} onValueChange={(value) => setVoiceMethod(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="record" className="flex items-center space-x-2">
            <Mic className="h-4 w-4" />
            <span>Record</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </TabsTrigger>
          <TabsTrigger
            value="prebuilt"
            disabled={!canUsePrebuilt}
            className="flex items-center space-x-2"
          >
            {canUsePrebuilt ? <Crown className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            <span>Prebuilt</span>
            {!canUsePrebuilt && <Badge variant="secondary" className="ml-1">Pro+</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Record Tab */}
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

        {/* Upload Tab (with sub-tabs) */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload / History</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="uploadFile" className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="uploadFile">Upload File</TabsTrigger>
                  <TabsTrigger value="history">Recorded History</TabsTrigger>
                </TabsList>

                {/* Upload Sub-Tab */}
                <TabsContent value="uploadFile" className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Audio Requirements:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Supported formats: MP3, WAV</li>
                      <li>• Duration: 10–60 seconds recommended</li>
                      <li>• Max file size: {uploadLimit}MB ({profile?.plan || 'free'} plan)</li>
                      <li>• Clear audio with minimal background noise</li>
                      <li>• Single speaker only</li>
                    </ul>
                  </div>

                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium mb-2">Choose Audio File (Max {uploadLimit}MB)</p>
                    <input
                      type="file"
                      accept="audio/mp3,audio/wav,audio/mpeg"
                      onChange={handleAudioUpload}
                      className="hidden"
                      id="audio-upload"
                    />
                    <label htmlFor="audio-upload">
                      <Button variant="outline" className="cursor-pointer">
                        Browse Files
                      </Button>
                    </label>
                  </div>
                </TabsContent>

                {/* Voice History only */}
                <TabsContent value="history" className="space-y-4">
                  <VoiceHistoryDropdown
                    onVoiceSelect={onVoiceSelect}
                    selectedVoiceId={selectedVoiceId}
                    filterType="recorded"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prebuilt Tab (no history here now) */}
        <TabsContent value="prebuilt" className="space-y-4">
          {canUsePrebuilt ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Crown className="h-5 w-5" />
                  <span>Prebuilt Voices</span>
                  <Badge>Paid</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingVoices ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">Loading voices...</span>
                  </div>
                ) : prebuiltVoices.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No voices available for your plan.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search voices "
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Voice List */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredVoices.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No voices match your search.</p>
                        </div>
                      ) : (
                        filteredVoices.map((voice) => (
                      <div
                        key={voice.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedVoiceId === voice.voice_id
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        }`}
                        onClick={() => handlePrebuiltSelect(voice.voice_id)}
                      >
                         <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                           <div className="flex-1 min-w-0">
                             <div className="flex flex-wrap items-center gap-2 mb-1">
                               <h4 className="font-medium text-sm sm:text-base truncate">{voice.name}</h4>
                               {voice.gender && (
                                 <Badge variant="outline" className="text-xs">
                                   {voice.gender}
                                 </Badge>
                               )}
                               {voice.accent && (
                                 <Badge variant="outline" className="text-xs">
                                   {voice.accent}
                                 </Badge>
                               )}
                             </div>
                             <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{voice.description}</p>
                           </div>
                           <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
                             {voice.audio_preview_url && (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   playPrebuiltSample(voice.voice_id);
                                 }}
                                 disabled={isPlaying && playingVoiceId !== voice.voice_id}
                                 className="h-8 w-8 p-0"
                               >
                                 {playingVoiceId === voice.voice_id && isPlaying ?
                                   <Pause className="h-3 w-3" /> :
                                   <Play className="h-3 w-3" />
                                 }
                               </Button>
                             )}
                             {selectedVoiceId === voice.voice_id && (
                               <Badge className="text-xs">Selected</Badge>
                             )}
                           </div>
                         </div>
                        </div>
                      )))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-muted">
              <CardContent className="p-8 text-center">
                <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">Prebuilt Voices Locked</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to Pro or Premium to access our collection of prebuilt AI voices
                </p>
                <Button variant="outline" onClick={() => window.open("/payment", "_blank")}>
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button
          onClick={onNext}
          disabled={!hasVoiceData && !selectedVoiceId}
          size="lg"
          className="px-8"
        >
          Continue to Generate
        </Button>
      </div>
    </div>
  );
}
