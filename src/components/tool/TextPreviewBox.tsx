
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Globe } from 'lucide-react';

interface TextPreviewBoxProps {
  text: string;
  wordCount: number;
  selectedLanguage: string;
  languageName: string;
}

export function TextPreviewBox({ text, wordCount, selectedLanguage, languageName }: TextPreviewBoxProps) {
  const previewText = text.length > 150 ? text.substring(0, 150) + '...' : text;

  return (
    <Card className="mb-4 border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm sm:text-base">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Text Preview</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {wordCount} words
            </Badge>
            <Badge variant="secondary" className="text-xs flex items-center space-x-1">
              <Globe className="h-3 w-3" />
              <span>{languageName}</span>
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="bg-gray-50 rounded-lg p-3 text-xs sm:text-sm text-gray-700 leading-relaxed">
          {previewText || "Your extracted text will appear here..."}
        </div>
      </CardContent>
    </Card>
  );
}
