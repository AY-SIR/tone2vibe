import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Edit3, Globe, BookOpen, Wand2, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GrammarService } from "@/services/grammarService";
import { supabase } from "@/integrations/supabase/client";

interface ModernStepTwoProps {
  extractedText: string;
  wordCount: number;
  onNext: () => void;
  onPrevious: () => void;
  onProcessingStart: (step: string) => void;
  onProcessingEnd: () => void;
  onLanguageSelect: (language: string) => void;
}

const ModernStepTwo = ({
  extractedText,
  wordCount,
  onNext,
  onPrevious,
  onProcessingStart,
  onProcessingEnd,
  onLanguageSelect,
}: ModernStepTwoProps) => {
  const [editedText, setEditedText] = useState(extractedText);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [isImproving, setIsImproving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslateIcon, setShowTranslateIcon] = useState(false);
  const { toast } = useToast();

  const languages = [


  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'te-IN', name: 'Telugu' },
  { code: 'bn-IN', name: 'Bengali (India)' },
  { code: 'bn-BD', name: 'Bengali (Bangladesh)' },
  { code: 'mr-IN', name: 'Marathi' },
  { code: 'gu-IN', name: 'Gujarati' },
  { code: 'pa-IN', name: 'Punjabi' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam' },
  { code: 'ur-PK', name: 'Urdu' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'fr-CA', name: 'French (Canada)' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
  { code: 'tr-TR', name: 'Turkish' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'sv-SE', name: 'Swedish' },
  { code: 'no-NO', name: 'Norwegian' },
  { code: 'da-DK', name: 'Danish' },
  { code: 'fi-FI', name: 'Finnish' },
  { code: 'cs-CZ', name: 'Czech' },
  { code: 'el-GR', name: 'Greek' },
  { code: 'he-IL', name: 'Hebrew' },
  { code: 'th-TH', name: 'Thai' },
  { code: 'vi-VN', name: 'Vietnamese' },
  { code: 'id-ID', name: 'Indonesian' },
  { code: 'ms-MY', name: 'Malay' },
  { code: 'fa-IR', name: 'Persian (Farsi)' },
  { code: 'uk-UA', name: 'Ukrainian' },
  { code: 'ro-RO', name: 'Romanian'  },
  { code: 'sk-SK', name: 'Slovak' },
  { code: 'sl-SI', name: 'Slovenian' },
  { code: 'hr-HR', name: 'Croatian' },
  { code: 'sr-RS', name: 'Serbian' },
  { code: 'bg-BG', name: 'Bulgarian' },
  { code: 'lt-LT', name: 'Lithuanian' }


];



  useEffect(() => {
    setEditedText(extractedText);
  }, [extractedText]);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setShowTranslateIcon(language !== "en-US");
    onLanguageSelect(language);
  };

  const handleTranslateText = async () => {
    if (!editedText.trim()) {
      toast({
        title: "No text to translate",
        description: "Please enter some text first.",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    onProcessingStart("Translating your text...");

    try {
      // Simple translation simulation
      const targetLang = selectedLanguage.split('-')[0];
      if (targetLang !== 'en') {
        const translatedText = `[Translated to ${targetLang.toUpperCase()}] ${editedText}`;
        setEditedText(translatedText);
        toast({
          title: "Text translated!",
          description: `Translated to ${targetLang.toUpperCase()}`,
        });
      } else {
        toast({
          title: "No translation needed",
          description: "Text is already in English",
        });
      }
    } catch (error) {
      console.error('Translation failed:', error);
      toast({
        title: "Translation failed",
        description: "Unable to translate text. Please continue with your current text.",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
      onProcessingEnd();
    }
  };

  const handleImproveText = async () => {
    if (!editedText.trim()) {
      toast({
        title: "No text to improve",
        description: "Please enter some text first.",
        variant: "destructive",
      });
      return;
    }

    setIsImproving(true);
    onProcessingStart("Improving your text with AI...");

    try {
      const result = await GrammarService.checkGrammar(editedText);
      const improvedText = result.correctedText;
      if (improvedText && improvedText !== editedText) {
        setEditedText(improvedText);
        toast({
          title: "Text improved!",
          description: "Your text has been enhanced for better speech synthesis.",
        });
      } else {
        toast({
          title: "Text looks great!",
          description: "No improvements needed for your text.",
        });
      }
    } catch (error) {
      console.error('Text improvement failed:', error);
      toast({
        title: "Improvement failed",
        description: "Unable to improve text. Please continue with your current text.",
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
      onProcessingEnd();
    }
  };

  // Calculate word count with 45-character rule (same as Step 1)
  const calculateDisplayWordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    let totalWordCount = 0;
    words.forEach((word) => {
      if (word.length > 45) {
        totalWordCount += Math.ceil(word.length / 45);
      } else {
        totalWordCount += 1;
      }
    });
    return totalWordCount;
  };

  const currentWordCount = calculateDisplayWordCount(editedText);
  const currentCharCount = editedText.replace(/\s/g, '').length;
  const hasChanges = editedText !== extractedText;



  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <Globe className="h-5 w-5 mr-2" />
            Select Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose language for speech synthesis" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center space-x-2">
                        <span>{lang.name}</span>
                      </div>
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
                  className="shrink-0"
                >
                  <Languages className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Choose the language that matches your text for optimal speech synthesis quality.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Text Editor */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
  <Edit3 className="h-5 w-5 mr-2" />
  Review & Edit Text
</CardTitle>

<div className="flex flex-wrap items-center max-w-[430px]">
  {/* Left-aligned badge */}
  <div className="flex items-center space-x-2">
    <Badge variant={hasChanges ? "default" : "secondary"}>
      {currentWordCount}
    </Badge>
    {hasChanges && (
      <Badge variant="outline" className="text-orange-600 border-orange-200">
        Edited
      </Badge>
    )}
  </div>
</div>
</div>


        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Textarea
                value={editedText}
                onChange={(e) => 
                   setEditedText(e.target.value)
                  }
          
                placeholder="Review and edit your text here..."
                className="min-h-[200px] resize-none text-base leading-relaxed"
              />
              <p className="text-xs text-gray-500 mt-2">
Edit your text to ensure it sounds natural when convert to Voice.
              
</p>
            </div>

            {/* AI Improvement */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleImproveText}
                disabled={isImproving || isTranslating || !editedText.trim()}
                variant="outline"
                className="flex-1"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {isImproving ? "Improving..." : "Improve with AI"}
              </Button>
              
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Auto-enhance for speech
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Statistics */}
      <Card className="bg-gray-50/50">
        <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-center">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{currentWordCount}</div>
                <div className="text-xs sm:text-sm text-gray-600">Words</div>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{editedText.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Characters</div>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">
                  {Math.ceil(currentWordCount / 150)}min
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Est. Minutes</div>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                  {selectedLanguage.split('-')[0].toUpperCase()}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Language</div>
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        <Button
          onClick={onPrevious}
          variant="outline"
          disabled={isImproving || isTranslating}
          className="order-2 sm:order-1 text-sm"
        >
          Back to Upload
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!editedText.trim() || isImproving || isTranslating}
          size="lg"
          className="px-6 sm:px-8 order-1 sm:order-2 text-sm"
        >
          Continue to Voice Selection
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ModernStepTwo;
