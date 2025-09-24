import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [successTitle, setSuccessTitle] = useState("Payment Successful!");
  const [successDescription, setSuccessDescription] = useState("");

  const plan = searchParams.get("plan");
  const type = searchParams.get("type");
  const count = searchParams.get("count");
  const amount = searchParams.get("amount");
  const coupon = searchParams.get("coupon");
  const paymentId = searchParams.get("payment_id");
  const paymentRequestId = searchParams.get("payment_request_id");
  const txId = searchParams.get("txId");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const toastKey = `toast_shown_${paymentId || paymentRequestId || txId}`;

        // THIS IS THE UPDATED LOGIC
        if (sessionStorage.getItem(toastKey)) {
          setIsVerifying(false);
          setVerified(true);

          // Always show the correct success details based on URL
          if (type === 'words' && count) {
            setSuccessTitle("Words Purchased!");
            setSuccessDescription(`${Number(count).toLocaleString()} words have been added to your account.`);
          } else if (type === 'subscription' && plan) {
            setSuccessTitle("Plan Activated!");
            setSuccessDescription(`Your ${plan} plan is active.`);
          } else {
            setSuccessTitle("Action Completed");
            setSuccessDescription("This transaction was already successfully processed.");
          }
          return; // IMPORTANT: Still return to prevent re-processing
        }

        // --- The rest of the verification logic runs only ONCE ---

        if (amount === "0" && (coupon || txId)) {
          // Free activations logic...
          if (type === 'words' && count) {
            setVerified(true);
            setSuccessTitle("Words Purchased!");
            setSuccessDescription(`${Number(count).toLocaleString()} words have been added to your account using coupon ${coupon}.`);
            toast({
              title: "Words Purchased",
              description: `${Number(count).toLocaleString()} words credited to your balance.`,
            });
            sessionStorage.setItem(toastKey, "1");
            await refreshProfile();
          }
          setIsVerifying(false);
          return;
        }

        if (!paymentId || !paymentRequestId) {
          navigate("/payment");
          return;
        }

        // Paid word purchase verification...
        if (type === 'words' && paymentId) {
          const { data, error } = await supabase.functions.invoke("verify-instamojo-payment", {
            body: { payment_id: paymentId, payment_request_id: paymentRequestId, type: 'words' }
          });
          if (error) throw error;

          if (data.success) {
            setVerified(true);
            setSuccessTitle("Words Purchased!");
            let purchasedWords = count;
            const pendingTx = sessionStorage.getItem('pending_transaction');
            if (pendingTx) {
              const txData = JSON.parse(pendingTx);
              if (txData.payment_request_id === paymentRequestId) {
                purchasedWords = txData.words?.toString();
              }
            }
            const added = purchasedWords ? Number(purchasedWords).toLocaleString() : "Your purchased";
            setSuccessDescription(`${added} words have been added to your account.`);
            toast({ title: "Words Purchased", description: `${added} words credited to your balance.` });
            sessionStorage.setItem(toastKey, "1");
            sessionStorage.removeItem('pending_transaction');
            await refreshProfile();
          } else {
            throw new Error(data.error || 'Verification failed');
          }
        }
        // ... other verification logic ...

      } catch (error) {
        setVerified(false);
        toast({
          title: "Verification Failed",
          description: "Please contact support if this issue persists.",
          variant: "destructive"
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  const handleNavigate = (path: string) => {
    window.location.href = path;
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p>Verifying your payment...</p>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we confirm your transaction.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">
            {verified ? successTitle : "Payment Issue"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {verified ? (
            <>
              <p className="text-muted-foreground">{successDescription}</p>
              <div className="space-y-2">
                <Button onClick={() => handleNavigate("/tool")} className="w-full">
                  Start Creating
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => handleNavigate("/")} className="w-full">
                  Go to Homepage
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                There was an issue verifying your payment. Please contact support.
              </p>
              <Button onClick={() => navigate("/payment")} className="w-full">
                Back to Payment
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;

