

export interface ImprovementResult {
  success: boolean;
  improvedText?: string;
  error?: string;
}

export class GrammarService {
  private static localeToISO: Record<string, string> = {
    'ar-SA': 'ar', 'as-IN': 'as', 'bn-BD': 'bn', 'bn-IN': 'bn', 'bg-BG': 'bg',
    'zh-CN': 'zh', 'zh-TW': 'zh-TW', 'hr-HR': 'hr', 'cs-CZ': 'cs', 'da-DK': 'da',
    'nl-NL': 'nl', 'en-GB': 'en-GB', 'en-US': 'en-US', 'fi-FI': 'fi', 'fr-CA': 'fr',
    'fr-FR': 'fr', 'de-DE': 'de', 'el-GR': 'el', 'gu-IN': 'gu', 'he-IL': 'he',
    'hi-IN': 'hi', 'id-ID': 'id', 'it-IT': 'it', 'ja-JP': 'ja', 'kn-IN': 'kn',
    'ko-KR': 'ko', 'lt-LT': 'lt', 'ms-MY': 'ms', 'ml-IN': 'ml', 'mr-IN': 'mr',
    'ne-IN': 'ne', 'no-NO': 'no', 'or-IN': 'or', 'fa-IR': 'fa', 'pt-BR': 'pt-BR',
    'pt-PT': 'pt-PT', 'pa-IN': 'pa', 'ro-RO': 'ro', 'ru-RU': 'ru', 'sr-RS': 'sr',
    'sk-SK': 'sk', 'sl-SI': 'sl', 'es-ES': 'es', 'es-MX': 'es', 'sv-SE': 'sv',
    'ta-IN': 'ta', 'te-IN': 'te', 'th-TH': 'th', 'tr-TR': 'tr', 'uk-UA': 'uk',
    'ur-IN': 'ur', 'vi-VN': 'vi'
  };

  /**
   * Improve text with AI grammar correction
   */
  static async improveText(
    text: string,
    language: string
  ): Promise<ImprovementResult> {
    try {
      if (!text || text.trim().length < 3) {
        return {
          success: false,
          error: 'Text must be at least 3 characters long'
        };
      }

      const languageISO = this.localeToISO[language] || 'en';

      const formData = new URLSearchParams();
      formData.append('text', text);
      formData.append('language', languageISO);
      formData.append('enabledOnly', 'false');

      const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      const data = await response.json();

      if (data.matches && data.matches.length > 0) {
        // Unicode-safe replacement
        let chars = [...text];
        const sortedMatches = [...data.matches].sort((a, b) => b.offset - a.offset);

        for (const match of sortedMatches) {
          if (match.replacements && match.replacements.length > 0) {
            const replacement = match.replacements[0].value;
            chars.splice(match.offset, match.length, replacement);
          }
        }

        return { success: true, improvedText: chars.join('') };
      }

      return { success: true, improvedText: text };
    } catch (error) {
      console.error('Text improvement error:', error);
      return {
        success: false,
        error: 'AI improvement service unavailable',
        improvedText: text
      };
    }
  }
}
