import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";

interface InvoiceDownloadProps {
  invoiceId: string;
  invoiceNumber: string;
}

export const InvoiceDownload = ({ invoiceId, invoiceNumber }: InvoiceDownloadProps) => {
  const [loading, setLoading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [invoiceHTML, setInvoiceHTML] = useState<string>("");
  const { toast } = useToast();

  const fetchInvoice = async () => {
    try {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        throw new Error("Please log in to view invoice.");
      }

      const userId = authData.user.id;
      const bucketName = "invoices";

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("pdf_url, invoice_number")
        .eq("payment_id", invoiceId)
        .eq("user_id", userId)
        .single();

      if (invoiceError || !invoice) {
        throw new Error("Invoice not found or you do not have permission to view it.");
      }

      if (!invoice.pdf_url) {
        throw new Error("Invoice file path not found in database.");
      }

      const filePath = invoice.pdf_url;

      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      if (!fileData) {
        throw new Error("Downloaded file data is empty.");
      }

      const htmlContent = await fileData.text();
      return { htmlContent, invoiceNumber: invoice.invoice_number || invoiceNumber };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleView = async () => {
    try {
      const { htmlContent } = await fetchInvoice();
      setInvoiceHTML(htmlContent);
      setViewDialogOpen(true);
      toast({
        title: "Invoice Loaded",
        description: "Your invoice is ready to view."
      });
    } catch (error) {
      // Error already handled in fetchInvoice
    }
  };

  const handleDownload = async () => {
    try {
      toast({
        title: "Preparing Download",
        description: "Converting invoice to PDF..."
      });

      const { htmlContent, invoiceNumber: fetchedInvoiceNumber } = await fetchInvoice();

      // Convert HTML to PDF using html2pdf.js
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      
      const opt = {
        margin: 0,
        filename: `Invoice-${fetchedInvoiceNumber}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();

      toast({
        title: "Download Complete",
        description: "Invoice PDF has been downloaded successfully."
      });

    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={handleView}
          disabled={loading}
          title="View Invoice"
          className="flex items-center gap-2"
          size="sm"
        >
          <Eye className="h-4 w-4" />
          View
        </Button>

        <Button
          variant="ghost"
          onClick={handleDownload}
          disabled={loading}
          title="Download Invoice as PDF"
          className="flex items-center gap-2"
          size="sm"
        >
          <Download className="h-4 w-4" />
          {loading ? "Processing..." : "Download PDF"}
        </Button>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Invoice: {invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div
            dangerouslySetInnerHTML={{ __html: invoiceHTML }}
            className="invoice-preview"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};