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

  static async detectLanguage(text: string): Promise<{
    code: string;
    confidence: number;
    iso: string;
    needsMoreText?: boolean;
  }> {
    try {
      const cleanText = text.trim();

      if (cleanText.length < 20) {
        return {
          code: 'hi-IN',
          confidence: 0,
          iso: 'hi',
          needsMoreText: true
        };
      }

      const scriptResult = this.detectByScript(cleanText);
      if (scriptResult && scriptResult.confidence > 0.8) {
        return scriptResult;
      }

      const francCode = franc(cleanText, { minLength: 20 });
      if (francCode && francCode !== 'und') {
        const localeCode = this.francToLocale[francCode] || 'en-US';
        const isoCode = this.localeToISO[localeCode] || 'en';
        return {
          code: localeCode,
          confidence: 0.9,
          iso: isoCode,
          needsMoreText: false
        };
      }

      const wordResult = this.detectByCommonWords(cleanText);
      if (wordResult && wordResult.confidence > 0.6) {
        return wordResult;
      }

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
      // 'devanagari': 'hi-IN', // <-- REMOVED: This was the problem. It's better to let word detection handle Devanagari.
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
      'cyrillic': 'ru-RU', // Can be Bulgarian, Serbian etc. but Russian is a strong default.
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

  private static detectByCommonWords(text: string): {
    code: string;
    confidence: number;
    iso: string;
    needsMoreText?: boolean;
  } | null {
    // --- START: FULLY UPDATED commonWords OBJECT ---
    const commonWords: Record<string, string[]> = {
      'en': ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'is', 'was', 'for', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she'],
      'hi': ['है', 'की', 'का', 'के', 'में', 'से', 'को', 'और', 'यह', 'ने', 'पर', 'हैं', 'कि', 'एक', 'वह', 'हो', 'तो', 'कर', 'रहे', 'थे', 'था', 'लिए', 'अपने', 'मैं', 'क्या', 'कोई', 'इस', 'उस', 'जब', 'तब'],
      'es': ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'ser', 'se', 'no', 'los', 'con', 'una', 'por', 'para', 'su', 'lo', 'como', 'más', 'o', 'pero', 'sus', 'le', 'ha', 'me', 'si', 'sin', 'sobre', 'este', 'ya'],
      'fr': ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'les', 'pour', 'pas', 'que', 'vous', 'qui', 'nous', 'ce', 'dans', 'en', 'du', 'elle', 'au', 'de', 'des', 'la', 'sur', 'se', 'sont', 's'],
      'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'ist', 'im', 'auf', 'für', 'es', 'ein', 'ich', 'auch', 'als', 'an', 'nach', 'wie', 'man', 'dass', 'sie', 'sind', 'hat', 'sind', 'oder', 'aber'],
      'it': ['di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'come', 'che', 'e', 'il', 'la', 'un', 'non', 'si', 'mi', 'ti', 'ci', 'vi', 'lo', 'gli', 'le', 'ma', 'ed', 'o', 'ha', 'sono', 'essere'],
      'pt': ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'os', 'com', 'uma', 'não', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua'],
      'ru': ['и', 'в', 'не', 'на', 'я', 'что', 'он', 'с', 'как', 'а', 'это', 'по', 'к', 'но', 'они', 'мы', 'же', 'бы', 'вы', 'за', 'да', 'из', 'от', 'так', 'его', 'ее', 'для', 'о', 'все', 'меня'],
      'ar': ['من', 'في', 'على', 'إلى', 'هو', 'هي', 'كان', 'أن', 'هذا', 'لكن', 'و', 'لا', 'ما', 'كل', 'يا', 'قد', 'تم', 'عن', 'قال', 'تكون', 'بعد', 'قبل', 'مع', 'عند', 'الذي', 'التي', 'الذين', 'ذلك', 'أو', 'إن'],
      'as': ['আৰু', 'এই', 'এটা', 'যে', 'কৰি', 'তেওঁ', 'হৈছে', 'বুলি', 'নাই', 'কিন্তু', 'মই', 'মোৰ', 'কি', 'তেওঁৰ', 'তেওঁলোকৰ', 'হয়', 'এজন', 'এতিয়া', 'যদি', 'তেন্তে', 'কেনে', 'কোনে', 'কোনো', 'কৰা', 'হৈছিল', 'পাৰে', 'আছে', 'নাইবা', 'হলেও', 'সি'],
      'bn': ['এবং', 'ও', 'একটি', 'যে', 'এই', 'জন্য', 'তার', 'থেকে', 'না', 'আমি', 'কিন্তু', 'হয়', 'করা', 'সে', 'তার', 'তাদের', 'মধ্যে', 'সঙ্গে', 'যদি', 'তাহলে', 'এখানে', 'সেখানে', 'কখন', 'কেন', 'কিভাবে', 'কোন', 'সব', 'আমার', 'আপনি', 'কি'],
      'bg': ['и', 'в', 'на', 'с', 'за', 'да', 'е', 'не', 'от', 'съм', 'ще', 'по', 'този', 'който', 'беше', 'но', 'са', 'си', 'аз', 'както', 'или', 'ако', 'до', 'тя', 'той', 'те', 'им', 'ни', 'вие', 'нас'],
      'zh': ['的', '是', '在', '我', '有', '和', '不', '了', '人', '都', '一', '个', '他', '她', '它', '们', '这', '那', '也', '就', '还', '对', '说', '看', '到', '去', '来', '很', '多', '会'],
      'hr': ['je', 'i', 'u', 'na', 'se', 'da', 'za', 's', 'od', 'su', 'koji', 'kao', 'ali', 'sam', 'smo', 'ste', 'će', 'biti', 'bio', 'bila', 'bilo', 'nas', 'vas', 'im', 'ih', 'ga', 'ju', 'što', 'ako', 'dok'],
      'cs': ['a', 'je', 'v', 'se', 'na', 'to', 's', 'z', 'že', 'jsem', 'ale', 'jako', 'pro', 'jsou', 'by', 'jsi', 'být', 'když', 'tak', 'než', 'on', 'ona', 'ono', 'my', 'vy', 'oni', 'co', 'kdo', 'jak', 'kde'],
      'da': ['og', 'i', 'er', 'en', 'at', 'for', 'af', 'det', 'med', 'den', 'har', 'jeg', 'til', 'som', 'på', 'de', 'han', 'hun', 'ikke', 'et', 'vi', 'var', 'mig', 'dig', 'sig', 'men', 'kan', 'vil', 'skal', 'ville'],
      'nl': ['de', 'en', 'van', 'ik', 'te', 'dat', 'die', 'in', 'een', 'hij', 'het', 'zijn', 'is', 'was', 'op', 'aan', 'met', 'als', 'voor', 'er', 'maar', 'om', 'hem', 'haar', 'mij', 'jij', 'u', 'wat', 'wie', 'waar'],
      'fi': ['ja', 'on', 'ei', 'se', 'että', 'mutta', 'kun', 'ovat', 'oli', 'myös', 'kuin', 'hän', 'minä', 'sinä', 'he', 'me', 'te', 'se', 'tämä', 'tuo', 'joka', 'mikä', 'kuka', 'tai', 'vain', 'myös', 'vielä', 'jo', 'nyt'],
      'el': ['και', 'το', 'η', 'ο', 'να', 'σε', 'για', 'που', 'δεν', 'με', 'ειναι', 'τα', 'αλλα', 'οτι', 'θα', 'μου', 'σου', 'του', 'της', 'μας', 'σας', 'τους', 'αυτο', 'αυτη', 'αυτο', 'οπως', 'αν', 'ή', 'εγω', 'εμεις'],
      'gu': ['અને', 'છે', 'આ', 'એ', 'કે', 'માટે', 'માં', 'થી', 'પણ', 'નથી', 'તે', 'એક', 'હું', 'તમે', 'તેઓ', 'મારું', 'તમારું', 'તેમનું', 'હોય', 'હતી', 'હતા', 'શું', 'ક્યાં', 'ક્યારે', 'કેમ', 'કોણ', 'પરંતુ', 'અથવા', 'જો', 'તો'],
      'he': ['את', 'של', 'ו', 'ה', 'לא', 'עם', 'על', 'זה', 'אני', 'הוא', 'כי', 'גם', 'או', 'כל', 'יש', 'אין', 'לי', 'לך', 'לו', 'לה', 'લנו', 'לכם', 'להם', 'היא', 'הם', 'הן', 'אבל', 'אם', 'כמו', 'רק'],
      'id': ['dan', 'di', 'yang', 'untuk', 'dengan', 'ini', 'itu', 'ke', 'adalah', 'saya', 'ada', 'dari', 'bisa', 'juga', 'akan', 'telah', 'kamu', 'dia', 'mereka', 'kita', 'kami', 'apa', 'siapa', 'kapan', 'dimana', 'bagaimana', 'tapi', 'atau', 'jika'],
      'ja': ['の', 'は', 'が', 'に', 'を', 'と', 'も', 'です', 'ます', 'で', 'た', 'いる', 'か', 'する', 'ない', 'これ', 'それ', 'あれ', 'この', 'その', 'あの', '私', 'あなた', '彼', '彼女', '私たち', '彼ら', '何', '誰', 'どこ'],
      'kn': ['ಮತ್ತು', 'ಒಂದು', 'ಈ', 'ಆ', 'ಅದು', 'ಇದು', 'ಅವರು', 'ಅಲ್ಲ', 'ಹಾಗೂ', 'ಅನ್ನು', 'ಆದರೆ', 'ಇದೆ', 'ನಾನು', 'ನೀವು', 'ಅವನು', 'ಅವಳು', 'ಅವು', 'ನಮ್ಮ', 'ನಿಮ್ಮ', 'ಅವರ', 'ಹೇಗೆ', 'ಯಾಕೆ', 'ಯಾರು', 'ಎಲ್ಲಿ', 'ಯಾವಾಗ', 'ಆದರೆ', 'ಅಥವಾ', 'ಹೌದು', 'ಇಲ್ಲ', 'ಕೂಡ'],
      'ko': ['의', '에', '는', '은', '를', '을', '이', '가', '과', '와', '하고', '있다', '합니다', '것', '저', '그', '나', '우리', '너희', '그들', '무엇', '누구', '언제', '어디서', '어떻게', '왜', '그리고', '그러나', '그래서', '또는'],
      'lt': ['ir', 'yra', 'kad', 'su', 'į', 'ne', 'bet', 'kaip', 'tai', 'jau', 'o', 'iki', 'aš', 'tu', 'jis', 'ji', 'mes', 'jūs', 'jie', 'jos', 'kas', 'ką', 'kam', 'kur', 'kada', 'kodėl', 'ar', 'taip', 'ne', 'dar'],
      'ms': ['dan', 'di', 'yang', 'untuk', 'dengan', 'ini', 'itu', 'ke', 'adalah', 'saya', 'ada', 'dari', 'boleh', 'juga', 'akan', 'telah', 'awak', 'dia', 'mereka', 'kita', 'kami', 'apa', 'siapa', 'bila', 'di mana', 'bagaimana', 'tetapi', 'atau', 'jika'],
      'ml': ['ഉം', 'ഈ', 'ആ', 'ഒരു', 'അത്', 'ഇത്', 'അവൻ', 'അവൾ', 'എന്നാൽ', 'കൂടി', 'നിന്ന്', 'കൂടെ', 'ഞാൻ', 'നീ', 'അവർ', 'നമ്മൾ', 'നിങ്ങൾ', 'എൻ്റെ', 'നിൻ്റെ', 'അവൻ്റെ', 'അവളുടെ', 'അവരുടെ', 'എന്ത്', 'ആര്', 'എവിടെ', 'എപ്പോൾ', 'എങ്ങനെ', 'പക്ഷേ', 'അല്ലെങ്കിൽ', 'അതെ'],
      'mr': ['आणि', 'हे', 'आहे', 'की', 'या', 'ते', 'एक', 'मी', 'नाही', 'पण', 'कारण', 'तर', 'तू', 'तुम्ही', 'आम्ही', 'त्या', 'ती', 'त्यांचे', 'तिचे', 'माझे', 'तुमचे', 'आमचे', 'काय', 'कोण', 'कुठे', 'कधी', 'कसे', 'परंतु', 'किंवा'],
      'ne': ['र', 'को', 'मा', 'छ', 'यो', 'हो', 'पनि', 'छैन', 'तर', 'भне', 'लागि', 'के', 'म', 'तिमी', 'तपाईं', 'हामी', 'उनीहरू', 'मेरो', 'तिम्रो', 'तपाईंको', 'हाम्रो', 'उनीहरूको', 'किन', 'कसरी', 'कहाँ', 'कहिले', 'को', 'कुन', 'वा', 'यदि'],
      'no': ['og', 'i', 'er', 'en', 'at', 'for', 'av', 'det', 'med', 'den', 'jeg', 'har', 'til', 'som', 'på', 'de', 'han', 'hun', 'ikke', 'et', 'vi', 'var', 'meg', 'deg', 'seg', 'men', 'kan', 'vil', 'skal', 'ville'],
      'or': ['ଏବଂ', 'ଓ', 'ଏକ', 'ଯେ', 'ଏହି', 'ପାଇଁ', 'ତାଙ୍କ', 'ଠାରୁ', 'ନା', 'ମୁଁ', 'କିନ୍ତୁ', 'ହେଉଛି', 'କରିବା', 'ସେ', 'ତାଙ୍କର', 'ସେମାନଙ୍କର', 'ମଧ୍ୟରେ', 'ସହିତ', 'ଯଦି', 'ତେବେ', 'ଏଠାରେ', 'ସେଠାରେ', 'କେବେ', 'କାହିଁକି', 'କିପରି', 'କୌଣସି', 'ସବୁ', 'ମୋର', 'ଆପଣ', 'କଣ'],
      'fa': ['و', 'در', 'به', 'از', 'که', 'این', 'آن', 'است', 'را', 'با', 'برای', 'هم', 'من', 'تو', 'او', 'ما', 'شما', 'ایشان', 'نیست', 'بود', 'شد', 'یک', 'هر', 'همه', 'چیزی', 'کسی', 'کجا', 'کی', 'چرا', 'چگونه'],
      'pa': ['ਅਤੇ', 'ਦੇ', 'ਵਿੱਚ', 'ਹੈ', 'ਇਹ', 'ਨੂੰ', 'ਤੋਂ', 'ਨਾਲ', 'ਇੱਕ', 'ਨਹੀਂ', 'ਉਹ', 'ਵੀ', 'ਮੈਂ', 'ਤੁਸੀਂ', 'ਅਸੀਂ', 'ਉਹਨਾਂ', 'ਮੇਰਾ', 'ਤੁਹਾਡਾ', 'ਸਾਡਾ', 'ਉਸਦਾ', 'ਕੀ', 'ਕੌਣ', 'ਕਿੱਥੇ', 'ਕਦੋਂ', 'ਕਿਵੇਂ', 'ਕਿਉਂ', 'ਪਰ', 'ਜਾਂ', 'ਜੇ'],
      'ro': ['și', 'în', 'de', 'la', 'pe', 'cu', 'un', 'o', 'este', 'nu', 'ca', 'sau', 'eu', 'tu', 'el', 'ea', 'noi', 'voi', 'ei', 'ele', 'ce', 'cine', 'unde', 'când', 'cum', 'dar', 'dacă', 'pentru', 'sunt', 'are'],
      'sr': ['је', 'и', 'у', 'на', 'се', 'да', 'за', 'с', 'од', 'су', 'који', 'али', 'сам', 'смо', 'сте', 'ће', 'бити', 'био', 'била', 'било', 'нас', 'вас', 'им', 'их', 'га', 'ју', 'што', 'ако', 'док', 'није'],
      'sk': ['a', 'je', 'v', 'sa', 'na', 'to', 's', 'z', 'že', 'som', 'ako', 'alebo', 'sú', 'by', 'si', 'byť', 'keď', 'tak', 'než', 'on', 'ona', 'ono', 'my', 'vy', 'oni', 'čo', 'kto', 'ako', 'kde', 'pre'],
      'sl': ['in', 'je', 'na', 'za', 'v', 'se', 'da', 'ki', 'so', 'pa', 'ter', 'ne', 'jaz', 'ti', 'on', 'ona', 'ono', 'mi', 'vi', 'oni', 'one', 'kaj', 'kdo', 'kje', 'kdaj', 'kako', 'ampak', 'ali', 'če', 'tudi'],
      'sv': ['och', 'i', 'är', 'en', 'att', 'för', 'av', 'det', 'med', 'den', 'jag', 'som', 'på', 'de', 'han', 'hon', 'inte', 'ett', 'vi', 'var', 'mig', 'dig', 'sig', 'men', 'kan', 'ska', 'kommer', 'till', 'från', 'om'],
      'ta': ['மற்றும்', 'ஒரு', 'இந்த', 'அந்த', 'அது', 'இது', 'அவர்', 'இல்லை', 'ஆகும்', 'என', 'ஆம்', 'நான்', 'நீங்கள்', 'அவர்கள்', 'என்', 'உங்கள்', 'அவர்களின்', 'என்ன', 'யார்', 'எங்கே', 'எப்போது', 'எப்படி', 'ஏன்', 'ஆனால்', 'அல்லது', 'இருக்கிறது', 'இருந்தது', 'வேண்டும்', 'முடியும்'],
      'te': ['మరియు', 'ఒక', 'ఈ', 'ఆ', 'అది', 'ఇది', 'అతను', 'కాదు', 'అని', 'తో', 'లో', 'నేను', 'మీరు', 'వారు', 'నా', 'మీ', 'వారి', 'ఏమిటి', 'ఎవరు', 'ఎక్కడ', 'ఎప్పుడు', 'ఎలా', 'ఎందుకు', 'కానీ', 'లేదా', 'ఉంది', 'ఉన్నది', 'வேண்டும்', 'చేయగలరు'],
      'th': ['และ', 'ที่', 'ใน', 'เป็น', 'ของ', 'ให้', 'ว่า', 'ไม่', 'ได้', 'การ', 'มี', 'แต่', 'ฉัน', 'คุณ', 'เขา', 'เรา', 'พวกเขา', 'อะไร', 'ใคร', 'ที่ไหน', 'เมื่อไหร่', 'อย่างไร', 'ทำไม', 'หรือ', 'ถ้า', 'จะ', 'ต้อง', 'สามารถ', 'แล้ว', 'ทุก'],
      'tr': ['ve', 'bir', 'bu', 'de', 'için', 'ile', 'ama', 'olarak', 'en', 'çok', 'da', 'ne', 'ben', 'sen', 'o', 'biz', 'siz', 'onlar', 'ne', 'kim', 'nerede', 'ne zaman', 'nasıl', 'neden', 'fakat', 'veya', 'eğer', 'var', 'yok', 'mi'],
      'uk': ['і', 'в', 'на', 'з', 'що', 'не', 'це', 'я', 'він', 'як', 'але', 'за', 'до', 'ми', 'ви', 'вони', 'вона', 'воно', 'був', 'була', 'було', 'були', 'є', 'чи', 'хто', 'де', 'коли', 'чому', 'якщо', 'або'],
      'ur': ['اور', 'کی', 'کا', 'کے', 'میں', 'سے', 'کو', 'یہ', 'نے', 'پر', 'ہے', 'ہیں', 'کہ', 'ایک', 'وہ', 'ہو', 'تو', 'کر', 'رہے', 'تھے', 'تھا', 'لئے', 'اپنے', 'میں', 'کیا', 'کوئی', 'اس', 'اس', 'جب', 'تب'],
      'vi': ['và', 'là', 'của', 'cho', 'có', 'một', 'trong', 'đã', 'không', 'khi', 'như', 'với', 'tôi', 'bạn', 'anh', 'chị', 'em', 'chúng tôi', 'họ', 'cái', 'gì', 'ai', 'ở đâu', 'khi nào', 'làm sao', 'tại sao', 'nhưng', 'hoặc', 'nếu', 'sẽ']
    };
    // --- END: FULLY UPDATED commonWords OBJECT ---

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
        const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceISO}|${targetISO}`;
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

  private static async translateWithLibreTranslate(
    text: string,
    sourceISO: string,
    targetISO: string,
    detected: { code: string; confidence: number }
  ): Promise<TranslationResult> {
    try {
      const response = await fetch('https://libretranslate.de/translate', {
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
      throw new Error(data.error || 'Translation failed');
    } catch (error) {
      console.error('LibreTranslate error:', error);
      return {
        success: false,
        error: 'Translation service unavailable',
        translatedText: text
      };
    }
  }
}
