import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Wand2, Volume2, CheckCircle, Settings, Lock, Crown, Mic2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

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
  const [generatedAudio, setGeneratedAudio] = useState<string>("");
  const [sampleAudio, setSampleAudio] = useState<string>("");
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sampleApproved, setSampleApproved] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);

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

  const calculateEstimatedTime = () => {
    const baseTime = Math.max(3, Math.ceil(wordCount / 100) * 3);
    setEstimatedTime(baseTime);
    return baseTime;
  };

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
    return {
      voice_id: selectedVoiceId,
      speed: speed[0],
      pitch: pitch[0],
      volume: volume[0],
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
      const sampleText = getSampleText();
      const { data, error } = await supabase.functions.invoke('generate-sample-voice', {
        body: {
          text: sampleText,
          language: selectedLanguage,
          is_sample: true,
          voice_settings: getAllVoiceSettings()
        }
      });

      if (error) throw error;

      setProgress(100);
      if (data?.audio_url) {
        setSampleAudio(data.audio_url);
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
      currentProgress += Math.random() * 15;
      if (currentProgress < 95) setProgress(currentProgress);
    }, 500);

    try {
      const title = `Audio Generation - ${new Date().toLocaleDateString()}`;
      const { data, error } = await supabase.functions.invoke('generate-voice', {
        body: {
          text: extractedText,
          title: title,
          voice_settings: getAllVoiceSettings(),
          language: selectedLanguage
        }
      });

      if (error) throw error;

      if (data && data.audio_url) {
        setGeneratedAudio(data.audio_url);
        onAudioGenerated(data.audio_url);
        toast({
          title: "Success! Your Audio is Ready",
          description: "Moving to the next step...",
        });
        setProgress(100);
        setGenerationComplete(true);
        // --- FIX: Re-added the 2-second auto-redirect as requested ---
        setTimeout(() => onNext(), 2000);
      } else {
        throw new Error("No audio content received");
      }
    } catch (error) {
      console.error("Audio generation failed:", error);
      setProgress(0);
      toast({
        title: "Audio Generation Failed",
        description: "An error occurred while creating your audio. Please try again.",
        variant: "destructive",
      });
      setGeneratedAudio("");
      onAudioGenerated("");
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      onProcessingEnd();
    }
  };

  const hasAudio = generatedAudio.length > 0;

  // If generation is complete, show ONLY the success card and the "Continue" button.
  // The page will auto-redirect, but this will be visible for 2 seconds.
  if (generationComplete) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-green-900 mb-2">
                  {hasAudio ? "Audio Generated Successfully!" : "Request Processed"}
                </h3>
                <p className="text-sm sm:text-base text-green-700">
                  {hasAudio ? "Your high-quality audio is ready." : "Your request is complete. Proceeding to the final results."}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                ✓ Process Complete
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Show only the "Continue" button, aligned to the right */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-0">
          <Button onClick={onNext} disabled={!generationComplete || isGenerating} size="lg" className="order-1 sm:order-2 w-full sm:w-auto px-4 sm:px-8 py-3 text-sm sm:text-base bg-black hover:bg-gray-800 text-white">
            Continue to Final Results
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // This is the original render logic for when generation is NOT complete
  return (
    <div className="space-y-6">
      {selectedVoiceId && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Voice Selected</p>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center text-sm sm:text-base md:text-lg">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> Advanced Settings
              {isPremiumUser && <Crown className="h-3 w-3 sm:h-4 sm:w-4 ml-2 text-yellow-500" />}
            </CardTitle>
            {profile?.plan === 'free' ? (
              <Badge variant="outline" className="text-xs sm:text-sm whitespace-nowrap">
                <Lock className="h-3 w-3 mr-1" />
                Upgrade
              </Badge>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs sm:text-sm">
                {showAdvanced ? "Hide" : "Show"}
              </Button>
            )}
          </div>
        </CardHeader>

        {profile?.plan === 'free' && (
          <CardContent className="text-center py-8">
            <Lock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm text-gray-500 mb-4">
              Advanced voice controls are available on Pro and Premium plans
            </p>
            <Button size="sm" onClick={() => window.location.href = '/payment'}>
              Upgrade Now
            </Button>
          </CardContent>
        )}

        {isPaidUser && showAdvanced && (
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-auto gap-1 p-1">
                <TabsTrigger value="basic" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm border-r border-gray-200">
                  Basic
                </TabsTrigger>
                <TabsTrigger value="style" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Style
                </TabsTrigger>
                {isPremiumUser && (
                  <>
                    <TabsTrigger value="pacing" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm border-r border-t border-gray-200">
                      Pacing
                    </TabsTrigger>
                    <TabsTrigger value="tuning" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm border-t border-gray-200">
                      Tuning
                    </TabsTrigger>
                    <TabsTrigger value="sfx" className="text-xs sm:text-sm px-2 py-2 col-span-2 data-[state=active]:bg-white data-[state=active]:shadow-sm border-t border-gray-200">
                      Sound Effects
                    </TabsTrigger>
                  </>
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
                      <SelectItem valueA="sad">Sad</SelectItem>
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

      {sampleAudio && !sampleApproved && (
        <Card className="border-gray-300 bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-black">
              <Volume2 className="h-5 w-5 text-black" />
              Voice Sample - Test Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-800 italic">
                  "{getSampleText()}..."
                </p>
              </div>
              <audio controls className="w-full"   controlsList="nodownload noplaybackrate">
                <source src={sampleAudio} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-700">
                  <strong>Test Sample:</strong> No words deducted, no history saved.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleApproveSample} className="w-full sm:flex-1 bg-black hover:bg-gray-800 text-white">
                  ✓ Approve & Continue
                </Button>
                <Button onClick={handleGenerateSample} variant="outline" className="w-full sm:flex-1 border border-black text-black hover:bg-gray-100" disabled={isSampleGeneration}>
                  {isSampleGeneration ? 'Generating...' : 'Regenerate Sample'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isGenerating && !generationComplete && !sampleAudio && !sampleApproved && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="p-6 bg-gray-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                <Volume2 className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  {isPaidUser ? "Choose Your Generation Method" : "Ready to Generate Audio"}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {isPaidUser ? "Test with a sample first, or generate the full audio directly." : "Your text will be converted to high-quality speech using advanced AI."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
                {isPaidUser && (
                  <Button onClick={handleGenerateSample} disabled={isGenerating} variant="outline" size="lg" className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 border-2 border-gray-300 hover:bg-gray-50">
                    <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Generate Sample Voice
                  </Button>
                )}
                <Button onClick={handleGenerateFullAudio} disabled={isGenerating} size="lg" className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-black hover:bg-gray-800 text-white">
                  <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Generate Full Audio ({wordCount} words)
                </Button>
              </div>
              {isPaidUser && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Sample generation is free and doesn't use your words.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {sampleApproved && !isGenerating && !generationComplete && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="p-6 bg-green-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-green-900 mb-2">
                  Ready for Full Generation
                </h3>
                <p className="text-sm sm:text-base text-green-700">
                  Sample approved! Generate the complete {wordCount}-word audio with your selected settings.
                </p>
              </div>
              <Button onClick={handleGenerateFullAudio} disabled={isGenerating} size="lg" className="w-full sm:w-auto px-4 sm:px-8 py-3 text-sm sm:text-base bg-black hover:bg-gray-800 text-white">
                <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Generate Complete Audio ({wordCount} words)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-900">
                  {isSampleGeneration ? "Generating Sample..." : "Generating Your Audio..."}
                </h3>
                <Badge className="bg-blue-100 text-blue-800">
                  {Math.round(progress)}%
                </Badge>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-xs sm:text-sm text-blue-700">
                    {isSampleGeneration ? `Processing 50-word sample...` : `Processing ${wordCount} words...`}
                  </span>
                </div>
                {!isSampleGeneration && (
                  <p className="text-xs text-blue-600">
                    This may take up to {estimatedTime} seconds
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        {/* The "Back" button will now only show if generation is NOT complete */}
        {!generationComplete && !isGenerating && (
          <Button onClick={onPrevious} variant="outline" disabled={isGenerating} className="order-2 sm:order-1 w-full sm:w-auto text-sm">
            Back to Voice Selection
          </Button>
        )}

        {/* The "Continue" button is hidden here unless generation is complete,
           but it's handled by the `if (generationComplete)` block at the top.
        */}
        <Button onClick={onNext} disabled={!generationComplete || isGenerating} size="lg" className="order-1 sm:order-2 w-full sm:w-auto px-4 sm:px-8 py-3 text-sm sm:text-base bg-black hover:bg-gray-800 text-white">
          Continue to Final Results
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ModernStepFour;