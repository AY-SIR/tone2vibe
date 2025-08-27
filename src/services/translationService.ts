
// Offline translation service (mock implementation)
export class TranslationService {
  private static translations: Record<string, Record<string, string>> = {
    'hi': {
      'Hello': 'नमस्ते',
      'Thank you': 'धन्यवाद',
      'Good morning': 'सुप्रभात',
      'How are you': 'आप कैसे हैं'
    },
    'es': {
      'Hello': 'Hola',
      'Thank you': 'Gracias',
      'Good morning': 'Buenos días',
      'How are you': 'Cómo estás'
    },
    'fr': {
      'Hello': 'Bonjour',
      'Thank you': 'Merci',
      'Good morning': 'Bonjour',
      'How are you': 'Comment allez-vous'
    }
  };

  static async translateText(text: string, targetLanguage: string): Promise<string> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock translation - in real app, use offline translation library
    if (targetLanguage === 'en') return text;
    
    const translations = this.translations[targetLanguage];
    if (!translations) {
      return `[Translated to ${targetLanguage}] ${text}`;
    }
    
    // Simple word replacement for demo
    let translatedText = text;
    Object.entries(translations).forEach(([english, translated]) => {
      translatedText = translatedText.replace(new RegExp(english, 'gi'), translated);
    });
    
    return translatedText;
  }

  static getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'hi', name: 'Hindi' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' }
    ];
  }
}
