import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Crown, Star, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CouponInput } from "@/components/payment/couponInput";
import { supabase } from "@/integrations/supabase/client";

interface PaymentGatewayProps {
  selectedPlan: "pro" | "premium";
  onPayment: (plan: "pro" | "premium") => void;
  isProcessing: boolean;
}

export function PaymentGateway({
  selectedPlan = "pro",
  onPayment,
  isProcessing = false
}: PaymentGatewayProps) {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [confirmPayment, setConfirmPayment] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [couponValidation, setCouponValidation] = useState({
    isValid: false,
    discount: 0,
    message: "",
    code: ""
  });

  // ✅ Secure Supabase URL fallback (safe to expose, but prevents missing env crash)
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL ||
    "https://msbmyiqhohtjdfbjmxlf.supabase.co";

  const pricing = {
    currency: "INR",
    symbol: "₹",
    plans: {
      pro: { price: 99, originalPrice: 99 },
      premium: { price: 299, originalPrice: 299 }
    }
  };

  const planDetails = {
    pro: {
      name: "Pro",
      price: pricing.plans.pro.price,
      features: [
        "10,000 words/month base limit",
        "Buy up to 36,000 additional words",
        "25MB upload limit",
        "₹11 for every 1,000 words",
        "High quality audio",
        "30 Days History",
        "Voice storage & reuse",
        "Priority support"
      ],
      icon: <Crown className="h-5 w-5" />,
      color: "bg-gray-700"
    },
    premium: {
      name: "Premium",
      price: pricing.plans.premium.price,
      features: [
        "50,000 words/month base limit",
        "Buy up to 49,000 additional words",
        "100MB upload limit",
        "Ultra-high quality",
        "₹9 for every 1,000 words",
        "90 Days History",
        "Advanced Speed & Pitch Control",
        "24/7 support"
      ],
      icon: <Star className="h-5 w-5" />,
      color: "bg-gray-700"
    }
  };

  const plan = planDetails[selectedPlan];
  const discount = Math.max(0, couponValidation.discount);
  const baseAmount = plan.price;
  const finalAmount = Math.max(0, baseAmount - discount);

  const currentPlan = profile?.plan || "free";
  const isUpgrade = currentPlan === "pro" && selectedPlan === "premium";
  const isDowngrade = currentPlan === "premium" && selectedPlan === "pro";
  const isExpired =
    profile?.plan_expires_at &&
    new Date(profile.plan_expires_at) <= new Date();
  const canPurchase = currentPlan === "free" || isUpgrade || isExpired;

  const handleCouponApplied = (validation: typeof couponValidation) => {
    setCouponValidation(validation);
  };

  const getPaymentButtonText = () => {
    if (finalAmount === 0) return `Activate ${plan.name} Plan (FREE!)`;
    if (isUpgrade) return `Upgrade for ${pricing.symbol}${finalAmount}`;
    if (isDowngrade) return `Downgrade for ${pricing.symbol}${finalAmount}`;
    return `Subscribe for ${pricing.symbol}${finalAmount}`;
  };

  const handlePayment = async () => {
    if (!confirmPayment) return;
    
    // For paid plans, trigger Razorpay payment
    if (finalAmount > 0) {
      onPayment(selectedPlan);
      return;
    }

    // For free (100% discount), use coupon activation
    setIsActivating(true);

    try {
      if (finalAmount === 0) {
        if (!couponValidation.isValid || !couponValidation.code) {
          toast({
            title: "Coupon required",
            description: "A valid coupon is required for free activation.",
            variant: "destructive"
          });
          setIsActivating(false);
          return;
        }
        await handleFreeActivation();
      } else {
        toast({
          title: "Redirecting to Payment",
          description: "Please wait while we redirect..."
        });
        onPayment(selectedPlan);
      }
    } catch (error) {
      toast({
        title: "Payment failed",
        description:
          error instanceof Error ? error.message : "Plan activation failed.",
        variant: "destructive"
      });
      setIsActivating(false);
    }
  };

  // ✅ Secure free plan activation using Edge Function (with auth)
  const handleFreeActivation = async () => {
    try {
      if (!user) throw new Error("Please log in first");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token)
        throw new Error("Session expired. Please log in again.");

      // Call activate-free-plan edge function to create payment + invoice
      const activateRes = await supabase.functions.invoke('activate-free-plan', {
        body: {
          plan: selectedPlan,
          user_id: user.id,
          coupon_code: couponValidation.code
        }
      });

      if (activateRes.error) {
        throw new Error(activateRes.error.message || 'Failed to activate plan');
      }

      const result = activateRes.data;
      
      if (!result.success) {
        throw new Error(result.error || 'Plan activation failed');
      }

      // Refresh profile and redirect to success page
      await refreshProfile();
      
      navigate(
        `/payment-success?plan=${selectedPlan}&amount=0&type=subscription&coupon=${couponValidation.code}&invoice=${result.invoice_number || ''}`,
        { replace: true }
      );

    } catch (error) {
      throw error;
    } finally {
      setIsActivating(false);
    }
  };

  // 🌀 Loading Overlay
  if (isProcessing || isActivating) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm mx-4">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-center text-sm text-gray-600">
            {finalAmount === 0
              ? "Activating your free plan..."
              : "Processing your payment..."}
          </p>
        </div>
      </div>
    );
  }

  // Already subscribed UI
  if (!canPurchase && currentPlan === selectedPlan && !isExpired) {
    return (
      <Card className="w-full max-w-md mx-auto border-orange-200">
        <CardHeader className="text-center">
          <div
            className={`${plan.color} w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-white`}
          >
            {plan.icon}
          </div>
          <CardTitle>Already Subscribed</CardTitle>
          <CardDescription>
            You're already on the {plan.name} plan
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Badge className="mb-4">Current Plan</Badge>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full">
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div
            className={`${plan.color} w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white`}
          >
            {plan.icon}
          </div>

          <CardTitle>
            {isUpgrade ? "Upgrade to " : "Subscribe to "} {plan.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* ✅ Plan Features Section */}
<div className="mt-4 bg-gray-50 rounded-lg p-4">
  <h4 className="font-semibold text-sm mb-3 text-gray-700">
    What’s included in the {plan.name} plan:
  </h4>
  <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
    {plan.features.map((feature, index) => (
      <li key={index}>{feature}</li>
    ))}
  </ul>
</div>

          <div>
            <h4 className="font-medium text-sm mb-2">Coupon Code</h4>
            <CouponInput
              amount={baseAmount}
              type="subscription"
              onCouponApplied={handleCouponApplied}
              disabled={isProcessing || isActivating}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Plan Price</span>
              <span>{pricing.symbol}{baseAmount}</span>
            </div>
            {couponValidation.isValid && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Coupon Discount ({couponValidation.code})</span>
                <span>-{pricing.symbol}{discount}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total Amount</span>
              <span className={finalAmount === 0 ? "text-green-600" : ""}>
                {pricing.symbol}{finalAmount}
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="confirm-payment"
              checked={confirmPayment}
              onCheckedChange={(checked) => setConfirmPayment(!!checked)}
              disabled={finalAmount === 0 && !couponValidation.isValid}
            />
            <label
              htmlFor="confirm-payment"
              className="text-sm text-gray-600 cursor-pointer"
            >
              I confirm the {finalAmount === 0 ? "free activation" : `payment of ₹${finalAmount}`} for the {plan.name} plan.
            </label>
          </div>

          <Button
            onClick={handlePayment}
            disabled={
              isProcessing ||
              isActivating ||
              !confirmPayment ||
              (finalAmount === 0 && !couponValidation.isValid)
            }
            className={`w-full ${
              finalAmount === 0
                ? "bg-green-500 hover:bg-green-600"
                : "bg-orange-500 hover:bg-orange-600"
            } text-white`}
          >
            {isProcessing || isActivating ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{finalAmount === 0 ? "Activating..." : "Processing..."}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>{getPaymentButtonText()}</span>
              </div>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentGateway;
