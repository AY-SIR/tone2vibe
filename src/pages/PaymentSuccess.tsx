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

  // Get URL parameters
  const plan = searchParams.get("plan");
  const type = searchParams.get("type");
  const count = searchParams.get("count");
  const amount = searchParams.get("amount");
  const coupon = searchParams.get("coupon");
  const method = searchParams.get("method");
  const paymentId = searchParams.get("payment_id");
  const paymentRequestId = searchParams.get("payment_request_id");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // FIXED: Improved key for preventing duplicate toasts
        const toastKey = `toast_shown_${paymentId || paymentRequestId || coupon || 'free'}`;
        if (sessionStorage.getItem(toastKey)) {
          setIsVerifying(false);
          // NOTE: We assume success if the toast was already shown to prevent re-processing.
          // You might want to fetch the final state and display it here instead of a blank screen.
          setVerified(true);
          setSuccessTitle("Action Previously Completed");
          setSuccessDescription("This transaction has already been verified and processed.");
          return;
        }

        // Free activations
        if (amount === "0" && (coupon || method === "free")) {
          if (type === "subscription" && plan) {
            setVerified(true);
            setSuccessTitle("Plan Activated!");
            setSuccessDescription(`Your ${plan} plan has been activated for free${coupon ? ` using coupon ${coupon}` : ''}.`);

            toast({
              title: "Plan Activated",
              description: `Your ${plan} plan is now active.`, // CHANGED: Emoji removed
            });
            sessionStorage.setItem(toastKey, "1");

          } else if (type === "words" && count) {
            setVerified(true);
            setSuccessTitle("Words Purchased!"); // CHANGED: Text updated
            const addedWords = parseInt(count).toLocaleString();
            setSuccessDescription(`${addedWords} words have been added to your account${coupon ? ` using coupon ${coupon}` : ''}.`);

            toast({
              title: "Words Purchased", // CHANGED: Text updated
              description: `${addedWords} words credited to your balance.`, // CHANGED: Emoji removed
            });
            sessionStorage.setItem(toastKey, "1");
          }

          await refreshProfile();
          setIsVerifying(false);
          return;
        }

        if (!paymentId || !paymentRequestId) {
          navigate("/payment");
          return;
        }

        // Word purchase verification
        if (type === 'words' && paymentId) {
          const { data, error } = await supabase.functions.invoke("verify-instamojo-payment", {
            body: { payment_id: paymentId, payment_request_id: paymentRequestId, type: 'words' }
          });
          if (error) throw error;

          if (data.success) {
            setVerified(true);
            setSuccessTitle("Words Purchased!"); // CHANGED: Text updated

            // FIXED: Reliably get word count from sessionStorage
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
            
            toast({ title: "Words Purchased", description: `${added} words credited to your balance.` }); // CHANGED: Text updated
            sessionStorage.setItem(toastKey, "1");
            
            sessionStorage.removeItem('pending_transaction');
            await refreshProfile();
          } else {
            throw new Error(data.error || 'Verification failed');
          }
        }
        // Subscription verification
        else if (plan && paymentId) {
          const { data, error } = await supabase.functions.invoke("verify-instamojo-payment", {
            body: { payment_id: paymentId, payment_request_id: paymentRequestId, type: 'subscription', plan }
          });
          if (error) throw error;

          if (data.success) {
            setVerified(true);
            setSuccessTitle("Payment Successful!");
            setSuccessDescription(`Your ${plan} plan has been activated.`);
            
            sessionStorage.removeItem('pending_transaction');
            
            toast({ title: "Payment Successful!", description: `Your ${plan} plan has been activated.` });
            sessionStorage.setItem(toastKey, "1");
            
            await refreshProfile();
          } else {
            throw new Error(data.error || 'Payment verification failed');
          }
        } else {
          navigate("/payment");
          return;
        }
      } catch (error) {
        toast({
          title: "Verification Failed",
          description: "Please contact support if this issue persists.",
          variant: "destructive"
        });
        setVerified(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [paymentId, paymentRequestId, plan, type, count, amount, coupon, method, navigate, refreshProfile, toast]);

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
                <Button onClick={() => navigate("/tool")} className="w-full">
                  Start Creating
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">
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
