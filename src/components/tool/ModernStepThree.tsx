// src/components/tool/ModernStepThree.tsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mic, Upload, Crown, Lock, Play, Pause, Search, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Component Imports
import { VoiceRecorder } from "@/components/tool/VoiceRecorder";
import { VoiceHistoryDropdown } from "@/components/tool/VoiceHistoryDropdown";
import { PrebuiltVoiceService, type PrebuiltVoice } from "@/services/prebuiltVoiceService";
import { UploadLimitService } from "@/services/uploadLimitService";

// --- FIX ---
// Define the large, static list of paragraphs outside the component.
// This is more performant and prevents re-render issues.
const sampleParagraphs: { [key: string]: string } = {
    "hi-IN": "सूरज की हल्की किरणें आज बहुत सुंदर हैं। बच्चे पार्क में खेल रहे हैं और लोग बाजार में अपने कामों में व्यस्त हैं। थोड़ी देर बाहर निकलकर ताज़ी हवा का आनंद लें।",
    "bn-IN": "आज সূর্যের আলো কোমল এবং সুন্দর। শিশুরা পার্কে খেলা করছে, মানুষ বাজারে ব্যস্ত। বাইরে একটু সময় কাটিয়ে প্রকৃতির মজা নিন।",
    "ta-IN": "இன்று காலை சூரியன் மென்மையான ஒளியை வழங்குகிறது. குழந்தைகள் பூங்காவில் விளையாடுகின்றனர், மக்கள் சந்தையில் பிஸியாக இருக்கிறார்கள். சிறிது நேரம் எடுத்துக் கொண்டு வெளியில் நடைபயிற்சி செய்யவும்.",
    "te-IN": "ఈ ఉదయం సూర్యకాంతి చాలా మృదువుగా ఉంది. పిల్లలు పార్క్‌లో ఆడుతున్నారు, మరియు మార్కెట్‌లో వ్యాపారులు పని చేస్తున్నారు. కొంచెం సమయం తీసుకుని బయట నడవండి.",
    "mr-IN": "आज सकाळी सूर्यप्रकाश सौम्य आहे. मुलं उद्यानात खेळत आहेत आणि लोक बाजारात व्यस्त आहेत. थोडा वेळ बाहेर घालवून ताजी हवा श्वास घ्या.",
    "gu-IN": "આ સવારે સૂર્યની કિરણો ખૂબ નમ્ર છે. બાળકો પાર્કમાં રમ્યા કરે છે અને લોકો બજારમાં વ્યસ્ત છે. થોડો સમય બહાર જઈને તાજી હવા માણો.",
    "kn-IN": "ಇಂದು ಬೆಳಿಗ್ಗೆ ಸೂರ್ಯನ ಬೆಳಕು ಮೃದುವಾಗಿದೆ. ಮಕ್ಕಳು ಪಾರ್ಕ್‌ನಲ್ಲಿ ಆಟವಾಡುತ್ತಿದ್ದಾರೆ, ಜನರು ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ವ್ಯಸ್ತರಾಗಿದ್ದಾರೆ. ಸ್ವಲ್ಪ ಸಮಯ ತೆಗೆದು ಹೊರಗೆ ನಡಿಗೆ ಮಾಡಿ.",
    "ml-IN": "ഇന്ന് രാവിലെ സൂര്യപ്രകാശം വളരെ മൃദുവാണ്. കുട്ടികൾ പാർക്കിൽ കളിക്കുന്നു, ആളുകൾ ബസാറിൽ ബിസിയാണ്. കുറച്ച് സമയം എടുത്ത് പുറത്ത് സഞ്ചരിക്കുക.",
    "pa-IN": "ਅੱਜ ਸਵੇਰੇ ਸੂਰਜ ਦੀ ਰੌਸ਼ਨੀ ਨਰਮ ਹੈ। ਬੱਚੇ ਪਾਰਕ ਵਿੱਚ ਖੇਡ ਰਹੇ ਹਨ ਅਤੇ ਲੋਕ ਬਾਜ਼ਾਰ ਵਿੱਚ ਵਿਅਸਤ ਹਨ। ਕੁਝ ਸਮਾਂ ਬਾਹਰ ਤਾਜ਼ੀ ਹਵਾ ਵਿੱਚ ਬਿਤਾਓ।",
    "or-IN": "ଆଜି ସକାଳି ସୂର୍ଯ୍ୟର ଆଲୋକ ସୁମଧୁର। ଶିଶୁମାନେ ପାର୍କରେ ଖେଳୁଛନ୍ତି, ଲୋକ ଚାରିପାଖରେ ବ୍ୟସ୍ତ। ବାହାର ଯାଇ ସ୍ୱଚ୍ଛ ହাওର ଆନନ୍ଦ ନିଅନ୍ତୁ।",
    "as-IN": "আজিৰ পুৱা সূৰ্য্যৰ পোহৰ মৃদু। শিশুবোৰ পাৰ্কত খেলি আছে, মানুহে বজাৰত ব্যস্ত। অলপ সময় উলিয়াই বাহিৰে বাতাস উপভোগ কৰক।",
    "ur-IN": "آج صبح سورج کی روشنی بہت ہلکی ہے۔ بچے پارک میں کھیل رہے ہیں اور لوگ بازار میں مصروف ہیں۔ کچھ وقت باہر تازہ ہوا میں گزاریں۔",
    "ne-IN": "आज मौसम रमाइलो छ। बच्चाहरु पार्कमा खेल्दै छन्, मानिसहरु बजारमा व्यस्त छन्। केही समय बाहिर गई ताजा हावा खानुहोस्।",
    "doi-IN": "आज मौसम बढ़िया है। बच्चे खेल रहे हैं और लोग अपने काम में व्यस्त हैं। थोड़ी देर बाहर निकलकर ताजी हवा का आनंद लें।",
    "ks-IN": "آج کا موسم خوشگوار ہے۔ بچے پارک میں کھیل رہے ہیں اور لوگ بازار میں مصروف ہیں۔ تھوڑا وقت باہر نکل کر تازہ ہوا میں لطف اٹھائیں۔",
    "mni-IN": "আজ সকালটা খুব সুন্দর। ছেলেমেয়েরা পার্কে খেলছে এবং মানুষ বাজারে ব্যস্ত। বাইরে একটু সময় কাটান।",
    "sd-IN": "اڄ صبح جو موسم خوشگوار آهي. ٻار پارڪ ۾ کيڏي رهيا آهن ۽ ماڻهو بازار ۾ مصروف آهن. ٿورو وقت ٻاهر نڪري تازو هوا وٺو.",
    "en-US": "This morning, the city streets are lively. People are heading to work, and street vendors are setting up their stalls. Take a moment to enjoy the buzz of the city and the aroma of fresh coffee.",
    "en-GB": "The morning city scene is bustling. Commuters make their way to work while vendors arrange their goods. Pause and enjoy the hum of life and the scent of fresh bread.",
    "es-ES": "Hoy el parque de la ciudad está lleno de vida. Los niños juegan, los corredores mantienen su ritmo, y el aroma de las flores frescas llena el aire. Disfruta del momento.",
    "es-MX": "Esta mañana, las calles del parque están activas. Los niños corren, los vendedores colocan sus productos, y el aire huele a flores frescas.",
    "fr-FR": "Aujourd'hui, le parc de la ville est animé. Les enfants jouent, les coureurs suivent leur rythme, et le parfum des fleurs fraîches emplit l'air. Prenez un moment pour apprécier.",
    "fr-CA": "Ce matin, le parc est vivant. Les enfants jouent, les adultes se déplacent, et l'air est rempli du parfum des fleurs. Profitez de ce moment.",
    "de-DE": "Heute ist der Stadtpark voller Leben. Kinder spielen, Jogger laufen, und der Duft frischer Blumen liegt in der Luft. Genießen Sie den Moment.",
    "it-IT": "Questa mattina il parco della città è vivace. I bambini giocano, le persone passeggiano e l'aria è piena di profumo di fiori freschi.",
    "pt-PT": "Esta manhã, o parque da cidade está animado. As crianças brincam, os vendedores arrumam os produtos e o ar está cheio de flores frescas.",
    "pt-BR": "Hoje pela manhã, o parque está cheio de vida. Crianças brincam, vendedores organizam suas barracas e o aroma das flores frescas está no ar.",
    "ru-RU": "Сегодня утром городской парк оживлен. Дети играют, люди идут по делам, а воздух наполнен ароматом свежих цветов.",
    "zh-CN": "今天早晨，公园里生机勃勃。孩子们在玩耍，街边的小贩摆好摊位，空气中弥漫着花香。",
    "zh-TW": "今天早晨，公園裡充滿生氣。孩子們在玩耍，小販擺好攤位，空氣中充滿花香。",
    "ja-JP": "今朝、市内の公園は活気にあふれています。子どもたちが遊び、屋台が準備をしています。新鮮な花の香りを楽しんでください。",
    "ko-KR": "오늘 아침, 도시 공원은 활기차요. 아이들이 놀고, 상인들이 가판대를 정리하며, 공기는 꽃향기로 가득합니다.",
    "ar-SA": "هذا الصباح، الحديقة العامة مليئة بالحياة. الأطفال يلعبون والبائعون يرتبون أكشاكهم. استمتع بجو المدينة ورائحة الزهور.",
    "tr-TR": "Bu sabah şehir parkı canlı. Çocuklar oynuyor, satıcılar tezgahlarını hazırlıyor. Şehrin hareketliliğinin tadını çıkarın.",
    "nl-NL": "Vanmorgen is het stadspark levendig. Kinderen spelen, verkopers zetten hun kramen op, en de lucht ruikt naar bloemen.",
    "sv-SE": "I morse var stadsparken livlig. Barn leker, försäljare ställer upp sina stånd och luften är fylld med doften av blommor.",
    "no-NO": "I dag morges er byparken full av liv. Barn leker, selgere setter opp bodene sine, og luften er fylt med blomsterduft.",
    "da-DK": "I morges er byparken fuld af liv. Børn leger, sælgere gør deres boder klar, og luften dufter af blomster.",
    "fi-FI": "Tänä aamuna kaupunkipuisto on vilkas. Lapset leikkivät, myyjät laittavat kojujaan ja ilma on täynnä kukkien tuoksua.",
    "cs-CZ": "Dnes ráno je městský park plný života. Děti si hrají, prodejci připravují stánky a vzduch je plný vůně květin.",
    "el-GR": "Αυτό το πρωί, το πάρκο της πόλης ζωντανεύει. Τα παιδιά παίζουν, οι πωλητές στήνουν τα περίπτερά τους και η ατμόσφαιρα μυρίζει λουλούδια.",
    "he-IL": "הבוקר הפארק העירוני מלא חיים. ילדים משחקים, מוכרים מסדרים את הדוכנים שלהם, והאוויר מלא בריח פרחים.",
    "th-TH": "เช้านี้ สวนสาธารณะในเมืองคึกคัก เด็ก ๆ กำลังเล่น และพ่อค้าเตรียมร้านของตน กลิ่นดอกไม้หอมฟุ้งไปทั่วบริเวณ",
    "vi-VN": "Sáng nay, công viên thành phố rất nhộn nhịp. Trẻ em chơi đùa, các người bán dọn quầy, không khí tràn ngập mùi hoa tươi.",
    "id-ID": "Pagi ini, taman kota ramai. Anak-anak bermain, para pedagang menata kios mereka, dan udara dipenuhi aroma bunga segar.",
    "ms-MY": "Pagi ini, taman bandar penuh dengan aktiviti. Kanak-kanak bermain, penjual menyusun gerai, dan udara dipenuhi bau bunga segar.",
    "fa-IR": "صبح امروز، پارک شهری پرجنب‌وجوش است. کودکان بازی می‌کنند, فروشندگان بساط خود را پهن می‌کنند و هوا پر از بوی گل است.",
    "uk-UA": "Сьогодні вранці міський парк сповнений життя. Діти грають, продавці облаштовують свої намети, а повітря наповнене запахом квітів.",
    "ro-RO": "În această dimineață, parcul orașului este plin de viață. Copiii se joacă, vânzătorii își aranjează tarabele, iar aerul este plin de miros de flori.",
    "sk-SK": "Dnes ráno je mestský park plný života. Deti sa hrajú, predajcovia pripravujú svoje stánky a vzduch je plný vône kvetov.",
    "sl-SI": "Danes zjutraj je mestni park živahen. Otroci se igrajo, prodajalci pripravljajo stojnice, zrak pa je poln vonja cvetja.",
    "hr-HR": "Jutros je gradski park pun života. Djeca se igraju, prodavači postavljaju svoje štandove, a zrak je ispunjen mirisom cvijeća.",
    "sr-RS": "Jutros je gradski park pun života. Deca se igraju, prodavci postavljaju štandove, a vazduh je ispunjen mirisom cveća.",
    "bg-BG": "Тази сутрин градският парк е оживен. Децата играят, продавачите подреждат щандовете си, а въздухът е пълен с аромат на цветя.",
    "lt-LT": "Šį rytą miesto parkas pilnas gyvybės. Vaikai žaidžia, prekeiviai ruošia savo stalus, o oras pilnas gėlių kvapo."
};


