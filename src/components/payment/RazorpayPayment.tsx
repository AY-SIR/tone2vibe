import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RazorpayService } from "@/services/razorpay";
import { toast } from "sonner";

interface RazorpayPaymentProps {
  plan?: "pro" | "premium";
  wordCount?: number;
  userEmail: string;
  userName: string;
  userPhone: string;
  couponCode?: string;
  userPlan?: string;
}

export const RazorpayPayment = ({
  plan,
  wordCount,
  userEmail,
  userName,
  userPhone,
  couponCode,
  userPlan
}: RazorpayPaymentProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      let response;
      
      if (plan) {
        // Plan subscription
        response = await RazorpayService.createPlanPayment(
          plan,
          userEmail,
          userName,
          couponCode
        );
      } else if (wordCount) {
        // Word purchase
        response = await RazorpayService.createWordPayment(
          wordCount,
          userEmail,
          userName,
          userPlan || "free"
        );
      } else {
        throw new Error("Invalid payment type");
      }

      if (!response.success || !response.order_id || !response.razorpay_key) {
        throw new Error(response.message || "Payment creation failed");
      }

      // Open Razorpay checkout
      RazorpayService.openCheckout(
        response.order_id,
        response.razorpay_key,
        response.amount!,
        response.currency!,
        userName,
        userEmail,
        userPhone,
        plan ? `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription` : `${wordCount} Words Purchase`,
        async (razorpayResponse: any) => {
          // Success callback
          const verifyResponse = await RazorpayService.verifyPayment(
            razorpayResponse.razorpay_order_id,
            razorpayResponse.razorpay_payment_id,
            razorpayResponse.razorpay_signature
          );

          if (verifyResponse.success) {
            toast.success("Payment successful!");
            if (plan) {
              navigate(`/payment-success?plan=${plan}&type=subscription`);
            } else {
              navigate(`/payment-success?words=${wordCount}&type=word_purchase`);
            }
          } else {
            throw new Error(verifyResponse.message || "Payment verification failed");
          }
        },
        (error: any) => {
          // Failure callback
          console.error("Payment failed:", error);
          toast.error(error.message || "Payment failed");
          navigate("/payment-failed");
        }
      );
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error(error instanceof Error ? error.message : "Payment initialization failed");
      navigate("/payment-failed");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm mx-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-center text-sm text-gray-600">
          Initializing payment...
        </p>
      </div>
    </div>
  );
};
