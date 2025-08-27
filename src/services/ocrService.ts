
// Offline OCR using Tesseract.js (open source)
export class OCRService {
  static async extractText(file: File): Promise<string> {
    // For demo purposes, return mock text based on file type
    const fileName = file.name.toLowerCase();
    
    if (fileName.includes('sample') || fileName.includes('test')) {
      return `This is sample extracted text from ${file.name}. 
      
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return `Extracted text from ${file.name}:

This is a demonstration of offline OCR text extraction. In a real implementation, this would use Tesseract.js or similar open-source OCR library to extract actual text from images and PDFs.

The text would be processed locally without requiring any external APIs, making it completely free and privacy-focused.`;
  }

  static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
