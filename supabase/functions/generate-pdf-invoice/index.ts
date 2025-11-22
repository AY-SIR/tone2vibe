import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    const { invoice_path } = await req.json();

    if (!invoice_path) {
      return new Response(
        JSON.stringify({ error: "Invoice path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the HTML from storage
    const { data: htmlData, error: downloadError } = await supabase.storage
      .from("invoices")
      .download(invoice_path);

    if (downloadError || !htmlData) {
      console.error("Error downloading HTML:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch invoice HTML" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const htmlContent = await htmlData.text();

    // Use an external PDF generation API (PDFShift, HTML2PDF API, etc.)
    // For now, we'll use a simple approach with Puppeteer via a service
    // Alternative: Use cloudconvert, html2pdf.it, or similar services
    
    // Since Deno doesn't have native PDF generation, we'll use an HTML-to-PDF service
    // For demo purposes, we'll use the free API from html2pdf.app
    const pdfResponse = await fetch("https://api.html2pdf.app/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: htmlContent,
        options: {
          format: "A4",
          margin: {
            top: "20mm",
            right: "15mm",
            bottom: "20mm",
            left: "15mm",
          },
          printBackground: true,
        },
      }),
    });

    if (!pdfResponse.ok) {
      // Fallback: Return HTML for client-side conversion
      console.error("PDF generation service failed, returning HTML");
      return new Response(
        JSON.stringify({
          success: false,
          html: htmlContent,
          fallback: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pdfBlob = await pdfResponse.arrayBuffer();

    // Return the PDF directly
    return new Response(pdfBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${Date.now()}.pdf"`,
      },
    });

  } catch (error: unknown) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate PDF",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
