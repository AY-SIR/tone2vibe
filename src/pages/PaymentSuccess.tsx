import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; // Using sonner as it's common in your app

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // Use the navigate hook for SPA navigation
  const { refreshProfile } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [title, setTitle] = useState("Verifying Payment...");
  const [description, setDescription] = useState("Please wait while we confirm your transaction.");

  useEffect(() => {
    const paymentId = searchParams.get("payment_id");
    const paymentRequestId = searchParams.get("payment_request_id");
    const txId = searchParams.get("txId");
    const type = searchParams.get("type");
    const plan = searchParams.get("plan");
    const count = searchParams.get("count");
    const amount = searchParams.get("amount");
    const coupon = searchParams.get("coupon");

    const verifyPayment = async () => {
      try {
        const toastKey = `toast_shown_${paymentId || paymentRequestId || txId}`;
        
        // This function will be called on success
        const onVerificationSuccess = async (successTitle: string, successDescription: string, toastTitle: string, toastDescription: string) => {
          setStatus('success');
          setTitle(successTitle);
          setDescription(successDescription);
          if (!sessionStorage.getItem(toastKey)) {
            toast.success(toastTitle, { description: toastDescription });
            sessionStorage.setItem(toastKey, "1");
          }
          await refreshProfile();
        };

        // If already processed, just show success but also refresh profile to be safe
        if (sessionStorage.getItem(toastKey)) {
            if (type === 'words' && count) {
                await onVerificationSuccess("Words Purchased!", `${Number(count).toLocaleString()} words have been added to your account.`, "Purchase Processed", "This transaction was already successfully processed.");
            } else if (type === 'subscription' && plan) {
                await onVerificationSuccess("Plan Activated!", `Your ${plan} plan is active.`, "Plan Processed", "This transaction was already successfully processed.");
            }
            return;
        }

        // Free activations
        if (amount === "0" && (coupon || txId)) {
            if (type === 'words' && count) {
                await onVerificationSuccess("Words Purchased!", `${Number(count).toLocaleString()} words added using coupon ${coupon}.`, "Words Purchased", `${Number(count).toLocaleString()} words credited.`);
            } else if (type === 'subscription' && plan) {
                await onVerificationSuccess("Plan Activated!", `Your ${plan} plan is active using coupon ${coupon}.`, "Plan Activated", `Your ${plan} plan is now active!`);
            }
            return;
        }

        if (!paymentId || !paymentRequestId) throw new Error("Missing payment information.");

        // Paid purchases
        const { data, error } = await supabase.functions.invoke("verify-instamojo-payment", {
          body: { payment_id: paymentId, payment_request_id: paymentRequestId, type, plan }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Verification failed');

        if (type === 'words') {
          const added = count ? Number(count).toLocaleString() : "Your purchased";
          await onVerificationSuccess("Words Purchased!", `${added} words have been added to your account.`, "Words Purchased", `${added} words credited to your balance.`);
        } else if (type === 'subscription') {
          await onVerificationSuccess("Plan Activated!", `Your ${plan} plan has been activated successfully.`, "Plan Activated", `Your ${plan} plan is now active!`);
        }

      } catch (error) {
        setStatus('error');
        setTitle("Verification Failed");
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setDescription(`Unable to verify your payment. Please contact support if this issue persists. Reason: ${errorMessage}`);
        toast.error("Verification Failed", { description: errorMessage });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, refreshProfile, navigate]);

  if (isVerifying) {
    // Show a loading state while verifying
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          {status === 'success' ? (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          )}
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{description}</p>
          <div className="space-y-2 pt-4">
            {status === 'success' ? (
              <>
                <Button onClick={() => navigate("/tool")} className="w-full">
                  Start Creating
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                  Go to Homepage
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/payment")} className="w-full">
                Back to Payment Page
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
