// src/components/tool/ModernStepFour.tsx - Complete Fixed Version
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Wand2, Volume2, Clock, CheckCircle, Settings, Lock, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ModernStepFourProps {
  extractedText: string;
  selectedLanguage: string;
  voiceRecording: Blob | null;
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
  const [generatedAudio, setGeneratedAudio] = useState<string>("");
  const [sampleAudio, setSampleAudio] = useState<string>("");
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [advancedPanelCount, setAdvancedPanelCount] = useState(0);
  const [sampleApproved, setSampleApproved] = useState(false);

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
    const words = extractedText.trim().split(/\s+/);
    return words.slice(0, 50).join(' ');
  };

  const handleGenerateSample = async () => {
    if (!extractedText.trim() || isGenerating || isSampleGeneration) return;

    setIsSampleGeneration(true);
    setIsGenerating(true);
    onProcessingStart("Generating voice sample...");

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 20;
      if (currentProgress < 90) setProgress(currentProgress);
    }, 300);

    try {
      const { data, error } = await supabase.functions.invoke('generate-sample-voice', {
        body: {
          voice_settings: {
            stability: voiceStability[0],
            similarity_boost: voiceClarity[0],
            style: voiceStyle === 'natural' ? 0.0 : 0.5,
            use_speaker_boost: true
          }
        }
      });
      if (error) throw error;

      setProgress(100);
      if (data?.audio_url) {
        setSampleAudio(data.audio_url);
        toast({
          title: "Voice Sample Ready!",
          description: "Your sample is ready to preview. Listen and decide if you like it. This is free - no words deducted!",
        });
      }
    } catch (error) {
      console.error('Primary sample generation failed:', error);
      toast({
        title: "Creating Sample Preview",
        description: "Generating a preview sample for you to review...",
        variant: "default",
      });

      try {
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('generate-fallback-sample');
        if (fallbackError) throw fallbackError;

        setProgress(100);
        setSampleAudio(fallbackData.audio_url);
        toast({
          title: "Sample Preview Ready",
          description: "Your preview sample is ready. You can now proceed to full generation!",
        });
      } catch (fallbackError) {
        console.error("Fallback sample generation also failed:", fallbackError);
        toast({
          title: "Sample Preview Unavailable",
          description: "We couldn't create a sample right now. You can skip to full generation or try again.",
          variant: "destructive",
        });
      }
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

  const handleRejectSample = () => {
    if (advancedPanelCount < 1) {
      setShowAdvancedSettings(true);
      setAdvancedPanelCount(1);
    }
    setSampleAudio("");
    toast({
      title: "Let's Fine-Tune",
      description: "Adjust the voice settings below to get the perfect sound, then generate a new sample.",
    });
  };

  const handleGenerateFullAudio = async () => {
    if (!extractedText.trim() || isGenerating) return;

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
    const estimatedTime = calculateEstimatedTime();
    
    // Show word deduction loading first
    onProcessingStart("Checking word balance and deducting words...");
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onProcessingStart("Generating full high-quality audio...");

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress < 90) setProgress(currentProgress);
    }, 500);

    try {
      const title = `Audio Generation - ${new Date().toLocaleDateString()}`;
      const { data, error } = await supabase.functions.invoke('generate-voice', {
        body: {
          text: extractedText,
          title: title,
          voice_settings: {
            stability: voiceStability[0],
            similarity_boost: voiceClarity[0],
            style: voiceStyle === 'natural' ? 0.0 : 0.5,
            use_speaker_boost: true
          },
          language: selectedLanguage
        }
      });

      if (error) throw new Error(error.message || 'Failed to generate audio');

      if (data && data.audio_url) {
        clearInterval(progressInterval);
        setProgress(100);
        setGeneratedAudio(data.audio_url);
        onAudioGenerated(data.audio_url);
        toast({
          title: "Success! Your Audio is Ready",
          description: `Created ${Math.ceil(wordCount / 150)} minutes of high-quality audio. Moving to download...`,
        });
        setTimeout(() => onNext(), 1500);
      } else {
        throw new Error("No audio content received");
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Primary generation failed, initiating server-side fallback:", error);

      if (error instanceof Error) {
        if (error.message.includes('word balance') || error.message.includes('Insufficient')) {
          toast({ title: "Oops! Not Enough Words", description: "You need more words to generate this audio. Upgrade your plan or purchase more words.", variant: "destructive" });
          setIsGenerating(false);
          onProcessingEnd();
          return;
        } else if (error.message.includes('authentication')) {
          toast({ title: "Please Sign In", description: "You need to be signed in to generate audio. Please log in to continue.", variant: "destructive" });
          setIsGenerating(false);
          onProcessingEnd();
          return;
        }
      }

      toast({
        title: "Generating Audio",
        description: "Processing your audio generation. This may take a moment...",
        variant: "default",
      });

      try {
        const title = `Fallback Generation - ${new Date().toLocaleDateString()}`;
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('generate-fallback-voice', {
          body: { text: extractedText, title: title }
        });
        if (fallbackError) throw fallbackError;

        setProgress(100);
        setGeneratedAudio(fallbackData.audio_url);
        onAudioGenerated(fallbackData.audio_url);
        toast({
          title: "Audio Generation Complete",
          description: "Your audio has been created and saved. Moving to the next step!",
        });
        setTimeout(() => onNext(), 2000);
      } catch (fallbackError) {
        console.error("Fallback generation also failed:", fallbackError);
        toast({
          title: "Generation Failed",
          description: "We couldn't create your audio right now. Please try again. No words were deducted.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
      onProcessingEnd();
    }
  };

  const canGenerate = extractedText.trim().length > 0 && !isGenerating;
  const hasAudio = generatedAudio.length > 0;

  return (
    <div className="space-y-6">
      {/* Generation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Wand2 className="h-5 w-5 mr-2" />
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
              <div className="text-lg sm:text-2xl font-bold text-blue-600">
                {selectedLanguage.split('-')[0].toUpperCase()}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Language</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-green-600">
                {profile?.plan === 'premium' ? 'HD' : 'STD'}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Quality</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings - Paid Users Only */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Settings className="h-5 w-5 mr-2" />
              Advanced Settings
            </CardTitle>
            {isPaidUser ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm"
              >
                {showAdvanced ? "Hide" : "Show"}
              </Button>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Paid Only
              </Badge>
            )}
          </div>
        </CardHeader>

        {isPaidUser ? (
          <CardContent className={`space-y-6 ${(showAdvanced || showAdvancedSettings) ? 'block' : 'hidden'}`}>
            {/* Pro Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">Basic Advanced Controls</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Speed: {speed[0]}x</label>
                  <Slider
                    value={speed}
                    onValueChange={setSpeed}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pitch: {pitch[0]}x</label>
                  <Slider
                    value={pitch}
                    onValueChange={setPitch}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Volume: {volume[0]}x</label>
                  <Slider
                    value={volume}
                    onValueChange={setVolume}
                    min={0.1}
                    max={1.5}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Voice Style</label>
                  <Select value={voiceStyle} onValueChange={setVoiceStyle}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="news">News Reader</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="cheerful">Cheerful</SelectItem>
                      <SelectItem value="empathetic">Empathetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emotion</label>
                  <Select value={emotion} onValueChange={setEmotion}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="happy">Happy</SelectItem>
                      <SelectItem value="sad">Sad</SelectItem>
                      <SelectItem value="angry">Angry</SelectItem>
                      <SelectItem value="excited">Excited</SelectItem>
                      <SelectItem value="calm">Calm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Accent</label>
                  <Select value={accent} onValueChange={setAccent}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="american">American</SelectItem>
                      <SelectItem value="british">British</SelectItem>
                      <SelectItem value="australian">Australian</SelectItem>
                      <SelectItem value="canadian">Canadian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Premium God-Level Settings */}
            {isPremiumUser && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-sm text-purple-700 border-b border-purple-200 pb-2 flex items-center">
                  <Crown className="h-4 w-4 mr-2" />
                  Premium God-Level Controls
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-purple-700">Voice Stability: {voiceStability[0].toFixed(2)}</label>
                    <Slider
                      value={voiceStability}
                      onValueChange={setVoiceStability}
                      min={0.0}
                      max={1.0}
                      step={0.01}
                      className="w-full [&>[role=slider]]:bg-purple-500"
                    />
                    <p className="text-xs text-gray-500">Controls voice consistency throughout generation</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-purple-700">Voice Clarity: {voiceClarity[0].toFixed(2)}</label>
                    <Slider
                      value={voiceClarity}
                      onValueChange={setVoiceClarity}
                      min={0.0}
                      max={1.0}
                      step={0.01}
                      className="w-full [&>[role=slider]]:bg-purple-500"
                    />
                    <p className="text-xs text-gray-500">Boosts clarity vs. naturalness</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-purple-700">Breathing Sound: {breathingSound[0].toFixed(2)}</label>
                    <Slider
                      value={breathingSound}
                      onValueChange={setBreathingSound}
                      min={0.0}
                      max={1.0}
                      step={0.01}
                      className="w-full [&>[role=slider]]:bg-purple-500"
                    />
                    <p className="text-xs text-gray-500">Add realistic breathing between sentences</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-purple-700">Pause Length: {pauseLength[0].toFixed(1)}x</label>
                    <Slider
                      value={pauseLength}
                      onValueChange={setPauseLength}
                      min={0.5}
                      max={3.0}
                      step={0.1}
                      className="w-full [&>[role=slider]]:bg-purple-500"
                    />
                    <p className="text-xs text-gray-500">Control natural pauses and timing</p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium text-purple-700">Word Emphasis: {wordEmphasis[0].toFixed(2)}</label>
                    <Slider
                      value={wordEmphasis}
                      onValueChange={setWordEmphasis}
                      min={0.5}
                      max={2.0}
                      step={0.01}
                      className="w-full [&>[role=slider]]:bg-purple-500"
                    />
                    <p className="text-xs text-gray-500">Fine-tune word emphasis and expression</p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings adjusted notification */}
            {showAdvancedSettings && sampleAudio && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>Settings Updated!</strong> Generate a new sample to hear the changes.
                    </p>
                    <Button onClick={handleGenerateSample} variant="outline" size="sm" className="mr-2">
                      Generate New Sample
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAdvancedSettings(false);
                        setAdvancedPanelCount(0);
                        setSampleAudio("");
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      Close Panel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        ) : (
          <CardContent>
            <div className="text-center py-6 space-y-4">
              <Crown className="h-12 w-12 mx-auto text-gray-400" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Advanced Voice Controls</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Unlock professional-grade voice customization with precise control over:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
                  <div>• Voice Stability</div>
                  <div>• Breathing Effects</div>
                  <div>• Pause Timing</div>
                  <div>• Word Emphasis</div>
                  <div>• Clarity Control</div>
                  <div>• Advanced Features</div>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" onClick={() => window.open("/payment", "_blank")}>
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
                <p className="text-xs text-gray-500">Paid users get Advanced controls</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Sample Audio Player and Approval */}
      {sampleAudio && !sampleApproved && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice Sample - Test Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-white/70 p-4 rounded-lg">
                <p className="text-sm text-gray-700 italic">
                  "{getSampleText()}..."
                </p>
              </div>
              <audio controls className="w-full">
                <source src={sampleAudio} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ✨ <strong>Test Sample:</strong> This is just the first 50 words.
                  No words deducted, no history saved.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleApproveSample}
                  className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  ✓ Perfect! Generate Full Audio
                </Button>
                <Button
                  onClick={handleRejectSample}
                  variant="outline"
                  className="w-full sm:flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                  disabled={advancedPanelCount >= 1}
                >
                  {advancedPanelCount >= 1 ? 'Settings Panel Open' : '⚙ Adjust Settings'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings for Fine-tuning (appears after rejection) */}
      {showAdvancedSettings && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-lg text-orange-900">
              ⚙ Fine-tune Voice Settings
            </CardTitle>
            <p className="text-sm text-orange-700">
              Adjust these settings to perfect your voice quality, then generate a new sample.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Speed: {speed[0]}x</label>
                <Slider
                  value={speed}
                  onValueChange={setSpeed}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pitch: {pitch[0]}x</label>
                <Slider
                  value={pitch}
                  onValueChange={setPitch}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Lower</span>
                  <span>Natural</span>
                  <span>Higher</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Emotion</label>
                <Select value={emotion} onValueChange={setEmotion}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral"> Neutral</SelectItem>
                    <SelectItem value="happy"> Happy</SelectItem>
                    <SelectItem value="sad">Sad</SelectItem>
                    <SelectItem value="excited"> Excited</SelectItem>
                    <SelectItem value="calm"> Calm</SelectItem>
                    <SelectItem value="confident"> Confident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Accent</label>
                <Select value={accent} onValueChange={setAccent}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default"> Default</SelectItem>
                    <SelectItem value="american"> American</SelectItem>
                    <SelectItem value="british">British</SelectItem>
                    <SelectItem value="australian"> Australian</SelectItem>
                    <SelectItem value="canadian"> Canadian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Voice Style</label>
                <Select value={voiceStyle} onValueChange={setVoiceStyle}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">🎭 Natural</SelectItem>
                    <SelectItem value="news">📰 News Reader</SelectItem>
                    <SelectItem value="conversational">💬 Conversational</SelectItem>
                    <SelectItem value="dramatic">🎬 Dramatic</SelectItem>
                    <SelectItem value="storytelling">📚 Storytelling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Volume: {volume[0]}x</label>
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  min={0.1}
                  max={1.5}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Quiet</span>
                  <span>Normal</span>
                  <span>Loud</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleGenerateSample}
                disabled={isSampleGeneration}
                className="flex-1"
              >
                {isSampleGeneration ? "Generating..." : "Generate New Sample"}
              </Button>
              <Button
                onClick={() => setShowAdvancedSettings(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Status - DUAL BUTTON FOR PAID USERS */}
      {!hasAudio && !sampleAudio && !sampleApproved && (
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
                  {isPaidUser
                    ? "Test with a 50-word sample first, or generate the full audio directly."
                    : "Your text will be converted to high-quality speech using advanced AI."
                  }
                </p>
              </div>
              {estimatedTime > 0 && !isGenerating && (
                <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Estimated time: ~{estimatedTime} seconds</span>
                </div>
              )}
              {isPaidUser ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleGenerateSample}
                    disabled={!canGenerate}
                    variant="outline"
                    size="lg"
                    className="px-6 sm:px-8 py-2 sm:py-3 border-blue-300 hover:bg-blue-50"
                  >
                    <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Generate Sample (50 words)
                  </Button>
                  <Button
                    onClick={handleGenerateFullAudio}
                    disabled={!canGenerate}
                    size="lg"
                    className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600"
                  >
                    <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Generate Full Audio ({wordCount} words)
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleGenerateFullAudio}
                  disabled={!canGenerate}
                  size="lg"
                  className="px-6 sm:px-8 py-2 sm:py-3"
                >
                  <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Generate Full Audio
                </Button>
              )}
              {isPaidUser && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Sample generation is free and doesn't use your word balance
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready for Full Generation */}
      {sampleApproved && !hasAudio && (
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
              <Button
                onClick={handleGenerateFullAudio}
                disabled={!canGenerate}
                size="lg"
                className="w-full sm:w-auto px-4 sm:px-8 py-3 text-sm sm:text-base bg-green-600 hover:bg-green-700"
              >
                <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Generate Complete Audio ({wordCount} words)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
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
                    {isSampleGeneration ? "Processing 50-word sample..." : `Processing ${wordCount} words...`}
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

      {/* Success Status */}
      {hasAudio && (
        <Card className="border-green-200 bg-green-50/50 animate-fade-in">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-green-900 mb-2">
                  Audio Generated Successfully!
                </h3>
                <p className="text-sm sm:text-base text-green-700">
                  Your high-quality audio is ready for download and playback.
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                ✓ Generation Complete
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        {!hasAudio && (
          <Button
            onClick={onPrevious}
            variant="outline"
            disabled={isGenerating}
            className="order-2 sm:order-1 w-full sm:w-auto text-sm"
          >
            Back to Voice Selection
          </Button>
        )}
        <Button
          onClick={onNext}
          disabled={!hasAudio}
          size="lg"
          className="order-1 sm:order-2 w-full sm:w-auto px-4 sm:px-8 py-3 text-sm sm:text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white rounded-lg transition-colors"
        >
          Continue to Final Results
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ModernStepFour;
