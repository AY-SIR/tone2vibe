import { franc } from 'franc';
import { supabase } from '@/integrations/supabase/client';

// Language mapping for translation
const languageNames: Record<string, string> = {
  'en-US': 'English',
  'en-GB': 'English',
  'hi-IN': 'Hindi',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'zh-CN': 'Chinese',
  'ar-SA': 'Arabic',
  'ru-RU': 'Russian',
  'pt-BR': 'Portuguese',
  'it-IT': 'Italian',
};

export interface TranslationResult {
  success: boolean;
  translatedText?: string;
  detectedLanguage?: string;
  error?: string;
  confidence?: number;
}

export class TranslationService {

  private static francToLocale: Record<string, string> = {
    'ara': 'ar-SA',   // Arabic
    'asm': 'as-IN',   // Assamese
    'ben': 'bn-IN',   // Bengali
    'bul': 'bg-BG',   // Bulgarian
    'cmn': 'zh-CN',   // Chinese (Mandarin)
    'hrv': 'hr-HR',   // Croatian
    'ces': 'cs-CZ',   // Czech
    'dan': 'da-DK',   // Danish
    'nld': 'nl-NL',   // Dutch
    'eng': 'en-US',   // English
    'fin': 'fi-FI',   // Finnish
    'fra': 'fr-FR',   // French
    'deu': 'de-DE',   // German
    'ell': 'el-GR',   // Greek
    'guj': 'gu-IN',   // Gujarati
    'heb': 'he-IL',   // Hebrew
    'hin': 'hi-IN',   // Hindi
    'ind': 'id-ID',   // Indonesian
    'ita': 'it-IT',   // Italian
    'jpn': 'ja-JP',   // Japanese
    'kan': 'kn-IN',   // Kannada
    'kor': 'ko-KR',   // Korean
    'lit': 'lt-LT',   // Lithuanian
    'zsm': 'ms-MY',   // Malay (Standard)
    'msa': 'ms-MY',   // Malay (Macro-language)
    'mal': 'ml-IN',   // Malayalam
    'mar': 'mr-IN',   // Marathi
    'nep': 'ne-IN',   // Nepali
    'nor': 'no-NO',   // Norwegian
    'ori': 'or-IN',   // Odia
    'fas': 'fa-IR',   // Persian (Farsi)
    'por': 'pt-BR',   // Portuguese
    'pan': 'pa-IN',   // Punjabi
    'ron': 'ro-RO',   // Romanian
    'rus': 'ru-RU',   // Russian
    'srp': 'sr-RS',   // Serbian
    'slk': 'sk-SK',   // Slovak
    'slv': 'sl-SI',   // Slovenian
    'spa': 'es-ES',   // Spanish
    'swe': 'sv-SE',   // Swedish
    'tam': 'ta-IN',   // Tamil
    'tel': 'te-IN',   // Telugu
    'tha': 'th-TH',   // Thai
    'tur': 'tr-TR',   // Turkish
    'ukr': 'uk-UA',   // Ukrainian
    'urd': 'ur-IN',   // Urdu
    'vie': 'vi-VN'    // Vietnamese
  };

  private static localeToISO: Record<string, string> = {
    'ar-SA': 'ar', 'as-IN': 'as', 'bn-BD': 'bn', 'bn-IN': 'bn',
    'bg-BG': 'bg', 'zh-CN': 'zh', 'zh-TW': 'zh', 'hr-HR': 'hr',
    'cs-CZ': 'cs', 'da-DK': 'da', 'nl-NL': 'nl', 'en-GB': 'en',
    'en-US': 'en', 'fi-FI': 'fi', 'fr-CA': 'fr', 'fr-FR': 'fr',
    'de-DE': 'de', 'el-GR': 'el', 'gu-IN': 'gu', 'he-IL': 'he',
    'hi-IN': 'hi', 'id-ID': 'id', 'it-IT': 'it', 'ja-JP': 'ja',
    'kn-IN': 'kn', 'ko-KR': 'ko', 'lt-LT': 'lt', 'ms-MY': 'ms',
    'ml-IN': 'ml', 'mr-IN': 'mr', 'ne-IN': 'ne', 'no-NO': 'no',
    'or-IN': 'or', 'fa-IR': 'fa', 'pt-BR': 'pt', 'pt-PT': 'pt',
    'pa-IN': 'pa', 'ro-RO': 'ro', 'ru-RU': 'ru', 'sr-RS': 'sr',
    'sk-SK': 'sk', 'sl-SI': 'sl', 'es-ES': 'es', 'es-MX': 'es',
    'sv-SE': 'sv', 'ta-IN': 'ta', 'te-IN': 'te', 'th-TH': 'th',
    'tr-TR': 'tr', 'uk-UA': 'uk', 'ur-IN': 'ur', 'vi-VN': 'vi'
  };

