// src/components/tool/ModernStepTwo.tsx
"use client"; // Assuming this is needed in your framework (like Next.js)

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Edit3, Globe, BookOpen, Wand2, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GrammarService } from "@/services/grammarService";
import { franc, francAll } from "franc"; // Using francAll can be more robust, but franc is fine with a whitelist

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
  const [isUnsupported, setIsUnsupported] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const { toast } = useToast();

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
   { code: 'zh-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt' }
  ];

  const francToLanguageCode: Record<string, string> = {
    'arb': 'ar-SA', 'asm': 'as-IN', 'bul': 'bg-BG', 'ben': 'bn-IN',
    'ces': 'cs-CZ', 'dan': 'da-DK', 'nld': 'nl-NL', 'eng': 'en-US',
    'fin': 'fi-FI', 'fra': 'fr-FR', 'deu': 'de-DE', 'ell': 'el-GR',
    'guj': 'gu-IN', 'heb': 'he-IL', 'hin': 'hi-IN', 'bho': 'hi-IN',
    'hrv': 'hr-HR', 'ind': 'id-ID', 'ita': 'it-IT', 'jpn': 'ja-JP',
    'kan': 'kn-IN', 'kor': 'ko-KR', 'lit': 'lt-LT',
    'msa': 'ms-MY', 'mal': 'ml-IN', 'mar': 'mr-IN', 'nep': 'ne-IN',
    'nor': 'no-NO', 'ory': 'or-IN', 'pan': 'pa-IN', 'pes': 'fa-IR',
    'por': 'pt-BR', 'ron': 'ro-RO', 'rus': 'ru-RU',
    'srp': 'sr-RS', 'slk': 'sk-SK', 'slv': 'sl-SI',
    'spa': 'es-ES', 'swe': 'sv-SE', 'tam': 'ta-IN', 'tel': 'te-IN',
    'tha': 'th-TH', 'tur': 'tr-TR', 'ukr': 'uk-UA', 'urd': 'ur-IN',
    'vie': 'vi-VN', 'cmn': 'zh-CN', 'rum': 'ro-RO',
  };

  // ADDED: Create a whitelist of allowed language codes for franc
  const allowedFrancCodes = Object.keys(francToLanguageCode);

  const isCodeSnippet = (text: string) => /<[\w\s="'{}-]>|{.}|;/.test(text);

  const isMixedLanguage = (text: string) => {
    const hasLatin = /[a-zA-Z]/.test(text);
    const hasDevanagari = /[\u0900-\u097F]/.test(text); // Devanagari Unicode range
    return hasLatin && hasDevanagari;
  };

  const detectLanguage = (text: string): { code: string; fallback: boolean; unsupported: boolean } => {
    const trimmed = text.trim();
    if (!trimmed) return { code: "en-US", fallback: false, unsupported: false };

    if (isMixedLanguage(trimmed)) {
      return { code: "en-US", fallback: true, unsupported: false };
    }

    if (trimmed.length < 10 || isCodeSnippet(trimmed)) return { code: "en-US", fallback: true, unsupported: false };
    
    const cleaned = trimmed.replace(/[^\p{L}\s]/gu, "");
    if (cleaned.length < 10) return { code: "en-US", fallback: true, unsupported: false };
    
    // Use francAll to get confidence scores
    const results = francAll(cleaned, { minLength: 10, only: allowedFrancCodes });
    
    // If no results or confidence too low, return fallback
    if (!results || results.length === 0 || results[0][1] < 0.5) {
      return { code: "en-US", fallback: true, unsupported: false };
    }
    
    const detectedCode = results[0][0];
    if (detectedCode === "und") return { code: "en-US", fallback: true, unsupported: false };

    const langCode = francToLanguageCode[detectedCode] || "en-US";
    const unsupported = !languages.find(l => l.code === langCode);
    return { code: langCode, fallback: false, unsupported };
  };

  useEffect(() => {
    setEditedText(extractedText);
    const { code, fallback, unsupported } = detectLanguage(extractedText);
    setDetectedLanguage(code);
    setSelectedLanguage(code);
    setIsFallback(fallback);
    setIsUnsupported(unsupported);
    onLanguageSelect(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractedText]);

  const handleTextChange = (newText: string) => {
    setEditedText(newText);
    onTextUpdated(newText);
    const { code, fallback, unsupported } = detectLanguage(newText);
    setDetectedLanguage(code);
    setIsFallback(fallback);
    setIsUnsupported(unsupported);
  };

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    onLanguageSelect(languageCode);
    // If user picked language manually, allow continuing
    setIsFallback(false);
    setIsUnsupported(false);
  };

  const handleTranslateText = async () => {
    if (!editedText.trim()) return;
    setIsTranslating(true);
    onProcessingStart("Translating text...");
    try {
      // This is a placeholder for your actual translation API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const translated = `[Translated to ${selectedLanguage}] ${editedText}`;
      setEditedText(translated);
      onTextUpdated(translated);
      setDetectedLanguage(selectedLanguage);
      setIsFallback(false);
      setIsUnsupported(false);
      toast({ title: "Text Translated (Simulated)", description: "Text translated to your selected language." });
    } catch {
      toast({ title: "Translation Failed", variant: "destructive" });
    } finally {
      setIsTranslating(false);
      onProcessingEnd();
    }
  };

  const handleImproveText = async () => {
    if (!editedText.trim()) return;
    setIsImproving(true);
    onProcessingStart("Improving text with AI...");
    try {
      const result = await GrammarService.checkGrammar(editedText);
      if (result.correctedText && result.correctedText !== editedText) {
        setEditedText(result.correctedText);
        onTextUpdated(result.correctedText);
        toast({ title: "Text Improved", description: "Grammar and phrasing have been enhanced." });
      } else {
        toast({ title: "No Changes Needed", description: "Your text looks great!" });
      }
    } catch {
      toast({ title: "Improvement Failed", description: "Could not connect to the AI service.", variant: "destructive" });
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
  const showTranslateIcon = editedText.trim() && !isFallback && selectedLanguage !== detectedLanguage;
  const isContinueDisabled =
    !editedText.trim() ||
    isImproving ||
    isTranslating ||
    isFallback ||
    isUnsupported ||
    showTranslateIcon;

  return (
    <div className="space-y-6">
      {/* Language Selector */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <Globe className="h-5 w-5 mr-2" /> Select Output Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center">
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  // CHANGED: Display both English and Native names
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name} {lang.name !== lang.nativeName && `(${lang.nativeName})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showTranslateIcon && (
              <Button
                onClick={handleTranslateText}
                disabled={isTranslating || !editedText.trim()}
                variant="outline"
                size="icon"
                title={`Translate to ${languages.find(l => l.code === selectedLanguage)?.name}`}
              >
                <Languages className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Text Editor */}
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
            className={`min-h-[200px] resize-none text-base leading-relaxed transition-all ${isUnsupported ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
          {isFallback && (
            <p className="text-sm text-destructive mt-2">
              The language of this text could not be reliably determined or is mixed (e.g., Hinglish). Please edit the text to continue.
            </p>
          )}
          {!isFallback && isUnsupported && (
            <p className="text-sm text-destructive mt-2">
              The detected language is not supported. Please choose a different language.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <Button
              onClick={handleImproveText}
              disabled={isImproving || isTranslating || !editedText.trim() || isFallback}
              variant="outline"
              className="flex-1"
            >
              <Wand2 className="h-4 w-4 mr-2" /> {isImproving ? "Improving..." : "Improve with AI"}
            </Button>
            <div className="flex items-center space-x-2 justify-center text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Auto-enhances for natural speech</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
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

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        <Button onClick={onPrevious} variant="outline" disabled={isImproving || isTranslating} className="order-2 sm:order-1">
          Back to Upload
        </Button>
        <Button
          onClick={onNext}
          disabled={isContinueDisabled}
          size="lg"
          className="px-6 sm:px-8 order-1 sm:order-2"
        >
          Continue to Voice Selection
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ModernStepTwo;

                
