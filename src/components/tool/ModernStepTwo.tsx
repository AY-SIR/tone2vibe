"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Edit3, Globe, BookOpen, Wand2, Languages, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GrammarService } from "@/services/grammarService";

interface ModernStepTwoProps {
  extractedText: string;
  onNext: () => void;
  onPrevious: () => void;
  onProcessingStart: (step: string) => void;
  onProcessingEnd: () => void;
  onLanguageSelect: (language: string) => void;
  onTextUpdated: (text: string) => void;
}

const MIN_CHARS = 20;

const ModernStepTwo = ({
  extractedText,
  onNext,
  onPrevious,
  onProcessingStart,
  onProcessingEnd,
  onLanguageSelect,
  onTextUpdated,
}: ModernStepTwoProps) => {
  const [editedText, setEditedText] = useState(extractedText);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [detectedLanguage, setDetectedLanguage] = useState("en-US");
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  const { toast } = useToast();

  const languages = [
    { code: "en-US", name: "English (US)", nativeName: "English" },
    { code: "hi-IN", name: "Hindi", nativeName: "हिन्दी" },
    { code: "fr-FR", name: "French", nativeName: "Français" },
    { code: "ar-SA", name: "Arabic", nativeName: "العربية" },
    // Add all other languages as needed...
  ];

  // Debounced language detection
  useEffect(() => {
    if (!editedText || editedText.trim().length < MIN_CHARS) {
      setDetectionConfidence(0);
      setDetectedLanguage("en-US");
      setDetectionError(null);
      return;
    }

    setIsDetecting(true);
    setDetectionError(null);

    const handler = setTimeout(async () => {
      try {
        const franc = await import("franc");
        const francAll = franc.francAll;
        const detections = francAll(editedText, { minLength: 10 });

        if (detections.length > 0 && detections[0][1] > 0.5) {
          const langMap: Record<string, string> = {
            eng: "en-US",
            hin: "hi-IN",
            fra: "fr-FR",
            ara: "ar-SA",
            // Add other mappings as needed
          };
          const code = langMap[detections[0][0]] || "en-US";
          setDetectedLanguage(code);
          setSelectedLanguage(code);
          setDetectionConfidence(detections[0][1]);
          onLanguageSelect(code);
        } else {
          setDetectionError("Language could not be reliably detected. Please select manually.");
          setDetectionConfidence(0.3);
        }
      } catch (error) {
        console.error("Language detection failed:", error);
        setDetectionError("Language detection failed. Please select manually.");
        setDetectionConfidence(0);
      } finally {
        setIsDetecting(false);
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [editedText, onLanguageSelect]);

  // Text change
  const handleTextChange = (text: string) => {
    setEditedText(text);
    onTextUpdated(text);
    setDetectionError(null);
  };

  // Language change
  const handleLanguageChange = (code: string) => {
    setSelectedLanguage(code);
    onLanguageSelect(code);
    setDetectionError(null);
  };

  // Improve text
  const handleImproveText = async () => {
    if (editedText.trim().length < 3) return;

    setIsImproving(true);
    onProcessingStart("Improving text with AI...");

    try {
      const result = await GrammarService.improveText(editedText, selectedLanguage);
      if (result.success && result.improvedText) {
        setEditedText(result.improvedText);
        onTextUpdated(result.improvedText);
        toast({ title: "Text Improved", description: "Grammar and clarity enhanced" });
      } else {
        toast({ title: "Improvement Failed", description: result.error || "Could not improve text", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Improvement Error", description: "An error occurred during improvement", variant: "destructive" });
    } finally {
      setIsImproving(false);
      onProcessingEnd();
    }
  };

  // Translate text (stub, can replace with real API)
  const handleTranslateText = async () => {
    if (editedText.trim().length < 3) {
      toast({ title: "Error", description: "Text too short to translate", variant: "destructive" });
      return;
    }

    setIsTranslating(true);
    onProcessingStart("Translating text...");

    try {
      // Replace with real translation API call
      const result = { success: true, translatedText: editedText };
      if (result.success && result.translatedText) {
        setEditedText(result.translatedText);
        onTextUpdated(result.translatedText);
        setDetectedLanguage(selectedLanguage);
        toast({ title: "Translation Complete", description: `Text translated to ${languages.find(l => l.code === selectedLanguage)?.name}` });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Translation Error", description: "An error occurred during translation", variant: "destructive" });
    } finally {
      setIsTranslating(false);
      onProcessingEnd();
    }
  };

  const isProcessing = isImproving || isTranslating || isDetecting;
  const hasError = detectionError !== null;
  const isContinueDisabled = editedText.trim().length < MIN_CHARS || isProcessing;

  // Translation suggestion
  const languageMismatch = selectedLanguage !== detectedLanguage && detectionConfidence > 0.6;
  const showTranslateIcon = (languageMismatch || (detectionConfidence <= 0.5 && editedText.trim().length >= MIN_CHARS)) && editedText.trim().length >= 3;

  const currentWordCount = editedText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Language selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg"><Globe className="h-5 w-5 mr-2" /> Select Output Language</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center">
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className={`flex-1 ${detectionError ? 'border-red-500 focus:ring-red-500' : ''}`}>
                <SelectValue placeholder="Choose language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name} {lang.name !== lang.nativeName && `(${lang.nativeName})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showTranslateIcon && (
              <Button
                onClick={handleTranslateText}
                disabled={isProcessing}
                variant="outline"
                size="icon"
                title={`Translate to ${languages.find(l => l.code === selectedLanguage)?.name}`}
              >
                {isTranslating ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Languages className="h-4 w-4 text-orange-600" />}
              </Button>
            )}
          </div>
          {detectionError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 font-medium">{detectionError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review & edit */}
      <Card>
        <CardHeader className="pb-4 flex justify-between items-center">
          <CardTitle className="flex items-center text-lg"><Edit3 className="h-5 w-5 mr-2" /> Review & Edit Text</CardTitle>
          <Badge variant="secondary">{currentWordCount} Words</Badge>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editedText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Your text will appear here. You can edit it before proceeding..."
            className={`min-h-[200px] resize-none text-base leading-relaxed transition-all ${hasError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          />

          {isDetecting && <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Detecting language...
          </p>}

          {!isDetecting && !hasError && detectionConfidence > 0.5 && (
            <p className="text-sm text-green-600 mt-2">Detected: {languages.find(l => l.code === detectedLanguage)?.name}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <Button onClick={handleImproveText} disabled={isProcessing || editedText.trim().length < MIN_CHARS || hasError} variant="outline" className="flex-1">
              {isImproving ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> : <><Wand2 className="h-4 w-4 mr-2" /> Improve with AI</>}
            </Button>
            <div className="flex items-center space-x-2 justify-center text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Auto-enhances for natural speech</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-center">
            <div className="p-3 sm:p-4 bg-background/50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold">{currentWordCount}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Words</div>
            </div>
            <div className="p-3 sm:p-4 bg-background/50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold">{editedText.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Characters</div>
            </div>
            <div className="p-3 sm:p-4 bg-background/50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-primary truncate" title={languages.find(l => l.code === selectedLanguage)?.name}>
                {languages.find(l => l.code === selectedLanguage)?.name || 'Unknown'}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Selected Language</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        <Button onClick={onPrevious} variant="outline" disabled={isProcessing} className="order-2 sm:order-1">Back to Upload</Button>
        <Button onClick={onNext} disabled={isContinueDisabled} size="lg" className="px-6 sm:px-8 order-1 sm:order-2">
          {showTranslateIcon ? 'Translate Required' : ''}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ModernStepTwo;
