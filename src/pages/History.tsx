import { useState, useRef, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Play,
  Pause,
  Download,
  Search,
  Filter,
  ArrowLeft,
  Mic,
  Volume2,
  Hash,
} from "lucide-react";
import { useVoiceHistory } from "@/hooks/useVoiceHistory";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CardSkeleton } from "@/components/common/Skeleton";
import { useNavigate } from "react-router-dom";

const History = () => {
  const { user, profile } = useAuth();
  const { projects, loading, error, retentionInfo } = useVoiceHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showGeneratedVoices, setShowGeneratedVoices] = useState(true);
  const [showRecordedVoices, setShowRecordedVoices] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Cleanup effect to pause audio when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-2 px-2 sm:py-4 sm:px-4 lg:px-8">
        <div className="mx-auto space-y-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.original_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage =
      languageFilter === "all" || project.language === languageFilter;
    return matchesSearch && matchesLanguage;
  });

  // Separate generated and recorded voices with better logic
  const generatedVoices = filteredProjects.filter((project) => {
    const type = project.voice_settings?.type;
    const isAI = type === "generated" || type === "ai_generated" || type === "cloned";
    const isFromGeneration = !type && project.audio_url && project.original_text;
    return isAI || isFromGeneration;
  });

  const recordedVoices = filteredProjects.filter((project) => {
    const type = project.voice_settings?.type;
    const isUserRecorded = type === "recorded" || type === "user_recorded" || type === "uploaded";
    const hasVoiceRecording = project.voice_settings?.has_voice_recording === true;
    return isUserRecorded || hasVoiceRecording;
  });

  const languages = Array.from(new Set(projects.map((p) => p.language)));

  const playAudio = async (project: any) => {
    try {
      // If clicking the currently playing audio, pause it
      if (playingAudio === project.id && audioRef.current) {
        audioRef.current.pause();
        setPlayingAudio(null);
        return;
      }

      // If another audio is playing, pause it first
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (project.audio_url) {
        const audio = new Audio(project.audio_url);
        audioRef.current = audio; // Store instance in ref
        setPlayingAudio(project.id);

        audio.onended = () => {
          setPlayingAudio(null);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setPlayingAudio(null);
          audioRef.current = null;
          toast({
            title: "Playback failed",
            description: "Could not play audio file",
            variant: "destructive",
          });
        };

        await audio.play();
      } else {
        toast({
          title: "No audio available",
          description: "This project doesn't have generated audio",
          variant: "destructive",
        });
      }
    } catch (err) {
      setPlayingAudio(null);
      if (audioRef.current) audioRef.current = null;
      toast({
        title: "Playback error",
        description: "Could not play audio",
        variant: "destructive",
      });
    }
  };

  const downloadAudio = async (project: any) => {
    try {
      if (project.audio_url) {
        const link = document.createElement("a");
        link.href = project.audio_url;
        link.download = `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: "Download started",
          description: "Audio file downloading",
        });
      } else {
        toast({
          title: "No audio to download",
          description: "This project doesn't have generated audio",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Download failed",
        description: "Could not download audio file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background py-2 px-2 sm:py-4 sm:px-4 lg:px-8">
      <div className=" mx-auto">
        {/* Header */}
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
              {profile?.plan?.charAt(0).toUpperCase()}
              {profile?.plan?.slice(1)} Plan
            </Badge>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 mt-2 sm:mb-2">
              Voice History
            </h1>
            <p className="text-xs mt-2 sm:text-sm text-muted-foreground">
              Your generated voice projects • {retentionInfo('all')} retention
            </p>
          </div>
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="text-xs sm:text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {profile?.plan}
              </Badge>
              <span>
                Retention: {retentionInfo('all')} • {filteredProjects.length} of{" "}
                {projects.length} projects shown
              </span>
            </div>
          </div>
        </div>

        {/* Filters and Tabs Card */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            {/* Search and Language Filter */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search projects..."
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
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Enhanced Toggle Switches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* AI Voice Generation Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Volume2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">AI Voice Generation</h3>
                    <p className="text-xs text-muted-foreground">
                      Generated: {generatedVoices.length} projects • ID: #VG{new Date().getFullYear()}
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={showGeneratedVoices} 
                  onCheckedChange={setShowGeneratedVoices}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* User Recorded Voice Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-secondary/10">
                    <Mic className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">User Recorded Voice</h3>
                    <p className="text-xs text-muted-foreground">
                      Recorded: {recordedVoices.length} samples • ID: #UR{new Date().getFullYear()}
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={showRecordedVoices} 
                  onCheckedChange={setShowRecordedVoices}
                  className="data-[state=checked]:bg-secondary"
                />
              </div>
            </div>

            <Tabs defaultValue="generated" className="w-full mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="generated"
                  className="flex items-center gap-2"
                  disabled={!showGeneratedVoices}
                >
                  <Volume2 className="h-4 w-4" />
                  AI Voice Generation
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {generatedVoices.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="recorded"
                  className="flex items-center gap-2"
                  disabled={!showRecordedVoices}
                >
                  <Mic className="h-4 w-4" />
                  User Recorded Voice
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {recordedVoices.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="generated">
                {showGeneratedVoices && generatedVoices.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4 mt-4">
                    <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-lg">
                      <Hash className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Generated Voice Projects - ID: #VG{new Date().getFullYear()}</span>
                    </div>
                    {generatedVoices.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        playingAudio={playingAudio}
                        onPlay={playAudio}
                        onDownload={downloadAudio}
                        type="generated"
                      />
                    ))}
                  </div>
                ) : showGeneratedVoices ? (
                  <div className="text-center p-6 sm:p-8">
                    <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                      No generated voice projects found matching your filters.
                    </p>
                    <Button onClick={() => navigate("/tool")} size="sm">
                      Create a New Voice
                    </Button>
                  </div>
                ) : (
                  <div className="text-center p-6 sm:p-8">
                    <p className="text-muted-foreground text-sm sm:text-base">
                      AI Voice Generation is currently disabled. Enable it using the toggle above.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recorded">
                {showRecordedVoices && recordedVoices.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4 mt-4">
                    <div className="flex items-center gap-2 mb-4 p-3 bg-secondary/5 rounded-lg">
                      <Hash className="h-4 w-4 text-secondary" />
                      <span className="text-sm font-medium">User Recorded Voice Projects - ID: #UR{new Date().getFullYear()}</span>
                    </div>
                    {recordedVoices.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        playingAudio={playingAudio}
                        onPlay={playAudio}
                        onDownload={downloadAudio}
                        type="recorded"
                      />
                    ))}
                  </div>
                ) : showRecordedVoices ? (
                  <p className="text-muted-foreground text-sm text-center p-6 sm:p-8">
                    No recorded voices found matching your filters.
                  </p>
                ) : (
                  <div className="text-center p-6 sm:p-8">
                    <p className="text-muted-foreground text-sm sm:text-base">
                      User Recorded Voice is currently disabled. Enable it using the toggle above.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-4 sm:mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="p-3 sm:p-4">
              <p className="text-destructive text-xs sm:text-sm">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// ProjectCard Component
const ProjectCard = ({
  project,
  playingAudio,
  onPlay,
  onDownload,
  type,
}: {
  project: any;
  playingAudio: string | null;
  onPlay: (project: any) => void;
  onDownload: (project: any) => void;
  type: "generated" | "recorded";
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center space-x-2">
              {type === "generated" ? (
                <Volume2 className="h-4 w-4 text-primary" />
              ) : (
                <Mic className="h-4 w-4 text-secondary" />
              )}
              <span>{project.title}</span>
            </CardTitle>
            <div className="flex items-center flex-wrap gap-1 sm:gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {project.language}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {project.word_count} words
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${
                  type === "generated"
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary/10 text-secondary"
                }`}
              >
                {type === "generated" ? "AI Generated" : "User Recorded"}
              </Badge>
              {project.processing_time_ms && (
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-blue-700"
                >
                  {(project.processing_time_ms / 1000).toFixed(1)}s
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 p-3 sm:p-6">
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
          {project.original_text}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              onClick={() => onPlay(project)}
              variant="outline"
              size="sm"
              disabled={!project.audio_url}
              className="h-7 sm:h-8 px-2 sm:px-3"
            >
              {playingAudio === project.id ? (
                <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Play className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
            <Button
              onClick={() => onDownload(project)}
              variant="outline"
              size="sm"
              disabled={!project.audio_url}
              className="h-7 sm:h-8 px-2 sm:px-3"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>{new Date(project.created_at).toLocaleDateString()}</span>
            {project.generation_started_at && (
              <span>
                {new Date(project.generation_started_at).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default History;