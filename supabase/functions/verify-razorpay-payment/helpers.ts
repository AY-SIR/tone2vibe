// helpers.ts
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib";

/**
 * Generates a simple invoice PDF and returns Uint8Array bytes.
 *
 * @param invoiceNumber - invoice identifier
 * @param payment - payment row/object from DB (expects .amount, .currency, .plan)
 * @param profile - user profile (expects .full_name, .email)
 * @param razorpayPaymentId - Razorpay payment id
 * @param razorpayOrderId - Razorpay order id
 * @param wordsPurchased - number|null
 * @returns Uint8Array (PDF bytes)
 */
export async function generateInvoicePDF(
  invoiceNumber: string,
  payment: any,
  profile: any,
  razorpayPaymentId: string,
  razorpayOrderId: string,
  wordsPurchased: number | null
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4-ish
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text: string, x: number, y: number, opts?: { size?: number; bold?: boolean }) => {
    page.drawText(text, {
      x,
      y,
      size: opts?.size ?? 12,
      font: opts?.bold ? helveticaBold : helvetica,
      color: rgb(0, 0, 0),
    });
  };

  let y = 780;

  // Header
  drawText("Tone2Vibe", 40, y, { size: 20, bold: true });
  drawText("https://tone2vibe.in", 40, y - 22);
  y -= 50;

  // Invoice title and meta
  drawText("INVOICE", 40, y, { size: 18, bold: true });
  drawText(`Invoice Number: ${invoiceNumber}`, 400, y);
  y -= 24;

  drawText(`Date: ${new Date().toLocaleDateString('en-IN')}`, 400, y);
  y -= 30;

  // Customer details
  drawText("Bill To:", 40, y, { bold: true });
  drawText(`${profile?.full_name || "User"}`, 40, y - 18);
  drawText(`${profile?.email || ""}`, 40, y - 36);
  y -= 70;

  // Payment & order IDs
  drawText(`Payment ID: ${razorpayPaymentId}`, 40, y);
  drawText(`Order ID: ${razorpayOrderId}`, 300, y);
  y -= 30;

  // Table header
  drawText("Description", 40, y, { bold: true });
  drawText("Quantity", 320, y, { bold: true });
  drawText("Rate", 400, y, { bold: true });
  drawText("Amount", 480, y, { bold: true });
  y -= 18;

  // Item row
  const amountStr = `₹${(payment.amount / 100).toFixed(2)}`;

  const description = payment.plan
    ? `${String(payment.plan).charAt(0).toUpperCase() + String(payment.plan).slice(1)} Plan - Monthly Subscription`
    : `Word Purchase${wordsPurchased ? ` - ${wordsPurchased.toLocaleString()} words` : ""}`;

  drawText(description, 40, y);
  drawText("1", 320, y);
  drawText(`₹${(payment.amount / 100).toFixed(2)}`, 400, y);
  drawText(amountStr, 480, y);
  y -= 40;

  // Total
  drawText("Total:", 400, y, { bold: true });
  drawText(amountStr, 480, y, { bold: true });
  y -= 60;

  // Footer / notes
  drawText("Thank you for your business!", 40, y);
  y -= 18;
  drawText("For support, contact: support@tone2vibe.in", 40, y);
  y -= 12;
  drawText("This is a computer-generated invoice and does not require a signature.", 40, y);

  const pdfBytes = await pdf.save();
  return pdfBytes;
}
