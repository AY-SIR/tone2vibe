import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ModernStepOne from "@/components/tool/ModernStepOne";
import ModernStepTwo from "@/components/tool/ModernStepTwo";
import ModernStepThree from "@/components/tool/ModernStepThree";
import ModernStepFour from "@/components/tool/ModernStepFour";
import ModernStepFive from "@/components/tool/ModernStepFive";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import Header from "@/components/layout/Header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STORAGE_KEY = "tool_state_v2";

interface ToolState {
  currentStep: number;
  completedSteps: number[];
  extractedText: string;
  wordCount: number;
  selectedLanguage: string;
  selectedVoiceId: string;
  voiceType: 'record' | 'prebuilt' | 'history';
  processedAudioUrl: string;
}

const Tool = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSteps = 5;

  const getInitialState = (): ToolState => {
    try {
      const savedState = sessionStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // ✅ FIX: If on step 5, reset to step 1 on reload
        if (parsed.currentStep === 5) {
          sessionStorage.removeItem(STORAGE_KEY);
          return getDefaultState();
        }
        return parsed;
      }
    } catch (error) {
      console.error("Error loading saved state:", error);
    }
    return getDefaultState();
  };

  const getDefaultState = (): ToolState => ({
    currentStep: 1,
    completedSteps: [],
    extractedText: "",
    wordCount: 0,
    selectedLanguage: "hi-IN",
    selectedVoiceId: "",
    voiceType: 'record',
    processedAudioUrl: "",
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [voiceType, setVoiceType] = useState<'record' | 'prebuilt' | 'history'>('record');
  const [voiceRecording, setVoiceRecording] = useState<Blob | null>(null);
  const [processedAudioUrl, setProcessedAudioUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessingSuccess, setIsProcessingSuccess] = useState(false);

  const calculateWordCount = useCallback((text: string): number => {
    if (!text || !text.trim()) return 0;

    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    let totalWordCount = 0;

    words.forEach((word) => {
      totalWordCount += word.length > 45 ? Math.ceil(word.length / 45) : 1;
    });

    return totalWordCount;
  }, []);

  useEffect(() => {
    if (!loading && user && !isInitialized) {
      const initialState = getInitialState();
      setCurrentStep(initialState.currentStep);
      setCompletedSteps(initialState.completedSteps);
      setExtractedText(initialState.extractedText);
      setWordCount(initialState.wordCount);
      setSelectedLanguage(initialState.selectedLanguage);
      setSelectedVoiceId(initialState.selectedVoiceId);
      setVoiceType(initialState.voiceType);
      setProcessedAudioUrl(initialState.processedAudioUrl);
      setIsInitialized(true);
    }
  }, [loading, user, isInitialized]);

  useEffect(() => {
    if (!isInitialized || currentStep === 5) return;

    try {
      const state: ToolState = {
        currentStep,
        completedSteps,
        extractedText,
        wordCount,
        selectedLanguage,
        selectedVoiceId,
        voiceType,
        processedAudioUrl,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Error saving state:", error);
    }
  }, [
    currentStep,
    completedSteps,
    extractedText,
    wordCount,
    selectedLanguage,
    selectedVoiceId,
    voiceType,
    processedAudioUrl,
    isInitialized
  ]);

  useEffect(() => {
    if (isInitialized) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [currentStep, isInitialized]);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  const hasEnoughWords = useMemo(() => {
    if (!profile || wordCount === 0) return true;

    const planWordsAvailable = Math.max(0, (profile.words_limit || 0) - (profile.plan_words_used || 0));
    const purchasedWords = profile.word_balance || 0;
    const totalAvailable = planWordsAvailable + purchasedWords;

    return wordCount <= totalAvailable;
  }, [profile, wordCount]);

  const remainingWords = useMemo(() => {
    if (!profile) return 0;
    const planWordsAvailable = Math.max(0, (profile.words_limit || 0) - (profile.plan_words_used || 0));
    const purchasedWords = profile.word_balance || 0;
    return planWordsAvailable + purchasedWords;
  }, [profile]);

  const getStepTitle = useCallback((step: number) => {
    const titles: Record<number, string> = {
      1: "Upload & Extract",
      2: "Review & Edit",
      3: "Voice Selection",
      4: "Generate Audio",
      5: "Download & Save",
    };
    return titles[step] || `Step ${step}`;
  }, []);

  const getStepDescription = useCallback((step: number) => {
    const descriptions: Record<number, string> = {
      1: "Upload files or type text to get started",
      2: "Review, translate and correct your text",
      3: "Record voice sample or choose preset",
      4: "Generate high-quality audio with AI",
      5: "Download and save to your history",
    };
    return descriptions[step] || "";
  }, []);

  const stopAllAudio = useCallback(() => {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep === 1 && !extractedText.trim()) {
      toast({
        title: "No Text Provided",
        description: "Please enter or extract text before continuing.",
        variant: "destructive"
      });
      return;
    }

    if (currentStep === 2 && !selectedLanguage) {
      toast({
        title: "No Language Selected",
        description: "Please select a language before continuing.",
        variant: "destructive"
      });
      return;
    }

    if (currentStep === 3) {
      if (!selectedVoiceId && !voiceRecording) {
        toast({
          title: "No Voice Selected",
          description: "Please record or select a voice before continuing.",
          variant: "destructive"
        });
        return;
      }

      if (!hasEnoughWords) {
        toast({
          title: "Insufficient Word Balance",
          description: `You need ${wordCount.toLocaleString()} words but only have ${remainingWords.toLocaleString()} remaining. Please upgrade your plan or purchase more words.`,
          variant: "destructive",
          duration: 5000
        });
        return;
      }
    }

    if (currentStep === 4 && !processedAudioUrl) {
      toast({
        title: "Audio Not Generated",
        description: "Please generate audio before continuing.",
        variant: "destructive"
      });
      return;
    }

    stopAllAudio();

    if (currentStep < totalSteps) {
      setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, extractedText, selectedLanguage, selectedVoiceId, voiceRecording, processedAudioUrl, hasEnoughWords, wordCount, remainingWords, toast, stopAllAudio]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      stopAllAudio();

      if (currentStep === 5) {
        // Keep everything
      } else if (currentStep === 4) {
        setProcessedAudioUrl("");
      } else if (currentStep === 3) {
        setSelectedVoiceId("");
        setVoiceType('record');
        setVoiceRecording(null);
      } else if (currentStep === 2) {
        setExtractedText("");
        setWordCount(0);
        setSelectedLanguage("en-US");
      }

      setCompletedSteps((prev) => prev.filter(step => step !== currentStep));
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, stopAllAudio]);

  const handleProcessingStart = (stepName: string, isSuccess: boolean = false) => {
    setIsProcessing(true);
    setProcessingStep(stepName);
    setIsProcessingSuccess(isSuccess);
  };

  const handleProcessingEnd = () => {
    setIsProcessing(false);
    setProcessingStep("");
    setIsProcessingSuccess(false);
  };

  const handleTextExtraction = (text: string) => {
    setExtractedText(text);
    const count = calculateWordCount(text);
    setWordCount(count);
  };

  const handleTextUpdated = (updatedText: string) => {
    const previousText = extractedText;
    setExtractedText(updatedText);

    const newCount = calculateWordCount(updatedText);
    setWordCount(newCount);

    const changePercentage = Math.abs(updatedText.length - previousText.length) / Math.max(previousText.length, 1);
    if (changePercentage > 0.1 && (selectedVoiceId || voiceRecording)) {
      setSelectedVoiceId("");
      setVoiceType('record');
      setVoiceRecording(null);
      setProcessedAudioUrl("");
      setCompletedSteps(prev => prev.filter(step => step <= 2));

      toast({
        title: "Text Changed",
        description: "Voice selection cleared due to significant text changes. Please reselect a voice.",
        duration: 4000
      });
    }
  };

  const handleWordCountUpdate = (count: number) => {
    setWordCount(count);
  };

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
  };

  const handleVoiceRecorded = (blob: Blob) => {
    setVoiceRecording(blob);
    setSelectedVoiceId("");
    setVoiceType('record');
  };

  const handleVoiceSelect = (voiceId: string, type: 'prebuilt' | 'history') => {
    setSelectedVoiceId(voiceId);
    setVoiceType(type);
    setVoiceRecording(null);
  };

  const handleAudioGenerated = async (audioUrl: string) => {
    setProcessedAudioUrl(audioUrl);

    if (user && refreshProfile) {
      await refreshProfile();
    }
  };

  // ✅ NEW: Complete reset function with confirmation
  const handleCompleteReset = async () => {
    setIsProcessing(true);
    setProcessingStep("Resetting to start...");

    stopAllAudio();

    if (user && refreshProfile) {
      await refreshProfile();
    }

    setExtractedText("");
    setWordCount(0);
    setSelectedLanguage("hi-IN");
    setSelectedVoiceId("");
    setVoiceType('record');
    setVoiceRecording(null);
    setProcessedAudioUrl("");
    setCurrentStep(1);
    setCompletedSteps([]);

    try {
      sessionStorage.removeItem(STORAGE_KEY);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('audioDuration_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Error clearing saved state:", error);
    }

    setIsProcessing(false);
    setProcessingStep("");

    toast({
      title: "Reset Complete",
      description: "Ready for a new voice generation!",
      duration: 3000,
    });
  };

  const progressPercentage = useMemo(() =>
    ((currentStep - 1) / (totalSteps - 1)) * 100,
    [currentStep, totalSteps]
  );

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <>
      <LoadingOverlay
        isVisible={isProcessing}
        message={processingStep || "Processing your request..."}
        isSuccess={isProcessingSuccess}
      />

      <div className="min-h-screen bg-background" ref={containerRef}>
        <div className="sticky top-2 z-50">
          <Header />
        </div>

  <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* ✅ NEW: Reset Button - Visible on all steps */}
          <div className="flex justify-end mb-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs sm:text-sm"
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Reset All</span>
                  <span className="sm:hidden">Reset</span>
                </Button>
              </AlertDialogTrigger>
        <AlertDialogContent className="w-[95vw] max-w-lg rounded-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Everything?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all your progress and return you to Step 1. Your current work will be lost.
                    {currentStep === 5 && " Your generated audio will remain in history."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCompleteReset}>
                    Yes, Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mb-4 sm:mb-6">
            {Array.from({ length: totalSteps }, (_, i) => {
              const step = i + 1;
              const isCompleted = completedSteps.includes(step);
              const isCurrent = currentStep === step;
              return (
                <Button
                  key={step}
                  variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
                  size="sm"
                  className={`flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm ${isCurrent ? "shadow-lg" : ""}`}
                  disabled={step > currentStep}
                >
                  {isCompleted && <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />}
                  {isCurrent && isProcessing && <Clock className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
                  <span className="hidden sm:inline font-medium">{getStepTitle(step)}</span>
                  <span className="sm:hidden font-medium">{step}</span>
                </Button>
              );
            })}
          </div>

          <div className="mb-4 sm:mb-6">
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2 sm:h-2" />
          </div>

          {!hasEnoughWords && wordCount > 0 && currentStep > 1 && (
            <Card className="mb-4 sm:mb-6 border-destructive/50 bg-destructive/5">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive text-sm">Insufficient Word Balance</p>
                    <p className="text-xs sm:text-sm text-destructive/80">
                      Need {wordCount.toLocaleString()} words, have {remainingWords.toLocaleString()} remaining.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => navigate('/payment')}
                  >
                    Get More Words
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg border-0 bg-card">
            <CardHeader className="border-b p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-xs sm:text-sm">
                  {currentStep}
                </span>
                <div>
                  <CardTitle className="text-base sm:text-lg lg:text-xl">{getStepTitle(currentStep)}</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{getStepDescription(currentStep)}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {currentStep === 1 && (
                <ModernStepOne
                  onNext={handleNext}
                  onTextExtracted={handleTextExtraction}
                  onWordCountUpdate={handleWordCountUpdate}
                  onProcessingStart={handleProcessingStart}
                  onProcessingEnd={handleProcessingEnd}
                  initialText={extractedText}
                />
              )}
              {currentStep === 2 && (
                <ModernStepTwo
                  extractedText={extractedText}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onTextUpdated={handleTextUpdated}
                  onProcessingStart={handleProcessingStart}
                  onProcessingEnd={handleProcessingEnd}
                  onLanguageSelect={handleLanguageSelect}
                />
              )}

              {currentStep === 3 && (
                <ModernStepThree
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onVoiceRecorded={handleVoiceRecorded}
                  onProcessingStart={handleProcessingStart}
                  onProcessingEnd={handleProcessingEnd}
                  onVoiceSelect={(voiceId, type) => handleVoiceSelect(voiceId, type)}
                  selectedVoiceId={selectedVoiceId}
                  selectedLanguage={selectedLanguage}
                />
              )}

              {currentStep === 4 && (
                <ModernStepFour
                  extractedText={extractedText}
                  selectedLanguage={selectedLanguage}
                  voiceRecording={voiceRecording}
                  selectedVoiceId={selectedVoiceId}
                  voiceType={voiceType}
                  wordCount={wordCount}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onAudioGenerated={handleAudioGenerated}
                  onProcessingStart={handleProcessingStart}
                  onProcessingEnd={handleProcessingEnd}
                />
              )}

              {currentStep === 5 && (
                <ModernStepFive
                  audioUrl={processedAudioUrl || ""}
                  extractedText={extractedText}
                  selectedLanguage={selectedLanguage}
                  wordCount={wordCount}
                  onNextGeneration={handleCompleteReset}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Tool;