interface ModernStepThreeProps {
  onNext: () => void;
  onPrevious: () => void;
  onVoiceRecorded: (blob: Blob) => void;
  onProcessingStart: (step: string) => void;
  onProcessingEnd: () => void;
  onVoiceSelect: (voiceId: string) => void;
  selectedVoiceId: string;
  selectedLanguage: string;
}

type VoiceSelection = {
  type: 'record' | 'upload' | 'history' | 'prebuilt';
  id: string;
  name: string;
};

export default function ModernStepThree({
  onNext,
  onPrevious,
  onVoiceRecorded,
  onVoiceSelect,
  selectedLanguage,
}: ModernStepThreeProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [voiceMethod, setVoiceMethod] = useState<"record" | "upload" | "prebuilt">("record");
  const [selectedVoice, setSelectedVoice] = useState<VoiceSelection | null>(null);
const navigate = useNavigate(); // <-- add this inside ModernStepThree function

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [prebuiltVoices, setPrebuiltVoices] = useState<PrebuiltVoice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<PrebuiltVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const canUsePrebuilt = profile?.plan !== "free";
  const uploadLimit = UploadLimitService.getUploadLimit(profile?.plan || 'free');

  const clearSelection = () => {
    setSelectedVoice(null);
    onVoiceRecorded(new Blob());
    onVoiceSelect('');
  };

  // This useEffect for paragraphs is now removed from here.

  useEffect(() => {
    const loadPrebuiltVoices = async () => {
      if (voiceMethod !== 'prebuilt' || !canUsePrebuilt) return;
      setLoadingVoices(true);
      try {
        const voices = await PrebuiltVoiceService.getVoicesForPlan(profile?.plan || 'free');
        setPrebuiltVoices(voices);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load prebuilt voices.", variant: "destructive" });
      } finally {
        setLoadingVoices(false);
      }
    };
    loadPrebuiltVoices();
  }, [voiceMethod, canUsePrebuilt, profile?.plan, toast]);

  useEffect(() => {
    let filtered = prebuiltVoices;
    if (selectedLanguage) {
      // Cast to any to access language property
      filtered = filtered.filter(voice => (voice as any).language === selectedLanguage);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(term) ||
        (v.category?.toLowerCase().includes(term)) ||
        (v.gender?.toLowerCase().includes(term)) ||
        (v.accent?.toLowerCase().includes(term))
      );
    }
    setFilteredVoices(filtered);
  }, [selectedLanguage, searchTerm, prebuiltVoices]);

  const handleVoiceRecorded = (blob: Blob) => {
    clearSelection();
    setSelectedVoice({ type: 'record', id: `rec-${Date.now()}`, name: 'New Recording' });
    onVoiceRecorded(blob);
    toast({ title: "Voice Recorded", description: "Your voice is ready for generation." });
  };

  const handleUploadComplete = (blob: Blob, fileName: string) => {
    clearSelection();
    setSelectedVoice({ type: 'upload', id: `upl-${Date.now()}`, name: fileName });
    onVoiceRecorded(blob);
    toast({ title: "Audio Uploaded", description: `"${fileName}" is ready for generation.` });
  };

  const handleHistoryVoiceSelect = async (voiceId: string) => {
    clearSelection();
    
    // Fetch the voice details from the database
    const { data: voice, error } = await supabase
      .from('user_voices')
      .select('*')
      .eq('id', voiceId)
      .single();
      
    if (error || !voice) {
      toast({ 
        title: "Error", 
        description: "Failed to load selected voice", 
        variant: "destructive" 
      });
      return;
    }
    
    // Convert audio_blob or fetch from audio_url
    let blob: Blob | null = null;
    if (voice.audio_blob) {
      blob = new Blob([voice.audio_blob], { type: 'audio/wav' });
    } else if (voice.audio_url) {
      try {
        const response = await fetch(voice.audio_url);
        blob = await response.blob();
      } catch (err) {
        toast({ 
          title: "Error", 
          description: "Failed to load voice audio", 
          variant: "destructive" 
        });
        return;
      }
    }
    
    if (blob) {
      setSelectedVoice({ type: 'history', id: voiceId, name: voice.name });
      onVoiceRecorded(blob);
      toast({ title: "Voice Selected", description: `Using your saved voice: "${voice.name}".` });
    }
  };

  const handlePrebuiltSelect = (voiceId: string) => {
    clearSelection();
    const voice = prebuiltVoices.find((v) => v.voice_id === voiceId);
    setSelectedVoice({ type: 'prebuilt', id: voiceId, name: voice?.name || 'Prebuilt Voice' });
    onVoiceSelect(voiceId);
    toast({ title: "Voice Selected", description: `Selected "${voice?.name}" voice.` });
  };

  const playPrebuiltSample = async (voiceId: string) => {
    if (currentAudio) currentAudio.pause();
    const voice = prebuiltVoices.find(v => v.voice_id === voiceId);
    if (!voice?.audio_preview_url) return;
    try {
      const audio = new Audio(voice.audio_preview_url);
      setCurrentAudio(audio);
      setPlayingVoiceId(voiceId);
      setIsPlaying(true);
      audio.onended = () => { setIsPlaying(false); setPlayingVoiceId(null); setCurrentAudio(null); };
      audio.onerror = () => { setIsPlaying(false); setPlayingVoiceId(null); toast({ title: "Playback Error", variant: "destructive" }); };
      await audio.play();
    } catch (error) {
      setIsPlaying(false); setPlayingVoiceId(null); toast({ title: "Playback Error", variant: "destructive" });
    }
  };


  const currentParagraph = sampleParagraphs[selectedLanguage] || sampleParagraphs["en-US"];

  return (
    <div className="space-y-6">


      <Tabs value={voiceMethod} onValueChange={(value) => setVoiceMethod(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="record"><Mic className="h-4 w-4 mr-2" />Record</TabsTrigger>

           <TabsTrigger value="prebuilt" disabled={!canUsePrebuilt}>
            {canUsePrebuilt ? <Crown className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            Prebuilt
          </TabsTrigger>
<TabsTrigger value="history">
  <Clock className="h-4 w-4 mr-2" />
  History
</TabsTrigger>



        </TabsList>

        {/* Record Tab */}
        <TabsContent value="record" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2"><Mic className="h-5 w-5" /><span>Record Your Voice</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Sample Text to Read:</h4>
                <p className="text-sm leading-relaxed">{currentParagraph}</p>
              </div>
              <VoiceRecorder onRecordingComplete={handleVoiceRecorded} />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Read the text naturally at a normal pace</p>
                <p>• Ensure good audio quality and minimal background noise</p>
                <p>• Recording should be at least 10 seconds long</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


    <TabsContent value="history" className="space-y-4">
  <Tabs defaultValue="recorded">
    <TabsList className="grid grid-cols-2 w-full">
      <TabsTrigger value="recorded">
      <Clock className="h-4 w-4 mr-2" />
      History</TabsTrigger>
      <TabsTrigger value="uploaded" disabled>

<Lock className="h-4 w-4 mr-2" />
      Upload (Soon)</TabsTrigger>
    </TabsList>

    <TabsContent value="recorded" className="p-4 space-y-4">

      <div className="flex items-center mb-4">
      {/* Clock Icon */}
      <Clock className="w-6 h-6 text-gray-700 mr-2" />

      {/* Header Text */}
      <h3 className="text-lg font-semibold text-gray-800">Your Voice History</h3>
    </div>




      <VoiceHistoryDropdown
        onVoiceSelect={handleHistoryVoiceSelect}
        selectedVoiceId={selectedVoice?.type === 'history' ? selectedVoice.id : ''}
      />

      {/* Optional CTA */}
 <div className="text-center mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/terms")}
      >
        Learn More About History
      </Button>
    </div>


    </TabsContent>

    <TabsContent value="uploaded" className="p-4 text-center text-muted-foreground">
      <p>Coming Soon</p>
    </TabsContent>
  </Tabs>
</TabsContent>







         {/* Prebuilt Tab */}
        <TabsContent value="prebuilt" className="space-y-4">
          {canUsePrebuilt ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5" /><span>Prebuilt Voices</span><Badge>Paid</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingVoices ? <p className="text-center p-4">Loading voices...</p> : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search voices in this language..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {filteredVoices.length > 0 ? (
                        filteredVoices.map((voice) => (
                          <div key={voice.id} onClick={() => handlePrebuiltSelect(voice.voice_id)}
                               className={`border rounded-lg p-3 cursor-pointer transition-colors ${selectedVoice?.id === voice.voice_id ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium">{voice.name}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">{voice.description}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {voice.category && <Badge variant="outline" className="text-xs">{voice.category}</Badge>}
                                  {voice.gender && <Badge variant="outline" className="text-xs">{voice.gender}</Badge>}
                                  {voice.accent && <Badge variant="outline" className="text-xs">{voice.accent}</Badge>}
                                </div>
                              </div>
                              <Button variant="outline" size="icon" className="h-8 w-8"
                                      onClick={(e) => { e.stopPropagation(); playPrebuiltSample(voice.voice_id); }}
                                      disabled={isPlaying && playingVoiceId !== voice.voice_id}>
                                {playingVoiceId === voice.voice_id && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-sm text-muted-foreground p-6">
                            No prebuilt voices found for the selected language or search term.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">Prebuilt Voices Locked</h3>
                <p className="text-sm text-muted-foreground mb-4">Upgrade to Pro or Premium to access our collection of prebuilt AI voices.</p>
                <Button variant="outline" onClick={() => window.open("/payment", "_blank")}>
                    <Crown className="h-4 w-4 mr-2" /> Upgrade Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {selectedVoice && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
                <strong>{selectedVoice.name}</strong> is selected and ready.
            </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>Previous</Button>
        <Button onClick={onNext} disabled={!selectedVoice} size="lg" className="px-8">
          Continue to Generate
        </Button>
      </div>
    </div>
  );
}