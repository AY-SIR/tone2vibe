import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface InvoiceDownloadProps {
  invoiceId: string;
  invoiceNumber: string;
}

export const InvoiceDownload = ({ invoiceId, invoiceNumber }: InvoiceDownloadProps) => {
  const [loading, setLoading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [invoiceHTML, setInvoiceHTML] = useState<string>("");

  const fetchInvoice = async () => {
    try {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        throw new Error("Please log in to view invoice.");
      }

      const userId = authData.user.id;
      const bucketName = "invoices";

      // Fetch invoice using payment_id and user_id
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

      // pdf_url already stores just the path (e.g., "userId/invoiceNumber.html")
      const filePath = invoice.pdf_url;

      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (downloadError) {
        console.error("Storage Download Error:", downloadError);
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      if (!fileData) {
         throw new Error("Downloaded file data is empty.");
      }

      // Assuming the invoice content is stored as an HTML file
      const htmlContent = await fileData.text();
      return { htmlContent, invoiceNumber: invoice.invoice_number || invoiceNumber };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error(errorMessage);
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
    } catch (error) {
      // Error is already logged and toasted in fetchInvoice
    }
  };

  const handleDownload = async () => {
    try {
      const { htmlContent, invoiceNumber: fetchedInvoiceNumber } = await fetchInvoice();

      // Create a blob URL for download (better than print window for actual download)
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Invoice-${fetchedInvoiceNumber}.html`; // Download as HTML file
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast.success("Download initiated successfully.");

      // If you specifically want to trigger a print dialog:
      // const printWindow = window.open('', '_blank');
      // if (printWindow) {
      //   printWindow.document.write(htmlContent);
      //   printWindow.document.title = `Invoice-${fetchedInvoiceNumber}`;
      //   printWindow.document.close();
      //   printWindow.onload = () => {
      //     printWindow.print();
      //   };
      // }

    } catch (error) {
      // Error is already logged and toasted in fetchInvoice
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
          title="Download Invoice"
          className="flex items-center gap-2"
          size="sm"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Invoice: {invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div
            dangerouslySetInnerHTML={{ __html: invoiceHTML }}
            className="invoice-preview p-4 border rounded"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};