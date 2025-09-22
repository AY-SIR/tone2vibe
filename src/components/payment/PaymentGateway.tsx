import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Crown, Star, Zap, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { couponInput } from "@/components/payment/couponInput"; // ✅ exact case
import { supabase } from "@/integrations/supabase/client";

interface PaymentGatewayProps {
  selectedPlan: 'pro' | 'premium';
  onPayment: (plan: 'pro' | 'premium') => void;
  isProcessing: boolean;
}

export function PaymentGateway({ selectedPlan = 'pro', onPayment, isProcessing = false }: PaymentGatewayProps) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [couponValidation, setCouponValidation] = useState({
    isValid: false,
    discount: 0,
    message: '',
    code: ''
  });

  const pricing = {
    currency: 'INR',
    symbol: '₹',
    plans: {
      pro: { price: 99, originalPrice: 99 },
      premium: { price: 299, originalPrice: 299 }
    }
  };

  const planDetails = {
    pro: {
      name: "Pro",
      price: pricing.plans.pro.price,
      originalPrice: pricing.plans.pro.originalPrice,
      features: [
        "10,000 words/month base limit",
        "Buy up to 36,000 additional words",
        "25MB upload limit",
        "High quality audio",
        "30 days history",
        "Priority support",
        "Basic Analytics",
      ],
      icon: <Crown className="h-4 w-4 sm:h-5 sm:w-5" />,
      color: "bg-gray-700"
    },
    premium: {
      name: "Premium",
      price: pricing.plans.premium.price,
      originalPrice: pricing.plans.premium.originalPrice,
      features: [
        "50,000 words/month base limit",
        "Buy up to 49,000 additional words",
        "100MB upload limit",
        "Ultra-high quality",
        "90 days history",
        "24/7 support",
        "Advanced Analytics",
      ],
      icon: <Star className="h-4 w-4 sm:h-5 sm:w-5" />,
      color: "bg-gray-700"
    }
  };

  const plan = planDetails[selectedPlan];
  const baseAmount = plan.price;
  const finalAmount = Math.max(0, baseAmount - couponValidation.discount);

  const currentPlan = profile?.plan || 'free';
  const isUpgrade = currentPlan === 'pro' && selectedPlan === 'premium';
  const isDowngrade = currentPlan === 'premium' && selectedPlan === 'pro';
  const isChange = isUpgrade || isDowngrade;

  const canPurchase = currentPlan === 'free' || isChange;

  const handleCouponApplied = (validation: typeof couponValidation) => {
    setCouponValidation(validation);
  };

  const handlePayment = async () => {
    if (!confirmPayment) return;
    setIsActivating(true);

    try {
      if (finalAmount === 0) {
        // Validate coupon before proceeding with free activation
        if (!couponValidation.isValid || !couponValidation.code) {
          toast({
            title: "Invalid Coupon",
            description: "A valid coupon is required for free plan activation.",
            variant: "destructive"
          });
          setIsActivating(false);
          return;
        }

        // Handle free activation with coupon
        await handleFreeActivation();
      } else {
        // Handle paid activation
        console.log("Payment/Activation initiated for plan:", selectedPlan, "Final Amount:", finalAmount);
        onPayment(selectedPlan);
      }
    } catch (error) {
      console.error("Payment failed:", error);
      toast({
        title: "Activation Failed",
        description: error instanceof Error ? error.message : "Failed to activate plan",
        variant: "destructive"
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleFreeActivation = async () => {
    try {
      // Generate unique transaction ID for free activation
      const freeTransactionId = `FREE_PLAN_${couponValidation.code}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Step 1: Verify coupon is still valid
      const { data: couponCheck, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponValidation.code)
        .eq('active', true)
        .eq('type', 'subscription') // Ensure it's a subscription coupon
        .single();

      if (couponError || !couponCheck) {
        throw new Error('Coupon is no longer valid for subscription');
      }

      // Step 2: Check coupon usage limits
      if (couponCheck.max_uses && couponCheck.used_count >= couponCheck.max_uses) {
        throw new Error('Coupon usage limit exceeded');
      }

      // Step 3: Update user plan
      const { error: planUpdateError } = await supabase
        .from('profiles')
        .update({
          plan: selectedPlan,
          subscription_status: 'active',
          subscription_end_date: null, // Free plans don't have end dates
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (planUpdateError) {
        console.error('Error updating plan:', planUpdateError);
        throw new Error('Failed to activate plan');
      }

      // Step 4: Record the subscription in history
      const { error: historyError } = await supabase
        .from('subscription_history')
        .insert({
          user_id: user!.id,
          plan: selectedPlan,
          amount_paid: 0, // Free activation
          currency: 'INR',
          status: 'completed',
          payment_id: freeTransactionId,
          payment_method: 'coupon',
          coupon_code: couponValidation.code,
          activated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('Error recording subscription history:', historyError);
        // Don't throw here as plan was already activated
        console.warn('Plan activated but history recording failed');
      }

      // Step 5: Update coupon usage
      const { error: couponUpdateError } = await supabase
        .from('coupons')
        .update({
          used_count: (couponCheck.used_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', couponCheck.id);

      if (couponUpdateError) {
        console.error('Error updating coupon usage:', couponUpdateError);
        // Don't throw here as the activation was successful
      }

      // Success feedback
      toast({
        title: "Plan Activated Successfully!",
        description: `Your ${selectedPlan} plan has been activated for free using coupon ${couponValidation.code}!`,
      });

      // Redirect to success page with proper parameters
      window.location.href = `/payment-success?plan=${selectedPlan}&type=subscription&amount=0&coupon=${couponValidation.code}&method=free`;

    } catch (error) {
      console.error('Free activation error:', error);

      let errorMessage = "Failed to activate plan. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  };

  // Already subscribed card
  if (!canPurchase && currentPlan === selectedPlan) {
    return (
      <Card className="w-full max-w-md mx-auto border-orange-200">
        <CardHeader className="text-center p-3 sm:p-6">
          <div
            className={`${plan.color} w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white`}
          >
            {plan.icon}
          </div>
          <CardTitle className="text-base sm:text-lg md:text-2xl">Already Subscribed</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            You're already on the {plan.name} plan
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center p-3 sm:p-6">
          <Badge className="mb-4 text-xs">Current Plan</Badge>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            You're currently enjoying all {plan.name} features
          </p>
          <Button onClick={() => window.location.href = '/'} className="w-full text-xs sm:text-sm" variant="outline">
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Invalid plan change card
  if (!canPurchase) {
    return (
      <Card className="w-full max-w-md mx-auto border-red-200">
        <CardHeader className="text-center p-3 sm:p-6">
          <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-base sm:text-lg md:text-2xl">Invalid Plan Change</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Plan changes are restricted based on your current subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-3 sm:p-6">
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Current plan: <Badge variant="outline" className="text-xs">{currentPlan}</Badge>
          </p>
          <Button onClick={() => window.location.href = '/payment'} className="w-full text-xs sm:text-sm" variant="outline">
            View Available Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main payment gateway
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center p-6 block lg:hidden">
          <div className={`${plan.color} w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-white`}>
            {plan.icon}
          </div>
          <CardTitle className="text-lg lg:text-xl">
            {isUpgrade ? 'Upgrade to ' : isDowngrade ? 'Downgrade to ' : 'Subscribe to '}{plan.name}
          </CardTitle>
          <CardDescription className="text-sm">
            {isChange
              ? `Change your ${currentPlan} plan to ${selectedPlan} plan`
              : 'Embark on your voice creation adventure.'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Current Plan Badge */}
          {currentPlan && currentPlan !== 'free' && (
            <div className="text-center">
              <Badge variant="outline" className="text-sm">
                Currently on {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
              </Badge>
            </div>
          )}

          {/* Plan Features */}
          <div className="space-y-3 lg:hidden">
            <h4 className="font-medium text-sm text-gray-900">What's included:</h4>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-3 text-xs">
                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator className="lg:hidden" />

          {/* Coupon Section */}
          <div>
            <h4 className="font-medium text-sm text-gray-900 mb-3">Coupon Code</h4>
            <CouponInput
              amount={baseAmount}
              type="subscription"
              onCouponApplied={handleCouponApplied}
              disabled={isProcessing || isActivating}
            />
          </div>

          <Separator />

          {/* Pricing Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-900">Pricing Summary</h4>
            <div className="flex justify-between text-sm">
              <span>Plan Price</span>
              <span className="font-medium">{pricing.symbol}{baseAmount}</span>
            </div>
            {couponValidation.isValid && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Coupon Discount ({couponValidation.code})</span>
                <span className="font-medium">-{pricing.symbol}{couponValidation.discount}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total Amount</span>
              <span className={finalAmount === 0 ? 'text-green-600' : ''}>
                {pricing.symbol}{finalAmount}
                {finalAmount === 0 && <span className="text-xs font-normal ml-2">(FREE!)</span>}
              </span>
            </div>
            <div className="text-xs text-gray-500 text-center">
              {finalAmount === 0 ? 'Free activation with coupon' : 'Billed monthly • INR Currency Only'}
            </div>
          </div>

          {/* Warning for zero amount without valid coupon */}
          {finalAmount === 0 && !couponValidation.isValid && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">
                ⚠️ Invalid Free Activation
              </p>
              <p className="text-xs text-red-500 mt-1">
                A valid coupon code is required for free plan activation.
              </p>
            </div>
          )}

          {/* Payment Confirmation */}
          <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="confirm-payment"
              checked={confirmPayment}
              onCheckedChange={(checked) => setConfirmPayment(checked as boolean)}
              disabled={finalAmount === 0 && !couponValidation.isValid}
            />
            <div className="text-sm text-gray-600 flex-1">
              <label htmlFor="confirm-payment" className="cursor-pointer">
                I confirm {finalAmount === 0 ? 'the free activation' : `the payment of ${pricing.symbol}${finalAmount}`} for the {plan.name} plan.
                {finalAmount > 0 && ' This amount will be charged to my selected payment method.'}
                {finalAmount === 0 && couponValidation.isValid && ` Using coupon code: ${couponValidation.code}`}
              </label>
            </div>
          </div>

          {/* Payment Button */}
          <Button
            onClick={handlePayment}
            disabled={
              isProcessing ||
              isActivating ||
              !confirmPayment ||
              (finalAmount === 0 && !couponValidation.isValid)
            }
            className={`w-full ${
              finalAmount === 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'
            } text-white py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            size="lg"
          >
            {isProcessing || isActivating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{finalAmount === 0 ? 'Activating...' : 'Processing...'}</span>
              </div>
            ) : !confirmPayment ? (
              <span>Confirm to Continue</span>
            ) : (finalAmount === 0 && !couponValidation.isValid) ? (
              <span>Valid Coupon Required</span>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>
                  {finalAmount === 0 ? `Activate ${plan.name} Plan (FREE!)` :
                   isUpgrade ? `Upgrade for ${pricing.symbol}${finalAmount}` :
                   isDowngrade ? `Downgrade for ${pricing.symbol}${finalAmount}` :
                   `Subscribe for ${pricing.symbol}${finalAmount}` }
                </span>
              </div>
            )}
          </Button>

          {/* Security Notice */}
          <div className="text-sm text-gray-500 text-center">
            <div className="flex items-center justify-center space-x-2">
              <span>🔒</span>
              <span>{finalAmount === 0 ? 'Secure free activation' : 'Secure payment processing'}</span>
            </div>
            <div className="mt-1 text-xs">
              {finalAmount === 0
                ? 'Your account will be upgraded immediately upon confirmation'
                : 'Your payment information is encrypted and secure'
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentGateway;