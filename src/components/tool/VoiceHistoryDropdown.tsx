import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Mic, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://msbmyiqhohtjdfbjmxlf.supabase.co";

// ============================================
// UTILITY: Clean Storage Path
// ============================================
const cleanStoragePath = (rawPath: string, bucket: string): string => {
  if (!rawPath) return '';

  let path = rawPath.trim();

  if (!path.includes('http') &&
      !path.includes('/storage/') &&
      !path.startsWith('/') &&
      path.split('/').length === 2) {
    return path;
  }

  path = path.replace(/^https?:\/\/[^\/]+/, '');
  path = path.replace(/^\/storage\/v1\/object\/(public|sign)\//, '');
  path = path.replace(/^\/+/, '');
  path = path.replace(new RegExp(`^${bucket}/`), '');
  path = path.replace(/\?.*$/, '');
  path = path.replace(/^\/+/, '');

  return path;
};

// ============================================
// LANGUAGE DATA
// ============================================
const languages = [
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', nativeName: 'العربية' },
  { code: 'as-IN', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'bn-BD', name: 'Bengali (Bangladesh)', nativeName: 'বাংলা' },
  { code: 'bn-IN', name: 'Bengali (India)', nativeName: 'বাংলা' },
  { code: 'bg-BG', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'hr-HR', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'cs-CZ', name: 'Czech', nativeName: 'Čeština' },
  { code: 'da-DK', name: 'Danish', nativeName: 'Dansk' },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English' },
  { code: 'fi-FI', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français' },
  { code: 'fr-FR', name: 'French (France)', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'el-GR', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'he-IL', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'id-ID', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'lt-LT', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'ms-MY', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ne-IN', name: 'Nepali (India)', nativeName: 'नेपाली' },
  { code: 'no-NO', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'or-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'fa-IR', name: 'Persian (Farsi)', nativeName: 'فارسی' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ro-RO', name: 'Romanian', nativeName: 'Română' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { code: 'sr-RS', name: 'Serbian', nativeName: 'Српски' },
  { code: 'sk-SK', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl-SI', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español' },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español' },
  { code: 'sv-SE', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'th-TH', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk-UA', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ur-IN', name: 'Urdu (India)', nativeName: 'اردو' },
  { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt' }
];

const getLanguageNativeName = (code: string) => {
  const language = languages.find(lang => lang.code === code);
  return language ? language.nativeName : code;
};

// ============================================
// TYPES
// ============================================
type UserVoice = {
  id: string;
  name: string;
  created_at: string;
  audio_url: string | null;
};

interface VoiceHistoryDropdownProps {
  onVoiceSelect: (voiceId: string) => void;
  selectedVoiceId?: string;
  selectedLanguage: string;
}

// ============================================
// MAIN COMPONENT
// ============================================
export const VoiceHistoryDropdown = ({
  onVoiceSelect,
  selectedVoiceId,
  selectedLanguage
}: VoiceHistoryDropdownProps) => {
  const [voices, setVoices] = useState<UserVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const audioBlobCacheRef = useRef<Map<string, string>>(new Map());

  const { user, profile } = useAuth();

  const getLimitForPlan = () => {
    switch (profile?.plan) {
      case "premium": return 90;
      case "pro": return 30;
      case "free":
      default: return 3;
    }
  };

  useEffect(() => {
    const fetchUserVoices = async () => {
      if (!user || !selectedLanguage) {
        setVoices([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const limit = getLimitForPlan();

        const { data, error } = await supabase
          .from("user_voices")
          .select("id, name, created_at, audio_url")
          .eq("user_id", user.id)
          .eq("language", selectedLanguage)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        setVoices(data || []);
      } catch (err) {
        console.error("Error fetching voices:", err);
        toast.error("Could not load voices", {
          description: "Please try again later"
        });
        setVoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserVoices();
  }, [user, profile?.plan, selectedLanguage]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
      }
      audioBlobCacheRef.current.forEach((blobUrl) => {
        URL.revokeObjectURL(blobUrl);
      });
      audioBlobCacheRef.current.clear();
    };
  }, []);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
    setLoadingVoiceId(null);
  };

  const playVoice = async (voice: UserVoice) => {
    if (!voice.audio_url) {
      toast.error("No audio found", {
        description: "This voice cannot be played"
      });
      return;
    }

    if (playingVoiceId === voice.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setLoadingVoiceId(voice.id);

    try {
      let blobUrl: string;

      if (audioBlobCacheRef.current.has(voice.id)) {
        blobUrl = audioBlobCacheRef.current.get(voice.id)!;
      } else {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          throw new Error("Not authenticated. Please log in again.");
        }

        const session = sessionData.session;

        const cleanPath = cleanStoragePath(voice.audio_url, 'user-voices');

        if (!cleanPath || cleanPath.length === 0) {
          throw new Error("Invalid audio path");
        }

        const pathParts = cleanPath.split('/');
        if (pathParts.length !== 2) {
          throw new Error("Invalid audio path format");
        }

        const tokenRequestBody = {
          bucket: 'user-voices',
          storagePath: cleanPath,
          ttlSeconds: 86400
        };

        const issueResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/issue-audio-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': session.access_token
            },
            body: JSON.stringify(tokenRequestBody),
          }
        );

        if (!issueResponse.ok) {
          const errorText = await issueResponse.text();
          console.error('Token request failed:', errorText);
          throw new Error(`Failed to create playback token: ${issueResponse.status}`);
        }

        const tokenData = await issueResponse.json();

        if (!tokenData.ok || !tokenData.token) {
          throw new Error('Invalid token response');
        }

        const streamUrl = `${SUPABASE_URL}/functions/v1/stream-audio?token=${tokenData.token}`;

        const audioResponse = await fetch(streamUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!audioResponse.ok) {
          throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
        }

        const audioBlob = await audioResponse.blob();
        blobUrl = URL.createObjectURL(audioBlob);

        audioBlobCacheRef.current.set(voice.id, blobUrl);
      }

      audioBlobUrlRef.current = blobUrl;
      const audio = new Audio(blobUrl);

      audioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceId(null);
        setLoadingVoiceId(null);
        audioBlobUrlRef.current = null;
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        stopPlayback();

        if (audioBlobCacheRef.current.has(voice.id)) {
          URL.revokeObjectURL(audioBlobCacheRef.current.get(voice.id)!);
          audioBlobCacheRef.current.delete(voice.id);
        }

        toast.error("Playback failed", {
          description: "Could not play this audio"
        });
      };

      await audio.play();

      setPlayingVoiceId(voice.id);
      setLoadingVoiceId(null);

    } catch (error) {
      console.error('Voice playback error:', error);
      stopPlayback();
      toast.error("Could not play voice", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    }
  };

  const languageDisplayName = getLanguageNativeName(selectedLanguage);

  if (loading) {
    return <div className="text-sm text-gray-500 p-4 text-center">Loading voices...</div>;
  }

  if (voices.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <Mic className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500 mb-1">No voices found for {languageDisplayName}</p>
          <p className="text-xs text-gray-400">Record a voice to see it here.</p>
        </CardContent>
      </Card>
    );
  }

  const selectedVoiceDetails = voices.find(v => v.id === selectedVoiceId);

  return (
    <div className="space-y-3">
      <div className="text-xs text-blue-600 mb-2">
        Showing last {voices.length} voices for {languageDisplayName} ({profile?.plan} plan)
      </div>

      <Select value={selectedVoiceId} onValueChange={onVoiceSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select a saved voice" />
        </SelectTrigger>
        <SelectContent>
          {voices.map((voice) => (
            <SelectItem
              key={voice.id}
              value={voice.id}
              className={!voice.audio_url ? "text-gray-400 cursor-not-allowed" : ""}
            >
              <div className="flex items-center justify-between w-full">
                <span className="truncate flex-1">{voice.name}</span>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                  {voice.created_at
                    ? new Date(voice.created_at).toLocaleDateString()
                    : "No date"}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedVoiceDetails && (
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{selectedVoiceDetails.name}</p>
              <p className="text-xs text-gray-500">
                Created: {new Date(selectedVoiceDetails.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-1 flex-shrink-0">
              <Button
                onClick={() => playVoice(selectedVoiceDetails)}
                variant="outline"
                size="icon"
                className="h-8 w-8"
                title={selectedVoiceDetails.audio_url ? "Play/Pause" : "Not available"}
                disabled={!selectedVoiceDetails.audio_url || loadingVoiceId === selectedVoiceDetails.id}
              >
                {loadingVoiceId === selectedVoiceDetails.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : playingVoiceId === selectedVoiceDetails.id ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};