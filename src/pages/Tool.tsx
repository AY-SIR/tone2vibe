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
const MAX_TEXT_LENGTH = 500000;
const MAX_WORD_COUNT = 50000; // 50k words max
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB max for sessionStorage
const MAX_BLOB_SIZE = 50 * 1024 * 1024; // 50MB max for voice recordings

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

// Security: Validate and sanitize tool state
const validateToolState = (state: any): state is ToolState => {
  if (!state || typeof state !== 'object') return false;

  return (
    typeof state.currentStep === 'number' &&
    state.currentStep >= 1 &&
    state.currentStep <= 5 &&
    Array.isArray(state.completedSteps) &&
    state.completedSteps.every((s: any) => typeof s === 'number' && s >= 1 && s <= 5) &&
    typeof state.extractedText === 'string' &&
    state.extractedText.length <= MAX_TEXT_LENGTH &&
    typeof state.wordCount === 'number' &&
    state.wordCount >= 0 &&
    state.wordCount <= MAX_WORD_COUNT &&
    typeof state.selectedLanguage === 'string' &&
    /^[a-z]{2}-[A-Z]{2}$/.test(state.selectedLanguage) &&
    typeof state.selectedVoiceId === 'string' &&
    typeof state.voiceType === 'string' &&
    ['record', 'prebuilt', 'history'].includes(state.voiceType) &&
    typeof state.processedAudioUrl === 'string'
  );
};

// Security: Sanitize text input to prevent XSS
const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return '';

  // Limit length
  const truncated = text.slice(0, MAX_TEXT_LENGTH);

  // Remove potentially dangerous patterns
  return truncated
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

// Security: Safe storage operations with error handling
const safeStorageGet = (key: string): string | null => {
  try {
    const item = sessionStorage.getItem(key);
    if (!item) return null;

    // Check size before parsing
    if (item.length > MAX_STORAGE_SIZE) {
      console.warn('Storage item too large, removing');
      sessionStorage.removeItem(key);
      return null;
    }

    return item;
  } catch (error) {
    console.error('Storage read error:', error);
    return null;
  }
};

const safeStorageSet = (key: string, value: string): boolean => {
  try {
    // Check size before setting
    if (value.length > MAX_STORAGE_SIZE) {
      console.error('Value too large for storage');
      return false;
    }

    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('Storage write error:', error);
    // Try to free up space
    try {
      sessionStorage.clear();
    } catch (clearError) {
      console.error('Failed to clear storage:', clearError);
    }
    return false;
  }
};

const safeStorageRemove = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Storage remove error:', error);
  }
};

