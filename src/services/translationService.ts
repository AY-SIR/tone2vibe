import { franc } from 'franc';
import { supabase } from '@/integrations/supabase/client';

// Language mapping for translation API (e.g., OpenAI)
const languageNames: Record<string, string> = {
  'en-US': 'English', 'en-GB': 'English', 'hi-IN': 'Hindi',
  'es-ES': 'Spanish', 'es-MX': 'Spanish', 'fr-FR': 'French',
  'fr-CA': 'French', 'de-DE': 'German', 'ja-JP': 'Japanese',
  'ko-KR': 'Korean', 'zh-CN': 'Chinese', 'zh-TW': 'Chinese',
  'ar-SA': 'Arabic', 'ru-RU': 'Russian', 'pt-BR': 'Portuguese',
  'pt-PT': 'Portuguese', 'it-IT': 'Italian', 'as-IN': 'Assamese',
  'bn-BD': 'Bengali', 'bn-IN': 'Bengali', 'bg-BG': 'Bulgarian',
  'hr-HR': 'Croatian', 'cs-CZ': 'Czech', 'da-DK': 'Danish',
  'nl-NL': 'Dutch', 'fi-FI': 'Finnish', 'el-GR': 'Greek',
  'gu-IN': 'Gujarati', 'he-IL': 'Hebrew', 'id-ID': 'Indonesian',
  'kn-IN': 'Kannada', 'lt-LT': 'Lithuanian', 'ms-MY': 'Malay',
  'ml-IN': 'Malayalam', 'mr-IN': 'Marathi', 'ne-IN': 'Nepali',
  'no-NO': 'Norwegian', 'or-IN': 'Odia', 'fa-IR': 'Persian',
  'pa-IN': 'Punjabi', 'ro-RO': 'Romanian', 'sr-RS': 'Serbian',
  'sk-SK': 'Slovak', 'sl-SI': 'Slovenian', 'sv-SE': 'Swedish',
  'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'th-TH': 'Thai',
  'tr-TR': 'Turkish', 'uk-UA': 'Ukrainian', 'ur-IN': 'Urdu',
  'vi-VN': 'Vietnamese', 'sa-IN': 'Sanskrit'
};

export interface TranslationResult {
  success: boolean;
  translatedText?: string;
  detectedLanguage?: string;
  error?: string;
  confidence?: number;
  isFallback?: boolean;
  fallbackAlertMessage?: string;
}

export interface DetectedLanguageResult {
    language: string | null;
    confidence: number;
    isFallback: boolean;
}

export class TranslationService {
  private static francToLocale: Record<string, string> = {
    'ara': 'ar-SA', 'asm': 'as-IN', 'ben': 'bn-IN', 'bul': 'bg-BG',
    'cmn': 'zh-CN', 'hrv': 'hr-HR', 'ces': 'cs-CZ', 'dan': 'da-DK',
    'nld': 'nl-NL', 'eng': 'en-US', 'fin': 'fi-FI', 'fra': 'fr-FR',
    'deu': 'de-DE', 'ell': 'el-GR', 'guj': 'gu-IN', 'heb': 'he-IL',
    'hin': 'hi-IN', 'ind': 'id-ID', 'ita': 'it-IT', 'jpn': 'ja-JP',
    'kan': 'kn-IN', 'kor': 'ko-KR', 'lit': 'lt-LT', 'zsm': 'ms-MY',
    'msa': 'ms-MY', 'mal': 'ml-IN', 'mar': 'mr-IN', 'nep': 'ne-IN',
    'nor': 'no-NO', 'ori': 'or-IN', 'fas': 'fa-IR', 'por': 'pt-BR',
    'pan': 'pa-IN', 'ron': 'ro-RO', 'rus': 'ru-RU', 'san': 'sa-IN',
    'srp': 'sr-RS', 'slk': 'sk-SK', 'slv': 'sl-SI', 'spa': 'es-ES',
    'swe': 'sv-SE', 'tam': 'ta-IN', 'tel': 'te-IN', 'tha': 'th-TH',
    'tur': 'tr-TR', 'ukr': 'uk-UA', 'urd': 'ur-IN', 'vie': 'vi-VN'
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
    'sv-SE': 'sv', 'sa-IN': 'sa', 'ta-IN': 'ta', 'te-IN': 'te',
    'th-TH': 'th', 'tr-TR': 'tr', 'uk-UA': 'uk', 'ur-IN': 'ur', 'vi-VN': 'vi'
  };

