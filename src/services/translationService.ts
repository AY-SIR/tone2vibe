import { supabase } from '@/integrations/supabase/client';

export interface TranslationResult {
  success: boolean;
  translatedText?: string;
  detectedLanguage?: string;
  error?: string;
}

export class TranslationService {
  // Language codes and names
  private static languages = {
    'en': 'English',
    'es': 'Spanish', 
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi'
  };

  static async translateText(text: string, targetLanguage: string = 'en'): Promise<string> {
    try {
      const result = await this.translateTextAdvanced(text, targetLanguage);
      return result.success ? result.translatedText || text : text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  }

  static async translateTextAdvanced(text: string, targetLanguage: string = 'en'): Promise<TranslationResult> {
    try {
      // For now, return a placeholder translation
      // In production, this would connect to Google Translate API, Azure Translator, etc.
      const languageName = this.languages[targetLanguage as keyof typeof this.languages] || targetLanguage;
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        translatedText: `[Translated to ${languageName}]: ${text}`,
        detectedLanguage: 'en'
      };
    } catch (error) {
      console.error('Translation Error:', error);
      return {
        success: false,
        error: 'Translation service temporarily unavailable'
      };
    }
  }

  static getSupportedLanguages(): Array<{code: string, name: string}> {
    return Object.entries(this.languages).map(([code, name]) => ({ code, name }));
  }

  static async detectLanguage(text: string): Promise<string> {
    try {
      // Simple language detection based on common words
      const commonWords = {
        en: ['the', 'and', 'a', 'to', 'of', 'in', 'for', 'is', 'on', 'that'],
        es: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no'],
        fr: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir'],
        de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
        it: ['il', 'di', 'che', 'e', 'la', 'per', 'un', 'in', 'con', 'del'],
        pt: ['o', 'de', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com']
      };

      const words = text.toLowerCase().split(/\s+/);
      const scores = Object.entries(commonWords).map(([lang, commonWordsArray]) => {
        const matchCount = words.filter(word => commonWordsArray.includes(word)).length;
        return { language: lang, score: matchCount / words.length };
      });

      const best = scores.reduce((prev, current) => 
        prev.score > current.score ? prev : current
      );

      return best.language;
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en';
    }
  }

  static getLanguages() {
    return this.languages;
  }
}