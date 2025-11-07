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
import { Check, Crown, Star, Zap, TriangleAlert as AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CouponInput } from "@/components/payment/couponInput";
import { supabase } from "@/integrations/supabase/client";

interface PaymentGatewayProps {
  selectedPlan: 'pro' | 'premium';
  onPayment: (plan: 'pro' | 'premium') => void;
  isProcessing: boolean;
}

export function PaymentGateway({
  selectedPlan = 'pro',
  onPayment,
  isProcessing = false
}: PaymentGatewayProps) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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
        "₹11 for every 1,000 words",
        "High quality audio",
        "Last 30 voices",
        "30 Days History",
        "Voice storage & reuse",
        "Priority support",
        "Speed & pitch control",
        "Usage analytics & charts",
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
        "₹9 for every 1,000 words",
        "90 days history",
        "Language usage tracking",
        "Last 90 Days voices",
        "Voice storage & reuse",
        "Advanced Speed & pitch control",
        "24/7 support",
        "Advanced Analytics"
      ],
      icon: <Star className="h-4 w-4 sm:h-5 sm:w-5" />,
      color: "bg-gray-700"
    }
  };

  const plan = planDetails[selectedPlan];
  const discount = Math.max(0, couponValidation.discount);
  const baseAmount = plan.price;
  const finalAmount = Math.max(0, baseAmount - discount);

  const currentPlan = profile?.plan || 'free';
  const isUpgrade = currentPlan === 'pro' && selectedPlan === 'premium';
  const isDowngrade = currentPlan === 'premium' && selectedPlan === 'pro';
  const isChange = isUpgrade || isDowngrade;

  const isExpired = profile?.plan_expires_at && new Date(profile.plan_expires_at) <= new Date();
  const canPurchase = currentPlan === 'free' || isUpgrade || isExpired;

  const handleCouponApplied = (validation: typeof couponValidation) => {
    setCouponValidation(validation);
  };

  const getPaymentButtonText = () => {
    if(finalAmount === 0) return `Activate ${plan.name} Plan (FREE!)`;
    if(isUpgrade) return `Upgrade for ${pricing.symbol}${finalAmount}`;
    if(isDowngrade) return `Downgrade for ${pricing.symbol}${finalAmount}`;
    return `Subscribe for ${pricing.symbol}${finalAmount}`;
  };

  const handlePayment = async () => {
    if (!confirmPayment) return;
    setIsActivating(true);

    try {
      if (finalAmount === 0) {
        // Free activation with coupon
        if (!couponValidation.isValid || !couponValidation.code) {
          toast({
            title: "Invalid Coupon",
            description: "A valid coupon is required for free plan activation.",
            variant: "destructive",
            duration: 3000,
          });
          setIsActivating(false);
          return;
        }
        await handleFreeActivation();
      } else {
        // Paid activation - call parent handler
    toast({
      title: "Payment initiated",
      description: "Redirecting to payment gateway...",
    });
        onPayment(selectedPlan);
      }
    } catch (error) {
      // FIXED: Redirect to payment-failed page with error details
      const errorMessage = error instanceof Error ? error.message : "Failed to activate plan";
      // Silent error handling

      navigate(
        `/payment-failed?type=subscription&reason=${encodeURIComponent(errorMessage)}`,
        { replace: true }
      );

      setIsActivating(false);
    }
  };

  const handleFreeActivation = async () => {
    try {
      if (!user) {
        throw new Error('User not logged in. Please login and try again.');
      }

      const freeTransactionId = `FREE_PLAN_${couponValidation.code}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Step 1: Verify coupon validity
      const { data: couponCheck, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponValidation.code)
        .in('type', ['subscription', 'both'])
        .single();

      if (couponError) {
        throw new Error('Failed to verify coupon. Please try again.');
      }

      if (!couponCheck) {
        throw new Error('Coupon is no longer valid for subscription.');
      }

      if (couponCheck.max_uses && couponCheck.used_count >= couponCheck.max_uses) {
        throw new Error('Coupon usage limit has been exceeded.');
      }

      // Step 2: Get plan limits
      const planLimits = {
        pro: { words_limit: 10000, upload_limit_mb: 25, plan_words_used: 0 },
        premium: { words_limit: 50000, upload_limit_mb: 100, plan_words_used: 0 }
      };

      const limits = planLimits[selectedPlan];
      if (!limits) {
        throw new Error('Invalid plan selected. Please try again.');
      }

      const now = new Date();
      const planEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Step 3: Update user profile
      const updateData = {
        plan: selectedPlan,
        words_limit: limits.words_limit,
        word_balance: profile?.word_balance || 0,
        plan_words_used: 0,
        upload_limit_mb: limits.upload_limit_mb,
        plan_start_date: now.toISOString(),
        plan_end_date: planEndDate.toISOString(),
        plan_expires_at: planEndDate.toISOString(),
        last_payment_amount: 0,
        last_payment_id: freeTransactionId,
        updated_at: now.toISOString()
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to update your profile: ${profileError.message}`);
      }

      // Step 4: Record payment transaction
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          plan: selectedPlan,
          amount: 0,
          currency: 'INR',
          status: 'completed',
          payment_id: freeTransactionId,
          payment_method: 'coupon',
          coupon_code: couponValidation.code,
          created_at: now.toISOString()
        });

      if (paymentError) {
        throw new Error(`Failed to record activation: ${paymentError.message}`);
      }

      // Step 5: Update coupon usage count
      const { error: couponUpdateError } = await supabase
        .from('coupons')
        .update({
          used_count: (couponCheck.used_count || 0) + 1,
          last_used_at: now.toISOString()
        })
        .eq('id', couponCheck.id);

      if (couponUpdateError) {
        throw new Error(`Failed to update coupon usage: ${couponUpdateError.message}`);
      }

      // SUCCESS - Redirect to success page
      navigate(
        `/payment-success?plan=${selectedPlan}&type=subscription&amount=0&coupon=${couponValidation.code}&method=free`,
        { replace: true }
      );

    } catch (error) {
      // Re-throw to be caught by handlePayment
      throw error;
    }
  };

  // FIXED: Added !isActivating to prevent flash
  if (!isProcessing && !isActivating && !canPurchase && currentPlan === selectedPlan && !isExpired) {
    return (
      <Card className="w-full max-w-md mx-auto border-orange-200">
        <CardHeader className="text-center p-3 sm:p-6">
          <div className={`${plan.color} w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white`}>
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
          <Button onClick={() => navigate('/')} className="w-full text-xs sm:text-sm" variant="outline">
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  // FIXED: Added !isActivating to prevent flash
  if (!isProcessing && !isActivating && !canPurchase && !isExpired) {
    return (
      <Card className="w-full max-w-md mx-auto border-red-200">
        <CardHeader className="text-center p-3 sm:p-6">
          <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-base sm:text-lg md:text-2xl">Plan Change Not Allowed</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            You can only upgrade from Pro to Premium. Downgrades are not allowed during active subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-3 sm:p-6">
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Current plan: <Badge variant="outline" className="text-xs">{currentPlan}</Badge>
            {profile?.plan_expires_at && (
              <span className="block mt-1">
                Expires: {new Date(profile.plan_expires_at).toLocaleDateString()}
              </span>
            )}
          </p>
          <Button onClick={() => navigate('/payment')} className="w-full text-xs sm:text-sm" variant="outline">
            View Available Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Loading overlay during processing */}
      {(isProcessing || isActivating) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm mx-4">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {finalAmount === 0 ? 'Activating Your Plan' : 'Processing Payment'}
                </h3>
                <p className="text-sm text-gray-600">
                  {finalAmount === 0
                    ? 'Setting up your free plan activation...'
                    : 'Please wait while we process your payment...'}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full animate-pulse" style={{width: '60%'}}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center p-6 block lg:hidden">
            <div className={`${plan.color} w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-white`}>
              {plan.icon}
            </div>
            <CardTitle className="text-lg lg:text-xl">
              {isUpgrade ? 'Upgrade to ' : isDowngrade ? 'Downgrade to ' : 'Subscribe to '}{plan.name}
            </CardTitle>
            <CardDescription className="text-sm">
              {isChange ? `Change your ${currentPlan} plan to ${selectedPlan} plan` : 'Embark on your voice creation adventure.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            {currentPlan && currentPlan !== 'free' && (
              <div className="text-center">
                <Badge variant="outline" className="text-sm">
                  Currently on {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
                </Badge>
              </div>
            )}

            <div className="space-y-3">
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

            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900">Pricing Summary</h4>
              <div className="flex justify-between text-sm">
                <span>Plan Price</span>
                <span className="font-medium">{pricing.symbol}{baseAmount}</span>
              </div>
              {couponValidation.isValid && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Coupon Discount ({couponValidation.code})</span>
                  <span className="font-medium">-{pricing.symbol}{discount}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total Amount</span>
                <span className={finalAmount === 0 ? 'text-green-600' : ''}>
                  {pricing.symbol}{finalAmount}
                </span>
              </div>
              <div className="text-xs text-gray-500 text-center">
                {finalAmount === 0 ? 'Free activation with coupon' :
                 isExpired ? 'Plan renewal • INR Currency Only' :
                 'Billed monthly • INR Currency Only'}
              </div>
            </div>

            {finalAmount === 0 && !couponValidation.isValid && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Invalid Free Activation</p>
                <p className="text-xs text-red-500 mt-1">A valid coupon code is required for free plan activation.</p>
              </div>
            )}

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
                  {finalAmount === 0 && couponValidation.isValid && ` Using coupon code: ${couponValidation.code}`}
                </label>
              </div>
            </div>

            <Button
              onClick={handlePayment}
              disabled={isProcessing || isActivating || !confirmPayment || (finalAmount === 0 && !couponValidation.isValid)}
              className={`w-full ${finalAmount === 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'} text-white py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
              size="lg"
            >
              {isProcessing || isActivating ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{finalAmount === 0 ? 'Activating...' : 'Processing...'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>{getPaymentButtonText()}</span>
                </div>
              )}
            </Button>

            <div className="text-sm text-gray-500 text-center mt-2">
              <div className="flex items-center justify-center space-x-2">
                <span>{finalAmount === 0 ? 'Secure free activation' : 'Secure payment processing'}</span>
              </div>
              <div className="mt-1 text-xs">
                {finalAmount === 0 ? 'Your account will be upgraded immediately upon confirmation' : 'Your payment information is encrypted and secure'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default PaymentGateway;