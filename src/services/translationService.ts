

import { franc } from 'franc';

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

  /**
   * Comprehensive map from your app's locale codes to ISO 639-1/2 codes
   * for use with translation APIs. This now covers all 51 locales.
   */
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

  // Script detection patterns (unchanged)
  private static scriptPatterns = {
    arabic: /[\u0600-\u06FF]/,
    bengali: /[\u0980-\u09FF]/,
    devanagari: /[\u0900-\u097F]/,
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

  /**
   * Detect language with minimum 20 character requirement
   */
  static async detectLanguage(text: string): Promise<{
    code: string;
    confidence: number;
    iso: string;
    needsMoreText?: boolean;
  }> {
    try {
      const cleanText = text.trim();

      // Check minimum length requirement
      if (cleanText.length < 20) {
        return {
          code: 'hi-IN', // Hindi fallback
          confidence: 0,
          iso: 'hi',
          needsMoreText: true
        };
      }

      // Strategy 1: Script-based detection for non-Latin scripts
      const scriptResult = this.detectByScript(cleanText);
      if (scriptResult && scriptResult.confidence > 0.8) {
        return scriptResult;
      }

      // Strategy 2: Use franc library (most reliable)
      const francCode = franc(cleanText, { minLength: 20 });

      if (francCode && francCode !== 'und') {
        const localeCode = this.francToLocale[francCode] || 'en-US';
        const isoCode = this.localeToISO[localeCode] || 'en';

        // Franc is very reliable for 20+ characters
        return {
          code: localeCode,
          confidence: 0.9,
          iso: isoCode,
          needsMoreText: false
        };
      }

      // Strategy 3: Common word detection (fallback)
      const wordResult = this.detectByCommonWords(cleanText);
      if (wordResult && wordResult.confidence > 0.6) {
        return wordResult;
      }

      // Default to Hindi if detection fails
      return {
        code: 'hi-IN',
        confidence: 0.3,
        iso: 'hi',
        needsMoreText: false
      };
    } catch (error) {
      console.error('Language detection error:', error);
      return {
        code: 'hi-IN',
        confidence: 0,
        iso: 'hi',
        needsMoreText: false
      };
    }
  }

  /**
   * Detect language by script/writing system
   */
  private static detectByScript(text: string): {
    code: string;
    confidence: number;
    iso: string;
    needsMoreText?: boolean;
  } | null {
    const scriptMatches: { script: string; count: number }[] = [];

    for (const [script, pattern] of Object.entries(this.scriptPatterns)) {
      const matches = text.match(new RegExp(pattern, 'g'));
      if (matches) {
        scriptMatches.push({ script, count: matches.length });
      }
    }

    if (scriptMatches.length === 0) return null;

    scriptMatches.sort((a, b) => b.count - a.count);
    const dominant = scriptMatches[0];

    const scriptToLanguage: Record<string, string> = {
      'arabic': 'ar-SA',
      'bengali': 'bn-IN',
      'devanagari': 'hi-IN',
      'gujarati': 'gu-IN',
      'gurmukhi': 'pa-IN',
      'kannada': 'kn-IN',
      'malayalam': 'ml-IN',
      'tamil': 'ta-IN',
      'telugu': 'te-IN',
      'thai': 'th-TH',
      'chinese': 'zh-CN',
      'japanese': 'ja-JP',
      'korean': 'ko-KR',
      'cyrillic': 'ru-RU',
      'greek': 'el-GR',
      'hebrew': 'he-IL'
    };

    const localeCode = scriptToLanguage[dominant.script];
    if (localeCode) {
      const isoCode = this.localeToISO[localeCode];
      return {
        code: localeCode,
        confidence: 0.95,
        iso: isoCode,
        needsMoreText: false
      };
    }

    return null;
  }

  /**
   * Detect by common words (fallback method)
   */
  private static detectByCommonWords(text: string): {
    code: string;
    confidence: number;
    iso: string;
    needsMoreText?: boolean;
  } | null {
    const commonWords: Record<string, string[]> = {
      'en': ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'is', 'was', 'for'],
      'hi': ['है', 'की', 'का', 'के', 'में', 'से', 'को', 'और', 'यह', 'ने', 'पर', 'हैं'],
      'es': ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'ser', 'se', 'no', 'los', 'con'],
      'fr': ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'les', 'pour'],
      'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'ist'],
      'it': ['di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'come', 'che'],
      'pt': ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'os'],
      'ru': ['и', 'в', 'не', 'на', 'я', 'что', 'он', 'с', 'как', 'а', 'это']
    };

    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};

    for (const [lang, commonList] of Object.entries(commonWords)) {
      scores[lang] = words.filter(word => commonList.includes(word)).length;
    }

    const bestMatch = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

    if (bestMatch && bestMatch[1] >= 2) {
      const isoCode = bestMatch[0];
      const localeCode = Object.entries(this.localeToISO)
        .find(([, iso]) => iso === isoCode)?.[0] || 'hi-IN';

      return {
        code: localeCode,
        confidence: Math.min(bestMatch[1] / Math.max(words.length, 1) * 3, 0.85),
        iso: isoCode,
        needsMoreText: false
      };
    }

    return null;
  }

  /**
   * Translate text using free APIs
   */
  static async translateText(text: string, targetLanguage: string): Promise<TranslationResult> {
    try {
      if (!text || text.trim().length < 3) {
        return {
          success: false,
          error: 'Text must be at least 3 characters long'
        };
      }

      const targetISO = this.localeToISO[targetLanguage] || 'en';
      const detected = await this.detectLanguage(text);
      const sourceISO = detected.iso;

      if (sourceISO === targetISO) {
        return {
          success: true,
          translatedText: text,
          detectedLanguage: detected.code,
          confidence: detected.confidence
        };
      }

      // Try MyMemory API first
      try {
        const myMemoryUrl = ``;
        const response = await fetch(myMemoryUrl);
        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData) {
          return {
            success: true,
            translatedText: data.responseData.translatedText,
            detectedLanguage: detected.code,
            confidence: detected.confidence
          };
        }
      } catch (e) {
        console.log('MyMemory failed, trying LibreTranslate');
      }

      // Fallback to LibreTranslate
      return await this.translateWithLibreTranslate(text, sourceISO, targetISO, detected);

    } catch (error) {
      console.error('Translation error:', error);
      return {
        success: false,
        error: 'Translation failed. Please try again.',
        translatedText: text
      };
    }
  }

  /**
   * Fallback translation using LibreTranslate
   */
  private static async translateWithLibreTranslate(
    text: string,
    sourceISO: string,
    targetISO: string,
    detected: { code: string; confidence: number }
  ): Promise<TranslationResult> {
    try {
      const response = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceISO,
          target: targetISO,
          format: 'text'
        })
      });

      const data = await response.json();

      if (data.translatedText) {
        return {
          success: true,
          translatedText: data.translatedText,
          detectedLanguage: detected.code,
          confidence: detected.confidence
        };
      }

      throw new Error('Translation failed');
    } catch (error) {
      return {
        success: false,
        error: 'Translation service unavailable',
        translatedText: text
      };
    }
  }

  // NOTE: You don't seem to have the improveText method from the previous version.
  // If you need it, you can add it back here.
}