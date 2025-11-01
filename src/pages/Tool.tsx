import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ModernStepOne from "@/components/tool/ModernStepOne";
import ModernStepTwo from "@/components/tool/ModernStepTwo";
import ModernStepThree from "@/components/tool/ModernStepThree";
import ModernStepFour from "@/components/tool/ModernStepFour";
import ModernStepFive from "@/components/tool/ModernStepFive";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import Header from "@/components/layout/Header";

const STORAGE_KEY = "tool_state_v1";

interface ToolState {
  currentStep: number;
  completedSteps: number[];
  extractedText: string;
  wordCount: number;
  selectedLanguage: string;
  selectedVoiceId: string;
  selectedVoiceType: 'record' | 'history' | 'prebuilt' | '';
  processedAudioUrl: string;
}

const Tool = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // FIXED: Ref to scroll to top of page
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSteps = 5;

  const getInitialState = (): ToolState => {
    try {
      const savedState = sessionStorage.getItem(STORAGE_KEY);
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      console.error("Error loading saved state:", error);
    }

    return {
      currentStep: 1,
      completedSteps: [],
      extractedText: "",
      wordCount: 0,
      selectedLanguage: "en-US",
      selectedVoiceId: "",
      selectedVoiceType: '',
      processedAudioUrl: "",
    };
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [selectedVoiceType, setSelectedVoiceType] = useState<'record' | 'history' | 'prebuilt' | ''>('');
  const [voiceRecording, setVoiceRecording] = useState<Blob | null>(null);
  const [processedAudioUrl, setProcessedAudioUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!loading && user && !isInitialized) {
      const initialState = getInitialState();
      setCurrentStep(initialState.currentStep);
      setCompletedSteps(initialState.completedSteps);
      setExtractedText(initialState.extractedText);
      setWordCount(initialState.wordCount);
      setSelectedLanguage(initialState.selectedLanguage);
      setSelectedVoiceId(initialState.selectedVoiceId);
      setSelectedVoiceType(initialState.selectedVoiceType || '');
      setProcessedAudioUrl(initialState.processedAudioUrl);
      setIsInitialized(true);
    }
  }, [loading, user, isInitialized]);

  useEffect(() => {
  if (!isInitialized || currentStep === 5) return; // ⬅️ skip saving at step 5

    try {
      const state: ToolState = {
        currentStep,
        completedSteps,
        extractedText,
        wordCount,
        selectedLanguage,
        selectedVoiceId,
        selectedVoiceType,
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
    selectedVoiceType,
    processedAudioUrl,
    isInitialized
  ]);

  // FIXED: Scroll to top whenever currentStep changes
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

  useEffect(() => {
    if (!extractedText) {
      setWordCount(0);
      return;
    }

    const words = extractedText.trim().split(/\s+/).filter((w) => w.length > 0);
    let totalWordCount = 0;

    words.forEach((word) => {
      totalWordCount += word.length > 45 ? Math.ceil(word.length / 45) : 1;
    });

    setWordCount(totalWordCount);
  }, [extractedText]);

  const remainingWords = useMemo(() => {
    if (!profile) return 0;
    const planWordsAvailable = Math.max(0, profile.words_limit - (profile.plan_words_used || 0));
    const purchasedWords = profile.word_balance || 0;
    return planWordsAvailable + purchasedWords;
  }, [profile]);

  const hasEnoughWords = useMemo(() => {
    return wordCount <= remainingWords;
  }, [wordCount, remainingWords]);

  // Block navigation to step 4 if insufficient words
  useEffect(() => {
    if (currentStep === 4 && !hasEnoughWords && wordCount > 0) {
      toast({
        title: "Insufficient Words",
        description: `You need ${wordCount} words but only have ${remainingWords} available.`,
        variant: "destructive",
      });
      setCurrentStep(3);
    }
  }, [currentStep, hasEnoughWords, wordCount, remainingWords, toast]);

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

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps) {
      setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      if (currentStep === 5) {
        // Going back from step 5 to 4: Keep everything
      } else if (currentStep === 4) {
        // Going back from step 4 to 3: Reset audio generation data only
        setProcessedAudioUrl("");
      } else if (currentStep === 3) {
        // Going back from step 3 to 2: Reset voice selection data
        setSelectedVoiceId("");
        setVoiceRecording(null);
      } else if (currentStep === 2) {
        // Going back from step 2 to 1: Reset text and language data
        setExtractedText("");
        setWordCount(0);
        setSelectedLanguage("en-US");
      }

      setCompletedSteps((prev) => prev.filter(step => step !== currentStep));
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleProcessingStart = (stepName: string) => {
    setIsProcessing(true);
    setProcessingStep(stepName);
  };

  const handleProcessingEnd = () => {
    setIsProcessing(false);
    setProcessingStep("");
  };

  const handleTextExtraction = (text: string) => {
    setExtractedText(text);
    if (text.trim()) handleNext();
  };

  const handleVoiceRecorded = (blob: Blob) => {
    setVoiceRecording(blob);
    setSelectedVoiceId("");
    setSelectedVoiceType('record');
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    setVoiceRecording(null);
  };

  const handleVoiceTypeChange = (type: 'record' | 'history' | 'prebuilt' | '') => {
    setSelectedVoiceType(type);
  };

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
  };

  const handleWordCountUpdate = (count: number) => {
    setWordCount(count);
  };

  const handleAudioGenerated = async (audioUrl: string) => {
    setProcessedAudioUrl(audioUrl);

    if (user && refreshProfile) {
      await refreshProfile();
    }
  };

  const handleTextUpdated = (updatedText: string) => {
    setExtractedText(updatedText);
  };

  const handleReset = async () => {
    setIsProcessing(true);
    setProcessingStep("Preparing for new generation...");

    if (user && refreshProfile) {
      await refreshProfile();
    }

    setExtractedText("");
    setWordCount(0);
    setSelectedLanguage("en-US");
    setSelectedVoiceId("");
    setVoiceRecording(null);
    setProcessedAudioUrl("");
    setCurrentStep(1);
    setCompletedSteps([]);

    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing saved state:", error);
    }

    setIsProcessing(false);
    setProcessingStep("");

    toast({
      title: "Ready for New Generation",
      description: "All data cleared. Start fresh!",
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
      <LoadingOverlay isVisible={isProcessing} message={processingStep || "Processing your request..."} />

      <div className="min-h-screen bg-background" ref={containerRef}>
        <div className="sticky top-2 z-50">
          <Header />
        </div>

        <div className="container mx-auto px-4 py-8 max-w-6xl">
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
              <span>
                Step {currentStep} of {totalSteps}
              </span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2 sm:h-2" />
          </div>

          {!hasEnoughWords && wordCount > 0 && (
            <Card className="mb-4 sm:mb-6 border-destructive/50 bg-destructive/5">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive text-sm">Insufficient Word Balance</p>
                    <p className="text-xs sm:text-sm text-destructive/80">
                      Need {wordCount} words, have {remainingWords} remaining.
                    </p>
                  </div>
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
                  onNext={() => {
                    // Check words before proceeding
                    if (!hasEnoughWords && wordCount > 0) {
                      toast({
                        title: "Insufficient Words",
                        description: `You need ${wordCount} words but only have ${remainingWords} available. Please purchase more words.`,
                        variant: "destructive",
                      });
                      return;
                    }
                    handleNext();
                  }}
                  onPrevious={handlePrevious}
                  onVoiceRecorded={handleVoiceRecorded}
                  onProcessingStart={handleProcessingStart}
                  onProcessingEnd={handleProcessingEnd}
                  onVoiceSelect={handleVoiceSelect}
                  onVoiceTypeChange={handleVoiceTypeChange}
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
                  selectedVoiceType={selectedVoiceType}
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
                  onNextGeneration={handleReset}
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