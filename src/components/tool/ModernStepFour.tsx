import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Wand2, Volume2, CheckCircle, Settings, Crown, Mic2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Security: Input sanitization
const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>\"']/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 50000); // Max 50k chars for audio text
};

// Security: Validate numeric ranges
const clampValue = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

interface ModernStepFourProps {
  extractedText: string;
  selectedLanguage: string;
  voiceRecording: Blob | null;
  selectedVoiceId: string;
  voiceType: 'record' | 'prebuilt' | 'history';
  wordCount: number;
  onNext: () => void;
  onPrevious: () => void;
  onAudioGenerated: (audioUrl: string) => void;
  onProcessingStart: (step: string, isSuccess?: boolean) => void;
  onProcessingEnd: () => void;
}

const ModernStepFour = ({
  extractedText,
  selectedLanguage,
  selectedVoiceId,
  voiceType,
  voiceRecording,
  wordCount,
  onNext,
  onPrevious,
  onAudioGenerated,
  onProcessingStart,
  onProcessingEnd,
}: ModernStepFourProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSampleGeneration, setIsSampleGeneration] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sampleAudio, setSampleAudio] = useState<string>("");
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sampleApproved, setSampleApproved] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);

  // Basic settings (Free + All)
  const [speed, setSpeed] = useState([1.0]);
  const [volume, setVolume] = useState([1.0]);

  // Pro settings
  const [pitch, setPitch] = useState([1.0]);
  const [voiceStyle, setVoiceStyle] = useState("natural");
  const [emotion, setEmotion] = useState("neutral");

  // Premium settings
  const [voiceStability, setVoiceStability] = useState([0.75]);
  const [voiceClarity, setVoiceClarity] = useState([0.75]);
  const [accent, setAccent] = useState("default");
  const [breathingSound, setBreathingSound] = useState([0.1]);
  const [pauseLength, setPauseLength] = useState([1.0]);
  const [wordEmphasis, setWordEmphasis] = useState([1.0]);
  const [intonation, setIntonation] = useState([0.5]);
  const [speakingRate, setSpeakingRate] = useState([150]);
  const [outputFormat, setOutputFormat] = useState("mp3_192");
  const [commaPause, setCommaPause] = useState([0.5]);
  const [periodPause, setPeriodPause] = useState([1.0]);
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [echoDepth, setEchoDepth] = useState([0.0]);

  const { toast } = useToast();
  const { profile } = useAuth();

  const userPlan = profile?.plan || 'free';
  const isFreeUser = userPlan === 'free';
  const isProUser = userPlan === 'pro';
  const isPremiumUser = userPlan === 'premium';
  const isPrebuiltVoice = voiceType === 'prebuilt';

  const canShowSettings = !isPrebuiltVoice && !isFreeUser;
  const canGenerateSample = !isPrebuiltVoice && (isProUser || isPremiumUser);
  const shouldSkipSample = isPrebuiltVoice;

  const calculateEstimatedTime = () => {
    const baseTime = Math.max(3, Math.ceil(wordCount / 100) * 3);
    setEstimatedTime(baseTime);
    return baseTime;
  };

  const getSampleText = () => {
    // Security: Sanitize and limit sample text
    const sanitized = sanitizeInput(extractedText);
    return sanitized.trim().split(/\s+/).slice(0, 50).join(' ');
  };

  const handleSettingsChange = () => {
    if (sampleAudio || sampleApproved) {
      setSampleAudio('');
      setSampleApproved(false);
      toast({
        title: "Settings Changed",
        description: "Please generate a new sample to hear your changes.",
      });
    }
  };

  // Security: Validate and clamp all settings
  const getVoiceSettings = () => {
    // Security: Validate voice_id format (UUID or specific format)
    if (!selectedVoiceId || typeof selectedVoiceId !== 'string') {
      throw new Error("Invalid voice ID");
    }

    const baseSettings = {
      voice_id: selectedVoiceId,
      voice_type: voiceType,
      language: selectedLanguage,
      speed: clampValue(speed[0], 0.5, 2.0),
      volume: clampValue(volume[0], 0.1, 1.5),
      use_speaker_boost: true,
    };

    if (isPrebuiltVoice || isFreeUser) {
      return baseSettings;
    }

    if (isProUser) {
      return {
        ...baseSettings,
        pitch: clampValue(pitch[0], 0.5, 2.0),
        style_name: voiceStyle,
        emotion: emotion,
      };
    }

    if (isPremiumUser) {
      return {
        ...baseSettings,
        pitch: clampValue(pitch[0], 0.5, 2.0),
        style_name: voiceStyle,
        emotion: emotion,
        accent: accent,
        intonation: clampValue(intonation[0], 0.0, 2.0),
        wpm: clampValue(speakingRate[0], 80, 220),
        overall_pause_multiplier: clampValue(pauseLength[0], 0.5, 3.0),
        comma_pause_duration: clampValue(commaPause[0], 0.1, 2.0),
        period_pause_duration: clampValue(periodPause[0], 0.2, 3.0),
        stability: clampValue(voiceStability[0], 0.0, 1.0),
        similarity_boost: clampValue(voiceClarity[0], 0.0, 1.0),
        breathing_sound: clampValue(breathingSound[0], 0.0, 1.0),
        word_emphasis: clampValue(wordEmphasis[0], 0.0, 2.0),
        reverb: reverbEnabled,
        echo: clampValue(echoDepth[0], 0.0, 1.0),
        output_format: outputFormat,
      };
    }

    return baseSettings;
  };

  const handleGenerateSample = async () => {
    if (!extractedText.trim() || isGenerating || isSampleGeneration) return;

    if (!selectedVoiceId) {
      toast({
        title: "No Voice Selected",
        description: "Please select or record a voice in the previous step.",
        variant: "destructive",
      });
      return;
    }

    setIsSampleGeneration(true);
    setIsGenerating(true);
    onProcessingStart("Generating voice sample...");
    setProgress(0);
    setSampleAudio('');

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 20;
      if (currentProgress < 90) setProgress(currentProgress);
    }, 300);

    // Security: Request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const sampleText = getSampleText();

      // Security: Validate sample text
      if (!sampleText || sampleText.length === 0) {
        throw new Error("Sample text is empty");
      }

      const settings = getVoiceSettings();

      // Security: Calculate actual word count from sample
      const sampleWordCount = sampleText.split(/\s+/).filter(Boolean).length;

      const { data, error } = await supabase.functions.invoke('generate-sample-voice', {
        body: {
          text: sampleText,
          language: selectedLanguage,
          is_sample: true,
          word_count: sampleWordCount, // ✅ Send word count to backend
          voice_settings: settings
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      setProgress(100);

      // Security: Validate response
      if (data?.audio_url && typeof data.audio_url === 'string') {
        // Security: Validate URL format
        try {
          const url = new URL(data.audio_url);
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error("Invalid audio URL protocol");
          }
        } catch (e) {
          throw new Error("Invalid audio URL format");
        }

        setSampleAudio(data.audio_url);
        toast({
          title: "✨ Sample Generated!",
          description: "Your voice sample is ready. Listen and adjust settings if needed."
        });
      } else {
        throw new Error("No audio URL in response");
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      setProgress(0);

      let errorMessage = "Could not generate the audio sample";
      if (error.name === 'AbortError') {
        errorMessage = "Request timeout. Please try again.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Sample Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setIsSampleGeneration(false);
      onProcessingEnd();
    }
  };

  const handleApproveSample = () => {
    setSampleApproved(true);
    toast({
      title: "🎯 Settings Approved!",
      description: "Your voice settings are locked in. Ready to generate your full audio!"
    });
  };

  const handleGenerateFullAudio = async () => {
    if (!extractedText.trim() || isGenerating) return;

    if (!selectedVoiceId) {
      toast({
        title: "No Voice Selected",
        description: "Please select or record a voice in the previous step.",
        variant: "destructive",
      });
      return;
    }

    // Security: Validate word count
    if (wordCount <= 0 || wordCount > 100000) {
      toast({
        title: "Invalid Word Count",
        description: "Word count must be between 1 and 100,000.",
        variant: "destructive",
      });
      return;
    }

    // Check word balance
    if (profile) {
      const planWordsAvailable = Math.max(0, (profile.words_limit || 0) - (profile.plan_words_used || 0));
      const purchasedWords = profile.word_balance || 0;
      const totalAvailable = planWordsAvailable + purchasedWords;

      if (wordCount > totalAvailable) {
        toast({
          title: "Not enough words",
          description: `You need ${wordCount.toLocaleString()} words but only have ${totalAvailable.toLocaleString()} available.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsGenerating(true);
    setGenerationComplete(false);
    calculateEstimatedTime();
    onProcessingStart("Generating full high-quality audio...");
    setProgress(0);

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 10;
      if (currentProgress < 90) setProgress(currentProgress);
    }, 500);

    // Security: Request timeout (longer for full generation)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    try {
      // Security: Sanitize title
      const title = sanitizeInput(`Audio Generation - ${new Date().toLocaleDateString()}`);

      // Security: Sanitize text
      const sanitizedText = sanitizeInput(extractedText);

      if (!sanitizedText || sanitizedText.length === 0) {
        throw new Error("Text content is empty");
      }

      const settings = getVoiceSettings();

      const { data, error } = await supabase.functions.invoke('generate-voice', {
        body: {
          text: sanitizedText,
          title: title,
          voice_settings: settings,
          language: selectedLanguage,
          word_count: wordCount, // ✅ Send word count to backend
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      // Security: Validate response
      if (data && data.audio_url && typeof data.audio_url === 'string') {
        // Security: Validate URL format
        try {
          const url = new URL(data.audio_url);
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error("Invalid audio URL protocol");
          }
        } catch (e) {
          throw new Error("Invalid audio URL format");
        }

        onAudioGenerated(data.audio_url);
        setProgress(100);
        onProcessingStart("Audio Generated Successfully!", true);
        setGenerationComplete(true);
        
        toast({
          title: "🎉 Generation Complete!",
          description: `Your ${wordCount.toLocaleString()} word audio is ready to play and download.`
        });
      } else {
        throw new Error("No audio content received");
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      setProgress(0);

      let errorMessage = "An error occurred while creating your audio";
      if (error.name === 'AbortError') {
        errorMessage = "Request timeout. The audio generation took too long.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Audio Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      onAudioGenerated("");
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (generationComplete) {
      const timer = setTimeout(() => {
        onProcessingEnd();
        onNext?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [generationComplete, onNext, onProcessingEnd]);

  return (
    <div className="space-y-6">
      {/* Voice Info Card */}
      {selectedVoiceId && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {voiceType === 'prebuilt' ? 'Prebuilt Voice Selected' :
                   voiceType === 'history' ? 'History Voice Selected' :
                   'Recorded Voice Ready'}
                </p>
                <p className="text-xs text-blue-700 truncate max-w-xs">Voice ID: {selectedVoiceId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    {/* Prebuilt Voice Alert */}
{isPrebuiltVoice && (
  <Alert
    className={`${
      isFreeUser ? "border-blue-200 bg-blue-50" : "border-purple-200 bg-purple-50"
    }`}
  >
    <Crown
      className={`h-4 w-4 ${
        isFreeUser ? "text-blue-600" : "text-purple-600"
      }`}
    />
    <AlertDescription
      className={`text-sm ${
        isFreeUser ? "text-blue-800" : "text-purple-800"
      }`}
    >
      <strong>Prebuilt Voice Mode:</strong>{" "}
      {isFreeUser ? (
        <>
 Professional prebuilt voice ready to generate.
         </>
      ) : (
        <>
          Professional prebuilt voice ready to generate. Advanced settings are
          not available for prebuilt voices.
        </>
      )}
    </AlertDescription>
  </Alert>
)}


      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center w-full text-base md:text-lg">
            <Wand2 className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            Audio Generation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{wordCount.toLocaleString()}</div>
              <div className="text-xs sm:text-sm text-gray-600">Words</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {Math.ceil(wordCount / 150)}min
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Est. Duration</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {selectedLanguage.split('-')[0].toUpperCase()}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Language</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {isPremiumUser ? 'HD' : 'STD'}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Quality</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      {canShowSettings && !generationComplete && !isGenerating && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center text-sm sm:text-base md:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> Advanced Settings
                {isPremiumUser && <Crown className="h-3 w-3 sm:h-4 sm:w-4 ml-2 text-yellow-500" />}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs sm:text-sm">
                {showAdvanced ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>

          {showAdvanced && (
            <CardContent>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-auto gap-1 p-1">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic</TabsTrigger>
                  {(isProUser || isPremiumUser) && <TabsTrigger value="style" className="text-xs sm:text-sm">Style</TabsTrigger>}
                  {isPremiumUser && (
                    <>
                      <TabsTrigger value="pacing" className="text-xs sm:text-sm">Pacing</TabsTrigger>
                      <TabsTrigger value="tuning" className="text-xs sm:text-sm">Tuning</TabsTrigger>
                                          <TabsTrigger value="sfx" className="text-xs sm:text-sm px-2 py-2 col-span-2 data-[state=active]:bg-white data-[state=active]:shadow-sm border-t border-gray-200">
                      Sound Effects
                    </TabsTrigger>

                    </>
                  )}
                </TabsList>

                {/* Basic Settings */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Speed: {speed[0].toFixed(1)}x</label>
                      <Slider value={speed} onValueChange={(val) => { setSpeed(val); handleSettingsChange(); }} min={0.5} max={2.0} step={0.1} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Volume: {volume[0].toFixed(1)}x</label>
                      <Slider value={volume} onValueChange={(val) => { setVolume(val); handleSettingsChange(); }} min={0.1} max={1.5} step={0.1} />
                    </div>
                    {(isProUser || isPremiumUser) && (
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Pitch: {pitch[0].toFixed(1)}x</label>
                        <Slider value={pitch} onValueChange={(val) => { setPitch(val); handleSettingsChange(); }} min={0.5} max={2.0} step={0.1} />
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Style Settings */}
                {(isProUser || isPremiumUser) && (
                   <TabsContent value="style" className="space-y-4 mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Voice Style</label>
                    <Select value={voiceStyle} onValueChange={(val) => {setVoiceStyle(val); handleSettingsChange();}}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                     <SelectContent>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="news">News Reader</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="cheerful">Cheerful</SelectItem>
                      <SelectItem value="empathetic">Empathetic</SelectItem>
                      <SelectItem value="dramatic">Dramatic</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                      <SelectItem value="motivational">Motivational</SelectItem>
                      <SelectItem value="calm">Calm</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="informal">Informal</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="relaxed">Relaxed</SelectItem>
                      <SelectItem value="energetic">Energetic</SelectItem>
                      <SelectItem value="introspective">Introspective</SelectItem>
                      <SelectItem value="excited">Excited</SelectItem>
                    </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Emotion</label>
                    <Select value={emotion} onValueChange={(val) => {setEmotion(val); handleSettingsChange();}}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="happy">Happy</SelectItem>
                      <SelectItem value="sad">Sad</SelectItem>
                      <SelectItem value="angry">Angry</SelectItem>
                      <SelectItem value="excited">Excited</SelectItem>
                      <SelectItem value="calm">Calm</SelectItem>
                      <SelectItem value="surprised">Surprised</SelectItem>
                      <SelectItem value="confident">Confident</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="serious">Serious</SelectItem>
                      <SelectItem value="dramatic">Dramatic</SelectItem>
                      <SelectItem value="whisper">Whisper</SelectItem>
                      <SelectItem value="soft">Soft</SelectItem>
                      <SelectItem value="shouting">Shouting</SelectItem>
                      <SelectItem value="curious">Curious</SelectItem>
                      <SelectItem value="bored">Bored</SelectItem>
                    </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Accent</label>
                    <Select value={accent} onValueChange={(val) => {setAccent(val); handleSettingsChange();}}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                     <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="american">American</SelectItem>
                      <SelectItem value="british">British</SelectItem>
                      <SelectItem value="australian">Australian</SelectItem>
                      <SelectItem value="canadian">Canadian</SelectItem>
                      <SelectItem value="irish">Irish</SelectItem>
                      <SelectItem value="southern">Southern US</SelectItem>
                      <SelectItem value="scottish">Scottish</SelectItem>
                      <SelectItem value="welsh">Welsh</SelectItem>
                      <SelectItem value="newzealand">New Zealand</SelectItem>
                      <SelectItem value="indian">Indian</SelectItem>
                      <SelectItem value="southafrican">South African</SelectItem>
                      <SelectItem value="singaporean">Singaporean</SelectItem>
                      <SelectItem value="nigerian">Nigerian</SelectItem>
                      <SelectItem value="jamaican">Jamaican</SelectItem>
                    </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Intonation: {intonation[0].toFixed(2)}</label>
                    <Slider value={intonation} onValueChange={(val) => { setIntonation(val); handleSettingsChange(); }} min={0.0} max={2.0} step={0.05} className="w-full"/>
                    <p className="text-xs text-gray-500">Controls vocal expressiveness.</p>
                  </div>
                </div>
              </TabsContent>
                )}

                {/* Premium Pacing */}
                {isPremiumUser && (
                  <TabsContent value="pacing" className="space-y-4 mt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Speaking Rate: {speakingRate[0]} WPM</label>
                        <Slider value={speakingRate} onValueChange={(val) => { setSpeakingRate(val); handleSettingsChange(); }} min={80} max={220} step={5} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Pause Multiplier: {pauseLength[0].toFixed(1)}x</label>
                        <Slider value={pauseLength} onValueChange={(val) => { setPauseLength(val); handleSettingsChange(); }} min={0.5} max={3.0} step={0.1} />
                      </div>
                    </div>
                  </TabsContent>
                )}

                {isPremiumUser && (
                <>
                  <TabsContent value="pacing" className="space-y-4 mt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center"><Mic2 className="h-4 w-4 mr-2" />Speaking Rate: {speakingRate[0]} WPM</label>
                        <Slider value={speakingRate} onValueChange={(val) => { setSpeakingRate(val); handleSettingsChange(); }} min={80} max={220} step={5} className="w-full"/>
                        <p className="text-xs text-gray-500">Set speed in Words Per Minute.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Overall Pause Multiplier: {pauseLength[0].toFixed(1)}x</label>
                        <Slider value={pauseLength} onValueChange={(val) => { setPauseLength(val); handleSettingsChange(); }} min={0.5} max={3.0} step={0.1} className="w-full"/>
                        <p className="text-xs text-gray-500">Adjust all natural pauses.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Comma Pause: {commaPause[0].toFixed(2)}s</label>
                        <Slider value={commaPause} onValueChange={(val) => { setCommaPause(val); handleSettingsChange(); }} min={0.1} max={2.0} step={0.05} className="w-full"/>
                        <p className="text-xs text-gray-500">Duration of pause at commas.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Period Pause: {periodPause[0].toFixed(2)}s</label>
                        <Slider value={periodPause} onValueChange={(val) => { setPeriodPause(val); handleSettingsChange(); }} min={0.2} max={3.0} step={0.05} className="w-full"/>
                        <p className="text-xs text-gray-500">Duration of pause at periods.</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="tuning" className="space-y-4 mt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Voice Stability: {voiceStability[0].toFixed(2)}</label>
                        <Slider value={voiceStability} onValueChange={(val) => { setVoiceStability(val); handleSettingsChange(); }} min={0.0} max={1.0} step={0.01} className="w-full"/>
                        <p className="text-xs text-gray-500">Controls voice consistency.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Voice Clarity: {voiceClarity[0].toFixed(2)}</label>
                        <Slider value={voiceClarity} onValueChange={(val) => { setVoiceClarity(val); handleSettingsChange(); }} min={0.0} max={1.0} step={0.01} className="w-full"/>
                        <p className="text-xs text-gray-500">Boosts clarity vs. naturalness.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Breathing Sound: {breathingSound[0].toFixed(2)}</label>
                        <Slider value={breathingSound} onValueChange={(val) => { setBreathingSound(val); handleSettingsChange(); }} min={0.0} max={1.0} step={0.01} className="w-full"/>
                        <p className="text-xs text-gray-500">Add realistic breathing.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Word Emphasis: {wordEmphasis[0].toFixed(2)}</label>
                        <Slider value={wordEmphasis} onValueChange={(val) => { setWordEmphasis(val); handleSettingsChange(); }} min={0.5} max={2.0} step={0.01} className="w-full"/>
                        <p className="text-xs text-gray-500">Fine-tune word emphasis.</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="sfx" className="space-y-4 mt-4">
                    <div className="p-3 bg-purple-50 rounded-lg mb-4">
                      <p className="text-xs text-purple-700">
                        <Crown className="h-3 w-3 inline mr-1" />
                        <strong>Premium Sound Design</strong> - Apply professional audio effects.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Output Format</label>
                        <Select value={outputFormat} onValueChange={(val) => { setOutputFormat(val); handleSettingsChange(); }}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mp3_192">MP3 - 192kbps (High Quality)</SelectItem>
                            <SelectItem value="mp3_320">MP3 - 320kbps (Ultra Quality)</SelectItem>
                            <SelectItem value="wav_lossless">WAV - Lossless (Professional)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 p-4 border rounded-lg justify-center">
                        <Switch id="reverb-mode" checked={reverbEnabled} onCheckedChange={(val) => { setReverbEnabled(val); handleSettingsChange(); }}/>
                        <label htmlFor="reverb-mode" className="text-sm font-medium">Enable Reverb</label>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Echo Depth: {echoDepth[0].toFixed(2)}</label>
                        <Slider value={echoDepth} onValueChange={(val) => { setEchoDepth(val); handleSettingsChange(); }} min={0.0} max={1.0} step={0.05} className="w-full"/>
                        <p className="text-xs text-gray-500">Adds a subtle echo effect.</p>
                      </div>
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        )}
      </Card>
      )}

      {/* Sample Audio Player */}
      {sampleAudio && !sampleApproved && !generationComplete && (
        <Card className="border-gray-300 bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice Sample - Test Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-800 italic">"{getSampleText()}..."</p>
              </div>
              <audio controls className="w-full" controlsList="nodownload">
                <source src={sampleAudio} type="audio/mpeg" />
                Your browser does not support audio playback.
              </audio>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleApproveSample} className="flex-1">
                  Approve & Continue <CheckCircle className="w-5 h-5 ml-2" />
                </Button>
                <Button onClick={handleGenerateSample} variant="outline" className="flex-1" disabled={isSampleGeneration}>
                  {isSampleGeneration ? 'Generating...' : 'Regenerate Sample'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Buttons */}
      {!isGenerating && !generationComplete && !sampleAudio && !sampleApproved && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="p-6 bg-gray-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                <Volume2 className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">
                  Ready to Generate Audio
                </h3>
                <p className="text-sm text-gray-600">
                  {isPrebuiltVoice ? "Professional prebuilt voice ready to generate your audio." :
                   canGenerateSample ? "Test with a sample first, or generate directly." :
                   "Your text will be converted to high-quality speech."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {canGenerateSample && (
                  <Button onClick={handleGenerateSample} disabled={isGenerating} variant="outline" size="lg">
                    <Volume2 className="h-5 w-5 mr-2" />
                    Generate Sample Audio
                  </Button>
                )}
                <Button onClick={handleGenerateFullAudio} disabled={isGenerating} size="lg">
                  <Wand2 className="h-5 w-5 mr-2" />
                  Generate Full Audio ({wordCount.toLocaleString()} words)
                </Button>
              </div>
              {canGenerateSample && (
                <p className="text-xs text-gray-500">💡 Sample generation is free - No words deducted</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Approved State */}
      {sampleApproved && !isGenerating && !generationComplete && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="p-6 bg-green-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-900 mb-2">Ready for Full Generation</h3>
                <p className="text-sm text-green-700">Sample approved! Generate the complete audio.</p>
              </div>
              <Button
                onClick={handleGenerateFullAudio}
                disabled={isGenerating}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                <span className="truncate">
                  Generate Complete Audio ({wordCount.toLocaleString()} words)
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generating State */}
      {isGenerating && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-8">
            <div className="space-y-6 text-center">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-blue-200"></div>
                <div className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-blue-900 mb-2">
                  {isSampleGeneration ? "Generating Sample..." : "Generating Your Audio..."}
                </h3>
                <p className="text-sm text-blue-700">
                  {isSampleGeneration ? `Processing sample...` : `Processing ${wordCount.toLocaleString()} words...`}
                </p>
                {!isSampleGeneration && (
                  <p className="text-xs text-blue-600 mt-2">
                    Estimated time: {estimatedTime} seconds
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-blue-600 font-medium">{Math.round(progress)}% Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Complete State */}
      {generationComplete && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full bg-green-100 animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-green-900 mb-2">
                  Generated Successfully!
                </h3>
                <p className="text-sm text-green-700">
                  Redirecting to download page in 2 seconds...
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                <span>Auto-redirecting...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        {!generationComplete && !isGenerating && (
          <Button onClick={onPrevious} variant="outline" disabled={isGenerating} className="order-2 sm:order-1 w-full sm:w-auto text-sm">
            Back to Voice Selection
          </Button>
        )}

        <Button onClick={onNext} disabled={!generationComplete || isGenerating} size="lg" className="order-1 sm:order-2 w-full sm:w-auto px-4 sm:px-8 py-3 text-sm sm:text-base bg-black hover:bg-gray-800 text-white">
          Continue to Final Results
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ModernStepFour;