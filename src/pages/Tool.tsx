import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GeoRestrictionAlert } from "@/components/common/GeoRestrictionAlert";
import ModernStepOne from "@/components/tool/ModernStepOne";
import ModernStepTwo from "@/components/tool/ModernStepTwo";
import ModernStepThree from "@/components/tool/ModernStepThree";
import ModernStepFour from "@/components/tool/ModernStepFour";
import ModernStepFive from "@/components/tool/ModernStepFive";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { AnalyticsService } from "@/services/analyticsService";
import Header from "@/components/layout/Header";

const Tool = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const totalSteps = 5;

  // Data state
  const [extractedText, setExtractedText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [voiceRecording, setVoiceRecording] = useState<Blob | null>(null);
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string>("");

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
      return;
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (extractedText) {
      const words = extractedText.trim().split(/\s+/).filter((w) => w.length > 0);
      let totalWordCount = 0;

      words.forEach((word) => {
        if (word.length > 45) {
          totalWordCount += Math.ceil(word.length / 45);
        } else {
          totalWordCount += 1;
        }
      });

      setWordCount(totalWordCount);
    }
  }, [extractedText]);

  const hasEnoughWords = () => {
    if (!profile) return false;
    // Check new word system: plan words + purchased words
    const planWordsAvailable = Math.max(0, profile.words_limit - (profile.plan_words_used || 0));
    const purchasedWords = profile.word_balance || 0;
    const totalAvailable = planWordsAvailable + purchasedWords;
    return wordCount <= totalAvailable;
  };

  const getStepTitle = (step: number) => {
    const titles = {
      1: "Upload & Extract",
      2: "Review & Edit",
      3: "Voice Selection",
      4: "Generate Audio",
      5: "Download & Save",
    };
    return titles[step as keyof typeof titles] || `Step ${step}`;
  };

  const getStepDescription = (step: number) => {
    const descriptions = {
      1: "Upload files or type text to get started",
      2: "Review, translate and correct your text",
      3: "Record voice sample or choose preset",
      4: "Generate high-quality audio with AI",
      5: "Download and save to your history",
    };
    return descriptions[step as keyof typeof descriptions] || "";
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCompletedSteps((prev) => [...prev, currentStep]);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

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
    if (text.trim()) {
      handleNext();
    }
  };

  const handleVoiceRecorded = (blob: Blob) => {
    setVoiceRecording(blob);
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
  };

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
  };

  const handleWordCountUpdate = (count: number) => {
    setWordCount(count);
  };

  const handleAudioGenerated = (audioUrl: string) => {
    setProcessedAudioUrl(audioUrl);

    if (user) {
      AnalyticsService.trackActivity(user.id, "audio_generated", {
        language: selectedLanguage,
        words: wordCount,
        voiceType: selectedVoiceId || "custom",
        responseTime: 0,
        title: "Audio Generated",
      });
      
      // No auto-refresh here - let user download first
      console.log('Audio generated successfully');
    }
  };

  const handleReset = () => {
    // Reset all state for new generation
    setCurrentStep(1);
    setCompletedSteps([]);
    setExtractedText("");
    setWordCount(0);
    setSelectedVoiceId("");
    setVoiceRecording(null);
    setProcessedAudioUrl("");
    
    // Force profile refresh to ensure latest word counts with loader
    if (user) {
      console.log('Starting new generation - refreshing profile');
      
      // Show processing overlay during refresh
      setIsProcessing(true);
      setProcessingStep("Refreshing word balance...");
      
      setTimeout(() => {
        window.location.reload(); // Force page refresh for smooth experience
      }, 1500);
    }
  };

  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
  
  // Calculate remaining words using new system
  const planWordsAvailable = Math.max(0, profile?.words_limit - (profile?.plan_words_used || 0));
  const purchasedWords = profile?.word_balance || 0;
  const totalWordsRemaining = planWordsAvailable + purchasedWords;
  const remainingWords = totalWordsRemaining;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <>
      <LoadingOverlay
        isVisible={isProcessing}
        message={processingStep || "Processing your request..."}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <Header />
        
        {/* Geo Restriction Alert */}
        <div className="container mx-auto px-4 max-w-4xl">
          <GeoRestrictionAlert />
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          
          {/* ✅ MOVED: Live Word Balance Display */}
          {profile && (
            <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Word Balance
                      </p>
                      <p className="text-xs text-gray-600">
                        Plan: {profile.plan} •
                        <br/>
                        Updates in real-time
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xl font-bold text-blue-600">
                      {remainingWords.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>{profile?.plan?.toUpperCase()}: {((profile?.words_limit || 0) - (profile?.plan_words_used || 0)).toLocaleString()} left</div>
                      {/* Only show purchased words if user has any */}
                      {(profile?.word_balance || 0) > 0 && (
                        <div>+ Purchased: {(profile?.word_balance || 0).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ✅ MOVED: Step Navigation */}
          <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mb-4 sm:mb-6">
            {Array.from({ length: totalSteps }, (_, i) => {
              const step = i + 1;
              const isCompleted = completedSteps.includes(step);
              const isCurrent = currentStep === step;
              return (
                <Button
                  key={step}
                  variant={
                    isCurrent
                      ? "default"
                      : isCompleted
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  className={`flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm ${
                    isCurrent ? "shadow-lg" : ""
                  }`}
                  disabled={step > currentStep}
                >
                  {isCompleted && (
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                  )}
                  {isCurrent && isProcessing && (
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  )}
                  <span className="hidden sm:inline font-medium">
                    {getStepTitle(step)}
                  </span>
                  <span className="sm:hidden font-medium">{step}</span>
                </Button>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-2">
              <span>
                Step {currentStep} of {totalSteps}
              </span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2 sm:h-3" />
          </div>

          {/* Word Balance Warning */}
          {!hasEnoughWords() && wordCount > 0 && (
            <Card className="mb-4 sm:mb-6 border-destructive/50 bg-destructive/5">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive text-sm">
                      Insufficient Word Balance
                    </p>
                    <p className="text-xs sm:text-sm text-destructive/80">
                      Need {wordCount} words, have {remainingWords} remaining.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate("/payment")}
                    className="w-full sm:w-auto text-xs"
                  >
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step Content */}
          <Card className="shadow-lg border-0 bg-card">
            <CardHeader className="border-b p-4 sm:p-6">
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
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {currentStep === 1 && (
                <ModernStepOne
                  onNext={handleNext}
                  onTextExtracted={handleTextExtraction}
                  onWordCountUpdate={handleWordCountUpdate}
                  onProcessingStart={handleProcessingStart}
                  onProcessingEnd={handleProcessingEnd}
                />
              )}

              {currentStep === 2 && (
                <ModernStepTwo
                  extractedText={extractedText}
                  wordCount={wordCount}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
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
                  onVoiceSelect={handleVoiceSelect}
                  selectedVoiceId={selectedVoiceId}
                  selectedLanguage={selectedLanguage}
                />
              )}

              {currentStep === 4 && (
                <ModernStepFour
                  extractedText={extractedText}
                  selectedLanguage={selectedLanguage}
                  voiceRecording={voiceRecording}
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
                  
