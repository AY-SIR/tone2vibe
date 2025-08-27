
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, User, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AIVoiceService } from "@/services/aiVoiceService";

interface AIVoiceGeneratorProps {
  onVoiceSelect: (voiceId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AIVoiceGenerator({ onVoiceSelect, isOpen, onClose }: AIVoiceGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'input' | 'suggestions' | 'generating'>('input');
  const [characterName, setCharacterName] = useState('');
  const [description, setDescription] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!characterName.trim() || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both character name and description.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Simplified AI analysis - just use the description
      const summary = `AI Voice for ${characterName}: ${description}`;
      setAiSummary(summary);

      // No existing voices search for now since we don't have the database
      setSuggestions([]);

      setStep('suggestions');
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze character. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExisting = async (voice: any) => {
    // Simplified - just select the voice
    onVoiceSelect(voice.voice_id);
    toast({
      title: "Voice Selected",
      description: `Using ${voice.character_name} voice.`
    });
    handleClose();
  };

  const handleGenerateNew = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate voices.",
        variant: "destructive"
      });
      return;
    }

    setStep('generating');
    setLoading(true);

    try {
      const result = await AIVoiceService.generateVoice({
        characterName,
        description,
        tone: 'neutral'
      }, user.id);
      
      if (result.success && result.voiceId) {
        onVoiceSelect(result.voiceId);
        toast({
          title: "Voice Generated",
          description: `New voice "${characterName}" has been created and selected.`
        });
        handleClose();
      } else {
        throw new Error(result.error || 'Voice generation failed');
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate new voice. Please try again.",
        variant: "destructive"
      });
      setStep('suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setCharacterName('');
    setDescription('');
    setAiSummary('');
    setSuggestions([]);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <span>AI Voice Generator</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="character-name">Character Name</Label>
              <Input
                id="character-name"
                placeholder="e.g., Morgan Freeman, Friendly Narrator, British Butler"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">Character Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the character's voice style, accent, tone, personality, etc. Be as detailed as possible for better results."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <Button 
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Character
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'suggestions' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">AI Character Analysis</h3>
              <p className="text-sm text-blue-800">{aiSummary}</p>
            </div>

            {suggestions.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Similar Existing Voices</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {suggestions.map((voice) => (
                    <Card key={voice.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleSelectExisting(voice)}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{voice.character_name}</p>
                            <p className="text-xs text-gray-600 truncate">{voice.ai_summary}</p>
                            <p className="text-xs text-gray-500">Used {voice.usage_count} times</p>
                          </div>
                          <Check className="h-4 w-4 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setStep('input')} className="flex-1">
                Back to Edit
              </Button>
              <Button onClick={handleGenerateNew} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Generate New Voice
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="text-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-500" />
            <div>
              <h3 className="font-medium mb-2">Generating Your Voice</h3>
              <p className="text-sm text-gray-600">
                Creating "{characterName}" voice based on your description...
              </p>
              <p className="text-xs text-gray-500 mt-2">
                This may take a few moments. Please don't close this window.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
