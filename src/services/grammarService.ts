// src/services/GrammarService.ts
export interface ImprovementResult {
  success: boolean;
  improvedText?: string;
  error?: string;
}

export class GrammarService {
  private static localeToISO: Record<string, string> = {
    "ar-SA": "ar", "as-IN": "as", "bn-BD": "bn", "bn-IN": "bn", "bg-BG": "bg",
    "zh-CN": "zh", "zh-TW": "zh-TW", "hr-HR": "hr", "cs-CZ": "cs", "da-DK": "da",
    "nl-NL": "nl", "en-GB": "en", "en-US": "en", "fi-FI": "fi", "fr-CA": "fr",
    "fr-FR": "fr", "de-DE": "de", "el-GR": "el", "gu-IN": "gu", "he-IL": "he",
    "hi-IN": "hi", "id-ID": "id", "it-IT": "it", "ja-JP": "ja", "kn-IN": "kn",
    "ko-KR": "ko", "lt-LT": "lt", "ms-MY": "ms", "ml-IN": "ml", "mr-IN": "mr",
    "ne-IN": "ne", "no-NO": "no", "or-IN": "or", "fa-IR": "fa", "pt-BR": "pt-BR",
    "pt-PT": "pt-PT", "pa-IN": "pa", "ro-RO": "ro", "ru-RU": "ru", "sr-RS": "sr",
    "sk-SK": "sk", "sl-SI": "sl", "es-ES": "es", "es-MX": "es", "sv-SE": "sv",
    "ta-IN": "ta", "te-IN": "te", "th-TH": "th", "tr-TR": "tr", "uk-UA": "uk",
    "ur-IN": "ur", "vi-VN": "vi"
  };

  static async improveText(text: string, language: string): Promise<ImprovementResult> {
    try {
      if (!text || text.trim().length < 3) {
        return { success: false, error: "Text must be at least 3 characters long" };
      }

      const languageISO = this.localeToISO[language] || "en-US";

      const { supabase } = await import("@/integrations/supabase/client");

      const { data, error } = await supabase.functions.invoke("improve-grammar", {
        body: { text, language: languageISO }
      });

      if (error || !data) {
        console.error("Grammar improvement error:", error);
        return { success: true, improvedText: text, error: "Service unavailable, fallback applied" };
      }

      return data.success
        ? { success: true, improvedText: data.improvedText }
        : { success: true, improvedText: text, error: "Fallback applied" };
    } catch (err) {
      console.error("Text improvement error:", err);
      return { success: true, improvedText: text, error: "Service failed, fallback applied" };
    }
  }
}
