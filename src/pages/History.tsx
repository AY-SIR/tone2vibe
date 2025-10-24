import { useState, useRef, useEffect, useMemo } from "react";
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
  AlertDialogOverlay,
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

// ====================================================================
// AudioDownloadDropdown Component - Modern Solution with FFmpeg
// ====================================================================
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

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/convert-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            audioUrl,
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

  const handleDownloadAll = async () => {
    const formats = ["mp3", "wav", "flac"];

    toast({
      title: "Downloading All Formats",
      description: "Starting downloads for MP3, WAV, and FLAC...",
    });

    for (const format of formats) {
      await handleDownload(format);
      await new Promise(resolve => setTimeout(resolve, 500));
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

type UserVoice = {
  id: string;
  name: string;
  audio_url: string;
  created_at: string;
  duration: string | null;
  language: string | null;
};

// ====================================================================
// ShowMoreText Component - Shows 2 lines with expand/collapse
// ====================================================================
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

const History = () => {
  const { user, profile } = useAuth();
  const { projects: projectsFromHook, loading: projectsLoading, error: projectsError, retentionInfo } = useVoiceHistory();

  const [searchTerm, setSearchTerm] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);

  const [projects, setProjects] = useState(projectsFromHook || []);
  const [userVoices, setUserVoices] = useState<UserVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<HistoryItem | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setProjects(projectsFromHook || []);
  }, [projectsFromHook]);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    if (!user) {
      setVoicesLoading(false);
      return;
    }

    const fetchUserVoices = async () => {
      setVoicesLoading(true);
      setVoicesError(null);
      try {
        const { data, error } = await (supabase as any)
          .from("user_voices")
          .select("id, name, audio_url, created_at, duration, language")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setUserVoices(data || []);
      } catch (err: any) {
        setVoicesError("Failed to fetch recorded voices.");
      } finally {
        setVoicesLoading(false);
      }
    };

    fetchUserVoices();
  }, [user]);

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
            const url = new URL(itemToDelete.audio_url);
            const bucketName = isRecorded ? "user-voices" : "generated-voices";
            const pathParts = url.pathname.split("/");
            const bucketIndex = pathParts.indexOf(bucketName);

            if (bucketIndex > -1 && bucketIndex < pathParts.length - 1) {
              const filePath = pathParts.slice(bucketIndex + 1).join("/");
              const { error: storageError } = await supabase.storage.from(bucketName).remove([filePath]);
              if (storageError) console.error(`Storage Error:`, storageError.message);
            }
        } catch (e) {
            console.warn("Could not process storage deletion for invalid URL:", itemToDelete.audio_url);
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
      return;
    }

    if (!project.audio_url) {
      toast({
        title: "Audio Not Available",
        description: "This audio file is no longer available. It may have been deleted.",
        variant: "destructive"
      });
      return;
    }

    setLoadingAudio(project.id);

    try {
      let audioUrl = project.audio_url;

      if (project.source_type === "recorded") {
        try {
          const url = new URL(project.audio_url);
          const bucketName = "user-voices";
          const pathParts = url.pathname.split("/");
          const bucketIndex = pathParts.indexOf(bucketName);
          if (bucketIndex > -1 && bucketIndex < pathParts.length - 1) {
            const filePath = pathParts.slice(bucketIndex + 1).join("/");
            const { data: signedData, error } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 3600);
            if (error) throw error;
            audioUrl = signedData.signedUrl;
          }
        } catch (e) {
          if (e instanceof TypeError) {
            toast({
              title: "Cannot Play Audio",
              description: "This recording format is not supported.",
              variant: "destructive",
            });
            setPlayingAudio(null);
            setLoadingAudio(null);
            return;
          }
          throw e;
        }
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingAudio(null);
        setLoadingAudio(null);
      };

      audio.onerror = () => {
        toast({
          title: "Playback Error",
          description: "The audio file could not be loaded. It may be corrupted or expired.",
          variant: "destructive"
        });
        setPlayingAudio(null);
        setLoadingAudio(null);
      };

      await audio.play();
      setPlayingAudio(project.id);
      setLoadingAudio(null);
    } catch (err: any) {
      console.error("Audio playback failed:", err);
      let description = "Could not play the audio file. Please try again.";

      if (err.message?.includes('network')) {
        description = "Network error. Check your connection and try again.";
      } else if (err.message?.includes('expired')) {
        description = "This audio file has expired. Please generate a new one.";
      }

      toast({
        title: "Playback Failed",
        description: description,
        variant: "destructive"
      });
      setPlayingAudio(null);
      setLoadingAudio(null);
    }
  };

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
        <AlertDialogOverlay className="fixed inset-0 bg-black/0" />
        <AlertDialogContent className="w-[95vw] max-w-lg rounded-lg m- sm:m-auto">
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
};

const ProjectCard = ({ project, playingAudio, loadingAudio, onPlay, onDelete, isDeleting }: {
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
              {type === "generated" ? <Volume2 className="h-4 w-4 text-primary" /> : <Mic className="h-4 w-4 text-primary" />}
              <span className="truncate">{project.title}</span>
            </CardTitle>
            <div className="flex items-center flex-wrap gap-1 sm:gap-2 mt-2">
              <Badge variant="outline" className={`text-xs ${type === "generated" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-primary"}`}>
                {type === "generated" ? "AI Generated" : "User Recorded"}
              </Badge>
              {project.language && project.language !== 'N/A' && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">{project.language}</Badge>
              )}
              {type === 'generated' && project.word_count > 0 && <Badge variant="secondary" className="text-xs">{project.word_count} words</Badge>}
              {(type === 'recorded' || type === 'generated') && project.duration && project.duration !== '--:--' && <Badge variant="secondary" className="text-xs">{project.duration}</Badge>}
              {project.processing_time_ms && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">{(project.processing_time_ms / 1000).toFixed(1)}s</Badge>}
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
              <Button onClick={() => onDelete(project)} variant="outline" size="sm" disabled={!!isDeleting} className="h-7 sm:h-8 px-2 sm:px-3 text-destructive hover:bg-destructive/10 hover:text-destructive">
                {isDeleting ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>{new Date(project.created_at).toLocaleDateString()}</span>
            <span>{type === "generated" && project.generation_started_at ? new Date(project.generation_started_at).toLocaleTimeString() : new Date(project.created_at).toLocaleTimeString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default History;