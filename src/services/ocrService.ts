import { createWorker } from "tesseract.js";

export interface OCRResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
}

export class OCRService {
  /**
   * Smart hybrid OCR router:
   * - ≤5 MB  → Paid (OCR.space)
   * - >5 MB  → Free (Tesseract.js)
   * - TXT    → Read directly
   */
  static async extractText(file: File): Promise<string> {
    try {
      const sizeMB = file.size / (1024 * 1024);
      const name = file.name.toLowerCase();

      // Direct read for TXT
      if (name.endsWith(".txt")) {
        return await file.text();
      }

      // 🔹 Use Paid API for small files (≤5MB)
      if (sizeMB <= 5) {
        const paid = await this.extractWithOCRSpace(file);
        if (paid.success && paid.text) return paid.text;
      }

      // 🔹 Fallback to Free Tesseract.js for large files
      const local = await this.extractTextFromImage(file);
      return local.success ? local.text || "" : local.error || "";
    } catch (err) {
      console.error("OCR Error:", err);
      return "OCR failed. Please try again.";
    }
  }

  /** 🔹 Fast OCR.space API (works for images + PDFs up to 5 MB free) */
  private static async extractWithOCRSpace(file: File): Promise<OCRResult> {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("apikey", "helloworld"); // Free demo key (replace with your own for higher quota)
      form.append("language", "eng");

      const res = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      const parsed = data?.ParsedResults?.[0]?.ParsedText || "";

      console.log(" OCR.space finished successfully");
      return { success: true, text: parsed, confidence: 0.9 };
    } catch (err) {
      console.error(" OCR.space error:", err);
      return { success: false, error: "Paid OCR API failed." };
    }
  }

  /** 🔹 Free open-source OCR using Tesseract.js (optimized & throttled) */
  static async extractTextFromImage(file: File): Promise<OCRResult> {
    try {
      console.log("Starting Tesseract OCR...");
      const worker = await createWorker("eng", 1, {
        logger: async (m) => {
          if (m.status === "recognizing text" && m.progress) {
            const percent = Math.round(m.progress * 100);
            console.log(`Tesseract progress: ${percent}%`);
            //  Add small delay every 10% to avoid UI freezing
            if (percent % 10 === 0) {
              await new Promise((r) => setTimeout(r, 200));
            }
          }
        },
      });

      const startTime = performance.now();
      const { data } = await worker.recognize(file);
      const endTime = performance.now();
      await worker.terminate();

      console.log(
        `Tesseract OCR completed in ${((endTime - startTime) / 1000).toFixed(1)}s`
      );

      return {
        success: true,
        text: data.text,
        confidence: data.confidence / 100,
      };
    } catch (err) {
      console.error(" Tesseract error:", err);
      return {
        success: false,
        error: "Failed to extract text via Tesseract.js. Try a smaller or clearer image.",
      };
    }
  }

  /** 🔹 Optional PDF handler placeholder (PDF.js integration later if needed) */
  static async extractTextFromPDF(file: File): Promise<OCRResult> {
    return {
      success: true,
      text: `📄 PDF detected: ${file.name}. OCR handled automatically by main extractText().`,
      confidence: 0.5,
    };
  }

  /**  Count words utility */
  static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
}
