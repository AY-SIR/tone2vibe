// src/components/tool/ModernStepTwo.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Edit3, Globe, BookOpen, Wand2, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GrammarService } from "@/services/grammarService";
import { franc } from "franc";

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
  const { toast } = useToast();

  const languages = [
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
    { code: 'as-IN', name: 'Assamese' },
    { code: 'bg-BG', name: 'Bulgarian' },
    { code: 'bn-BD', name: 'Bengali (Bangladesh)' },
    { code: 'bn-IN', name: 'Bengali (India)' },
    { code: 'cs-CZ', name: 'Czech' },
    { code: 'da-DK', name: 'Danish' },
    { code: 'nl-NL', name: 'Dutch' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'en-US', name: 'English (US)' },
    { code: 'fi-FI', name: 'Finnish' },
    { code: 'fr-CA', name: 'French (Canada)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'de-DE', name: 'German' },
    { code: 'el-GR', name: 'Greek' },
    { code: 'gu-IN', name: 'Gujarati' },
    { code: 'he-IL', name: 'Hebrew' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'hr-HR', name: 'Croatian' },
    { code: 'id-ID', name: 'Indonesian' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'kn-IN', name: 'Kannada' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'lt-LT', name: 'Lithuanian' },
    { code: 'ms-MY', name: 'Malay' },
    { code: 'ml-IN', name: 'Malayalam' },
    { code: 'mr-IN', name: 'Marathi' },
    { code: 'ne-IN', name: 'Nepali (India)' },
    { code: 'no-NO', name: 'Norwegian' },
    { code: 'or-IN', name: 'Odia' },
    { code: 'pa-IN', name: 'Punjabi' },
    { code: 'fa-IR', name: 'Persian (Farsi)' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)' },
    { code: 'ro-RO', name: 'Romanian' },
    { code: 'ru-RU', name: 'Russian' },
    { code: 'sr-RS', name: 'Serbian' },
    { code: 'sk-SK', name: 'Slovak' },
    { code: 'sl-SI', name: 'Slovenian' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'es-MX', name: 'Spanish (Mexico)' },
    { code: 'sv-SE', name: 'Swedish' },
    { code: 'ta-IN', name: 'Tamil' },
    { code: 'te-IN', name: 'Telugu' },
    { code: 'th-TH', name: 'Thai' },
    { code: 'tr-TR', name: 'Turkish' },
    { code: 'uk-UA', name: 'Ukrainian' },
    { code: 'ur-IN', name: 'Urdu (India)' },
    { code: 'vi-VN', name: 'Vietnamese' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' }
  ];

  // Comprehensive map from franc's 3-letter codes to your xx-YY format
const francToLanguageCode: Record<string, string> = {
  'afr': 'af-ZA', // Afrikaans
  'amh': 'am-ET', // Amharic
  'arb': 'ar-SA', // Arabic
  'asm': 'as-IN', // Assamese
  'ava': 'av-RU', // Avaric
  'aym': 'ay-BO', // Aymara
  'aze': 'az-AZ', // Azerbaijani
  'bak': 'ba-RU', // Bashkir
  'bar': 'bar-DE', // Bavarian
  'bel': 'be-BY', // Belarusian
  'ben': 'bn-IN', // Bengali
  'bho': 'hi-IN', // Bhojpuri (Mapped to Hindi)
  'bos': 'bs-BA', // Bosnian
  'bpy': 'bpy-IN', // Bishnupriya
  'bre': 'br-FR', // Breton
  'bul': 'bg-BG', // Bulgarian
  'bua': 'bua-RU', // Buryat
  'cat': 'ca-ES', // Catalan
  'ceb': 'ceb-PH', // Cebuano
  'ces': 'cs-CZ', // Czech
  'che': 'ce-RU', // Chechen
  'chm': 'chm-RU', // Mari (Russia)
  'chv': 'cv-RU', // Chuvash
  'cmn': 'zh-CN', // Chinese (Mandarin)
  'cor': 'kw-GB', // Cornish
  'cos': 'co-FR', // Corsican
  'cym': 'cy-GB', // Welsh
  'dan': 'da-DK', // Danish
  'deu': 'de-DE', // German
  'div': 'dv-MV', // Dhivehi
  'dsb': 'dsb-DE', // Lower Sorbian
  'dzo': 'dz-BT', // Dzongkha
  'ell': 'el-GR', // Greek
  'eng': 'en-US', // English
  'epo': 'eo',    // Esperanto
  'est': 'et-EE', // Estonian
  'eus': 'eu-ES', // Basque
  'fao': 'fo-FO', // Faroese
  'fij': 'fj-FJ', // Fijian
  'fin': 'fi-FI', // Finnish
  'fra': 'fr-FR', // French
  'fry': 'fy-NL', // Western Frisian
  'gla': 'gd-GB', // Scottish Gaelic
  'gle': 'ga-IE', // Irish
  'glg': 'gl-ES', // Galician
  'gom': 'gom-IN', // Goan Konkani
  'grn': 'gn-PY', // Guarani
  'guj': 'gu-IN', // Gujarati
  'hat': 'ht-HT', // Haitian
  'hau': 'ha-NG', // Hausa
  'heb': 'he-IL', // Hebrew
  'hif': 'hif-FJ', // Fiji Hindi
  'hil': 'hil-PH', // Hiligaynon
  'hin': 'hi-IN', // Hindi
  'hrv': 'hr-HR', // Croatian
  'hsb': 'hsb-DE', // Upper Sorbian
  'hun': 'hu-HU', // Hungarian
  'hye': 'hy-AM', // Armenian
  'ido': 'io',    // Ido
  'iii': 'ii-CN', // Sichuan Yi
  'ilo': 'ilo-PH', // Iloko
  'ina': 'ia',    // Interlingua
  'ind': 'id-ID', // Indonesian
  'isl': 'is-IS', // Icelandic
  'ita': 'it-IT', // Italian
  'jav': 'jv-ID', // Javanese
  'jpn': 'ja-JP', // Japanese
  'kaa': 'kaa-UZ', // Karakalpak
  'kat': 'ka-GE', // Georgian
  'kaz': 'kk-KZ', // Kazakh
  'kbd': 'kbd-RU', // Kabardian
  'khm': 'km-KH', // Central Khmer
  'kir': 'ky-KG', // Kirghiz
  'kan': 'kn-IN', // Kannada
  'kor': 'ko-KR', // Korean
  'krc': 'krc-RU', // Karachay-Balkar
  'kur': 'ku-TR', // Kurdish
  'kum': 'kum-RU', // Kumyk
  'lao': 'lo-LA', // Lao
  'lat': 'la',    // Latin
  'lav': 'lv-LV', // Latvian
  'lez': 'lez-RU', // Lezghian
  'lim': 'li-NL', // Limburgan
  'lin': 'ln-CD', // Lingala
  'lit': 'lt-LT', // Lithuanian
  'lmo': 'lmo-IT', // Lombard
  'ltz': 'lb-LU', // Luxembourgish
  'lug': 'lg-UG', // Luganda
  'mal': 'ml-IN', // Malayalam
  'mar': 'mr-IN', // Marathi
  'mkd': 'mk-MK', // Macedonian
  'mlg': 'mg-MG', // Malagasy
  'mlt': 'mt-MT', // Maltese
  'mon': 'mn-MN', // Mongolian
  'mri': 'mi-NZ', // Maori
  'msa': 'ms-MY', // Malay
  'mya': 'my-MM', // Burmese
  'myv': 'myv-RU', // Erzya
  'nah': 'nah-MX', // Nahuatl languages
  'nav': 'nv-US', // Navajo
  'nbl': 'nr-ZA', // South Ndebele
  'nde': 'nd-ZW', // North Ndebele
  'nds': 'nds-DE', // Low German
  'nep': 'ne-NP', // Nepali
  'new': 'new-NP', // Newari
  'nld': 'nl-NL', // Dutch
  'nno': 'nn-NO', // Norwegian Nynorsk
  'nob': 'nb-NO', // Norwegian Bokmål
  'nor': 'no-NO', // Norwegian
  'oci': 'oc-FR', // Occitan
  'ory': 'or-IN', // Odia
  'oss': 'os-RU', // Ossetian
  'pan': 'pa-IN', // Panjabi
  'pap': 'pap-AW', // Papiamento
  'pes': 'fa-IR', // Persian
  'pli': 'pi-IN', // Pali
  'pol': 'pl-PL', // Polish
  'por': 'pt-BR', // Portuguese
  'pus': 'ps-AF', // Pashto
  'que': 'qu-PE', // Quechua
  'roh': 'rm-CH', // Romansh
  'ron': 'ro-RO', // Romanian
  'rus': 'ru-RU', // Russian
  'ryu': 'ryu-UA', // Rusyn
  'sah': 'sah-RU', // Yakut
  'scn': 'scn-IT', // Sicilian
  'sco': 'sco-GB', // Scots
  'sin': 'si-LK', // Sinhala
  'slk': 'sk-SK', // Slovak
  'slv': 'sl-SI', // Slovenian
  'sme': 'se-NO', // Northern Sami
  'sna': 'sn-ZW', // Shona
  'som': 'so-SO', // Somali
  'sot': 'st-LS', // Southern Sotho
  'spa': 'es-ES', // Spanish
  'sqi': 'sq-AL', // Albanian
  'srd': 'sc-IT', // Sardinian
  'srp': 'sr-RS', // Serbian
  'ssw': 'ss-SZ', // Swati
  'sun': 'su-ID', // Sundanese
  'swa': 'sw-TZ', // Swahili
  'swe': 'sv-SE', // Swedish
  'tah': 'ty-PF', // Tahitian
  'tam': 'ta-IN', // Tamil
  'tat': 'tt-RU', // Tatar
  'tel': 'te-IN', // Telugu
  'tgk': 'tg-TJ', // Tajik
  'tgl': 'tl-PH', // Tagalog
  'tha': 'th-TH', // Thai
  'tir': 'ti-ER', // Tigrinya
  'tuk': 'tk-TM', // Turkmen
  'tur': 'tr-TR', // Turkish
  'tyv': 'tyv-RU', // Tuvan
  'uig': 'ug-CN', // Uighur
  'ukr': 'uk-UA', // Ukrainian
  'urd': 'ur-PK', // Urdu
  'uzb': 'uz-UZ', // Uzbek
  'vec': 'vec-IT', // Venetian
  'vie': 'vi-VN', // Vietnamese
  'vol': 'vo',    // Volapük
  'war': 'war-PH', // Waray
  'wln': 'wa-BE', // Walloon
  'xho': 'xh-ZA', // Xhosa
  'xal': 'xal-RU', // Kalmyk
  'yid': 'yi',    // Yiddish
  'yor': 'yo-NG', // Yoruba
  'zul': 'zu-ZA', // Zulu
};


  const [lastValidLanguage, setLastValidLanguage] = useState("en-US");
  const detectLanguage = (text: string, minLength = 5, maxLength = 31) => {
    const trimmed = text.trim();
    if (!trimmed) return 'en-US'; // safe fallback
    const textToDetect = trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
    const detectedCode = franc(textToDetect, { minLength });
    return francToLanguageCode[detectedCode] || 'unsupported'; // unsupported if not mapped
  };

  // Initial detection from Step 1
  useEffect(() => {
  setEditedText(extractedText);
  const detected = detectLanguage(extractedText);
  const initialLang = detected !== 'unsupported' ? detected : 'en-US';
  setDetectedLanguage(initialLang);
  setSelectedLanguage(initialLang);
  setIsUnsupported(detected === 'unsupported');
  setLastValidLanguage(initialLang);
  onLanguageSelect(initialLang);
}, [extractedText]);

  
  const handleTextChange = (newText: string) => {
  setEditedText(newText);
  onTextUpdated(newText);

  const trimmed = newText.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean);

  if (!trimmed) {
    // Reset if text is empty
    setDetectedLanguage("en-US");
    setIsUnsupported(false);
    setLastValidLanguage("en-US");
    return;
  }

  // For very short text, fallback to last valid language
  if (trimmed.length < 5 || wordCount.length < 2) {
    setDetectedLanguage(lastValidLanguage);
    setIsUnsupported(false);
    return;
  }

  // Detect language for longer text
  const detected = detectLanguage(trimmed);
  if (detected === "unsupported") {
    setDetectedLanguage(lastValidLanguage); // fallback
    setIsUnsupported(true);
  } else {
    setDetectedLanguage(detected);
    setIsUnsupported(false);
    setLastValidLanguage(detected); // remember last valid
  }
};

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    onLanguageSelect(languageCode);
  };

  const handleTranslateText = async () => {
    if (!editedText.trim()) return;
    setIsTranslating(true);
    onProcessingStart("Translating text...");
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const translated = `[Simulated translation to ${selectedLanguage}] ... ${editedText}`;
      setEditedText(translated);
      onTextUpdated(translated);
      setDetectedLanguage(selectedLanguage);
      setIsUnsupported(false);
      toast({ title: "Text Translated (Simulated)", description: `The text has been translated to your selected language.` });
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
  const showTranslateIcon = editedText.trim() && detectedLanguage !== selectedLanguage && !isUnsupported;

  return (
    <div className="space-y-6">
      {/* Language Selection */}
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
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showTranslateIcon && (
              <Button onClick={handleTranslateText} disabled={isTranslating} variant="outline" size="icon">
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
            className={`min-h-[200px] resize-none text-base leading-relaxed ${isUnsupported ? 'border-red-500 border-2' : ''}`}
          />
          {isUnsupported && (
            <p className="text-red-600 mt-2 text-sm"> Language not supported. Please rewrite in a supported language.</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <Button onClick={handleImproveText} disabled={isImproving || isTranslating || !editedText.trim() || isUnsupported} variant="outline" className="flex-1">
              <Wand2 className="h-4 w-4 mr-2" /> {isImproving ? "Improving..." : "Improve with AI"}
            </Button>
            <div className="flex items-center space-x-2 justify-center text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Auto-enhances for natural speech</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Statistics */}
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
              <div className="text-lg sm:text-2xl font-bold text-primary truncate">{languages.find(l => l.code === selectedLanguage)?.name || 'Unknown'}</div>
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
        <Button onClick={onNext} disabled={!editedText.trim() || isImproving || isTranslating || isUnsupported} size="lg" className="px-6 sm:px-8 order-1 sm:order-2">
          Continue to Voice Selection
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ModernStepTwo;
