import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface InvoiceDownloadProps {
  invoiceId: string;
  invoiceNumber: string;
}

export const InvoiceDownload = ({ invoiceId, invoiceNumber }: InvoiceDownloadProps) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      
      // Get invoice details from database
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('pdf_url, user_id')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) throw new Error("Invoice not found");

      // Download from storage bucket
      if (invoice.pdf_url) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('invoices')
          .download(invoice.pdf_url);

        if (downloadError) throw downloadError;

        // Trigger download
        const url = window.URL.createObjectURL(fileData);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoiceNumber}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Fallback to generate-invoice if pdf_url is missing
        const { data, error } = await supabase.functions.invoke('generate-invoice', {
          body: { invoice_id: invoiceId }
        });

        if (error) throw error;

        const blob = new Blob([data.invoice_html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoiceNumber}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Invoice download error:", error);
      toast.error("Failed to download invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDownload}
      disabled={loading}
      className="h-8 w-8"
    >
      <Download className="h-4 w-4" />
    </Button>
  );
};
