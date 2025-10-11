// src/components/tool/VoiceHistoryDropdown.tsx
import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Mic } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// NOTE: This could be moved to a shared constants/data file
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
    return language ? language.nativeName : code; // Fallback to code if not found
};

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

export const VoiceHistoryDropdown = ({ onVoiceSelect, selectedVoiceId, selectedLanguage }: VoiceHistoryDropdownProps) => {
  const [voices, setVoices] = useState<UserVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

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
        
        // Optimized query: only fetch necessary fields
        const { data, error } = await supabase
          .from("user_voices")
          .select("id, name, created_at, audio_url")
          .eq("user_id", user.id)
          .eq("language", selectedLanguage)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        setVoices(data || []);
      } catch {
        toast({
          title: "Could not load voices",
          description: "Please try again later",
          variant: "default",
        });
        setVoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserVoices();
  }, [user, profile?.plan, selectedLanguage]);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  };

  const playVoice = async (voice: UserVoice) => {
    if (!voice.audio_url) {
      toast({ title: "No audio found", description: "This voice cannot be played", variant: "default" });
      return;
    }

    if (playingVoiceId === voice.id) { stopPlayback(); return; }
    stopPlayback();

    try {
      // Enhanced path extraction with better error handling
      const getPathFromUrl = (url: string) => {
        try {
          // Handle both full URLs and direct paths
          if (!url.startsWith('http')) return url;
          
          const u = new URL(url);
          const pathParts = u.pathname.split('/user-voices/');
          if (pathParts.length > 1) {
            return pathParts[1];
          }
          // Fallback: return full pathname without leading slash
          return u.pathname.startsWith('/') ? u.pathname.substring(1) : u.pathname;
        } catch (err) {
          console.error('URL parsing error:', err);
          // If it's not a URL, assume it's a direct path
          return url.replace(/^\/+/, '');
        }
      };

      const path = getPathFromUrl(voice.audio_url);
      if (!path || path.length === 0) {
        throw new Error('Could not extract valid path from audio URL');
      }

      // Get signed URL with extended expiry
      const { data: signed, error: signErr } = await supabase.storage
        .from('user-voices')
        .createSignedUrl(path, 7200); // 2 hours
        
      if (signErr) {
        console.error('Signed URL error:', signErr);
        throw new Error('Failed to get audio access');
      }
      
      if (!signed?.signedUrl) {
        throw new Error('No signed URL returned');
      }

      // Create and configure audio element
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = signed.signedUrl;
      
      audioRef.current = audio;
      setPlayingVoiceId(voice.id);

      audio.onended = () => {
        setPlayingVoiceId(null);
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        stopPlayback();
        toast({ 
          title: "Playback failed", 
          description: "Could not play this audio. The file may be corrupted or expired.",
          variant: "default" 
        });
      };

      // Attempt playback
      await audio.play().catch(err => {
        console.error('Play() failed:', err);
        throw new Error('Audio playback was blocked or failed');
      });
      
    } catch (error) {
      console.error('Voice playback error:', error);
      stopPlayback();
      toast({ 
        title: "Could not play voice", 
        description: error instanceof Error ? error.message : "Please try again",
        variant: "default" 
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

      <Select
        value={selectedVoiceId}
        onValueChange={(voiceId) => {
          onVoiceSelect(voiceId);
        }}
      >
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
                  {/* CHANGE IS HERE */}
                  {voice.created_at ? new Date(voice.created_at).toLocaleString() : "No date"}
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
                {/* AND CHANGE IS HERE */}
                Created: {new Date(selectedVoiceDetails.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex space-x-1 flex-shrink-0">
              <Button
                onClick={() => playVoice(selectedVoiceDetails)}
                variant="outline"
                size="icon"
                className="h-8 w-8"
                title={selectedVoiceDetails.audio_url ? "Play/Pause" : "Not available"}
                disabled={!selectedVoiceDetails.audio_url}
              >
                {playingVoiceId === selectedVoiceDetails.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};