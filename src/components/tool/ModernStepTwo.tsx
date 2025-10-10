
"use client";

import { useState, useEffect, useMemo } from "react";
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

  const MIN_CHARS = 20;

  const languages = [
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', nativeName: 'العربية' },
    { code: 'as-IN', name: 'Assamese', nativeName: 'অসমীয়া' },
    { code: 'bn-BD', name: 'Bengali (Bangladesh)', nativeName: 'বাংলা' },
    { code: 'bn-IN', name: 'Bengali (India)', nativeName: 'বাংলা' },
    { code: 'bg-BG', name: 'Bulgarian', nativeName: 'Български' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
    { code: 'hr-HR', name: 'Croatian', nativeName: 'Hrvatski' },
    { code: 'cs-CZ', name: 'Czech', nativeName: 'Čeština' },
    { code: 'da-DK', name: 'Danish', nativeName: 'Dansk' },
    { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'en-GB', name: 'English (UK)', nativeName: 'English' },
    { code: 'en-US', name: 'English (US)', nativeName: 'English' },
    { code: 'fi-FI', name: 'Finnish', nativeName: 'Suomi' },
    { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français' },
    { code: 'fr-FR', name: 'French (France)', nativeName: 'Français' },
    { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
    { code: 'el-GR', name: 'Greek', nativeName: 'Ελληνικά' },
    { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'he-IL', name: 'Hebrew', nativeName: 'עברית' },
    { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'id-ID', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
    { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
    { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
    { code: 'lt-LT', name: 'Lithuanian', nativeName: 'Lietuvių' },
    { code: 'ms-MY', name: 'Malay', nativeName: 'Bahasa Melayu' },
    { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
    { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'ne-IN', name: 'Nepali (India)', nativeName: 'नेपाली' },
    { code: 'no-NO', name: 'Norwegian', nativeName: 'Norsk' },
    { code: 'or-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
    { code: 'fa-IR', name: 'Persian (Farsi)', nativeName: 'فارسی' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português' },
    { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
    { code: 'ro-RO', name: 'Romanian', nativeName: 'Română' },
    { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
    { code: 'sr-RS', name: 'Serbian', nativeName: 'Српски' },
    { code: 'sk-SK', name: 'Slovak', nativeName: 'Slovenčina' },
    { code: 'sl-SI', name: 'Slovenian', nativeName: 'Slovenščina' },
    { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español' },
    { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español' },
    { code: 'sv-SE', name: 'Swedish', nativeName: 'Svenska' },
    { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'th-TH', name: 'Thai', nativeName: 'ไทย' },
    { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'uk-UA', name: 'Ukrainian', nativeName: 'Українська' },
    { code: 'ur-IN', name: 'Urdu (India)', nativeName: 'اردو' },
    { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt' }
  ];

  const textLengthError = useMemo(() => {
    const trimmedLength = editedText.trim().length;
    if (trimmedLength > 0 && trimmedLength < MIN_CHARS) {
      return `Please enter at least ${MIN_CHARS} characters for Process.`;
    }
    return null;
  }, [editedText]);

  const detectTextLanguage = async (text: string) => {
    if (text.trim().length < MIN_CHARS) {
      setDetectionConfidence(0);
      setDetectedLanguage('en-US'); // Reset
      return;
    }

    setIsDetecting(true);
    setDetectionError(null);

    try {
      // Use franc for language detection
      const franc = await import('franc');
      const francAll = franc.francAll;
      const detections = francAll(text, { minLength: 10 });

      if (detections.length > 0 && detections[0][1] > 0.5) {
        const langCode = detections[0][0];
        // Map franc codes to our language codes
        const langMap: Record<string, string> = {
          'eng': 'en-US', 'ara': 'ar-SA', 'ben': 'bn-IN', 'bul': 'bg-BG',
          'ces': 'cs-CZ', 'dan': 'da-DK', 'nld': 'nl-NL', 'fin': 'fi-FI',
          'fra': 'fr-FR', 'deu': 'de-DE', 'ell': 'el-GR', 'heb': 'he-IL',
          'hin': 'hi-IN', 'hrv': 'hr-HR', 'ind': 'id-ID', 'ita': 'it-IT',
          'jpn': 'ja-JP', 'kor': 'ko-KR', 'lit': 'lt-LT', 'mar': 'mr-IN',
          'nor': 'no-NO', 'fas': 'fa-IR', 'pol': 'pl-PL', 'por': 'pt-BR',
          'ron': 'ro-RO', 'rus': 'ru-RU', 'srp': 'sr-RS', 'slk': 'sk-SK',
          'slv': 'sl-SI', 'spa': 'es-ES', 'swe': 'sv-SE', 'tam': 'ta-IN',
          'tel': 'te-IN', 'tha': 'th-TH', 'tur': 'tr-TR', 'ukr': 'uk-UA',
          'urd': 'ur-IN', 'vie': 'vi-VN', 'cmn': 'zh-CN'
        };
        const code = langMap[langCode] || 'en-US';
        setDetectedLanguage(code);
        setSelectedLanguage(code);
        setDetectionConfidence(detections[0][1]);
        onLanguageSelect(code);
      } else {
        setDetectionError("Language could not be reliably detected. Please select manually.");
        setDetectionConfidence(0.3);
      }
    } catch (error) {
      console.error('Detection error:', error);
      setDetectionError("Language detection failed. Please select manually.");
      setDetectionConfidence(0);
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    setEditedText(extractedText);
    if (extractedText && extractedText.trim().length >= MIN_CHARS) {
      detectTextLanguage(extractedText);
    }
  }, [extractedText]);

  const handleTextChange = (newText: string) => {
    setEditedText(newText);
    onTextUpdated(newText);
    setDetectionError(null); // Clear previous errors on new input

    const timeoutId = setTimeout(() => {
      detectTextLanguage(newText);
    }, 800);

    return () => clearTimeout(timeoutId);
  };

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    onLanguageSelect(languageCode);
    setDetectionError(null);
  };

  const handleTranslateText = async () => {
    if (editedText.trim().length < 3) { // Translation can work on shorter text
      toast({
        title: "Error",
        description: "Text is too short to translate",
        variant: "destructive"
      });
      return;
    }
    setIsTranslating(true);
    onProcessingStart("Translating text...");
    try {
      const result = { success: false, translatedText: editedText, error: "Translation service not available" };
      if (result.success && result.translatedText) {
        setEditedText(result.translatedText);
        onTextUpdated(result.translatedText);
        setDetectedLanguage(selectedLanguage); // Update detected lang after translation
        toast({
          title: "Translation Complete",
          description: `Text translated to ${languages.find(l => l.code === selectedLanguage)?.name}`,
        });
      } else {
        toast({
          title: "Translation Failed",
          description: result.error || "Could not translate text",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Error",
        description: "An error occurred during translation",
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
      onProcessingEnd();
    }
  };

  const handleImproveText = async () => {
    if (editedText.trim().length < 3) {
      toast({
        title: "Error",
        description: "Text is too short to improve",
        variant: "destructive"
      });
      return;
    }
    setIsImproving(true);
    onProcessingStart("Improving text with AI...");
    try {
      const result = await GrammarService.improveText(editedText, selectedLanguage);
      if (result.success && result.improvedText) {
        setEditedText(result.improvedText);
        onTextUpdated(result.improvedText);
        toast({
          title: "Text Improved",
          description: "Grammar and clarity enhanced",
        });
      } else {
        toast({
          title: "Improvement Failed",
          description: result.error || "Could not improve text",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Improvement error:', error);
      toast({
        title: "Improvement Error",
        description: "An error occurred during text improvement",
        variant: "destructive"
      });
    } finally {
      setIsImproving(false);
      onProcessingEnd();
    }
  };

  const calculateDisplayWordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.reduce((acc, word) => acc + (word.length > 45 ? Math.ceil(word.length / 45) : 1), 0);
  };

  const currentWordCount = calculateDisplayWordCount(editedText);
  
  // Enhanced translation detection logic
  const languageMismatch = selectedLanguage !== detectedLanguage && detectionConfidence > 0.6;
  const isFallbackLanguage = detectionConfidence <= 0.5 && editedText.trim().length >= MIN_CHARS;
  const showTranslateIcon = (languageMismatch || isFallbackLanguage) && editedText.trim().length >= 3;
  
  const hasError = detectionError !== null || textLengthError !== null;
  
  // Block continue button strictly
  const isContinueDisabled =
    editedText.trim().length < MIN_CHARS ||
    isImproving ||
    isTranslating ||
    isDetecting ||
    hasError ||
    detectionConfidence === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <Globe className="h-5 w-5 mr-2" /> Select Output Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center">
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className={`flex-1 ${detectionError ? 'border-red-500 focus:ring-red-500' : ''}`}>
                <SelectValue placeholder="Choose language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name} {lang.name !== lang.nativeName && `(${lang.nativeName})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showTranslateIcon && (
              <Button
                onClick={handleTranslateText}
                disabled={isTranslating || isImproving || !editedText.trim()}
                variant="outline"
                size="icon"
                title={`Translate to ${languages.find(l => l.code === selectedLanguage)?.name}`}
                className="border-2 border-red-400 animate-pulse"
              >
                {isTranslating ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Languages className="h-4 w-4 text-orange-600" />
                )}
              </Button>
            )}
          </div>
          
          {detectionError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 font-medium">{detectionError}</p>
            </div>
          )}
          
          {showTranslateIcon && !isTranslating && !detectionError && (
            <div className="mt-2 p-3 bg-red-50 border-2 border-red-300 rounded-md">
              <p className="text-sm text-red-800 font-semibold flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Translation Required
              </p>
            </div>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Edit3 className="h-5 w-5 mr-2" /> Review & Edit Text
            </CardTitle>
            <Badge variant={"secondary"}>{currentWordCount} Words</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editedText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Your text will appear here. You can edit it before proceeding..."
            className={`min-h-[200px] resize-none text-base leading-relaxed transition-all ${
              hasError ? 'border-red-500 focus-visible:ring-red-500' : ''
            }`}
          />
          {(detectionError || textLengthError) && (
            <div className="flex items-start gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{detectionError || textLengthError}</p>
            </div>
          )}


           {isDetecting && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Detecting language...
            </p>
          )}
          {!isDetecting && detectionConfidence > 0.5 && !detectionError && !textLengthError &&(
            <p className="text-sm text-green-600 mt-2">
               Detected: {languages.find(l => l.code === detectedLanguage)?.name}
            </p>
          )}


          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <Button
              onClick={handleImproveText}
              disabled={isImproving || isTranslating || editedText.trim().length < MIN_CHARS || hasError}
              variant="outline"
              className="flex-1"
            >
              {isImproving ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Improving...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Improve with AI
                </>
              )}
            </Button>
            <div className="flex items-center space-x-2 justify-center text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Auto-enhances for natural speech</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <div className="text-lg sm:text-2xl font-bold">~{Math.ceil(currentWordCount / 150)} min</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Speaking Time</div>
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

      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        <Button onClick={onPrevious} variant="outline" disabled={isImproving || isTranslating || isDetecting} className="order-2 sm:order-1">
          Back to Upload
        </Button>
        <Button 
          onClick={onNext} 
          disabled={isContinueDisabled} 
          size="lg" 
          className="px-6 sm:px-8 order-1 sm:order-2"
        >
          {showTranslateIcon ? 'Translate Required' : 'Continue to Voice Selection'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ModernStepTwo;