const Tool = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const resetCounterRef = useRef(0); // Add reset counter for forcing remounts

  const totalSteps = 5;

  const getInitialState = (): ToolState => {
    try {
      const savedState = safeStorageGet(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);

        // Security: Validate parsed state
        if (!validateToolState(parsed)) {
          console.warn('Invalid saved state, resetting');
          safeStorageRemove(STORAGE_KEY);
          return getDefaultState();
        }

        // Reset if on step 5
        if (parsed.currentStep === 5) {
          safeStorageRemove(STORAGE_KEY);
          return getDefaultState();
        }

        // Sanitize text content
        parsed.extractedText = sanitizeText(parsed.extractedText);

        return parsed;
      }
    } catch (error) {
      console.error("Error loading saved state:", error);
      safeStorageRemove(STORAGE_KEY);
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
  const [resetCounter, setResetCounter] = useState(0); // Add state for reset counter

  // Security: Safe word count calculation with limits
  const calculateWordCount = useCallback((text: string): number => {
    if (!text || !text.trim()) return 0;

    // Sanitize input
    const sanitized = sanitizeText(text);

    const words = sanitized.trim().split(/\s+/).filter(w => w.length > 0);
    let totalWordCount = 0;

    words.forEach((word) => {
      // Limit individual word processing
      const wordLength = Math.min(word.length, 1000);
      totalWordCount += wordLength > 45 ? Math.ceil(wordLength / 45) : 1;
    });

    // Enforce maximum word count
    return Math.min(totalWordCount, MAX_WORD_COUNT);
  }, []);

  // Security: Component cleanup
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Stop all media on unmount
      try {
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
          audio.pause();
          audio.src = '';
          audio.load();
        });

        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          video.pause();
          video.src = '';
          video.load();
        });
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && user && !isInitialized && isMountedRef.current) {
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

  // Security: Throttled state persistence
  useEffect(() => {
    if (!isInitialized || currentStep === 5 || !isMountedRef.current) return;

    const timeoutId = setTimeout(() => {
      try {
        const state: ToolState = {
          currentStep,
          completedSteps,
          extractedText: sanitizeText(extractedText),
          wordCount: Math.min(wordCount, MAX_WORD_COUNT),
          selectedLanguage,
          selectedVoiceId,
          voiceType,
          processedAudioUrl,
        };

        // Validate before saving
        if (validateToolState(state)) {
          safeStorageSet(STORAGE_KEY, JSON.stringify(state));
        }
      } catch (error) {
        console.error("Error saving state:", error);
      }
    }, 500); // Debounce saves

    return () => clearTimeout(timeoutId);
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
    if (isInitialized && isMountedRef.current) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [currentStep, isInitialized]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true }); // Security: Use replace to prevent back navigation
    }
  }, [user, loading, navigate]);

  // Security: Safe calculation with null checks
  const hasEnoughWords = useMemo(() => {
    if (!profile || wordCount === 0) return true;

    const wordsLimit = Math.max(0, profile.words_limit || 0);
    const planWordsUsed = Math.max(0, profile.plan_words_used || 0);
    const wordBalance = Math.max(0, profile.word_balance || 0);

    const planWordsAvailable = Math.max(0, wordsLimit - planWordsUsed);
    const totalAvailable = planWordsAvailable + wordBalance;

    return wordCount <= totalAvailable;
  }, [profile, wordCount]);

  const remainingWords = useMemo(() => {
    if (!profile) return 0;

    const wordsLimit = Math.max(0, profile.words_limit || 0);
    const planWordsUsed = Math.max(0, profile.plan_words_used || 0);
    const wordBalance = Math.max(0, profile.word_balance || 0);

    const planWordsAvailable = Math.max(0, wordsLimit - planWordsUsed);
    return planWordsAvailable + wordBalance;
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
    try {
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
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (!isMountedRef.current) return;

    // Security: Validate inputs at each step
    if (currentStep === 1) {
      const sanitized = sanitizeText(extractedText);
      if (!sanitized.trim()) {
        toast({
          title: "No Text Provided",
          description: "Please enter or extract text before continuing.",
          variant: "destructive"
        });
        return;
      }
    }

    if (currentStep === 2) {
      if (!selectedLanguage || !/^[a-z]{2}-[A-Z]{2}$/.test(selectedLanguage)) {
        toast({
          title: "Invalid Language",
          description: "Please select a valid language before continuing.",
          variant: "destructive"
        });
        return;
      }
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
  if (!isMountedRef.current || currentStep <= 1) return;

  stopAllAudio();

  if (currentStep === 4) {
    setProcessedAudioUrl("");
  } else if (currentStep === 3) {
    setSelectedVoiceId("");
    setVoiceType('record');
    setVoiceRecording(null);
  }
  // Remove the "else if (currentStep === 2)" block entirely

  setCompletedSteps((prev) => prev.filter(step => step !== currentStep));
  setCurrentStep(currentStep - 1);
}, [currentStep, stopAllAudio]);

  const handleProcessingStart = (stepName: string, isSuccess: boolean = false) => {
    if (!isMountedRef.current) return;
    setIsProcessing(true);
    setProcessingStep(stepName);
    setIsProcessingSuccess(isSuccess);
  };

  const handleProcessingEnd = () => {
    if (!isMountedRef.current) return;
    setIsProcessing(false);
    setProcessingStep("");
    setIsProcessingSuccess(false);
  };

  const handleTextExtraction = (text: string) => {
    if (!isMountedRef.current) return;

    const sanitized = sanitizeText(text);
    setExtractedText(sanitized);
    const count = calculateWordCount(sanitized);
    setWordCount(count);
  };

  const handleTextUpdated = (updatedText: string) => {
    if (!isMountedRef.current) return;

    const previousText = extractedText;
    const sanitized = sanitizeText(updatedText);
    setExtractedText(sanitized);

    const newCount = calculateWordCount(sanitized);
    setWordCount(newCount);

    const prevLength = Math.max(previousText.length, 1);
    const changePercentage = Math.abs(sanitized.length - previousText.length) / prevLength;

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
    if (!isMountedRef.current) return;
    // Security: Enforce maximum
    setWordCount(Math.min(Math.max(0, count), MAX_WORD_COUNT));
  };

  const handleLanguageSelect = (language: string) => {
    if (!isMountedRef.current) return;
    // Security: Validate language format
    if (/^[a-z]{2}-[A-Z]{2}$/.test(language)) {
      setSelectedLanguage(language);
    }
  };

  const handleVoiceRecorded = (blob: Blob) => {
    if (!isMountedRef.current) return;

    // Security: Validate blob
    if (blob instanceof Blob && blob.size > 0 && blob.size < MAX_BLOB_SIZE) {
      setVoiceRecording(blob);
      setSelectedVoiceId("");
      setVoiceType('record');
    }
  };

  const handleVoiceSelect = (voiceId: string, type: 'prebuilt' | 'history') => {
    if (!isMountedRef.current) return;

    // Security: Validate voice type
    if (['prebuilt', 'history'].includes(type)) {
      setSelectedVoiceId(voiceId);
      setVoiceType(type);
      setVoiceRecording(null);
    }
  };

  const handleAudioGenerated = async (audioUrl: string) => {
    if (!isMountedRef.current) return;

    setProcessedAudioUrl(audioUrl);

    if (user && refreshProfile) {
      try {
        await refreshProfile();
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  const handleCompleteReset = async () => {
    if (!isMountedRef.current) return;

    setIsProcessing(true);
    setProcessingStep("Resetting to start...");

    stopAllAudio();

    if (user && refreshProfile) {
      try {
        await refreshProfile();
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }

    // Clear all state
    setExtractedText("");
    setWordCount(0);
    setSelectedLanguage("hi-IN");
    setSelectedVoiceId("");
    setVoiceType('record');
    setVoiceRecording(null);
    setProcessedAudioUrl("");
    setCurrentStep(1);
    setCompletedSteps([]);

    // Increment reset counter to force remount of Step 1
    setResetCounter(prev => prev + 1);
    resetCounterRef.current += 1;

    // Security: Safe cleanup
    try {
      safeStorageRemove(STORAGE_KEY);

      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('audioDuration_')) {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            console.error('Error removing key:', key, error);
          }
        }
      });
    } catch (error) {
      console.error("Error clearing saved state:", error);
    }

    setIsProcessing(false);
    setProcessingStep("");

    if (isMountedRef.current) {
      toast({
        title: "Reset Complete",
        description: "Ready for a new voice generation!",
        duration: 3000,
      });
    }
  };

  const progressPercentage = useMemo(() =>
    Math.min(100, Math.max(0, ((currentStep - 1) / (totalSteps - 1)) * 100)),
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

          {!hasEnoughWords && wordCount > 0 && currentStep > 1 && currentStep < 5 && (
            <Card className="mb-4 sm:mb-6 border-destructive/50 bg-destructive/5">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive text-sm">Insufficient Word Balance</p>
                    <p className="text-xs sm:text-sm text-destructive/80">
                      Need <strong>{wordCount.toLocaleString()}</strong> words · Remaining: <strong>{remainingWords.toLocaleString()}</strong>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

<Card className="bg-white/50 backdrop-blur-md border border-gray-300/30 transition-all duration-300">
            <CardHeader className="border-b p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-xs sm:text-sm">
                    {currentStep}
                  </span>
                  <div>
                    <CardTitle className="text-base sm:text-lg lg:text-xl">
                      {getStepTitle(currentStep)}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {getStepDescription(currentStep)}
                    </p>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs sm:text-sm"
                      disabled={isProcessing}
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="hidden sm:inline">Reset All</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[95vw] max-w-lg rounded-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Everything?</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-3 text-gray-600 dark:text-gray-400">
                          <p>This will securely clear all your progress and return you to Step 1.</p>
                          <div className="text-xs space-y-1 bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p>• All text and settings will be cleared</p>
                            <p>• Voice recordings will be removed</p>
                            {currentStep === 5 && <p>• Generated audio will remain in history</p>}
                          </div>
                        </div>
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
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {currentStep === 1 && (
                <ModernStepOne
                  key={`step1-${resetCounter}`}
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