import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
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

  // Get URL parameters (removed sessionId as it's Stripe specific)
  const plan = searchParams.get("plan");
  const type = searchParams.get("type");
  const count = searchParams.get("count");
  const paymentId = searchParams.get("payment_id");
  const paymentRequestId = searchParams.get("payment_request_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentId && !paymentRequestId) {
        navigate("/payment");
        return;
      }

      try {
        if (type === 'words' && paymentId) {
          // Instamojo word purchase verification
          const { data, error } = await supabase.functions.invoke("verify-instamojo-payment", {
            body: { payment_id: paymentId, payment_request_id: paymentRequestId, type: 'words' }
          });

          if (error) throw error;

          if (data.success) {
            setVerified(true);
            setSuccessTitle("Words Added!");
            const added = count ? Number(count).toLocaleString() : undefined;
            setSuccessDescription(added ? `${added} words have been added to your account.` : `Your purchased words have been added to your account.`);
            await refreshProfile();
            toast({
              title: "Words Added",
              description: added ? `${added} words credited to your balance.` : `Words credited to your balance.`,
            });
          } else {
            throw new Error(data.error || 'Verification failed');
          }
        } else if (plan && paymentId) {
          // Instamojo subscription verification
          const { data, error } = await supabase.functions.invoke("verify-instamojo-payment", {
            body: { payment_id: paymentId, payment_request_id: paymentRequestId, type: 'subscription', plan }
          });

          if (error) throw error;

          if (data.success) {
            setVerified(true);
            setSuccessTitle("Payment Successful!");
            setSuccessDescription(`Your ${plan} plan has been activated.`);
            await refreshProfile();
            toast({
              title: "Payment Successful!",
              description: `Your ${plan} plan has been activated.`,
            });
          } else {
            throw new Error(data.error || 'Payment verification failed');
          }
        } else if (paymentId && paymentRequestId) {
          // New Instamojo verification
          const { data, error } = await supabase.functions.invoke("verify-instamojo-payment", {
            body: { payment_id: paymentId, payment_request_id: paymentRequestId }
          });

          if (error) throw error;

          if (data.success) {
            setVerified(true);
            setSuccessTitle("Payment Successful!");
            setSuccessDescription("Your payment has been processed successfully.");
            
            // Refresh user profile to show updated plan/words
            await refreshProfile();
            toast({
              title: "Payment Successful!",
              description: "Your payment has been processed successfully.",
            });
          } else {
            throw new Error(data.error || 'Payment verification failed');
          }
        } else {
          navigate("/payment");
          return;
        }
      } catch (error) {
        console.error("Payment verification failed:", error);
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
  }, [paymentId, paymentRequestId, plan, type, count, navigate, refreshProfile, toast]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Verifying your payment...</p>
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
              <p className="text-muted-foreground">
                {successDescription}
              </p>
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