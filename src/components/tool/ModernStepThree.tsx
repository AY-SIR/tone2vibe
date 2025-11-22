import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mic, Lock, Play, Pause, Search, CheckCircle,
  Clock, Crown, Filter, X, Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/tool/VoiceRecorder";
import { VoiceHistoryDropdown } from "@/components/tool/VoiceHistoryDropdown";
import { PrebuiltVoiceService, type PrebuiltVoice } from "@/services/prebuiltVoiceService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const sampleParagraphs: { [key: string]: string } = {
  "ar-SA": "في الصباح، تنتشر أشعة الشمس الذهبية على المدينة. الأطفال يلعبون في الحدائق ويلتقطون الكرة معًا. الباعة ينظمون أكشاكهم بينما يمر الناس في شوارع المدينة. الطيور تغرد فوق الأشجار، والهواء مليء برائحة الزهور الطازجة. بعض الناس يجلسون على المقاهي يراقبون حركة المدينة.",
  "as-IN": "আজিৰ পুৱা, সূৰ্যৰ ৰশ্মিয়ে নগৰখনক ৰঙীন কৰি তুলিছে। শিশুৱে উদ্যানত খেলিছে আৰু বন্ধু-বান্ধৱীৰ সৈতে ৰঙীন খেল খেলিছে। মানুহে কামত ব্যস্ত, আৰু দোকানী সকলে সামগ্ৰী সাজি আছে। বতৰ মনোমোহা, আৰু পাৰ্কত ফুলৰ সুবাস আছে। কিছুমান মানুহ বেঞ্চত বহি বিশ্ৰাম লৈছে।",
  "bg-BG": "Сутринта слънцето огрява града с топла светлина. Децата се смеят и играят в парка, докато възрастните минават за работа. Продавачите отварят своите щандове, а въздухът е изпълнен с аромат на прясно изпечен хляб. Птиците пеят от дърветата и хората се поздравяват помежду си. Малки кафенета привличат първите клиенти на деня.",
  "bn-BD": "সকালের আলো শহরকে উজ্জ্বল করেছে। শিশুরা পার্কে খেলছে এবং হাসছে। বাজারে বিক্রেতারা তাদের দোকান সাজাচ্ছে। বাতাসে তাজা ফুলের সুবাস ছড়াচ্ছে। কিছু মানুষ কফি খেতে বসে আছে এবং শহরের জীবন উপভোগ করছে।",
  "bn-IN": "সকালের আলো শহরকে উজ্জ্বল করেছে। শিশুরা পার্কে খেলছে এবং হাসছে। দোকানিরা তাদের দোকান সাজাচ্ছে। বাতাসে তাজা ফুলের সুবাস রয়েছে। কিছু মানুষ পার্কের বেঞ্চে বসে আছে এবং প্রাতঃরাশের উপভোগ করছে।",
  "cs-CZ": "Ráno slunce osvětluje městské ulice zlatavým světlem. Děti si hrají v parku a smějí se, zatímco dospělí spěchají do práce. Prodavači připravují své stánky a vzduch je plný vůně čerstvého pečiva. Ptáci zpívají na stromech a lidé se navzájem zdraví. Malé kavárny začínají přijímat první zákazníky.",
  "da-DK": "Om morgenen skinner solen over byen med gyldent lys. Børn leger i parkerne og griner, mens voksne skynder sig på arbejde. Gadehandlere gør deres boder klar, og luften er fyldt med duften af friskbagt brød. Fuglene synger i træerne, og folk hilser på hinanden. Små caféer begynder at få deres første gæster.",
  "nl-NL": "In de ochtend straalt de zon over de stad met een gouden gloed. Kinderen spelen en lachen in het park, terwijl volwassenen naar hun werk haasten. Straatverkopers zetten hun kraampjes op, en de lucht is gevuld met de geur van versgebakken brood. Vogels zingen in de bomen, en mensen groeten elkaar vriendelijk. Kleine cafés openen hun deuren voor vroege klanten.",
  "en-GB": "This morning, the city streets are bathed in warm sunlight. Children play in the parks, laughing and chasing each other. Street vendors prepare their stalls as people hurry to work. The scent of fresh flowers and baked bread fills the air. Some residents sit at cafés, enjoying the calm of the morning.",
  "en-US": "This morning, the streets are lively with people heading to work. Children play in the parks, chasing each other and laughing. Street vendors set up their stalls, while a gentle breeze carries the scent of flowers. People greet each other as the city wakes up to a new day. A few cafes already have early customers sipping coffee.",
  "fi-FI": "Aamulla aurinko valaisee kaupungin kaduilla lämpimästi. Lapset leivät puistoissa ja nauravat. Katuruokamyyjät avaavat kojujaan, ja ilma on täynnä tuoreiden kukkien ja leivän tuoksua. Linnut laulavat puissa ja ihmiset tervehtivät toisiaan. Kahvilat valmistautuvat ottamaan vastaan ensimmäiset asiakkaat.",
  "fr-CA": "Ce matin, la ville est baignée de soleil. Les enfants jouent dans les parcs, riant et courant partout. Les marchands installent leurs étals tandis que les gens se dirigent vers le travail. L'air est parfumé de fleurs fraîches et de pain chaud. Quelques cafés accueillent déjà leurs premiers clients.",
  "fr-FR": "Ce matin, le parc et les rues de la ville sont animés par le soleil et les rires des enfants. Les marchands mettent en place leurs étals tandis que les adultes se hâtent pour aller au travail. L'air est empli du parfum des fleurs et du pain frais. Les oiseaux chantent sur les arbres, et certains habitants savourent un café matinal.",
  "de-DE": "Am Morgen taucht die Sonne die Straßen der Stadt in warmes Licht. Kinder spielen fröhlich im Park, während Erwachsene zur Arbeit eilen. Verkäufer bereiten ihre Stände vor, und die Luft ist erfüllt vom Duft frisch gebackenen Brotes und Blumen. Vögel singen in den Bäumen, und einige Menschen genießen einen Kaffee in kleinen Cafés.",
  "el-GR": "Το πρωί, οι δρόμοι της πόλης γεμίζουν με χρυσό φως. Τα παιδιά παίζουν στα πάρκα και γελούν. Οι πλανόδιοι πωλητές ετοιμάζουν τα πανέρια τους, ενώ οι ενήλικες βιάζονται για τη δουλειά. Ο αέρας γεμίζει με μυρωδιές φρέσκων λουλουδιών και ψωμιού. Μερικοί κάτοικοι κάθονται σε καφετέριες απολαμβάνοντας τη γαλήνη.",
  "gu-IN": "સવારમાં સૂર્ય શહેરની સાફ રસ્તાઓ પર તેજ આપે છે. બાળકો પાર્કમાં રમતા અને હસતા છે. માર્ગના વેપારીઓ પોતાના સ્ટોલ તૈયાર કરે છે અને લોકો કામ માટે દોડી રહ્યા છે. હવામાં તાજા ફૂલો અને બેકરીની સુગંધ છે. કેટલાક લોકો કેફેમાં બેસીને સવારનો આનંદ માણી રહ્યા છે.",
  "he-IL": "בבוקר הזה, הרחובות העירוניים מוארים באור שמש חם. הילדים משחקים בפארקים וצוחקים יחד. הסוחרים מסדרים את הדוכנים שלהם, בעוד האנשים ממהרים לעבודה. הריח של פרחים טריים ולחם אפוי ממלא את האוויר. כמה תושבים יושבים בבתי קפה ונהנים מהשקט.",
  "hi-IN": "सूरज की हल्की किरणें आज सुबह शहर में फैल रही हैं। बच्चे पार्क में खेल रहे हैं और हंस रहे हैं। सड़क के किनारे व्यापारी अपने स्टॉल सजाते हैं और लोग काम पर जा रहे हैं। हवा में ताजे फूल और पके हुए खाने की खुशबू है। कुछ लोग कैफे में बैठकर सुबह का आनंद ले रहे हैं।",
  "hr-HR": "Ujutro sunce obasjava gradske ulice zlatnim sjajem. Djeca se igraju u parkovima, dok odrasli žure na posao. Prodavači pripremaju svoje štandove, a zrak je ispunjen mirisom svježeg kruha i cvijeća. Ptice pjevaju na drveću, a neki ljudi uživaju u jutarnjoj kavi u malim kafićima.",
  "id-ID": "Pagi ini, sinar matahari menyinari jalan-jalan kota. Anak-anak bermain di taman sambil tertawa. Pedagang kaki lima menyiapkan gerobak mereka, sementara orang dewasa terburu-buru ke tempat kerja. Udara dipenuhi aroma bunga segar dan roti panggang. Beberapa orang duduk di kafe menikmati pagi yang tenang.",
  "it-IT": "Questa mattina, le strade della città sono illuminate da una luce calda. I bambini giocano nei parchi ridendo e correndo. I venditori preparano le loro bancarelle mentre gli adulti si affrettano al lavoro. L'aria è piena del profumo di fiori freschi e pane appena sfornato. Alcuni abitanti si godono un caffè nei piccoli bar.",
  "ja-JP": "今朝、街の通りは暖かい日差しに照らされています。子どもたちは公園で遊び、笑い声が響いています。露店商人は店を準備し、大人たちは仕事に急いでいます。空気には新鮮な花と焼きたてのパンの香りが漂っています。カフェで朝の時間を楽しむ人もいます。",
  "kn-IN": "ಈ ಬೆಳಿಗ್ಗೆ, ನಗರದ ಬೀದಿಗಳು ಸೂರ್ಯನ ಬೆಳಕುಗಳಿಂದ ಭಾಸವಾಗಿವೆ. ಮಕ್ಕಳು ಪಾರ್ಕ್‌ನಲ್ಲಿ ಆಟವಾಡುತ್ತಿದ್ದಾರೆ ಮತ್ತು ನಗುತ್ತಿದ್ದಾರೆ. ಬೀದಿ ವ್ಯಾಪಾರಿಗಳು ತಮ್ಮ ಸ್ಟಾಲ್‌ಗಳನ್ನು ಸಿದ್ಧಪಡಿಸುತ್ತಿದ್ದಾರೆ, ಜನರು ಕೆಲಸಕ್ಕೆ ಓಡುತ್ತಿದ್ದಾರೆ. ಹವೆಯಲ್ಲಿ ಹೊಸ ಹೂವುಗಳ ಮತ್ತು ರొಟ್ಟಿ خوشಬೂ ಇದೆ. ಕೆಲವು ಜನ ಕಾಫಿ ಪಾನ ಮಾಡುತ್ತಿರುವುದು ಕಾಣಿಸುತ್ತದೆ.",
  "ko-KR": "오늘 아침, 도시의 거리에는 따뜻한 햇빛이 가득합니다. 아이들은 공원에서 뛰어놀며 웃습니다. 거리 상인들은 가게를 준비하고, 어른들은 일터로 향합니다. 공기에는 신선한 꽃과 갓 구운 빵 향기가 가득합니다. 일부 주민들은 카페에 앉아 아침을 즐깁니다.",
  "lt-LT": "Šį rytą miesto gatves apšviečia šilta saulės šviesa. Vaikai žaidžia parkuose ir juokiasi. Prekeiviai ruošia savo stalus, o suaugusieji skuba į darbą. Ore jaučiasi šviežių gėlių ir duonos kvapas. Kai kurie žmonės sėdi kavinėse, mėgaudydamiesi rytine ramybe.",
  "ms-MY": "Pagi ini, sinar matahari menyinari bandar dengan hangat. Kanak-kanak bermain di taman sambil ketawa. Penjual jalanan menyediakan gerai mereka, sementara orang dewasa tergesa-gesa ke tempat kerja. Udara dipenuhi dengan aroma bunga segar dan roti panas. Sesetengah orang duduk di kafe menikmati pagi yang tenang.",
  "ml-IN": "ഈ രാവിലെ, നഗരത്തിലെ തെരുവുകൾ സൂര്യപ്രകാശത്തിൽ പ്രകാശിക്കുന്നു. കുട്ടികൾ പാർക്കിൽ കളിക്കുന്നു, ചിരിക്കുന്നു. തെരുവിൽ വ്യാപാരികൾ അവരുടെ സ്റ്റാൾ ഒരുക്കുന്നു, മുതിർന്നവർ ജോലി കൊതിക്കുന്നു. വായുവിൽ تاز تاز പൂവുകളും ബേക്കഡ് പാന്റെയും ഗന്ധം നിറഞ്ഞിരിക്കുന്നു. ചിലർ കഫേയിൽ ഇരുന്ന് രാവിലെ ആസ്വദിക്കുന്നു.",
  "mr-IN": "या सकाळी, शहरातील रस्ते सूर्यप्रकाशाने उजळले आहेत. मुले पार्कमध्ये खेळत आहेत आणि हसत आहेत. रस्त्यावरील विक्रेते आपली दुकाने सजवत आहेत, तर लोक कामावर जात आहेत. हवेतील ताज्या फुलांचा व गोड ब्रेडचा सुगंध आहे. काही लोक कॅफेमध्ये बसून सकाळचा आनंद घेत आहेत.",
  "ne-IN": "आज बिहान, शहरका सडकहरू सुनौलो घामले उज्यालो भएको छ। बच्चाहरू पार्कमा खेलिरहेका छन् र हाँसिरहेका छन्। सडकका व्यापारी आफ्नो स्टल तयार गर्दैछन्, र मानिसहरू काममा हतारमा छन्। हावामा ताजा फूल र पस्केको रोटीको खुशबू छ। केही मानिस क्याफेमा बसेर बिहानको रमाइलो गरिरहेका छन्।",
  "no-NO": "I morges skinner solen over byens gater. Barn leker i parkene og ler. Gatehandlere gjør klare sine boder mens voksne haster til jobb. Luften er fylt med duften av friske blomster og nybakt brød. Noen sitter på kafeer og nyter morgenstunden.",
  "or-IN": "ସକାଳେ ସୂର୍ଯ୍ୟର କିରଣ ଶହରକୁ ରଙ୍ଗିନ କରିଛି। ଶିଶୁମାନେ ପାର୍କରେ ଖେଳୁଛନ୍ତି ଓ ହସୁଛନ୍ତି। ବାଜାରରେ ବିକ୍ରେତାମାନେ ତାଙ୍କର ଷ୍ଟଲ୍ ସଜାଇ ରହିଛନ୍ତି। ହାବାରେ ତାଜା ଫୁଲ ଓ ପକା ଖାଦ୍ୟର ସୁଗନ୍ଧ ମିଶିଛି। କିଛି ଲୋକ କଫେରେ ବସି ସକାଳ ଉପଭୋଗ କରୁଛନ୍ତି।",
  "pa-IN": "ਇਸ ਸਵੇਰੇ, ਸ਼ਹਿਰ ਦੀਆਂ ਸੜਕਾਂ ਸੂਰਜ ਦੀ ਗਰਮ ਰੋਸ਼ਨੀ ਨਾਲ ਰੋਸ਼ਨ ਹਨ। ਬੱਚੇ ਬਾਗਾਂ ਵਿੱਚ ਖੇਡ ਰਹੇ ਹਨ ਅਤੇ ਹੱਸ ਰਹੇ ਹਨ। ਸੜਕ ਦੇ ਵੇਪਾਰੀ ਆਪਣੇ ਸਟਾਲ ਤਿਆਰ ਕਰ ਰਹੇ ਹਨ। ਹਵਾ ਵਿੱਚ ਤਾਜ਼ਾ ਫੁੱਲਾਂ ਅਤੇ ਨਵੀਂ ਰੋਟੀ ਦੀ ਖੁਸ਼ਬੂ ਹੈ। ਕੁਝ ਲੋਕ ਕੈਫੇ ਵਿੱਚ ਬੈਠੇ ਸਵੇਰੇ ਦਾ ਆਨੰਦ ਲੈ ਰਹੇ ਹਨ।",
  "fa-IR": "صبح امروز، خیابان‌های شهر با نور گرم خورشید روشن شده‌اند. کودکان در پارک‌ها بازی می‌کنند و می‌خندند. فروشندگان غرفه‌های خود را آماده می‌کنند و بزرگسالان به سر کار می‌وند. هوا پر از عطر گل‌های تازه و نان تازه است. بعضی افراد در کافی‌শা‌ها نشسته و از صبح لذت می‌برند.",
  "pt-BR": "Nesta manhã, as ruas da cidade estão iluminadas pelo sol. Crianças brincam nos parques, rindo e correndo. Os vendedores de rua preparam suas barracas enquanto os adultos se apressam para o trabalho. O ar está cheio do aroma de flores frescas e pão recém-assado. Algumas pessoas sentam-se em cafés apreciando a manhã.",
  "pt-PT": "Esta manhã, as ruas da cidade estão iluminadas pelo sol. As crianças brincam nos parques, rindo e correndo. Os vendedores de rua preparam os seus postos enquanto os adultos se apressam para o trabalho. O ar está cheio do aroma de flores frescas e pão acabado de cozer. Algumas pessoas estão sentadas em cafés a desfrutar da manhã.",
  "ro-RO": "În această dimineață, străzile orașului sunt luminate de soare. Copiii se joacă în parcuri, râzând și alergând. Vânzătorii își pregătesc tarabele, iar adulții se grăbesc la serviciu. Aerul este plin de mirosul florilor proaspete și al pâinii calde. Unii oameni stau la cafenele și savurează dimineața.",
  "ru-RU": "Сегодня утром улицы города залиты теплым солнечным светом. Дети играют в парках и смеются. Уличные торговцы готовят свои ларьки, а взрослые спешат на работу. Воздух наполнен ароматом свежих цветов и свежевыпеченного хлеба. Некоторые жители наслаждаются утренним кофе в кафе.",
  "sr-RS": "Jutros su gradske ulice obasjane toplim sunčevim zracima. Deca se igraju u parkovima i smeju se. Prodavci pripremaju svoje tezge, dok odrasli žure na posao. Vazduh je pun mirisa svežeg cveća i hleba. Neki ljudi uživaju u jutarnjoj kafi u kafićima.",
  "sk-SK": "Ráno sú mestské ulice osvetlené teplým slnečným svetlom. Deti sa hrajú v parkoch a smejú sa. Predavači pripravujú svoje stánky a dospelí sa ponáhľajú do práce. Vzduch je naplnený vôňou čerstvých kvetov a pečiva. Niektorí ľudia si vychutnávajú rannú kávu v kaviarňach.",
  "sl-SI": "Zjutraj sonce osvetljuje mestne ulice s toplim svetlom. Otroci se igrajo v parkih in se smejijo. Prodajalci pripravljajo svoje stojnice, medtem ko odrasli hitijo na delo. Zrak je poln vonja svežega cvetja in kruha. Nekteri ljudje uživajo v jutranji kavi v kavarnah.",
  "es-MX": "Esta mañana, las calles de la ciudad están iluminadas por el sol. Los niños juegan en los parques riendo y corriendo. Los vendedores de la calle preparan sus puestos mientras los adultos se apresuran al trabajo. El aire está lleno del aroma de flores frescas y pan recién horneado. Algunas personas disfrutan de un café en los cafés locales.",
  "sv-SE": "I morse badades stadens gator i varmt solljus. Barn leker i parkerna och skrattar. Gatuhandlare förbereder sina stånd medan vuxna skyndar till jobbet. Luften är fylld av doften av färska blommor och nybakat bröd. Vissa sitter på kaféer och njuter av morgonen.",
  "ta-IN": "இந்த காலை, நகரின் தெருக்கள் வெள்ளியுமிடும் ஒளியில் பிரகாசமாக இருக்கின்றன. குழந்தைகள் பூங்காவில் விளையாடி, சிரிக்கின்றனர். தெரு வணிகர்கள் தங்கள் கடைகளை தயாரிக்கிறார்கள், மக்கள் வேலைக்கு விரைவில் செல்கிறார்கள். காற்றில் புதிய மலர்கள் மற்றும் freshly-baked ரொட்டியின் வாசனை பரவி உள்ளது. சிலர் காபேயில் காலை நேரத்தை அனுபவிக்கின்றனர்.",
  "te-IN": "ఈ ఉదయం, నగర వీధులు సూర్యరశ్మితో ప్రకాశవంతంగా ఉన్నాయి. పిల్లలు పార్క్‌ల్లో ఆడుతూ నవ్వుతున్నారు. వీధి వ్యాపారులు తమ స్టాళ్లు సిద్ధం చేస్తున్నారు, పెద్దవాళ్లు పని కోసం పరుగులు తీస్తున్నారు. గాలి కొత్త పువ్వులు మరియు రొట్టె వాసనతో నిండింది. కొందరు కాఫీ షాప్‌లో కూర్చోని ఉదయం ఆనందిస్తున్నారు.",
  "th-TH": "เช้านี้ ถนนในเมืองสว่างไสวด้วยแสงแดดอบอุ่น เด็ก ๆ เล่นในสวนสาธารณะพร้อมหัวเราะ ผู้ขายตั้งแผงขายของของพวกเขา ขณะที่ผู้ใหญ่รีบไปทำงาน กลิ่นดอกไม้สดและขนมปังอบใหม่ลอยมาในอากาศ บางคนกำลังนั่งจิบกาแฟในร้านคาเฟ่",
  "tr-TR": "Bu sabah, şehir sokakları sıcak güneş ışığıyla aydınlanıyor. Çocuklar parkta oynuyor ve gülüyorlar. Sokak satıcıları tezgahlarını hazırlıyor, yetişkinler ise işe acele ediyor. Havadaki taze çiçekler ve yeni pişmiş ekmek kokusu yayılıyor. Bazı insanlar kafelerde oturup sabahın keyfini çıkarıyor.",
  "uk-UA": "Сьогодні вранці вулиці міста наповнені теплим сонячним світлом. Діти грають у парках та сміються. Вуличні торговці готують свої кіоски, а дорослі поспішають на роботу. Повітря сповнене ароматом свіжих квітів та випічки. Деякі люди насолоджуються ранковою кавою в кафе.",
  "ur-IN": "اس صبح شہر کی گلیاں دھوپ سے روشن ہیں۔ بچے پارک میں کھیل رہے ہیں اور ہنس रहे ہیں۔ گلی کے دکاندار اپنے اسٹال تیار کر रहे ہیں جبکہ لوگ کام پر جا رہے ہیں۔ ہوا میں تازہ پھولوں اور پکے ہوئے روٹی کی خوشبو ہے۔ کچھ لوگ کیفے میں بیٹھ کر صبح کا لطف اٹھا रहे ہیں۔",
  "vi-VN": "Sáng nay, các con phố trong thành phố rực rỡ ánh nắng. Trẻ em chơi đùa trong công viên và cười vui vẻ. Các người bán hàng chuẩn bị quầy hàng của mình, trong khi người lớn vội đến nơi làm việc. Không khí ngập tràn mùi hoa tươi và bánh mì mới nướng. Một số người ngồi ở quán cà phê thưởng thức buổi sáng.",
  "zh-CN": "今天早上，城市的街道沐浴在温暖的阳光下。孩子们在公园里玩耍，欢笑声不断。街头小贩在摆摊，而大人们匆忙去上班。空气中弥漫着新鲜花朵和刚出炉面包的香味。一些人坐在咖啡馆里享受早晨的时光。",
  "zh-TW": "今天早上，城市的街道沐浴在溫暖的陽光下。孩子們在公園裡玩耍，笑聲不斷。街頭小販在擺攤，大人們匆忙去上班。空氣中瀰漫著新鮮花朵和剛出爐麵包的香氣。一些人坐在咖啡館裡享受早晨的時光。"
};


