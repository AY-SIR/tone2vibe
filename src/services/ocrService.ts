import { createWorker } from 'tesseract.js';

export interface OCRResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
}

export class OCRService {
  static async extractText(file: File): Promise<string> {
    try {
      const result = await this.extractTextFromImage(file);
      return result.success ? result.text || '' : '';
    } catch (error) {
      console.error('OCR Error:', error);
      return `Error extracting text from ${file.name}`;
    }
  }

  static async extractTextFromImage(imageFile: File): Promise<OCRResult> {
    try {
      console.log('Starting OCR with Tesseract.js');
      
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const { data } = await worker.recognize(imageFile);
      await worker.terminate();

      console.log('OCR completed successfully');

      return {
        success: true,
        text: data.text,
        confidence: data.confidence / 100
      };
    } catch (error) {
      console.error('OCR Error:', error);
      return {
        success: false,
        error: 'Failed to extract text from image. Please try again.'
      };
    }
  }

  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  static async extractTextFromPDF(pdfFile: File): Promise<OCRResult> {
    try {
      // PDF extraction requires PDF.js - for now return basic message
      return {
        success: true,
        text: `PDF file detected: ${pdfFile.name}. Please copy and paste text from the PDF or convert pages to images for OCR processing.`,
        confidence: 0.5
      };
    } catch (error) {
      return {
        success: false,
        error: 'PDF text extraction not available. Please use images instead.'
      };
    }
  }

  static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
