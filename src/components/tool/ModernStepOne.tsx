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

  // REFACTORED: This is now the single source of truth for word count calculation.
  const calculateWordCount = (text: string) => {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).filter(Boolean);
    let totalWordCount = 0;
    words.forEach((word) => {
      // A very long "word" without spaces is counted based on character length
      totalWordCount += word.length > 45 ? Math.ceil(word.length / 45) : 1;
    });
    return totalWordCount;
  };

  const uploadLimit = UploadLimitService.getUploadLimit(profile?.plan || 'free');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validation = UploadLimitService.validateFileSize(file, profile?.plan || 'free');
    if (!validation.valid) {
      toast({ title: "File Too Large", description: validation.error, variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    onProcessingStart("Extracting text from file...");

    try {
      const text = await OCRService.extractText(file);
      if (text.trim()) {
        const wordCount = calculateWordCount(text); // REFACTORED: Using the helper function

        setExtractedText(text);
        onTextExtracted(text);
        onWordCountUpdate(wordCount);

        toast({
          title: "Text Extracted Successfully",
          description: `Extracted ${wordCount} words from your file.`,
        });
      } else {
        throw new Error("No text could be extracted from the file.");
      }
    } catch (error) {
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive"
      });
      setExtractedText(""); // Clear previous results on failure
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
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false,
    disabled: isProcessing
  });

  const handleManualTextSubmit = () => {
    const trimmedText = manualText.trim();
    if (!trimmedText) {
      toast({
        title: "No Text Entered",
        description: "Please enter some text to continue.",
        variant: "destructive"
      });
      return;
    }

    const wordCount = calculateWordCount(trimmedText); // REFACTORED: Using the helper function

    setExtractedText(trimmedText);
    onTextExtracted(trimmedText);
    onWordCountUpdate(wordCount);
  };

  const canContinue = extractedText.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Add Your Content</h2>
        <p className="text-muted-foreground">
          Type your text directly or upload a file to extract content.
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
                <span>{calculateWordCount(manualText)} words</span>
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
                <span>Upload a Document or Image</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Upload Guidelines</span>
                </div>
                <p className="text-muted-foreground">
                  Your <span className="font-semibold">{profile?.plan || 'free'}</span> plan allows files up to <span className="font-semibold">{uploadLimit}MB</span>.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported: PDF, DOCX, TXT, PNG, JPG
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
                {isProcessing ? (
                  <p className="text-primary animate-pulse">Processing File...</p>
                ) : isDragActive ? (
                  <p className="text-primary">Drop the file here to start extracting!</p>
                ) : (
                  <div>
                    <p className="font-medium mb-2">
                      Drag & drop a file, or click to select
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
              <span className="font-medium text-green-800">Content Ready for Next Step</span>
            </div>
            <p className="text-sm text-green-700 line-clamp-3">
              {extractedText}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end pt-4">
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