  // Enhanced common words dictionary with better coverage
  private static commonWords: Record<string, string[]> = {
    en: ['the','and','to','of','in','is','that','it','for','on','with','as','was','be','by','this','are','from','at','but','not','or','if','so','we','you','he','she','they','an','my','your','his','her','its','our','their','all','any','some','one','more','most','other','what','who','when','where','why','how','which','do','does','did','have','has','had','will','would','can','could','should','may','might','must','get','go','make','know','see','say','think','look','come','want','use','find','give','tell','work','call','try','ask','need','feel','become','leave','put','mean','keep','let','begin','seem','help','talk','turn','start','show','hear','play','run','move','like','live','believe','hold','bring','happen','write','provide','sit','stand','lose','pay','meet','include','continue','set','learn','change','lead','understand','watch','follow','stop','create','speak','read','allow','add','spend','grow','open','walk','win','offer','remember','love','consider','appear','buy','wait','serve','die','send','expect','build','stay','fall','cut','reach','kill','remain'],

    hi: ['है','और','का','के','में','से','यह','तो','पर','एक','भी','था','थे','हूँ','हैं','कि','को','नहीं','जो','लिए','मैं','वह','इस','एक','उस','ने','हो','गया','कर','दिया','करने','कोई','क्या','किया','हुए','अपने','जब','तब','कुछ','बाद','बहुत','फिर','हुई','दो','वे','थे','तक','सबसे','पहले','बीच','कहना','बात','समय','काम','लोग','दिन','साल','घर','हाथ','आँख','मुँह','सिर','जगह','पानी','आग','हवा','धरती','आकाश','सूरज','चाँद','रात','सुबह','शाम','आज','कल','परसों','यहाँ','वहाँ','कहाँ','कैसे','क्यों','कौन','किस','जिस','उसका','उसकी','उनके','मेरे','तेरा','तुम्हारा','हमारा','इसका','इसकी','इनके','आपका','आपकी','आपके'],

    mr: ['आहे','आणि','कि','मध्ये','तो','तरी','या','त्या','होता','होत','ही','आहेत','करतो','करते','एक','मी','तू','आम्ही','तुम्ही','ते','ती','हे','ही','जो','जी','जे','का','कसे','कोण','काय','केव्हा','कुठे','काही','सर्व','खूप','जास्त','कमी','चांगले','वाईट','मोठे','लहान','नवीन','जुने','आज','उद्या','काल','परवा','येथे','तेथे','इकडे','तिकडे','वर','खाली','आत','बाहेर','समोर','मागे','जवळ','दूर','सोबत','शिवाय','आता','नंतर','आधी','पुन्हा','फक्त','अगदी','म्हणून','कारण','परंतु','किंवा','नाही','हो','ये','जा','कर','सांग','बोल','बघ','ऐक','लिहि','वाच','घे','दे','थांब','चाल','बस','उठ','झोप','खा','पी','शिक','विसर','आठव','समज','विचार'],

    sa: ['अस्ति','च','कि','तत्','एवं','मम','त्वम्','अहम्','स','सः','सा','एते','एताः','एषः','एषा','यत्','इदम्','अदस्','किम्','कः','का','सर्वे','सर्वाः','एकः','एका','द्वौ','द्वे','त्रयः','त्रिः','चतुरः','चतुराः','पञ्च','षट्','षष्','सप्त','अष्ट','नव','दश','शत','सहस्र','अत्र','तत्र','यत्र','कुत्र','इदानीम्','तदा','यदा','कदा','सर्वदा','एव','हि','वा','न','मा','खलु','अपि','तु','परन्तु','यदि','चेत्','यद्यपि','तथापि','यथा','तथा','इव','सह','विना','प्रति','अनु','अधि','उप','आ','परा','परि','प्र','सम्','गम्','भू','अस्','कृ','ज्ञा','दृश्','पठ्','लिख्','वद्','श्रु','दा','पा','स्था','इष्','पत्','नश्','जीव्','मृ','हस्','रुद्','नृत्','खाद्','चल्','धाव्','रक्ष्','जि','नी','हृ','चिन्त्','कथ्','नाम','धर्म','कर्म','लोक','देव','पुत्र','भवति','भवन्ति','आसीत्','आसन्','भविष्यति','भविष्यन्ति','करोति','करोमि','करोषि'],

    gu: ['છે','અને','કે','ના','માં','હું','તમને','તેનું','તે','હો','કરવું','આ છે','એક','અમે','તમે','તેઓ','આ','તે','શું','કોણ','ક્યાં','ક્યારે','કેમ','કેવી રીતે','કંઈક','બધા','ઘણું','વધુ','ઓછું','સારું','ખરાબ','મોટું','નાનું','નવું','જૂનું','આજે','કાલે','ગઈકાલે','અહીં','ત્યાં','ઉપર','નીચે','અંદર','બહાર','આગળ','પાછળ','પાસે','દૂર','સાથે','વગર','હવે','પછી','પહેલાં','ફરીથી','માત્ર','માટે','કારણ કે','પરંતુ','અથવા','નથી','હા','આવો','જાઓ','કરો','કહો','બોલો','જુઓ','સાંભળો','લખો','વાંચો','લો','આપો','ઊભા રહો','ચાલો','બેસો','ઊઠો','સૂઈ જાઓ','ખાઓ','પીઓ','શીખો','ભૂલી જાઓ','યાદ રાખો','સમજો','વિચારો'],

    bn: ['হয়','এবং','এই','কিন্তু','আমি','সে','একটি','এইখানে','তাকে','হিসাবে','ও','আর','জন্য','থেকে','মধ্যে','করে','তার','তারা','ছিল','আছে','হবে','কি','কে','কোথায়','কখন','কেন','কিভাবে','কিছু','সব','অনেক','আরও','কম','ভাল','খারাপ','বড়','ছোট','নতুন','পুরাতন','আজ','কাল','গতকাল','এখানে','সেখানে','উপরে','নীচে','ভিতরে','বাইরে','সামনে','পিছনে','কাছে','দূরে','সঙ্গে','ছাড়া','এখন','পরে','আগে','আবার','শুধু','কারণ','অথবা','না','হ্যাঁ','আসা','যাওয়া','করা','বলা','দেখা','শোনা','লেখা','পড়া','নেওয়া','দেওয়া','থাকা','চলা','বসা','ওঠা','ঘুমানো','খাওয়া','পান করা','শেখা','ভোলা','মনে রাখা','বোঝা','ভাবা'],

    ur: ['ہے','اور','یہ','میں','کے','سے','وہ','کیا','ہیں','ہو','نے','کرتا','کی','کو','نہیں','جو','لئے','میں','وہ','اس','ایک','اس','نے','ہو','گیا','کر','دیا','کرنے','کوئی','کیا','کیا','ہوئے','اپنے','اپنے','جب','تب','کچھ','بعد','بہت','پھر','ہوئی','دو','وہ','تھے','تک','سب','سے','پہلے','درمیان','کہنا','بات','وقت','کام','لوگ','دن','سال','گھر','ہاتھ','آنکھ','منہ','سر','جگہ','پانی','آگ','ہوا','زمین','آسمان','سورج','چاند','رات','صبح','شام','آج','کل','پرسوں','یہاں','وہاں','کہاں','کیسے','کیوں','کون','کس','جس','اسکا','اسکی','انکے','میرے','تیرا','تمہارا','ہمارا','اسکا','اسکی','انکے','آپکا','آپکی','آپکے'],

    ar: ['و','في','من','على','هذا','هو','كان','أن','عن','لم','إلى','لا','ما','كل','ذلك','هي','قد','بعد','بعض','أو','يكون','قال','غير','نحن','أنا','أنت','هم','هي','هذه','كيف','متى','أين','لماذا','من','ماذا','شيء','كثير','أكثر','أقل','جيد','سيء','كبير','صغير','جديد','قديم','اليوم','غدا','أمس','هنا','هناك','فوق','تحت','داخل','خارج','أمام','خلف','قرب','بعيد','مع','بدون','الآن','بعد','قبل','مرة أخرى','فقط','لأن','لكن','نعم','يأتي','يذهب','يفعل','يقول','يرى','يسمع','يكتب','يقرأ','يأخذ','يعطي','يبقى','يمشي','يجلس','يقوم','ينام','يأكل','يشرب','يتعلم','ينسى','يتذكر','يفهم','يفكر','xin','chào','cảm','ơn'],

    // Add more languages with proper common words
    fr: ['de','la','le','et','à','est','en','je','un','pour','que','qui','il','elle','ne','pas','sur','se','plus','avec','nous','vous','ils','elles','son','sa','ses','mon','ma','mes','ton','ta','tes','notre','votre','leur','leurs','tout','rien','autre','même','aussi','bien','mal','grand','petit','nouveau','vieux','aujourd\'hui','demain','hier','ici','là','dessus','dessous','dedans','dehors','devant','derrière','près','loin','sans','maintenant','après','avant','encore','seulement','parce que','mais','ou','non','oui','venir','aller','faire','dire','voir','entendre','écrire','lire','prendre','donner','rester','marcher','s\'asseoir','se lever','dormir','manger','boire','apprendre','oublier','se souvenir','comprendre','penser'],

    es: ['de','la','el','y','en','a','que','es','del','se','no','lo','los','las','un','una','unos','unas','por','con','para','su','sus','mi','mis','tu','tus','nuestro','vuestro','él','ella','ellos','ellas','nosotros','vosotros','este','ese','aquel','esto','eso','aquello','todo','nada','algo','mucho','poco','otro','nuevo','viejo','bueno','malo','grande','pequeño','hoy','mañana','ayer','aquí','allí','arriba','abajo','dentro','fuera','delante','detrás','cerca','lejos','con','sin','ahora','después','antes','otra vez','solo','porque','pero','o','sí','venir','ir','hacer','decir','ver','oír','escribir','leer','tomar','dar','quedarse','caminar','sentarse','levantarse','dormir','comer','beber','aprender','olvidar','recordar','entender','pensar'],

    de: ['der','die','das','und','in','ich','zu','den','von','mit','er','sie','es','nicht','ein','eine','sind','hat','auf','für','sich','auch','als','an','nach','wie','im','wir','was','wird','sein','haben','werden','hier','dort','oben','unten','innen','außen','vor','hinter','nah','fern','mit','ohne','jetzt','danach','davor','wieder','nur','weil','aber','oder','ja','nein','kommen','gehen','machen','sagen','sehen','hören','schreiben','lesen','nehmen','geben','bleiben','gehen','sitzen','stehen','schlafen','essen','trinken','lernen','vergessen','erinnern','verstehen','denken'],

    // Add remaining languages with their common words
    it: ['di','e','che','la','il','per','un','con','essere','a','in','non','si','da','mi','ti','ci','vi','lo','gli','le','questo','quello','tutto','niente','qualcosa','molto','poco','altro','nuovo','vecchio','buono','cattivo','grande','piccolo','oggi','domani','ieri','qui','lì','sopra','sotto','dentro','fuori','davanti','dietro','vicino','lontano','senza','adesso','dopo','prima','ancora','solo','perché','ma','o','sì','no','venire','andare','fare','dire','vedere','sentire','scrivere','leggere','prendere','dare','stare','camminare','sedersi','alzarsi','dormire','mangiare','bere','imparare','dimenticare','ricordare','capire','pensare'],

    ru: ['и','в','на','что','это','он','с','как','быть','за','по','от','для','не','я','мы','ты','вы','они','она','оно','мой','твой','наш','ваш','его','её','их','этот','тот','весь','всё','ничего','что-то','много','мало','другой','новый','старый','хороший','плохой','большой','маленький','сегодня','завтра','вчера','здесь','там','вверху','внизу','внутри','снаружи','впереди','сзади','близко','далеко','с','без','сейчас','потом','до','снова','только','потому что','но','или','да','нет','приходить','идти','делать','говорить','видеть','слышать','писать','читать','брать','давать','оставаться','ходить','сидеть','стоять','спать','есть','пить','учить','забывать','помнить','понимать','думать'],

    pt: ['de','que','em','para','com','uma','ele','é','se','do','na','os','das','não','um','eu','nós','você','vocês','eles','elas','ela','meu','teu','nosso','vosso','seu','deles','delas','este','esse','aquele','tudo','nada','algo','muito','pouco','outro','novo','velho','bom','mau','grande','pequeno','hoje','amanhã','ontem','aqui','ali','acima','abaixo','dentro','fora','em frente','atrás','perto','longe','com','sem','agora','depois','antes','de novo','só','porque','mas','ou','sim','não','vir','ir','fazer','dizer','ver','ouvir','escrever','ler','pegar','dar','ficar','andar','sentar','levantar','dormir','comer','beber','aprender','esquecer','lembrar','entender','pensar'],

    ja: ['これ','それ','です','に','を','の','と','が','は','私','あなた','彼','彼女','私たち','あなたたち','彼ら','彼女ら','この','その','あの','すべて','何もない','何か','たくさん','少し','他の','新しい','古い','良い','悪い','大きい','小さい','今日','明日','昨日','ここ','そこ','あそこ','上','下','中','外','前','後ろ','近く','遠く','と','なし','今','後','前','再び','だけ','なぜなら','しかし','または','はい','いいえ','来る','行く','する','言う','見る','聞く','書く','読む','取る','与える','いる','歩く','座る','立つ','寝る','食べる','飲む','学ぶ','忘れる','覚える','理解する','思う'],

    ko: ['그리고','이','그','저','은','는','이것','있다','있어요','있습니다','합니다','아니','나','우리','너','너희','그','그녀','그들','이','그','저','모든','아무것도','무언가','많이','조금','다른','새로운','오래된','좋은','나쁜','큰','작은','오늘','내일','어제','여기','거기','저기','위','아래','안','밖','앞','뒤','가까이','멀리','와','없이','지금','후에','전에','다시','만','왜냐하면','그러나','또는','네','아니요','오다','가다','하다','말하다','보다','듣다','쓰다','읽다','가지다','주다','머무르다','걷다','앉다','서다','자다','먹다','마시다','배우다','잊다','기억하다','이해하다','생각하다'],

    zh: ['的','是','我','在','有','了','你','他','这','我们','不','人','和','也','还','就','都','能','要','想','会','可以','没有','一个','什么','谁','哪里','什么时候','为什么','怎么样','一些','所有','很多','更','少','好','坏','大','小','新','旧','今天','明天','昨天','这里','那里','上面','下面','里面','外面','前面','后面','附近','远','一起','没有','现在','以后','以前','再','只','因为','但是','或者','不是','是的','来','去','做','说','看','听','写','读','拿','给','在','走','坐','站','睡觉','吃','喝','学习','忘记','记得','明白','想'],

    ta: ['மற்றும்','ஒரு','இது','அது','என்று','நான்','நீ','இங்கு','இவர்','அவர்கள்','ஆம்','இல்லை','அவன்','அவள்','அவை','இந்த','அந்த','எல்லா','ஒன்றும் இல்லை','ஏதாவது','நிறைய','கொஞ்சம்','வேறு','புதிய','பழைய','நல்ல','கெட்ட','பெரிய','சிறிய','இன்று','நாளை','நேற்று','இங்கே','அங்கே','மேலே','கீழே','உள்ளே','வெளியே','முன்னால்','பின்னால்','அருகில்','தூரத்தில்','உடன்','இல்லாமல்','இப்போது','பிறகு','முன்பு','மீண்டும்','மட்டும்','ஏனென்றால்','ஆனால்','அல்லது','ஆமாம்','இல்லை','வா','போ','செய்','சொல்','பார்','கேள்','எழுது','படி','எடு','கொடு','இரு','நட','உட்கார்','நில்','தூங்கு','சாப்பிடு','குடி','படி','மற','நினைவில் கொள்','புரிந்துகொள்','நினை'],

    te: ['మరియు','ఒక','ఈ','అది','నాకు','నువ్వు','ఇది','అక్కడ','వారు','అవును','కాదు','అతను','ఆమె','వారు','ఈ','ఆ','అన్నీ','ఏమీ లేదు','ఏదో','చాలా','కొంచెం','వేరే','కొత్త','పాత','మంచి','చెడ్డ','పెద్ద','చిన్న','ఈ రోజు','రేపు','నిన్న','ఇక్కడ','అక్కడ','పైన','క్రింద','లోపల','బయట','ముందు','వెనుక','దగ్గర','దూరంగా','తో','లేకుండా','ఇప్పుడు','తర్వాత','ముందు','మళ్ళీ','మాత్రమే','ఎందుకంటే','కానీ','లేదా','అవును','కాదు','రా','వెళ్ళు','చెయ్యి','చెప్పు','చూడు','విను','వ్రాయి','చదువు','తీసుకో','ఇవ్వు','ఉండు','నడువు','కూర్చో','నిలబడు','నిద్రపో','తిను','త్రాగు','నేర్చుకో','మర్చిపో','గుర్తుంచుకో','అర్థం చేసుకో','ఆలోచించు'],

    ml: ['എന്നും','ഒരു','ഇത്','ആണ്','അവൻ','ഞാൻ','ഇവൻ','അവൾ','അവർ','അതെ','ഇല്ല','അവൻ','അവൾ','അവർ','ഈ','ആ','എല്ലാം','ഒന്നുമില്ല','എന്തെങ്കിലും','ധാരാളം','കുറച്ച്','മറ്റൊന്ന്','പുതിയ','പഴയ','നല്ല','ചീത്ത','വലിയ','ചെറിയ','ഇന്ന്','നാളെ','ഇന്നലെ','ഇവിടെ','അവിടെ','മുകളിൽ','താഴെ','അകത്ത്','പുറത്ത്','മുന്നിൽ','പിന്നിൽ','അടുത്ത്','ദൂരെ','കൂടെ','ഇല്ലാതെ','ഇപ്പോൾ','ശേഷം','മുമ്പ്','വീണ്ടും','മാത്രം','കാരണം','പക്ഷേ','അല്ലെങ്കിൽ','അതെ','ഇല്ല','വരൂ','പോവുക','ചെയ്യുക','പറയുക','കാണുക','കേൾക്കുക','എഴുതുക','വായിക്കുക','എടുക്കുക','കൊടുക്കുക','നിൽക്കുക','നടക്കുക','ഇരിക്കുക','നിൽക്കുക','ഉറങ്ങുക','കഴിക്കുക','കുടിക്കുക','പഠിക്കുക','മറക്കുക','ഓർമ്മിക്കുക','മനസ്സിലാക്കുക','ചിന്തിക്കുക'],

    kn: ['ಮತ್ತು','ಒಂದು','ಈ','ಅದು','ನಾನು','ನೀನು','ಇದು','ಅವರು','ಅವನು','ಹೌದು','ಇಲ್ಲ','ಅವನು','ಅವಳು','ಅವರು','ಈ','ಆ','ಎಲ್ಲ','ಏನೂ ಇಲ್ಲ','ಏನಾದರೂ','ಬಹಳ','ಸ್ವಲ್ಪ','ಬೇರೆ','ಹೊಸ','ಹಳೆಯ','ಒಳ್ಳೆಯ','ಕೆಟ್ಟ','ದೊಡ್ಡ','ಸಣ್ಣ','ಇಂದು','ನಾಳೆ','ನಿನ್ನೆ','ಇಲ್ಲಿ','ಅಲ್ಲಿ','ಮೇಲೆ','ಕೆಳಗೆ','ಒಳಗೆ','ಹೊರಗೆ','ಮುಂದೆ','ಹಿಂದೆ','ಹತ್ತಿರ','ದೂರ','ಜೊತೆ','ಇಲ್ಲದೆ','ಈಗ','ನಂತರ','ಮೊದಲು','ಮತ್ತೆ','ಮಾತ್ರ','ಏಕೆಂದರೆ','ಆದರೆ','ಅಥವಾ','ಹೌದು','ಇಲ್ಲ','ಬನ್ನಿ','ಹೋಗು','ಮಾಡು','ಹೇಳು','ನೋಡು','ಕೇಳು','ಬರೆ','ಓದು','ತೆಗೆದುಕೋ','ಕೊಡು','ಇರು','ನಡಿ','ಕುಳಿತುಕೋ','ನಿಲ್ಲು','ಮಲಗು','ತಿನ್ನು','ಕುಡಿ','ಕಲಿ','ಮರೆತುಬಿಡು','ನೆನಪಿಟ್ಟುಕೊ','ಅರ್ಥಮಾಡಿಕೊ','ಯೋಚಿಸು'],

    pa: ['ਤੇ','ਇਹ','ਹੈ','ਅਤੇ','ਉਹ','ਮੈਂ','ਤੁਸੀਂ','ਇਸ','ਨੂੰ','ਇੱਕ','ਹਾਂ','ਨਹੀਂ','ਉਹ','ਉਹ','ਉਹ','ਇਹ','ਉਹ','ਸਾਰੇ','ਕੁਝ ਨਹੀਂ','ਕੁਝ','ਬਹੁਤ','ਥੋੜਾ','ਹੋਰ','ਨਵਾਂ','ਪੁਰਾਣਾ','ਚੰਗਾ','ਬੁਰਾ','ਵੱਡਾ','ਛੋਟਾ','ਅੱਜ','ਕੱਲ੍ਹ','ਕੱਲ੍ਹ','ਇੱਥੇ','ਉੱਥੇ','ਉੱਪਰ','ਹੇਠਾਂ','ਅੰਦਰ','ਬਾਹਰ','ਅੱਗੇ','ਪਿੱਛੇ','ਨੇੜੇ','ਦੂਰ','ਨਾਲ','ਬਿਨਾਂ','ਹੁਣ','ਬਾਅਦ','ਪਹਿਲਾਂ','ਦੁਬਾਰਾ','ਸਿਰਫ','ਕਿਉਂਕਿ','ਪਰ','ਜਾਂ','ਹਾਂ','ਨਹੀਂ','ਆਓ','ਜਾਓ','ਕਰੋ','ਕਹੋ','ਦੇਖੋ','ਸੁਣੋ','ਲਿਖੋ','ਪੜ੍ਹੋ','ਲਵੋ','ਦੇਵੋ','ਰਹੋ','ਚੱਲੋ','ਬੈਠੋ','ਖੜ੍ਹੇ ਹੋਵੋ','ਸੌਂਵੋ','ਖਾਓ','ਪੀਓ','ਸਿੱਖੋ','ਭੁੱਲ ਜਾਓ','ਯਾਦ ਰੱਖੋ','ਸਮਝੋ','ਸੋਚੋ'],

    ne: ['राम्रो','छ','म','तपाईं','यो','हुन्छ','हामी','छैन','संग','भएको','हो','होइन','उ','उनी','उनीहरू','यो','त्यो','सबै','केहि छैन','केहि','धेरै','थोरै','अर्को','नयाँ','पुरानो','राम्रो','नराम्रो','ठूलो','सानो','आज','भोलि','हिजो','यहाँ','त्यहाँ','माथि','तल','भित्र','बाहिर','अगाडि','पछाडि','नजिक','टाढा','सँग','बिना','अहिले','पछि','पहिले','फेरि','मात्र','किनकि','तर','वा','हो','होइन','आउनुहोस्','जानुहोस्','गर्नुहोस्','भन्नुहोस्','हेर्नुहोस्','सुन्नुहोस्','लेख्नुहोस्','पढ्नुहोस्','लिनुहोस्','दिनुहोस्','रहनुहोस्','हिड्नुहोस्','बस्नुहोस्','उठ्नुहोस्','सुत्नुहोस्','खानुहोस्','पिउनुहोस्','सिक्नुहोस्','बिर्सनुहोस्','सम्झनुहोस्','बुझ्नुहोस्','सोच्नुहोस्'],

    or: ['ଏବଂ','ଏହା','ତୁମେ','ମୋତେ','ହେଉଛି','ମୁଁ','ସେ','ଏକ','ହଁ','ନା','ସେ','ସେ','ସେମାନେ','ଏହି','ସେହି','ସବୁ','କିଛି ନୁହେଁ','କିଛି','ବହୁତ','ଅଳ୍ପ','ଅନ୍ୟ','ନୂଆ','ପୁରୁଣା','ଭଲ','ଖରାପ','ବଡ','ଛୋଟ','ଆଜି','କାଲି','ଗତକାଲି','ଏଠାରେ','ସେଠାରେ','ଉପରେ','ତଳେ','ଭିତରେ','ବାହାରେ','ଆଗରେ','ପଛରେ','ପାଖରେ','ଦୂରରେ','ସହିତ','ବିନା','ଏବେ','ପରେ','ପୂର୍ବରୁ','ପୁଣି','କେବଳ','କାରଣ','କିନ୍ତୁ','ବା','ହଁ','ନା','ଆସ','ଯାଅ','କର','କହ','ଦେଖ','ଶୁଣ','ଲେଖ','ପଢ','ନିଅ','ଦିଅ','ରୁହ','ଚାଲ','ବସ','ଉଠ','ଶୋଇପଡ','ଖାଅ','ପିଅ','ଶିଖ','ଭୁଲିଯାଅ','ମନେରଖ','ବୁଝ','ଭାବ'],

    th: ['และ','ใน','ของ','ที่','เป็น','ฉัน','เขา','เรา','คุณ','มี','ใช่','ไม่','เขา','เธอ','พวกเขา','นี้','นั้น','ทั้งหมด','ไม่มีอะไร','บางสิ่ง','มาก','น้อย','อื่น','ใหม่','เก่า','ดี','ไม่ดี','ใหญ่','เล็ก','วันนี้','พรุ่งนี้','เมื่อวาน','ที่นี่','ที่นั่น','ข้างบน','ข้างล่าง','ข้างใน','ข้างนอก','ข้างหน้า','ข้างหลัง','ใกล้','ไกล','กับ','โดยไม่มี','ตอนนี้','หลังจาก','ก่อน','อีกครั้ง','เท่านั้น','เพราะ','แต่','หรือ','ใช่','ไม่','มา','ไป','ทำ','พูด','ดู','ฟัง','เขียน','อ่าน','เอา','ให้','อยู่','เดิน','นั่ง','ยืน','นอน','กิน','ดื่ม','เรียน','ลืม','จำ','เข้าใจ','คิด'],

    id: ['dan','yang','untuk','dengan','ini','itu','saya','adalah','di','dari','ya','tidak','dia','mereka','ini','itu','semua','tidak ada','sesuatu','banyak','sedikit','lain','baru','lama','baik','buruk','besar','kecil','hari ini','besok','kemarin','di sini','di sana','di atas','di bawah','di dalam','di luar','di depan','di belakang','dekat','jauh','dengan','tanpa','sekarang','setelah','sebelum','lagi','hanya','karena','tapi','atau','ya','tidak','datang','pergi','melakukan','mengatakan','melihat','mendengar','menulis','membaca','mengambil','memberi','tinggal','berjalan','duduk','berdiri','tidur','makan','minum','belajar','lupa','ingat','mengerti','berpikir'],

    ms: ['dan','yang','untuk','dengan','ini','ialah','adalah','di','dari','ya','tidak','dia','mereka','ini','itu','semua','tiada','sesuatu','banyak','sedikit','lain','baru','lama','baik','buruk','besar','kecil','hari ini','esok','semalam','di sini','di sana','di atas','di bawah','di dalam','di luar','di hadapan','di belakang','dekat','jauh','dengan','tanpa','sekarang','selepas','sebelum','lagi','sahaja','kerana','tetapi','atau','ya','tidak','datang','pergi','buat','cakap','lihat','dengar','tulis','baca','ambil','beri','tinggal','jalan','duduk','berdiri','tidur','makan','minum','belajar','lupa','ingat','faham','fikir'],

    fa: ['و','در','به','از','این','او','است','که','را','با','بله','نه','او','آنها','این','آن','همه','هیچ','چیزی','بسیار','کم','دیگر','جدید','قدیمی','خوب','بد','بزرگ','کوچک','امروز','فردا','دیروز','اینجا','آنجا','بالا','پایین','داخل','بیرون','جلو','پشت','نزدیک','دور','با','بدون','اکنون','بعد','قبل','دوباره','فقط','زیرا','اما','یا','بله','نه','آمدن','رفتن','کردن','گفتن','دیدن','شنیدن','نوشتن','خواندن','گرفتن','دادن','ماندن','راه رفتن','نشستن','ایستادن','خوابیدن','خوردن','نوشیدن','یاد گرفتن','فراموش کردن','به یاد آوردن','فهمیدن','فکر کردن'],

    uk: ['і','в','на','що','це','він','з','як','бути','так','ні','він','вона','вони','цей','той','все','нічого','щось','багато','мало','інший','новий','старий','добрий','поганий','великий','маленький','сьогодні','завтра','вчора','тут','там','вгорі','внизу','всередині','зовні','попереду','позаду','близько','далеко','з','без','зараз','потім','до','знову','тільки','тому що','але','або','так','ні','приходити','йти','робити','говорити','бачити','чути','писати','читати','брати','давати','залишатися','ходити','сидіти','стояти','спати','їсти','пити','вчити','забувати','пам\'ятати','розуміти','думати'],

    tr: ['ve','bir','bu','o','için','ile','ben','sen','o','biz','siz','evet','hayır','o','onlar','bu','şu','o','tüm','hiçbir şey','bir şey','çok','az','diğer','yeni','eski','iyi','kötü','büyük','küçük','bugün','yarın','dün','burada','orada','yukarıda','aşağıda','içeride','dışarıda','önünde','arkasında','yakın','uzak','ile','olmadan','şimdi','sonra','önce','tekrar','sadece','çünkü','ama','veya','evet','hayır','gelmek','gitmek','yapmak','söylemek','görmek','duymak','yazmak','okumak','almak','vermek','kalmak','yürümek','oturmak','kalkmak','uyumak','yemek','içmek','öğrenmek','unutmak','hatırlamak','anlamak','düşünmek'],

    sr: ['и','је','да','у','на','са','сада','то','ово','је','да','не','он','она','они','овај','тај','сви','ништа','нешто','много','мало','други','нов','стар','добар','лош','велик','мали','данас','сутра','јуче','овде','тамо','горе','доле','унутра','напољу','испред','иза','близу','далеко','са','без','сада','после','пре','поново','само','зато што','али','или','да','не','доћи','ићи','радити','рећи','видети','чути','писати','читати','узети','дати','остати','ходати','седети','стајати','спавати','јести','пити','учити','заборавити','сећати се','разумети','мислити'],

    ro: ['și','în','la','pentru','cu','este','un','o','pe','care','da','nu','el','ea','ei','ele','acest','acel','tot','nimic','ceva','mult','puțin','alt','nou','vechi','bun','rău','mare','mic','astăzi','mâine','ieri','aici','acolo','sus','jos','înăuntru','afară','în față','în spate','aproape','departe','cu','fără','acum','după','înainte','din nou','doar','pentru că','dar','sau','da','nu','a veni','a merge','a face','a spune','a vedea','a auzi','a scrie','a citi','a lua','a da','a sta','a merge','a sta jos','a sta în picioare','a dormi','a mânca','a bea','a învăța','a uita','a-și aminti','a înțelege','a gândi'],

    sv: ['och','att','det','är','en','i','på','som','för','med','ja','nej','han','hon','de','den','det','denna','denne','detta','all','ingenting','något','mycket','lite','annan','ny','gammal','bra','dålig','stor','liten','idag','imorgon','igår','här','där','ovan','nedan','inne','ute','framför','bakom','nära','långt','med','utan','nu','efter','före','igen','bara','därför att','men','eller','ja','nej','komma','gå','göra','säga','se','höra','skriva','läsa','ta','ge','stanna','gå','sitta','stå','sova','äta','dricka','lära','glömma','komma ihåg','förstå','tänka'],

    sk: ['a','je','v','na','že','to','sa','s','do','k','od','u','za','áno','nie','on','ona','ono','oni','ony','tento','ten','všetko','nič','niečo','veľa','málo','iný','nový','starý','dobrý','zlý','veľký','malý','dnes','zajtra','včera','tu','tam','hore','dole','vnútri','vonku','pred','za','blízko','ďaleko','s','bez','teraz','potom','pred','znovu','len','pretože','ale','alebo','áno','nie','prísť','ísť','robiť','povedať','vidieť','počuť','písať','čítať','vziať','dať','zostať','chodiť','sedieť','stáť','spať','jesť','piť','učiť sa','zabudnúť','pamätať si','rozumieť','myslieť'],

    sl: ['in','je','da','na','v','za','se','s','do','k','od','ta','ja','ne','on','ona','ono','oni','one','ta','tisti','vse','nič','nekaj','veliko','malo','drug','nov','star','dober','slab','velik','majhen','danes','jutri','včeraj','tukaj','tam','zgoraj','spodaj','notri','zunaj','pred','za','blizu','daleč','z','brez','zdaj','potem','prej','spet','samo','ker','ampak','ali','ja','ne','priti','iti','delati','reči','videti','slišati','pisati','brati','vzeti','dati','ostati','hoditi','sedeti','stati','spati','jesti','piti','učiti se','pozabiti','spomniti se','razumeti','misliti'],

    bg: ['и','в','на','че','е','се','за','с','от','по','не','той','тя','те','да','не','той','тя','то','те','този','онзи','всичко','нищо','нещо','много','малко','друг','нов','стар','добър','лош','голям','малък','днес','утре','вчера','тук','там','горе','долу','вътре','навън','пред','зад','близо','далеч','с','без','сега','след','преди','отново','само','защото','но','или','да','не','идвам','отивам','правя','казвам','виждам','чувам','пиша','чета','вземам','давам','оставам','ходя','седя','стоя','спя','ям','пия','уча','забравям','помня','разбирам','мисля'],

    he: ['ו','של','את','על','זה','הוא','היא','אני','אתה','יש','אין','מה','מי','כן','לא','הם','הן','ההוא','הכל','כלום','משהו','הרבה','מעט','אחר','חדש','ישן','טוב','רע','גדול','קטן','היום','מחר','אתמול','כאן','שם','למעלה','למטה','בפנים','בחוץ','לפני','מאחורי','קרוב','רחוק','עם','בלי','עכשיו','אחר כך','שוב','רק','כי','אבל','או','לבוא','ללכת','לעשות','לומר','לראות','לשמוע','לכתוב','לקרוא','לקחת','לתת','להישאר','לשבת','לעמוד','לישון','לאכול','לשתות','ללמוד','לשכוח','לזכור','להבין','לחשוב'],

    as: ['আৰু','এটা','হয়','মই','তুমি','তেওঁ','আমি','তোমালোক','তেওঁলোক','এই','সেই','কি','কোনে','ক\'ত','কেতিয়া','কিয়','কেনেকৈ','কিছু','সকলো','বহুত','অধিক','কম','ভাল','বেয়া','ডাঙৰ','সৰু','নতুন','পুৰণি','আজি','কালি','যোৱাকালি','ইয়াত','তাত','ওপৰত','তলত','ভিতৰত','বাহিৰত','সন্মুখত','পিছফালে','ওচৰত','দূৰত','লগত','অবিহনে','এতিয়া','পিছত','আগতে','পুনৰ','কেৱল','কাৰণ','কিন্তু','বা','হয়','নহয়','আহ','যা','কৰ','ক','চা','শুন','লিখ','পঢ়','ল','দে','থাক','খোজ','কাঢ়','বহ','উঠ','শো','খা','পি','শিক','পাহৰ','মনত','ৰাখ','বুজ','ভাব'],

    hr: ['i','je','da','u','na','s','za','od','do','se','ne','ja','ti','on','ona','ono','mi','vi','oni','one','ovaj','taj','sve','ništa','nešto','puno','malo','drugi','novi','stari','dobar','loš','velik','mali','danas','sutra','jučer','ovdje','tamo','gore','dolje','unutra','vani','ispred','iza','blizu','daleko','bez','sada','poslije','prije','opet','samo','zato','ali','ili','doći','ići','raditi','reći','vidjeti','čuti','pisati','čitati','uzeti','dati','ostati','hodati','sjediti','stajati','spavati','jesti','piti','učiti','zaboraviti','sjetiti','razumjeti','misliti'],

    cs: ['a','je','v','na','že','to','se','s','do','k','od','u','za','tak','ale','jako','pro','jsem','jsi','jsme','jste','jsou','být','mít','já','ty','on','ona','ono','my','vy','oni','ony','tento','ten','všechno','nic','něco','hodně','málo','jiný','nový','starý','dobrý','špatný','velký','malý','dnes','zítra','včera','tady','tam','nahoře','dole','uvnitř','venku','před','za','blízko','daleko','bez','teď','potom','předtím','znovu','jen','protože','nebo','ano','ne','přijít','jít','dělat','říci','vidět','slyšet','psát','číst','vzít','dát','zůstat','chodit','sedět','stát','spát','jíst','pít','učit','zapomenout','pamatovat','rozumět','myslet'],

    da: ['og','i','er','at','på','en','det','til','af','for','ikke','jeg','du','han','hun','den','vi','de','denne','dette','alle','intet','noget','meget','lidt','anden','ny','gammel','god','dårlig','stor','lille','dag','morgen','går','her','der','op','ned','inde','ude','foran','bag','nær','langt','med','uden','nu','efter','før','igen','kun','fordi','men','eller','ja','nej','komme','gå','gøre','sige','se','høre','skrive','læse','tage','give','blive','sidde','stå','sove','spise','drikke','lære','glemme','huske','forstå','tænke'],

    nl: ['en','van','is','in','een','de','het','dat','op','te','niet','ik','jij','hij','zij','we','jullie','ze','deze','dit','alles','niets','iets','veel','weinig','andere','nieuw','oud','goed','slecht','groot','klein','vandaag','morgen','gisteren','hier','daar','boven','beneden','binnen','buiten','voor','achter','dichtbij','ver','met','zonder','nu','na','weer','alleen','omdat','maar','of','ja','nee','komen','gaan','doen','zeggen','zien','horen','schrijven','lezen','nemen','geven','blijven','lopen','zitten','staan','slapen','eten','drinken','leren','vergeten','onthouden','begrijpen','denken'],

    fi: ['ja','on','ei','että','se','joka','kanssa','mutta','myös','kuin','ovat','oli','ole','vain','hän','minä','sinä','me','te','he','tämä','tuo','kaikki','mitään','jotain','paljon','vähän','toinen','uusi','vanha','hyvä','huono','suuri','pieni','tänään','huomenna','eilen','täällä','siellä','ylhäällä','alhaalla','sisällä','ulkona','edessä','takana','lähellä','kaukana','ilman','nyt','jälkeen','ennen','uudelleen','koska','tai','kyllä','tulla','mennä','tehdä','sanoa','nähdä','kuulla','kirjoittaa','lukea','ottaa','antaa','jäädä','kävellä','istua','seisoa','nukkua','syödä','juoda','oppia','unohtaa','muistaa','ymmärtää','ajatella'],

    el: ['και','είναι','δεν','που','το','η','ο','ένα','για','με','ναι','όχι','αυτός','αυτή','αυτό','εμείς','εσείς','αυτοί','αυτές','αυτά','εκείνος','όλα','τίποτα','κάτι','πολύ','λίγο','άλλος','νέος','παλιός','καλός','κακός','μεγάλος','μικρός','σήμερα','αύριο','χθες','εδώ','εκεί','πάνω','κάτω','μέσα','έξω','μπροστά','πίσω','κοντά','μακριά','χωρίς','τώρα','μετά','πριν','πάλι','μόνο','γιατί','αλλά','ή','έρχομαι','πηγαίνω','κάνω','λέω','βλέπω','ακούω','γράφω','διαβάζω','παίρνω','δίνω','μένω','περπατάω','κάθομαι','στέκομαι','κοιμάμαι','τρώω','πίνω','μαθαίνω','ξεχνάω','θυμάμαι','καταλαβαίνω','σκέφτομαι'],

    lt: ['ir','yra','ne','kad','su','bet','taip','kaip','iš','į','jis','ji','jie','jos','šis','tas','viskas','nieko','kažkas','daug','mažai','kitas','naujas','senas','geras','blogas','didelis','mažas','šiandien','rytoj','vakar','čia','ten','aukštyn','žemyn','viduje','lauke','priešais','už','arti','toli','be','dabar','po','prieš','vėl','tik','nes','arba','ateiti','eiti','daryti','sakyti','matyti','girdėti','rašyti','skaityti','imti','duoti','likti','vaikščioti','sėdėti','stovėti','miegoti','valgyti','gerti','mokytis','pamiršti','prisiminti','suprasti','galvoti'],

    no: ['og','er','i','på','en','et','det','som','til','av','ikke','jeg','du','han','hun','den','vi','dere','de','denne','dette','all','ingenting','noe','mye','lite','annen','ny','gammel','god','dårlig','stor','liten','dag','morgen','går','her','der','opp','ned','inne','ute','foran','bak','nær','langt','med','uten','nå','etter','før','igjen','bare','fordi','men','eller','ja','nei','komme','gå','gjøre','si','se','høre','skrive','lese','ta','gi','bli','sitte','stå','sove','spise','drikke','lære','glemme','huske','forstå','tenke'],

    vi: ['và','là','của','trong','có','một','tôi','bạn','anh','chị','em','chúng','tôi','họ','nó','cái','này','đó','tất','cả','không','gì','nhiều','ít','khác','mới','cũ','tốt','xấu','lớn','nhỏ','hôm','nay','ngày','mai','qua','ở','đây','đó','trên','dưới','bên','ngoài','phía','trước','sau','gần','xa','với','bây','giờ','sau','trước','lần','nữa','chỉ','bởi','vì','nhưng','hoặc','đến','đi','làm','nói','thấy','nghe','viết','đọc','lấy','cho','đi','bộ','ngồi','đứng','ngủ','ăn','uống','học','quên','nhớ','hiểu','nghĩ'],
  };

