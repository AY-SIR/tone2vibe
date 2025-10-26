import { useState, useRef, useEffect, useMemo, memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Pause,
  Search,
  Filter,
  ArrowLeft,
  Mic,
  Volume2,
  Trash2,
  Loader2,
  Download,
} from "lucide-react";
import { useVoiceHistory } from "@/hooks/useVoiceHistory";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CardSkeleton } from "@/components/common/Skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ============================================
// UTILITY: Clean Storage Path
// ============================================
const cleanStoragePath = (rawPath: string, bucket: string): string => {
  if (!rawPath) return '';

  let path = rawPath.trim();

  // If it's already a clean path (userId/filename.ext), return it
  if (!path.includes('http') &&
      !path.includes('/storage/') &&
      !path.startsWith('/') &&
      path.split('/').length === 2) {
    return path;
  }

  // Remove protocol and domain if present
  path = path.replace(/^https?:\/\/[^\/]+/, '');

  // Remove storage API paths
  path = path.replace(/^\/storage\/v1\/object\/(public|sign)\//, '');

  // Remove leading slashes
  path = path.replace(/^\/+/, '');

  // Remove bucket name if present
  path = path.replace(new RegExp(`^${bucket}/`), '');

  // Remove query strings
  path = path.replace(/\?.*$/, '');

  // Final cleanup
  path = path.replace(/^\/+/, '');

  return path;
};

// ============================================
// TYPES
// ============================================
type HistoryItem = {
  id: string;
  title: string;
  audio_url: string;
  created_at: string;
  original_text: string;
  language: string;
  word_count: number;
  duration: string | null;
  duration_seconds?: number | null;
  source_type: "generated" | "recorded";
  processing_time_ms?: number;
  generation_started_at?: string;
};

type UserVoice = {
  id: string;
  name: string;
  audio_url: string;
  created_at: string;
  duration: string | null;
  language: string | null;
};

// ============================================
// AUDIO DOWNLOAD DROPDOWN COMPONENT
// ============================================
const AudioDownloadDropdown = ({
  audioUrl,
  fileName,
  sourceType
}: {
  audioUrl: string;
  fileName: string;
  sourceType: "generated" | "recorded";
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  if (!audioUrl) return null;

  const handleDownload = async (format: string) => {
    setDownloading(format);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const bucket = sourceType === "recorded" ? "user-voices" : "user-generates";
      const cleanPath = cleanStoragePath(audioUrl, bucket);

      // Get token for streaming
      const tokenResponse = await fetch(
        `${supabase.supabaseUrl}/functions/v1/issue-audio-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            bucket,
            storagePath: cleanPath,
            ttlSeconds: 3600
          })
        }
      );

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to get download token');
      }

      const tokenData = await tokenResponse.json();
      if (!tokenData.ok || !tokenData.token) {
        throw new Error('Invalid token response');
      }

      const streamUrl = `${supabase.supabaseUrl}/functions/v1/stream-audio?token=${tokenData.token}`;

      // Call convert-audio with the authenticated stream URL
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/convert-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            audioUrl: streamUrl,
            format,
            sourceType,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Conversion failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `${fileName}.${format} has been downloaded successfully.`,
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download audio file.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const formats = [
    { value: "mp3", label: "MP3", desc: "Universal compatibility" },
    { value: "wav", label: "WAV", desc: "Lossless quality" },
    { value: "flac", label: "FLAC", desc: "Compressed lossless" },
    { value: "ogg", label: "OGG", desc: "Open format" },
    { value: "aac", label: "AAC", desc: "Modern codec" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3"
          disabled={!!downloading}
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs">{downloading.toUpperCase()}</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span className="sr-only">Download options</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" sideOffset={5} className="w-56">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Single Format
        </div>
        {formats.map((format) => (
          <DropdownMenuItem
            key={format.value}
            onSelect={() => handleDownload(format.value)}
            disabled={!!downloading}
            className="flex flex-col items-start py-2"
          >
            <div className="font-medium">{format.label}</div>
            <div className="text-xs text-muted-foreground">{format.desc}</div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ============================================
// SHOW MORE TEXT COMPONENT
// ============================================
const ShowMoreText = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <div className="mb-3">
      <p className={`text-xs sm:text-sm text-muted-foreground ${!expanded ? 'line-clamp-2' : ''}`}>
        {text}
      </p>
      {text.length > 100 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline mt-1 font-medium"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

// ============================================
// PROJECT CARD COMPONENT
// ============================================
const ProjectCard = memo(({
  project,
  playingAudio,
  loadingAudio,
  onPlay,
  onDelete,
  isDeleting
}: {
  project: HistoryItem;
  playingAudio: string | null;
  loadingAudio: string | null;
  onPlay: (project: HistoryItem) => void;
  onDelete?: (project: HistoryItem) => void;
  isDeleting?: boolean;
}) => {
  const type = project.source_type;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center space-x-2 truncate">
              {type === "generated" ? (
                <Volume2 className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <Mic className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              <span className="truncate">{project.title}</span>
            </CardTitle>
            <div className="flex items-center flex-wrap gap-1 sm:gap-2 mt-2">
              <Badge
                variant="outline"
                className={`text-xs ${
                  type === "generated"
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary/10 text-primary"
                }`}
              >
                {type === "generated" ? "AI Generated" : "User Recorded"}
              </Badge>
              {project.language && project.language !== 'N/A' && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                  {project.language}
                </Badge>
              )}
              {type === 'generated' && project.word_count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {project.word_count} words
                </Badge>
              )}
              {project.duration && project.duration !== '--:--' && (
                <Badge variant="secondary" className="text-xs">
                  {project.duration}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 p-3 sm:p-6">
        {type === 'generated' && project.original_text && (
          <ShowMoreText text={project.original_text} />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              onClick={() => onPlay(project)}
              variant="outline"
              size="sm"
              disabled={!project.audio_url || !!isDeleting || loadingAudio === project.id}
              className="h-7 sm:h-8 px-2 sm:px-3"
            >
              {loadingAudio === project.id ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : playingAudio === project.id ? (
                <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Play className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>

            <AudioDownloadDropdown
              audioUrl={project.audio_url}
              fileName={project.title}
              sourceType={project.source_type}
            />

            {onDelete && (
              <Button
                onClick={() => onDelete(project)}
                variant="outline"
                size="sm"
                disabled={!!isDeleting}
                className="h-7 sm:h-8 px-2 sm:px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>{new Date(project.created_at).toLocaleDateString()}</span>
            <span>
              {type === "generated" && project.generation_started_at
                ? new Date(project.generation_started_at).toLocaleTimeString()
                : new Date(project.created_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ProjectCard.displayName = 'ProjectCard';

// ============================================
// MAIN HISTORY COMPONENT
// ============================================
const History = memo(() => {
  const { user, profile } = useAuth();
  const { projects: projectsFromHook, loading: projectsLoading, error: projectsError, retentionInfo } = useVoiceHistory();

  const [searchTerm, setSearchTerm] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [loadingAudioMeta, setLoadingAudioMeta] = useState<Record<string, boolean>>({});

  const [projects, setProjects] = useState(projectsFromHook || []);
  const [userVoices, setUserVoices] = useState<UserVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<HistoryItem | null>(null);
  const [voicesFetched, setVoicesFetched] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const audioBlobCacheRef = useRef<Map<string, string>>(new Map());
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setProjects(projectsFromHook || []);
  }, [projectsFromHook]);

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

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || voicesFetched) {
      return;
    }

    let isMounted = true;

    const fetchUserVoices = async () => {
      setVoicesLoading(true);
      setVoicesError(null);
      try {
        const { data, error } = await supabase
          .from("user_voices")
          .select("id, name, audio_url, created_at, duration, language")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (isMounted) {
          setUserVoices(data || []);
          setVoicesFetched(true);
        }
      } catch (err: any) {
        if (isMounted) {
          setVoicesError("Failed to fetch recorded voices.");
        }
      } finally {
        if (isMounted) {
          setVoicesLoading(false);
        }
      }
    };

    fetchUserVoices();

    return () => {
      isMounted = false;
    };
  }, [user, voicesFetched]);

  const handleDeleteRequest = (itemToDelete: HistoryItem) => {
    setDeleteCandidate(itemToDelete);
  };

  const executeDelete = async () => {
    if (!deleteCandidate) return;

    const itemToDelete = deleteCandidate;
    setIsDeleting(itemToDelete.id);
    setDeleteCandidate(null);

    try {
      const isRecorded = itemToDelete.source_type === "recorded";
      const tableName = isRecorded ? "user_voices" : "history";

      const { error: dbError } = await supabase.from(tableName).delete().eq("id", itemToDelete.id);
      if (dbError) throw new Error(`Database Error: ${dbError.message}`);

      if (itemToDelete.audio_url) {
        try {
          const bucket = isRecorded ? 'user-voices' : 'user-generates';
          const cleanPath = cleanStoragePath(itemToDelete.audio_url, bucket);

          const { error: storageError } = await supabase.storage.from(bucket).remove([cleanPath]);
          if (storageError) console.error('Storage Error:', storageError.message);
        } catch (e) {
          console.warn('Could not process storage deletion:', e);
        }
      }

      if (isRecorded) {
        setUserVoices((current) => current.filter((v) => v.id !== itemToDelete.id));
      } else {
        setProjects((current) => current.filter((p) => p.id !== itemToDelete.id));
      }

      toast({ title: "Item Deleted", description: `"${itemToDelete.title}" has been removed.` });
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDuration = (duration: string | number | null, durationSeconds?: number | null) => {
    if (durationSeconds !== null && durationSeconds !== undefined) {
      const totalSeconds = durationSeconds;
      if (isNaN(totalSeconds) || totalSeconds < 0) return "--:--";
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    if (!duration) return "--:--";
    const totalSeconds = typeof duration === "string" ? parseInt(duration, 10) : duration;
    if (isNaN(totalSeconds) || totalSeconds < 0) return "--:--";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const allItems = useMemo((): HistoryItem[] => {
    const generatedItems = projects.map((p) => ({
      ...p,
      title: p.title,
      duration: formatDuration(null, p.duration_seconds),
      duration_seconds: p.duration_seconds,
      source_type: "generated" as const
    }));
    const recordedItems = userVoices.map((v) => ({
      id: v.id,
      title: v.name,
      audio_url: v.audio_url,
      created_at: v.created_at,
      original_text: "",
      language: v.language || "N/A",
      word_count: 0,
      duration: formatDuration(v.duration),
      source_type: "recorded" as const,
    }));
    return [...generatedItems, ...recordedItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [projects, userVoices]);

  const playAudio = async (project: HistoryItem) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }

    if (playingAudio === project.id) {
      setPlayingAudio(null);
      setLoadingAudio(null);
      audioRef.current = null;
      audioBlobUrlRef.current = null;
      return;
    }

    if (!project.audio_url) {
      toast({
        title: "Audio Not Available",
        description: "This audio file is no longer available.",
        variant: "destructive"
      });
      return;
    }

    setLoadingAudio(project.id);

    try {
      let blobUrl: string;

      if (audioBlobCacheRef.current.has(project.id)) {
        blobUrl = audioBlobCacheRef.current.get(project.id)!;
      } else {
        const bucket = project.source_type === "recorded" ? "user-voices" : "user-generates";
        const cleanPath = cleanStoragePath(project.audio_url, bucket);

        const pathParts = cleanPath.split('/');
        if (pathParts.length !== 2) {
          throw new Error("Invalid audio path format");
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error("Not authenticated");
        }

        const tokenRequestBody = {
          bucket: bucket,
          storagePath: cleanPath,
          ttlSeconds: 86400
        };

        const tokenResponse = await fetch(
          `${supabase.supabaseUrl}/functions/v1/issue-audio-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(tokenRequestBody)
          }
        );

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(errorData.error || 'Failed to get playback token');
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.ok || !tokenData.token) {
          throw new Error('Invalid token response');
        }

        const streamUrl = `${supabase.supabaseUrl}/functions/v1/stream-audio?token=${tokenData.token}`;

        const audioResponse = await fetch(streamUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!audioResponse.ok) {
          const errorText = await audioResponse.text();
          throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
        }

        const audioBlob = await audioResponse.blob();
        blobUrl = URL.createObjectURL(audioBlob);

        audioBlobCacheRef.current.set(project.id, blobUrl);
      }

      audioBlobUrlRef.current = blobUrl;
      const audio = new Audio(blobUrl);

      setLoadingAudioMeta((m) => ({ ...m, [project.id]: true }));

      audio.onloadedmetadata = () => {
        setLoadingAudioMeta((m) => ({ ...m, [project.id]: false }));
      };

      audioRef.current = audio;

      audio.onended = () => {
        setPlayingAudio(null);
        setLoadingAudio(null);
        audioBlobUrlRef.current = null;
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        toast({
          title: "Playback Error",
          description: "The audio file could not be loaded.",
          variant: "destructive"
        });
        setPlayingAudio(null);
        setLoadingAudio(null);

        if (audioBlobCacheRef.current.has(project.id)) {
          URL.revokeObjectURL(audioBlobCacheRef.current.get(project.id)!);
          audioBlobCacheRef.current.delete(project.id);
        }
      };

      await audio.play();

      setPlayingAudio(project.id);
      setLoadingAudio(null);

    } catch (err: any) {
      console.error("Playback failed:", err.message);

      toast({
        title: "Playback Failed",
        description: err.message || "Could not play the audio file.",
        variant: "destructive"
      });

      setPlayingAudio(null);
      setLoadingAudio(null);
    }
  };

  const loading = projectsLoading || voicesLoading;
  const error = projectsError || voicesError;

  if (!user) return null;
  if (loading)
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto space-y-6">
          <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
        </div>
      </div>
    );

  const filteredItems = allItems.filter((item) => {
    const searchHaystack = `${item.title} ${item.original_text}`.toLowerCase();
    const matchesSearch = searchHaystack.includes(searchTerm.toLowerCase());
    const matchesLanguage = languageFilter === "all" || item.language === languageFilter;
    return matchesSearch && matchesLanguage;
  });

  const generatedVoices = filteredItems.filter((p) => p.source_type === "generated");
  const recordedVoices = filteredItems.filter((p) => p.source_type === "recorded");
  const languages = Array.from(new Set(allItems.map((p) => p.language).filter(lang => lang && lang !== 'N/A')));

  return (
    <div className="min-h-screen bg-background py-2 px-2 sm:py-4 sm:px-4 lg:px-8">
      <div className="mx-auto">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              size="sm"
              className="flex items-center space-x-1 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Back to Home</span>
            </Button>
            <Badge variant="outline" className="text-xs">
              {profile?.plan?.charAt(0).toUpperCase() + profile?.plan?.slice(1)} Plan
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mb-2">Voice History</h1>
          <p className="text-xs mt-2 sm:text-sm text-muted-foreground">
            Your voice projects • {retentionInfo("all")} retention (from plan start)
          </p>
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="text-xs sm:text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{profile?.plan}</Badge>
              <span>
                Retention: {retentionInfo("all")} • {generatedVoices.length} of {projects.length} generated items shown
              </span>
            </div>
          </div>
        </div>

        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs sm:text-sm"
                />
              </div>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-full sm:w-48 text-xs sm:text-sm">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="generated" className="w-full mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generated" className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Voice Generation</span>
                  <span className="inline sm:hidden">AI Voice</span>
                </TabsTrigger>
                <TabsTrigger value="recorded" className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  <span className="hidden sm:inline">User Recorded Voice</span>
                  <span className="inline sm:hidden">Recorded</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="generated">
                {generatedVoices.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4 mt-4">
                    <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-lg">
                      <Volume2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Generated Voice Projects</span>
                    </div>
                    {generatedVoices.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        playingAudio={playingAudio}
                        loadingAudio={loadingAudio}
                        onPlay={playAudio}
                        onDelete={handleDeleteRequest}
                        isDeleting={isDeleting === project.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 sm:p-8">
                    <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                      No generated voice projects found.
                    </p>
                    <Button onClick={() => navigate("/tool")} size="sm">Create a New Voice</Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recorded">
                {recordedVoices.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4 mt-4">
                    <div className="flex items-center gap-2 mb-4 p-3 bg-secondary/5 rounded-lg">
                      <Mic className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">User Recorded Voice</span>
                    </div>
                    {recordedVoices.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        playingAudio={playingAudio}
                        loadingAudio={loadingAudio}
                        onPlay={playAudio}
                        onDelete={handleDeleteRequest}
                        isDeleting={isDeleting === project.id}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center p-6 sm:p-8">
                    No recorded voices found.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-4 sm:mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="p-3 sm:p-4">
              <p className="text-destructive text-xs sm:text-sm">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteCandidate} onOpenChange={(isOpen) => !isOpen && setDeleteCandidate(null)}>
        <AlertDialogContent className="w-[95vw] max-w-lg rounded-lg">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-lg font-semibold">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
              This action cannot be undone. This will permanently delete the item titled{" "}
              <span className="font-semibold text-foreground">"{deleteCandidate?.title}"</span>{" "}
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

History.displayName = 'History';

export default History;