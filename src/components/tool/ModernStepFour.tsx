import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Wand2, Volume2, CheckCircle, Settings, Lock, Crown, Mic2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { cacheService } from "@/services/cacheService";

interface ModernStepFourProps {
  extractedText: string;
  selectedLanguage: string;
  voiceRecording: Blob | null;
  selectedVoiceId: string;
  wordCount: number;
  onNext: () => void;
  onPrevious: () => void;
  onAudioGenerated: (audioUrl: string) => void;
  onProcessingStart: (step: string) => void;
  onProcessingEnd: () => void;
}

const ModernStepFour = ({
  extractedText,
  selectedLanguage,
  selectedVoiceId,
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
  const [sampleApproved, setSampleApproved] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [showSuccessLoader, setShowSuccessLoader] = useState(false);
  
  const isPrebuiltVoice = selectedVoiceId && !selectedVoiceId.startsWith('user_');

  // --- State for all settings ---
  const [speed, setSpeed] = useState([1.0]);
  const [pitch, setPitch] = useState([1.0]);
  const [volume, setVolume] = useState([1.0]);
  const [voiceStability, setVoiceStability] = useState([0.75]);
  const [voiceClarity, setVoiceClarity] = useState([0.75]);
  const [voiceStyle, setVoiceStyle] = useState("natural");
  const [emotion, setEmotion] = useState("neutral");
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
  const isPaidUser = profile?.plan === 'premium' || profile?.plan === 'pro';
  const isPremiumUser = profile?.plan === 'premium';
  const isProUser = profile?.plan === 'pro';
  const isFreeUser = profile?.plan === 'free';

  const getSampleText = () => {
    return extractedText.trim().split(/\s+/).slice(0, 50).join(' ');
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

  const getAllVoiceSettings = () => {
    const baseSettings = {
      voice_id: selectedVoiceId,
      speed: speed[0],
      pitch: pitch[0],
      volume: volume[0],
    };

    // For prebuilt voices, return only basic settings
    if (isPrebuiltVoice) {
      return baseSettings;
    }

    // For custom voices, add plan-specific settings
    if (isFreeUser) {
      return baseSettings;
    }

    if (isProUser) {
      return {
        ...baseSettings,
        style_name: voiceStyle,
        emotion: emotion,
        stability: voiceStability[0],
        similarity_boost: voiceClarity[0],
      };
    }

    // Premium users get all settings
    return {
      ...baseSettings,
      style_name: voiceStyle,
      emotion: emotion,
      accent: accent,
      intonation: intonation[0],
      wpm: speakingRate[0],
      overall_pause_multiplier: pauseLength[0],
      comma_pause_duration: commaPause[0],
      period_pause_duration: periodPause[0],
      stability: voiceStability[0],
      similarity_boost: voiceClarity[0],
      breathing_sound: breathingSound[0],
      word_emphasis: wordEmphasis[0],
      reverb: reverbEnabled,
      echo: echoDepth[0],
      output_format: outputFormat,
      use_speaker_boost: true,
    };
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

    // Check cache first
    const settings = getAllVoiceSettings();
    const sampleText = getSampleText();
    const cacheKey = cacheService.generateCacheKey(sampleText, settings);
    const cachedSample = cacheService.get(cacheKey);

    if (cachedSample?.audio_url) {
      console.log("Using cached sample");
      setSampleAudio(cachedSample.audio_url);
      toast({
        title: "Sample Ready!",
        description: "Loaded from cache - instant playback!",
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

    try {
      const { data, error } = await supabase.functions.invoke('generate-sample-voice', {
        body: {
          text: sampleText,
          language: selectedLanguage,
          is_sample: true,
          voice_settings: settings
        }
      });

      if (error) throw error;

      setProgress(100);
      if (data?.audio_url) {
        setSampleAudio(data.audio_url);
        // Cache the sample
        cacheService.set(cacheKey, { audio_url: data.audio_url, settings });
        toast({
          title: "Sample Ready!",
          description: "Listen and adjust settings if needed.",
        });
      } else {
        throw new Error("No audio URL in response");
      }
    } catch (error) {
      console.error('Sample generation failed:', error);
      setProgress(0);
      toast({
        title: "Sample Generation Failed",
        description: "Could not generate the audio sample. Please try again.",
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
      title: "Great Choice!",
      description: "Your voice settings are locked in. Ready to generate your full audio!",
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

    // Check word balance
    if (profile) {
      const planWordsAvailable = Math.max(0, (profile.words_limit || 0) - (profile.plan_words_used || 0));
      const purchasedWords = profile.word_balance || 0;
      const totalAvailable = planWordsAvailable + purchasedWords;
      if (wordCount > totalAvailable) {
        toast({
          title: "Insufficient Words",
          description: `You need ${wordCount.toLocaleString()} words but only have ${totalAvailable.toLocaleString()} available.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsGenerating(true);
    setGenerationComplete(false);
    onProcessingStart("Generating full high-quality audio...");
    setProgress(0);

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress < 95) setProgress(currentProgress);
    }, 500);

    try {
      const settings = getAllVoiceSettings();
      
      // Check full generation cache
      const cacheKey = cacheService.generateCacheKey(extractedText, settings);
      const cachedFull = cacheService.get(cacheKey);
      
      if (cachedFull?.audio_url) {
        console.log("Using cached full generation");
        setProgress(100);
        onAudioGenerated(cachedFull.audio_url);
        setGenerationComplete(true);
        setShowSuccessLoader(true);
        
        setTimeout(() => {
          onNext();
        }, 2000);
        
        return;
      }

      const title = `Audio Generation - ${new Date().toLocaleDateString()}`;
      const { data, error } = await supabase.functions.invoke('generate-voice', {
        body: {
          text: extractedText,
          title: title,
          voice_settings: settings,
          language: selectedLanguage
        }
      });

      if (error) throw error;

      if (data && data.audio_url) {
        onAudioGenerated(data.audio_url);
        setProgress(100);
        setGenerationComplete(true);
        
        // Cache the full generation
        cacheService.set(cacheKey, { audio_url: data.audio_url, settings });
        
        // Show success loader with checkmark
        setShowSuccessLoader(true);
        
        // Auto-redirect after 2 seconds
        setTimeout(() => {
          onNext();
        }, 2000);
      } else {
        throw new Error("No audio content received");
      }
    } catch (error) {
      console.error("Audio generation failed:", error);
      setProgress(0);
      toast({
        title: "Generation Failed",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
      onAudioGenerated("");
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      onProcessingEnd();
    }
  };

  // Don't show advanced settings for prebuilt voices or free users
  const showAdvancedSettings = !isPrebuiltVoice && !isFreeUser;

  return (
    <div className="space-y-6">
      {selectedVoiceId && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {isPrebuiltVoice ? "Prebuilt Voice Selected" : "Custom Voice Selected"}
                </p>
                <p className="text-xs text-blue-700">Voice ID: {selectedVoiceId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{wordCount}</div>
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
                {profile?.plan === 'premium' ? 'HD' : 'STD'}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Quality</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Only show advanced settings for custom voices and paid users */}
      {showAdvancedSettings && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center text-sm sm:text-base md:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> Advanced Settings
                {isPremiumUser && <Crown className="h-3 w-3 sm:h-4 sm:w-4 ml-2 text-yellow-500" />}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => {}} className="text-xs sm:text-sm">
                Basic Only
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-auto gap-1 p-1">
                <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic</TabsTrigger>
                {isProUser && <TabsTrigger value="style" className="text-xs sm:text-sm">Style</TabsTrigger>}
                {isPremiumUser && (
                  <TabsTrigger value="advanced" className="text-xs sm:text-sm">Advanced</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Speed: {speed[0]}x</label>
                    <Slider value={speed} onValueChange={(val) => { setSpeed(val); handleSettingsChange(); }} min={0.5} max={2.0} step={0.1} className="w-full"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pitch: {pitch[0]}x</label>
                    <Slider value={pitch} onValueChange={(val) => { setPitch(val); handleSettingsChange(); }} min={0.5} max={2.0} step={0.1} className="w-full"/>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Volume: {volume[0]}x</label>
                    <Slider value={volume} onValueChange={(val) => { setVolume(val); handleSettingsChange(); }} min={0.1} max={1.5} step={0.1} className="w-full"/>
                  </div>
                </div>
              </TabsContent>

              {isProUser && (
                <TabsContent value="style" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Voice Style</label>
                      <Select value={voiceStyle} onValueChange={(val) => {setVoiceStyle(val); handleSettingsChange();}}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="natural">Natural</SelectItem>
                          <SelectItem value="conversational">Conversational</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
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
                          <SelectItem value="calm">Calm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              )}

              {isPremiumUser && (
                <TabsContent value="advanced" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Speaking Rate: {speakingRate[0]} WPM</label>
                      <Slider value={speakingRate} onValueChange={(val) => { setSpeakingRate(val); handleSettingsChange(); }} min={80} max={220} step={5} className="w-full"/>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pause Length: {pauseLength[0].toFixed(1)}x</label>
                      <Slider value={pauseLength} onValueChange={(val) => { setPauseLength(val); handleSettingsChange(); }} min={0.5} max={3.0} step={0.1} className="w-full"/>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Show success loader with checkmark */}
      {showSuccessLoader && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-green-600" />
                <CheckCircle className="h-8 w-8 text-green-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2 justify-center">
                  Generated Successfully <CheckCircle className="h-5 w-5" />
                </h3>
                <p className="text-sm text-green-700 mt-2">Redirecting to results...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isGenerating && !showSuccessLoader && !sampleAudio && !sampleApproved && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="p-6 bg-gray-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                <Volume2 className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  {isPaidUser && !isPrebuiltVoice ? "Choose Your Generation Method" : "Ready to Generate Audio"}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {isPaidUser && !isPrebuiltVoice ? "Test with a sample first, or generate the full audio directly." : "Your text will be converted to high-quality speech."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
                {isPaidUser && !isPrebuiltVoice && (
                  <Button onClick={handleGenerateSample} disabled={isGenerating} variant="outline" size="lg" className="w-full sm:w-auto">
                    <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Generate Sample
                  </Button>
                )}
                <Button onClick={handleGenerateFullAudio} disabled={isGenerating} size="lg" className="w-full sm:w-auto bg-black hover:bg-gray-800 text-white">
                  <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Generate Full Audio ({wordCount} words)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {sampleAudio && !sampleApproved && !showSuccessLoader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice Sample - Test Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <audio controls className="w-full">
                <source src={sampleAudio} type="audio/mpeg" />
              </audio>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleApproveSample} className="w-full sm:flex-1 bg-black hover:bg-gray-800 text-white">
                  ✓ Approve & Continue
                </Button>
                <Button onClick={handleGenerateSample} variant="outline" className="w-full sm:flex-1" disabled={isSampleGeneration}>
                  Regenerate Sample
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isGenerating && !showSuccessLoader && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-900">
                  {isSampleGeneration ? "Generating Sample..." : "Generating Audio..."}
                </h3>
                <Badge className="bg-blue-100 text-blue-800">
                  {Math.round(progress)}%
                </Badge>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" disabled={isGenerating}>
          Back
        </Button>
      </div>
    </div>
  );
};

export default ModernStepFour;