  public static detectSourceLanguage(text: string): DetectedLanguageResult {
    // First try common words detection (more reliable for Sanskrit and Indic languages)
    const commonWordsResult = this.detectByCommonWords(text);
    if (commonWordsResult.language && commonWordsResult.score >= 3) {
      console.log(`Detected by common words: ${commonWordsResult.language} with score ${commonWordsResult.score}`);
      return { language: commonWordsResult.language, confidence: 0.9, isFallback: false };
    }

    // Then try franc detection
    const francResult = this.detectWithFranc(text);
    if (francResult) {
      console.log(`Detected by franc: ${francResult}`);
      return { language: francResult, confidence: 0.7, isFallback: false };
    }

    // If common words found something but with low score, use it as last resort
    if (commonWordsResult.language && commonWordsResult.score >= 1) {
      console.log(`Low confidence detection: ${commonWordsResult.language} with score ${commonWordsResult.score}`);
      return { language: commonWordsResult.language, confidence: 0.5, isFallback: false };
    }

    console.warn("Language detection failed. Falling back to Hindi.");
    return { language: 'hi-IN', confidence: 0.1, isFallback: true };
  }

  private static detectWithFranc(text: string): string | null {
    try {
      const detectedCode = franc(text, { minLength: 3 });
      if (detectedCode === 'und') return null;

      const locale = this.francToLocale[detectedCode];
      return locale || null;
    } catch (error) {
      console.error('Franc detection error:', error);
      return null;
    }
  }