  private static scriptPatterns = {
    arabic: /[\u0600-\u06FF]/,
    bengali: /[\u0980-\u09FF]/,
    devanagari: /[\u0900-\u097F]/, // Used for Hindi, Marathi, Nepali
    gujarati: /[\u0A80-\u0AFF]/,
    gurmukhi: /[\u0A00-\u0A7F]/,
    kannada: /[\u0C80-\u0CFF]/,
    malayalam: /[\u0D00-\u0D7F]/,
    tamil: /[\u0B80-\u0BFF]/,
    telugu: /[\u0C00-\u0C7F]/,
    thai: /[\u0E00-\u0E7F]/,
    chinese: /[\u4E00-\u9FFF]/,
    japanese: /[\u3040-\u309F\u30A0-\u30FF]/,
    korean: /[\uAC00-\uD7AF]/,
    cyrillic: /[\u0400-\u04FF]/,
    greek: /[\u0370-\u03FF]/,
    hebrew: /[\u0590-\u05FF]/
  };

  private static detectLanguage(text: string): string | null {
    try {
      const detectedCode = franc(text, { minLength: 3 });
      return detectedCode === 'und' ? null : detectedCode;
    } catch (error) {
      console.warn("Language detection failed:", error);
      return null;
    }
  }

  private static detectByScript(text: string): string | null {
    for (const script in this.scriptPatterns) {
      if (this.scriptPatterns[script].test(text)) {
        return script;
      }
    }
    return null;
  }

  private static detectByCommonWords(text: string): string | null {
    const commonWords: { [key: string]: string[] } = {
      english: ['the', 'and', 'a', 'to', 'of', 'in', 'is', 'that', 'it', 'for'],
      spanish: ['de', 'la', 'el', 'en', 'y', 'a', 'que', 'es', 'del', 'se'],
      french: ['de', 'la', 'le', 'et', 'à', 'est', 'en', 'je', 'un', 'pour'],
      german: ['der', 'die', 'das', 'und', 'in', 'ich', 'zu', 'den', 'von', 'mit']
    };

    for (const lang in commonWords) {
      const words = commonWords[lang];
      const count = words.filter(word => new RegExp(`\\b${word}\\b`, 'i').test(text)).length;
      if (count > 2) {
        return lang;
      }
    }
    return null;
  }
}

export const translateText = async (
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult> => {
  try {
    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    const sourceLangName = sourceLanguage ? (languageNames[sourceLanguage] || sourceLanguage) : undefined;

    console.log('Translating text using OpenAI GPT-3.5');
    
    const { data, error } = await supabase.functions.invoke('translate-text', {
      body: {
        text,
        targetLanguage: targetLangName,
        sourceLanguage: sourceLangName
      }
    });

    if (error) {
      console.error('Translation error:', error);
      throw new Error('Translation service temporarily unavailable');
    }

    if (data && data.success) {
      return {
        success: true,
        translatedText: data.translatedText,
        detectedLanguage: data.sourceLanguage || 'unknown',
        confidence: 0.95
      };
    }

    throw new Error('Translation failed');
  } catch (error) {
    console.error('Translation error:', error);
    return {
      success: false,
      error: 'Translation service unavailable. Please try again.'
    };
  }
};
