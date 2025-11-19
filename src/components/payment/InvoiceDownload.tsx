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

        const url = window.URL.createObjectURL(fileData);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      else {
        // ✅ 4. No pdf in storage → fallback to generate invoice
        const { data, error } = await supabase.functions.invoke("generate-invoice", {
          body: { invoice_id: invoice.id },
        });

        if (error) throw error;

        const blob = new Blob([data.invoice_html], { type: "text/html" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.html`;
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
      <Download className="h-4 w-4" />Download
    </Button>
  );
};