interface ModernStepThreeProps {
  onNext: () => void;
  onPrevious: () => void;
  onVoiceRecorded: (blob: Blob) => void;
  onProcessingStart: (step: string) => void;
  onProcessingEnd: () => void;
  onVoiceSelect: (voiceId: string, type: 'prebuilt' | 'history') => void;
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
  selectedVoiceId,
}: ModernStepThreeProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State management
  const [voiceMethod, setVoiceMethod] = useState<"record" | "prebuilt" | "history">("record");
  const [selectedVoice, setSelectedVoice] = useState<VoiceSelection | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [prebuiltVoices, setPrebuiltVoices] = useState<PrebuiltVoice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<PrebuiltVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "usage" | "plan">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [generatingPreview, setGeneratingPreview] = useState<string | null>(null);
  const [previewCache, setPreviewCache] = useState<Map<string, string>>(new Map());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userPlan = profile?.plan || 'free';

  // ✅ CRITICAL: Stop all audio helper function
  const stopAllAudio = () => {
    if (currentAudio) {
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
      currentAudio.load();
      setCurrentAudio(null);
    }
    setIsPlaying(false);
    setPlayingVoiceId(null);
  };

  // ✅ Clear selection helper
  const clearSelection = () => {
    setSelectedVoice(null);
    onVoiceRecorded(new Blob());
    onVoiceSelect('', 'history');
  };

  // ✅ FIXED: Stop audio when tab changes
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [voiceMethod]);

  // ✅ FIXED: Stop audio on component unmount (covers navigation away)
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  // ✅ Restore selection when user navigates back
  useEffect(() => {
    if (selectedVoiceId && !selectedVoice) {
      const restoreSelection = async () => {
        let voice = prebuiltVoices.find(v => v.voice_id === selectedVoiceId);
        if (!voice) {
          voice = await PrebuiltVoiceService.getVoiceById(selectedVoiceId);
        }

        if (voice) {
          setSelectedVoice({ type: 'prebuilt', id: selectedVoiceId, name: voice.name });
          setVoiceMethod('prebuilt');
          return;
        }

        const { data: historyVoice } = await supabase
          .from('user_voices')
          .select('id, name')
          .eq('id', selectedVoiceId)
          .single();

        if (historyVoice) {
          setSelectedVoice({ type: 'history', id: selectedVoiceId, name: historyVoice.name });
          setVoiceMethod('history');
        }
      };
      restoreSelection();
    }
  }, [selectedVoiceId, selectedVoice, prebuiltVoices]);

  // ✅ Load prebuilt voices
  useEffect(() => {
    const loadPrebuiltVoices = async () => {
      if (voiceMethod !== 'prebuilt' || prebuiltVoices.length > 0) return;

      setLoadingVoices(true);
      try {
        const voices = await PrebuiltVoiceService.getAllActiveVoices();
        setPrebuiltVoices(voices);

        if (voices.length === 0) {
          toast({
            title: "No Voices Available",
            description: "No prebuilt voices found.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error loading voices:", error);
        toast({
          title: "Error",
          description: "Failed to load prebuilt voices.",
          variant: "destructive"
        });
      } finally {
        setLoadingVoices(false);
      }
    };

    loadPrebuiltVoices();
  }, [voiceMethod, userPlan, toast, prebuiltVoices.length]);

  // ✅ Filter and sort voices
  useEffect(() => {
    let filtered = prebuiltVoices;

    if (selectedLanguage) {
      filtered = filtered.filter(voice => voice.language === selectedLanguage);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(v => v.category === categoryFilter);
    }

    if (genderFilter !== "all") {
      filtered = filtered.filter(v => v.gender === genderFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(term) ||
        v.description.toLowerCase().includes(term) ||
        (v.category?.toLowerCase().includes(term)) ||
        (v.gender?.toLowerCase().includes(term)) ||
        (v.accent?.toLowerCase().includes(term))
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "usage") {
        const usageA = PrebuiltVoiceService.getVoiceUsageCount(a.voice_id);
        const usageB = PrebuiltVoiceService.getVoiceUsageCount(b.voice_id);
        comparison = usageA - usageB;
      } else if (sortBy === "plan") {
        const planOrder = { free: 0, pro: 1, premium: 2 };
        comparison = planOrder[a.required_plan] - planOrder[b.required_plan];
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredVoices(filtered);
  }, [selectedLanguage, searchTerm, prebuiltVoices, categoryFilter, genderFilter, sortBy, sortOrder]);

  // ✅ Handle voice recording
  const handleVoiceRecorded = (blob: Blob) => {
    stopAllAudio(); // Stop audio when recording
    clearSelection();

    const tempVoiceId = `rec-${Date.now()}`;
    setSelectedVoice({
      type: 'record',
      id: tempVoiceId,
      name: 'New Recording'
    });

    onVoiceRecorded(blob);
    onVoiceSelect(tempVoiceId, 'history');

    toast({
      title: "Voice Ready",
      description: "Your recorded voice is ready for generation."
    });
  };

  // ✅ Handle history voice selection
  const handleHistoryVoiceSelect = async (voiceId: string) => {
    stopAllAudio(); // Stop audio when selecting history voice
    clearSelection();

    const { data: voice, error } = await supabase
      .from('user_voices')
      .select('id, name')
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

    setSelectedVoice({ type: 'history', id: voiceId, name: voice.name });
    onVoiceSelect(voiceId, 'history');
    toast({
      title: "Voice Selected",
      description: `${voice.name} is ready for generation`
    });
  };

  // ✅ Check if user can access voice
  const canUserAccessVoice = (requiredPlan: string): boolean => {
    return PrebuiltVoiceService.canAccessVoice(
      { required_plan: requiredPlan } as PrebuiltVoice,
      userPlan
    );
  };

  // ✅ Handle prebuilt voice selection with auto-play
  const handlePrebuiltSelect = async (voiceId: string) => {
    const voice = prebuiltVoices.find((v) => v.voice_id === voiceId);
    if (!voice) {
      toast({
        title: "Voice Not Found",
        description: "The selected voice is not available.",
        variant: "destructive"
      });
      return;
    }

    const canAccess = PrebuiltVoiceService.canAccessVoice(voice, userPlan);

    if (!canAccess) {
      toast({
        title: "Upgrade Required",
        description: `This voice requires the ${voice.required_plan} plan.`,
        variant: "destructive"
      });
      return;
    }

    PrebuiltVoiceService.trackVoiceUsage(voiceId);

    // Stop any playing audio
    stopAllAudio();
    clearSelection();

    setSelectedVoice({ type: 'prebuilt', id: voiceId, name: voice.name });
    onVoiceSelect(voiceId, 'prebuilt');

    toast({
      title: "🎙️ Voice Selected",
      description: `${voice.name} is ready to use for generation.`
    });

    // Auto-play the preview
    try {
      let audioUrl: string | null = null;

      if (previewCache.has(voiceId)) {
        audioUrl = previewCache.get(voiceId)!;
      } else if (voice.audio_preview_url) {
        audioUrl = voice.audio_preview_url;
      } else {
        audioUrl = await generateAndPlayPreview(voiceId, voice);
        if (!audioUrl) return;
      }

      const audio = new Audio(audioUrl);
      audio.preload = 'auto';

      audio.onended = () => {
        if (audio === currentAudio) {
          setIsPlaying(false);
          setPlayingVoiceId(null);
          setCurrentAudio(null);
        }
      };

      audio.onerror = () => {
        if (audio === currentAudio) {
          setIsPlaying(false);
          setPlayingVoiceId(null);
          setCurrentAudio(null);

          if (voice.audio_preview_url === audioUrl) {
            setPreviewCache(prev => {
              const newCache = new Map(prev);
              newCache.delete(voiceId);
              return newCache;
            });
          }

          toast({
            title: "Playback Error",
            description: "Unable to play voice preview",
            variant: "destructive"
          });
        }
      };

      setCurrentAudio(audio);
      setPlayingVoiceId(voiceId);
      setIsPlaying(true);

      await audio.play();

    } catch (error) {
      setIsPlaying(false);
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      console.log("Auto-play prevented or failed:", error);
    }
  };

  // ✅ Play prebuilt sample
  const playPrebuiltSample = async (voiceId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    // If clicking the same voice that's playing - STOP it
    if (playingVoiceId === voiceId && currentAudio) {
      stopAllAudio();
      return;
    }

    // Stop any other playing audio
    stopAllAudio();

    const voice = prebuiltVoices.find(v => v.voice_id === voiceId);
    if (!voice) return;

    try {
      let audioUrl: string | null = null;

      if (previewCache.has(voiceId)) {
        audioUrl = previewCache.get(voiceId)!;
      } else if (voice.audio_preview_url) {
        audioUrl = voice.audio_preview_url;
      } else {
        audioUrl = await generateAndPlayPreview(voiceId, voice);
        if (!audioUrl) return;
      }

      const audio = new Audio(audioUrl);
      audio.preload = 'auto';

      audio.onended = () => {
        if (audio === currentAudio) {
          setIsPlaying(false);
          setPlayingVoiceId(null);
          setCurrentAudio(null);
        }
      };

      audio.onerror = () => {
        if (audio === currentAudio) {
          setIsPlaying(false);
          setPlayingVoiceId(null);
          setCurrentAudio(null);

          if (voice.audio_preview_url === audioUrl) {
            setPreviewCache(prev => {
              const newCache = new Map(prev);
              newCache.delete(voiceId);
              return newCache;
            });
          }

          toast({
            title: "Playback Error",
            description: "Unable to play voice preview",
            variant: "destructive"
          });
        }
      };

      setCurrentAudio(audio);
      setPlayingVoiceId(voiceId);
      setIsPlaying(true);

      await audio.play();

    } catch (error) {
      setIsPlaying(false);
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      toast({
        title: "Playback Error",
        description: "Unable to play voice preview",
        variant: "destructive"
      });
    }
  };

  // Generate preview - returns the URL
  const generateAndPlayPreview = async (voiceId: string, voice: PrebuiltVoice): Promise<string | null> => {
    setGeneratingPreview(voiceId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const sampleText = sampleParagraphs[voice.language] || sampleParagraphs["en-US"];

      const { data, error } = await supabase.functions.invoke('generate-prebuilt-voice', {
        body: {
          voice_id: voiceId,
        }
      });

      if (error) throw error;
      if (!data?.audio_url) throw new Error("No audio URL returned");

      const audioUrl = data.audio_url;
      setPreviewCache(prev => new Map(prev).set(voiceId, audioUrl));

      return audioUrl;

    } catch (error: any) {
      toast({
        title: "Preview Generation Failed",
        description: error.message || "Could not generate voice preview",
        variant: "destructive"
      });
      return null;
    } finally {
      setGeneratingPreview(null);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setGenderFilter("all");
  };

  // ✅ FIXED: Wrap onNext to stop audio before proceeding
  const handleNext = () => {
    stopAllAudio();
    onNext();
  };

  // ✅ FIXED: Wrap onPrevious to stop audio before going back
  const handlePrevious = () => {
    stopAllAudio();
    onPrevious();
  };

  // ✅ FIXED: Update voice method change to stop audio
  const handleVoiceMethodChange = (method: "record" | "prebuilt" | "history") => {
    stopAllAudio();
    setVoiceMethod(method);
  };

  const categories = Array.from(new Set(prebuiltVoices.map(v => v.category).filter(Boolean)));
  const genders = Array.from(new Set(prebuiltVoices.map(v => v.gender).filter(Boolean)));
  const currentParagraph = sampleParagraphs[selectedLanguage] || sampleParagraphs["hi-IN"];
  const hasActiveFilters = searchTerm || categoryFilter !== "all" || genderFilter !== "all";

  return (
    <div className="space-y-6">
      <Tabs value={voiceMethod} onValueChange={handleVoiceMethodChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="record">
            <Mic className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Record</span>
            <span className="sm:hidden">Record</span>
          </TabsTrigger>
          <TabsTrigger value="prebuilt">
            <Crown className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Prebuilt</span>
            <span className="sm:hidden">Prebuilt</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        {/* RECORD TAB */}
        <TabsContent value="record" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Mic className="h-5 w-5" />
                <span>Record Your Voice</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 text-sm sm:text-base">Sample Text to Read:</h4>
                <p className="text-xs sm:text-sm leading-relaxed">{currentParagraph}</p>
              </div>
              <VoiceRecorder
                onRecordingComplete={handleVoiceRecorded}
                selectedLanguage={selectedLanguage}
                onRecordingStart={clearSelection}
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Read the text naturally at a normal pace</p>
                <p>• Ensure good audio quality and minimal background noise</p>
                <p>• Recording should be at least 10 seconds long</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Clock className="h-5 w-5" />
                <span>Your Voice History</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <VoiceHistoryDropdown
                onVoiceSelect={handleHistoryVoiceSelect}
                selectedVoiceId={selectedVoice?.type === 'history' ? selectedVoice.id : ''}
                selectedLanguage={selectedLanguage}
              />
              <div className="text-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/terms")}
                >
                  Learn More About History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREBUILT TAB */}
        <TabsContent value="prebuilt" className="space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center space-x-2 text-sm sm:text-base md:text-lg">
                  <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Prebuilt Voices</span>
                </CardTitle>
                <Badge variant={userPlan === 'free' ? 'secondary' : 'default'} className="w-fit text-xs sm:text-sm">
                  {userPlan === 'free' ? 'Free Plan' : userPlan === 'pro' ? 'Pro Plan' : 'Premium Plan'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-3 md:px-4">
              {loadingVoices ? (
                <div className="text-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading voices...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPlan === 'free' && (
                    <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                      <AlertDescription className="text-xs sm:text-sm">
                        You can browse all voices but only use Free voices.{' '}
                        <Button
                          variant="link"
                          className="p-0 h-auto text-amber-900 font-semibold underline"
                          onClick={() => window.open("/payment", "_blank")}
                        >
                          Upgrade
                        </Button>
                        {' '}to unlock Pro and Premium voices.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search voices by name, description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat} className="capitalize">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={genderFilter} onValueChange={setGenderFilter}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        {genders.map(gender => (
                          <SelectItem key={gender} value={gender} className="capitalize">
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        className="w-full sm:w-auto"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Sorting Controls */}
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Sort by:</span>
                      <Select value={sortBy} onValueChange={(value: "name" | "usage" | "plan") => setSortBy(value)}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="usage">Usage</SelectItem>
                          <SelectItem value="plan">Plan</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        className={`px-2 ${sortOrder === "asc" ? "text-green-500" : "text-red-500"}`}
                      >
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </Button>
                    </div>
                  </div>

                  {/* Voice List */}
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {filteredVoices.length > 0 ? (
                      filteredVoices.map((voice) => {
                        const canAccess = canUserAccessVoice(voice.required_plan);
                        const isSelected = selectedVoice?.id === voice.voice_id;
                        const isCurrentlyPlaying = playingVoiceId === voice.voice_id && isPlaying;
                        const isGenerating = generatingPreview === voice.voice_id;

                        return (
                          <div
                            key={voice.id}
                            onClick={() => handlePrebuiltSelect(voice.voice_id)}
                            className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                              !canAccess ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''
                            } ${isSelected ? "border-primary bg-primary/5 shadow-md ring-primary/20" : "hover:border-primary/50"}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-medium text-sm sm:text-base truncate">
                                    {voice.name}
                                  </h4>
                                  {!canAccess && (
                                    <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  )}
                                  {isSelected && (
                                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {voice.description}
                                </p>
                                <div className="flex gap-1 flex-wrap items-center">
                                  <Badge variant="secondary" className="text-xs">
                                    {voice.required_plan}
                                  </Badge>
                                  {voice.category && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {voice.category}
                                    </Badge>
                                  )}
                                  {voice.gender && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {voice.gender}
                                    </Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-auto h-9 w-9 flex-shrink-0 hover:bg-transparent focus-visible:ring-0"
                                    onClick={(e) => playPrebuiltSample(voice.voice_id, e)}
                                    disabled={isGenerating}
                                  >
                                    {isGenerating ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isCurrentlyPlaying ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-muted-foreground mb-4">
                          <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p className="text-sm font-medium mb-1">
                            {prebuiltVoices.length === 0
                              ? "No voices available"
                              : "No voices found"
                            }
                          </p>
                          <p className="text-xs">
                            {prebuiltVoices.length === 0
                              ? "Please check your internet connection or try again later"
                              : "Try adjusting your search or filters"
                            }
                          </p>
                        </div>
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAllFilters}
                          >
                            Clear All Filters
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Voice Count Info */}
                  {filteredVoices.length > 0 && (
                    <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                      {selectedLanguage
                        ? `Showing ${filteredVoices.length} of ${prebuiltVoices.filter(v => v.language === selectedLanguage).length} voices for ${selectedLanguage}`
                        : `Showing ${filteredVoices.length} of ${prebuiltVoices.length} voices across all languages`}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selection Confirmation */}
      {selectedVoice && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong className="font-semibold">{selectedVoice.name}</strong> is selected and ready for generation.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation Buttons - USING WRAPPED FUNCTIONS */}
      <div className="flex justify-between pt-4 gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          className="px-6"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedVoice}
          size="lg"
          className="px-6 sm:px-8"
        >
          Continue to Generate
        </Button>
      </div>
    </div>
  );
}