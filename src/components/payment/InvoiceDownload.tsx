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
      
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { invoice_id: invoiceId }
      });

      if (error) throw error;

      // Create blob from HTML and trigger download
      const blob = new Blob([data.invoice_html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
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
