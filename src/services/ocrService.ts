// ocrService.ts

export interface OCRResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
}

export class OCRService {
  /**
   * Main entry point for OCR (auto-detects image vs PDF)
   *  TEMPORARILY DISABLED - Returns error message
   */
  static async extractText(file: File): Promise<string> {
    return 'OCR feature is currently under maintenance. Please type your text manually or try again later.';
  }

  /**
   * Extracts text from image using Tesseract.js
   *  TEMPORARILY DISABLED
   */
  static async extractTextFromImage(imageFile: File): Promise<OCRResult> {
    return {
      success: false,
      error: 'Image OCR is currently not available. Please type your text manually.',
    };
  }

  /**
   * Extract text from PDF file using PDF.js
   *  TEMPORARILY DISABLED
   */
  static async extractTextFromPDF(pdfFile: File): Promise<OCRResult> {
    return {
      success: false,
      error: 'PDF text extraction is currently not available. Please type your text manually.',
    };
  }

  /**
   * Converts a File to a Data URL (Base64)
   */
  private static fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Counts total words in a string
   */
  static countWords(text: string): number {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }
}