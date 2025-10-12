import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [sampleApproved, setSampleApproved] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);

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
  const isProUser = profile?.plan === 'pro';

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
          voice_settings: { stability: voiceStability[0], similarity_boost: voiceClarity[0] }
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
      // === MODIFICATION: CATCH BLOCK UPDATED ===
      // On error, show a proper error message instead of failing silently.
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
          voice_settings: {
            stability: voiceStability[0],
            similarity_boost: voiceClarity[0],
            style: voiceStyle === 'natural' ? 0.0 : 0.5,
            use_speaker_boost: true
          },
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
        setTimeout(() => onNext(), 2000); // Proceed to next step only on success
      } else {
        throw new Error("No audio content received");
      }
    // === MODIFICATION: CATCH BLOCK UPDATED ===
    } catch (error) {
      // On error, show a proper error message and stay on the current step.
      console.error("Audio generation failed:", error);
      setProgress(0); // Reset progress on failure
      toast({
        title: "Audio Generation Failed",
        description: "An error occurred while creating your audio. Please try again.",
        variant: "destructive",
      });
      setGeneratedAudio(""); // Ensure no old audio data persists
      onAudioGenerated("");
    // === MODIFICATION: FINALLY BLOCK UPDATED ===
    } finally {
      // Cleanup logic that runs on both success and failure.
      clearInterval(progressInterval);
      setIsGenerating(false);
      onProcessingEnd();
    }
  };

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

              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {selectedLanguage.split('-')[0].toUpperCase()}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Language</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {profile?.plan === 'premium' ?
                  'HD' : 'STD'}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Quality</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings with Tabs - Always visible BEFORE generation */}
      <Card>
        <CardHeader>

          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">

            <CardTitle className="flex items-center text-lg">
              <Settings className="h-5 w-5 mr-2" />
              Advanced Settings
              {isPremiumUser && <Crown className="h-4 w-4 ml-2 text-yellow-500" />}

            </CardTitle>
            {profile?.plan === 'free' ?
              (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Upgrade to unlock
              </Badge>
            ) : (
              <Button

                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAdvanced(!showAdvanced);
                  if (!showAdvanced && sampleAudio) {

                    setSampleAudio('');
                    setSampleApproved(false);
                    toast({
                      title: "Settings changed",
                      description: "Generate a new sample with updated settings",

                    });
                  }
                }}
                className="text-sm"
              >
                {showAdvanced ? "Hide" : "Show"}
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Free Plan - Locked state */}
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

        {/* Pro/Premium Settings with Tabs */}
        {isPaidUser && showAdvanced && (
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: isPremiumUser ? '1fr 1fr 1fr' : '1fr 1fr' }}>
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="normal">Normal</TabsTrigger>
                {isPremiumUser && (
                  <TabsTrigger value="premium" className="flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Premium
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Basic Tab - Available for Pro & Premium */}
              <TabsContent value="basic" className="space-y-4 mt-4">
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
                </div>
              </TabsContent>

             {/* Normal Tab - Available for Pro & Premium */}
              <TabsContent value="normal" className="space-y-4 mt-4">
                <div className="grid gap-4 sm:grid-cols-2">

                  {/* Voice Style */}
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
                        <SelectItem value="dramatic">Dramatic</SelectItem>
                        <SelectItem value="storytelling">Storytelling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Emotion */}
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
                        <SelectItem value="surprised">Surprised</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Accent */}
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
                        <SelectItem value="irish">Irish</SelectItem>
                        <SelectItem value="southern">Southern US</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Premium Tab - Premium Only */}
              {isPremiumUser && (
                <TabsContent value="premium" className="space-y-4 mt-4">
                  <div className="p-3 bg-purple-50 rounded-lg mb-4">
                    <p className="text-xs text-purple-700">
                      <Crown className="h-3 w-3 inline mr-1" />
                      <strong>Premium Fine-Tune Controls</strong> - Advanced parameters for professional quality
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Voice Stability: {voiceStability[0].toFixed(2)}</label>
                      <Slider
                        value={voiceStability}
                        onValueChange={setVoiceStability}
                        min={0.0}
                        max={1.0}
                        step={0.01}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">Controls voice consistency</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Voice Clarity: {voiceClarity[0].toFixed(2)}</label>
                      <Slider
                        value={voiceClarity}
                        onValueChange={setVoiceClarity}
                        min={0.0}
                        max={1.0}
                        step={0.01}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">Boosts clarity vs. naturalness</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Breathing Sound: {breathingSound[0].toFixed(2)}</label>
                      <Slider
                        value={breathingSound}
                        onValueChange={setBreathingSound}
                        min={0.0}
                        max={1.0}
                        step={0.01}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">Add realistic breathing</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pause Length: {pauseLength[0].toFixed(1)}x</label>
                      <Slider
                        value={pauseLength}
                        onValueChange={setPauseLength}
                        min={0.5}
                        max={3.0}
                        step={0.1}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">Control natural pauses</p>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-medium">Word Emphasis: {wordEmphasis[0].toFixed(2)}</label>
                      <Slider
                        value={wordEmphasis}
                        onValueChange={setWordEmphasis}
                        min={0.5}
                        max={2.0}
                        step={0.01}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">Fine-tune word emphasis</p>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        )}
      </Card>

    {/* Sample Audio Player */}
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
        {/* Sample Text Box */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-sm text-gray-800 italic">
            "{getSampleText()}..."
          </p>
        </div>

        {/* Audio Player */}
        <audio controls className="w-full">
          <source src={sampleAudio} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>

        {/* Info Box */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-700">
            ✨ <strong>Test Sample:</strong> First 50 words. No words deducted, no history saved.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleApproveSample}
            className="w-full sm:flex-1 bg-black hover:bg-gray-800 text-white"
          >
            ✓ Approve & Continue
          </Button>
          <Button
            onClick={handleGenerateSample}
            variant="outline"
            className="w-full sm:flex-1 border border-black text-black hover:bg-gray-100"
            disabled={isSampleGeneration}
          >
            {isSampleGeneration ? 'Generating...' : 'Regenerate Sample'}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)}


      {/* Generation Controls */}
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
                  {isPaidUser
                    ? "Test with a 50-word sample first, or generate the full audio directly."
                    : "Your text will be converted to high-quality speech using advanced AI."
                  }
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
                {isPaidUser && (
                  <Button
                    onClick={handleGenerateSample}
                    disabled={isGenerating}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 border-2 border-gray-300 hover:bg-gray-50"
                  >
                    <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Generate Sample (50 words)
                  </Button>
                )}
                <Button
                  onClick={handleGenerateFullAudio}
                  disabled={isGenerating}
                  size="lg"
                  className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-black hover:bg-gray-800 text-white"
                >
                  <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Generate Full Audio ({wordCount} words)
                </Button>
              </div>
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
              <Button
                onClick={handleGenerateFullAudio}
                disabled={isGenerating}
                size="lg"
                className="w-full sm:w-auto px-4 sm:px-8 py-3 text-sm sm:text-base bg-black hover:bg-gray-800 text-white"
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

      {/* Success Status */}
      {generationComplete && !isGenerating && (
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
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        {!generationComplete && !isGenerating && (
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
          disabled={!generationComplete || isGenerating}
          size="lg"
          className="order-1 sm:order-2 w-full sm:w-auto px-4 sm:px-8 py-3 text-sm sm:text-base bg-black hover:bg-gray-800 text-white"
        >
          Continue to Final Results
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ModernStepFour;