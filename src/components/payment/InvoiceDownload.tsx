import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface InvoiceDownloadProps {
  invoiceId: string;       // this is payment_id
  invoiceNumber: string;   // you may pass payment_id or leave empty
}

export const InvoiceDownload = ({ invoiceId, invoiceNumber }: InvoiceDownloadProps) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);

      // ✅ 1. Get authenticated user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        throw new Error("User not authenticated");
      }
      const userId = authData.user.id;

      // ✅ 2. Fetch invoice using payment_id + user_id
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("payment_id", invoiceId)
        .eq("user_id", userId)
        .single();

      if (invoiceError || !invoice) {
        throw new Error("Invoice not found");
      }

      const fileName = invoice.invoice_number || invoiceNumber || "invoice";

      // ✅ 3. If pdf_url exists → download from storage
      if (invoice.pdf_url) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("invoices")
          .download(invoice.pdf_url);

        if (downloadError) throw downloadError;

        // Convert HTML to PDF-like format by printing
        const htmlContent = await fileData.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        // ✅ 4. No pdf in storage → fallback to generate invoice
        const { data, error } = await supabase.functions.invoke("generate-invoice", {
          body: { invoice_id: invoice.id },
        });

        if (error) throw error;

        // Open in new window for printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.invoice_html);
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      }

      toast.success("Invoice ready for printing");
    } catch (error) {
      console.error("Invoice download error:", error);
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
<Button
  variant="ghost"
  onClick={handleDownload}
  disabled={loading}
  title="Print Invoice"
  className="flex items-center gap-2"
>
  <Download className="h-4 w-4" />
  Download
</Button>
  );
};
