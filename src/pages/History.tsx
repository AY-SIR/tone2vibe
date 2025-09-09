import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  Download,
  Search,
  Filter,
  ArrowLeft,
  Mic,
  Volume2,
} from "lucide-react";
import { useVoiceHistory } from "@/hooks/useVoiceHistory";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useNavigate } from "react-router-dom";

const History = () => {
  const { user, profile } = useAuth();
  const { projects, loading, error, retentionInfo } = useVoiceHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showVoiceGeneration, setShowVoiceGeneration] = useState(true);
  const [showUserRecorded, setShowUserRecorded] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!user) {
    navigate("/");
    return null;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.original_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage =
      languageFilter === "all" || project.language === languageFilter;

    return matchesSearch && matchesLanguage;
  });

  // Separate generated and recorded voices
  const generatedVoices = filteredProjects.filter((project) => {
    const isGenerated =
      !project.voice_settings?.type ||
      project.voice_settings?.type === "generated" ||
      project.voice_settings?.type === "ai_generated" ||
      (project.voice_settings?.type === "cloned" &&
        project.voice_settings?.is_permanent);
    return isGenerated;
  });

  const recordedVoices = filteredProjects.filter((project) => {
    const isRecorded =
      project.voice_settings?.type === "recorded" ||
      project.voice_settings?.type === "user_recorded" ||
      (project.voice_settings?.type === "cloned" &&
        !project.voice_settings?.is_permanent);
    return isRecorded;
  });

  const languages = Array.from(new Set(projects.map((p) => p.language)));

  const playAudio = async (project: any) => {
    try {
      if (playingAudio === project.id) {
        setPlayingAudio(null);
        return;
      }

      if (project.audio_url) {
        const audio = new Audio(project.audio_url);
        setPlayingAudio(project.id);

        audio.onended = () => {
          setPlayingAudio(null);
        };

        audio.onerror = () => {
          setPlayingAudio(null);
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
    } catch (error) {
      setPlayingAudio(null);
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
    } catch (error) {
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
              Your generated voice projects • {retentionInfo} retention
            </p>
          </div>

          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="text-xs sm:text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {profile?.plan}
              </Badge>
              <span>
                Retention: {retentionInfo} • {filteredProjects.length} of{" "}
                {projects.length} projects shown
              </span>
            </div>
          </div>
        </div>

        {/* Filters and Toggles */}
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

            {/* Content Type Toggles */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-4 border-t border-muted">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all duration-300 border border-primary/20 hover:border-primary/30 shadow-sm hover:shadow-md group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors duration-300">
                    <Volume2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="voice-generation" className="text-sm font-semibold cursor-pointer text-foreground group-hover:text-primary transition-colors duration-300">
                      AI Voice Generation
                    </Label>
                    <p className="text-xs text-muted-foreground">Smart AI-generated voices</p>
                  </div>
                </div>
                <Switch
                  id="voice-generation"
                  checked={showVoiceGeneration}
                  onCheckedChange={setShowVoiceGeneration}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/20 transition-all duration-300 scale-110"
                />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-secondary/5 to-secondary/10 hover:from-secondary/10 hover:to-secondary/15 transition-all duration-300 border border-secondary/20 hover:border-secondary/30 shadow-sm hover:shadow-md group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-secondary/20 group-hover:bg-secondary/30 transition-colors duration-300">
                    <Mic className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <Label htmlFor="user-recorded" className="text-sm font-semibold cursor-pointer text-foreground group-hover:text-secondary transition-colors duration-300">
                      User Recorded Voice
                    </Label>
                    <p className="text-xs text-muted-foreground">Your personal recordings</p>
                  </div>
                </div>
                <Switch
                  id="user-recorded"
                  checked={showUserRecorded}
                  onCheckedChange={setShowUserRecorded}
                  className="data-[state=checked]:bg-secondary data-[state=unchecked]:bg-muted-foreground/20 transition-all duration-300 scale-110"
                />
              </div>
            </div>
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

        {/* Projects List */}
        {!showVoiceGeneration && !showUserRecorded ? (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                Enable at least one content type to view projects
              </p>
            </CardContent>
          </Card>
        ) : generatedVoices.length === 0 && recordedVoices.length === 0 ? (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                No voice projects found
              </p>
              <Button onClick={() => navigate("/tool")} size="sm">
                Create Your First Voice
              </Button>
            </CardContent>  
          </Card>
        ) : (
          <div className="space-y-6">
            {/* AI Voice Generation Section */}
            {showVoiceGeneration && generatedVoices.length > 0 && (
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Volume2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg sm:text-xl font-semibold">
                    AI Voice Generation ({generatedVoices.length})
                  </h2>
                </div>
                <div className="space-y-3 sm:space-y-4">
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
              </div>
            )}

            {/* User Recorded Voice Section */}
            {showUserRecorded && recordedVoices.length > 0 && (
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Mic className="h-5 w-5 text-secondary" />
                  <h2 className="text-lg sm:text-xl font-semibold">
                    User Recorded Voice ({recordedVoices.length})
                  </h2>
                </div>
                <div className="space-y-3 sm:space-y-4">
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ProjectCard Component
const ProjectCard = ({ project, playingAudio, onPlay, onDownload, type }: {
  project: any;
  playingAudio: string | null;
  onPlay: (project: any) => void;
  onDownload: (project: any) => void;
  type: 'generated' | 'recorded';
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center space-x-2">
              {type === 'generated' ? (
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
                className={`text-xs ${type === 'generated' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}
              >
                {type === 'generated' ? 'AI Generated' : 'User Recorded'}
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
              <span>{new Date(project.generation_started_at).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default History;
