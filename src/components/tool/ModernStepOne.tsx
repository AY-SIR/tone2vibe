
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { UploadLimitService } from "@/services/uploadLimitService";
import { OCRService } from "@/services/ocrService";

interface ModernStepOneProps {
  onNext: () => void;
  onTextExtracted: (text: string) => void;
  onWordCountUpdate: (count: number) => void;
  onProcessingStart: (step: string) => void;
  onProcessingEnd: () => void;
}

export default function ModernStepOne({
  onNext,
  onTextExtracted,
  onWordCountUpdate,
  onProcessingStart,
  onProcessingEnd,
}: ModernStepOneProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [inputMethod, setInputMethod] = useState<"text" | "file">("text");
  const [manualText, setManualText] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate word count with 45-character rule for display
  const calculateDisplayWordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    let totalWordCount = 0;
    words.forEach((word) => {
      if (word.length > 45) {
        totalWordCount += Math.ceil(word.length / 45);
      } else {
        totalWordCount += 1;
      }
    });
    return totalWordCount;
  };

  const uploadLimit = UploadLimitService.getUploadLimit(profile?.plan || 'free');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size
    const validation = UploadLimitService.validateFileSize(file, profile?.plan || 'free');
    if (!validation.valid) {
      toast({
        title: "File Too Large",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    onProcessingStart("Extracting text from file...");

    try {
      const text = await OCRService.extractText(file);
      if (text.trim()) {
        setExtractedText(text);
        onTextExtracted(text);
        
        // Calculate word count
        const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
        let totalWordCount = 0;
        words.forEach((word) => {
          if (word.length > 45) {
            totalWordCount += Math.ceil(word.length / 45);
          } else {
            totalWordCount += 1;
          }
        });
        
        onWordCountUpdate(totalWordCount);
        
        toast({
          title: "Text Extracted Successfully",
          description: `Extracted ${totalWordCount} words from your file.`,
        });
      } else {
        throw new Error("No text found in the file");
      }
    } catch (error) {
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract text",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      onProcessingEnd();
    }
  }, [profile?.plan, onTextExtracted, onWordCountUpdate, onProcessingStart, onProcessingEnd, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false,
    disabled: isProcessing
  });

  const handleManualTextSubmit = () => {
    if (!manualText.trim()) {
      toast({
        title: "No Text Entered",
        description: "Please enter some text to continue.",
        variant: "destructive"
      });
      return;
    }

        // Calculate word count with 45-character rule (but don't show to user)
        const words = manualText.trim().split(/\s+/).filter((w) => w.length > 0);
        let totalWordCount = 0;
        words.forEach((word) => {
          if (word.length > 45) {
            totalWordCount += Math.ceil(word.length / 45);
          } else {
            totalWordCount += 1;
          }
        });

    setExtractedText(manualText);
    onTextExtracted(manualText);
    onWordCountUpdate(totalWordCount);
  };

  const canContinue = extractedText.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Add Your Content</h2>
        <p className="text-muted-foreground">
          Choose how you want to add content for voice generation
        </p>
      </div>

      <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as "text" | "file")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Type Text</span>
          </TabsTrigger>
          <TabsTrigger value="file" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Upload File</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Enter Your Text</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type or paste your text here..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="min-h-[200px] resize-none"
                disabled={isProcessing}
              />
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{manualText.replace(/\s/g, '').length} characters</span>
                <span>{calculateDisplayWordCount(manualText)} words</span>
              </div>
              <Button 
                onClick={handleManualTextSubmit}
                disabled={!manualText.trim() || isProcessing}
                className="w-full"
              >
                Use This Text
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="file" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload File</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Upload Limits</span>
                </div>
                <p className="text-muted-foreground">
                  Your {profile?.plan || 'free'} plan allows files up to {uploadLimit}MB
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported: PDF, Word, Text files, Images (PNG, JPG)
                </p>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-primary">Drop the file here...</p>
                ) : (
                  <div>
                    <p className="font-medium mb-2">
                      Drag & drop a file here, or click to select
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Max file size: {uploadLimit}MB
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {extractedText && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">Content Ready</span>
            </div>
            <p className="text-sm text-green-700">
              {extractedText.length > 200 ? extractedText.substring(0, 200) + "..." : extractedText}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canContinue || isProcessing}
          size="lg"
          className="px-8"
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );
}