  private static detectByCommonWords(text: string): { language: string | null; score: number } {
    // Normalize and split text into words
    const normalizedText = text.toLowerCase().trim();
    const wordsInText = normalizedText.split(/[\s,.;:!?()"\-\[\]{}।॥]+/).filter(w => w.length > 0);

    let bestMatch = { language: null, score: 0 };

    for (const isoCode in this.commonWords) {
      const commonSet = new Set(this.commonWords[isoCode].map(w => w.toLowerCase()));
      let matchCount = 0;

      // Count matches
      for (const word of wordsInText) {
        if (commonSet.has(word)) {
          matchCount++;
        }
      }

      // Update best match
      if (matchCount > bestMatch.score) {
        const locale = Object.keys(this.localeToISO).find(
          key => this.localeToISO[key] === isoCode
        );
        bestMatch = { language: locale || null, score: matchCount };
      }
    }

    return bestMatch;
  }
}

export const translateText = async (
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult> => {
  try {
    let detectionResult: DetectedLanguageResult;

    if (sourceLanguage) {
      detectionResult = { language: sourceLanguage, confidence: 1.0, isFallback: false };
    } else {
      detectionResult = TranslationService.detectSourceLanguage(text);
    }

    const detectedSourceLang = detectionResult.language;
    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    const sourceLangName = detectedSourceLang ? (languageNames[detectedSourceLang] || detectedSourceLang) : undefined;

    console.log('Translation request:', {
      text: text.substring(0, 50),
      targetLangName,
      sourceLangName,
      confidence: detectionResult.confidence
    });

    const { data, error } = await supabase.functions.invoke('translate-text', {
      body: { text, targetLanguage: targetLangName, sourceLanguage: sourceLangName }
    });

    if (error) {
      console.error('Translation API error:', error);
      throw new Error('Translation service temporarily unavailable.');
    }

    if (data && data.success) {
      return {
        success: true,
        translatedText: data.translatedText,
        detectedLanguage: sourceLangName || 'Hindi (Fallback)',
        confidence: detectionResult.confidence,
        isFallback: detectionResult.isFallback,
        fallbackAlertMessage: detectionResult.isFallback
          ? "We couldn't detect the language, so we assumed it was Hindi. The translation may be inaccurate."
          : undefined
      };
    }

    throw new Error(data?.error || 'Unknown translation failure.');
  } catch (error: any) {
    console.error('Translation error:', error);
    return { success: false, error: error.message || 'Translation failed' };
  }
};