import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UploadLimitService } from "@/services/uploadLimitService";

interface VoiceUploadProps {
  onVoiceUploaded?: (url: string, name: string) => void;
}

export function VoiceUpload({ onVoiceUploaded }: VoiceUploadProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const uploadLimit = UploadLimitService.getUploadLimit(profile?.plan || "free"); // MB

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    setIsUploading(true);

    const allowedTypes = ["audio/mp3", "audio/wav", "audio/mpeg", "audio/wave", "audio/x-wav"];
    const maxSize = uploadLimit * 1024 * 1024;

    // Validation
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an MP3 or WAV file.",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `Please upload a file smaller than ${uploadLimit}MB.`,
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    try {
      // 1️⃣ Upload to Supabase Storage (private bucket)
      const filePath = `${profile.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("user-voices")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      // 2️⃣ Insert record with secure storage path (no public URL)
      const { error: insertError } = await supabase
        .from("user_voices")
        .insert({
          user_id: profile.id,
          name: file.name,
          audio_url: filePath,
          duration: null,
          language: profile.preferred_language || 'en-US'
        });
      if (insertError) console.error("DB insert error:", insertError);

      toast({ title: "Upload complete!", description: `${file.name} uploaded` });

      if (onVoiceUploaded) onVoiceUploaded(filePath, file.name);

      event.target.value = ""; // Reset input
    } catch (err: any) {
      console.error("Upload Error:", err);
      toast({
        title: "Upload Failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger file input click
  const handleButtonClick = () => {
    const fileInput = document.getElementById("audio-upload") as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  return (
    <div className="space-y-4">
      {/* Audio Requirements */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Audio Requirements:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Supported formats: MP3, WAV</li>
          <li>• Max file size: {uploadLimit}MB ({profile?.plan || "free"} plan)</li>
          <li>• Clear audio, minimal background noise</li>
        </ul>
      </div>

      {/* Upload Box */}
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium mb-2">Choose Audio File (Max {uploadLimit}MB)</p>

        <input
          type="file"
          accept="audio/mp3,audio/wav,audio/mpeg,audio/wave,audio/x-wav"
          onChange={handleAudioUpload}
          className="hidden"
          id="audio-upload"
          disabled={isUploading}
        />

        <Button
          variant="outline"
          onClick={handleButtonClick}
          disabled={isUploading}
          type="button"
        >
          {isUploading ? "Uploading..." : "Browse Files"}
        </Button>
      </div>
    </div>
  );
}
