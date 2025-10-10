import { useState, useEffect } from "react";
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
import { Check, Crown, Star, Zap, TriangleAlert as AlertTriangle, Sparkles } from "lucide-react";
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
  const [planData, setPlanData] = useState<any>(null);

  // Load plan data from database
  useEffect(() => {
    const loadPlanData = async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('name', selectedPlan)
        .single();
      
      if (!error && data) {
        setPlanData(data);
      }
    };
    
    loadPlanData();
  }, [selectedPlan]);

  const pricing = {
    currency: planData?.currency || 'INR',
    symbol: planData?.currency === 'INR' ? '₹' : '$',
    plans: {
      pro: { price: planData?.name === 'pro' ? planData.price : 99, originalPrice: planData?.name === 'pro' ? (planData.original_price || planData.price) : 99 },
      premium: { price: planData?.name === 'premium' ? planData.price : 299, originalPrice: planData?.name === 'premium' ? (planData.original_price || planData.price) : 299 }
    }
  };

  const planDetails = {
    pro: {
      name: "Pro",
      price: pricing.plans.pro.price,
      originalPrice: pricing.plans.pro.originalPrice,
      features: planData?.features || [
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
        "Usage analytics & charts"
      ],
      icon: <Crown className="h-5 w-5" />,
      gradient: "from-amber-500 to-yellow-600"
    },
    premium: {
      name: "Premium",
      price: pricing.plans.premium.price,
      originalPrice: pricing.plans.premium.originalPrice,
      features: planData?.features || [
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
      icon: <Star className="h-5 w-5" />,
      gradient: "from-purple-500 to-pink-600"
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
        if (!couponValidation.isValid || !couponValidation.code) {
          toast({
            title: "Invalid Coupon",
            description: "A valid coupon is required for free plan activation.",
            variant: "destructive"
          });
          setIsActivating(false);
          return;
        }
        await handleFreeActivation();
      } else {
        onPayment(selectedPlan);
      }
    } catch (error) {
      toast({
        title: "Activation Failed",
        description: error instanceof Error ? error.message : "Failed to activate plan",
        variant: "destructive"
      });
      console.error(error);
    } finally {
      setIsActivating(false);
    }
  };

  const handleFreeActivation = async () => {
    try {
      if (!user) throw new Error('User not logged in');

      const freeTransactionId = `FREE_PLAN_${couponValidation.code}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: couponCheck, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponValidation.code)
        .in('type', ['subscription', 'both'])
        .single();

      if (couponError || !couponCheck) throw new Error('Coupon is no longer valid for subscription');
      if (couponCheck.max_uses && couponCheck.used_count >= couponCheck.max_uses) {
        throw new Error('Coupon usage limit exceeded');
      }

      const planLimits = {
        pro: { words_limit: 10000, upload_limit_mb: 25, plan_words_used: 0 },
        premium: { words_limit: 50000, upload_limit_mb: 100, plan_words_used: 0 }
      };

      const limits = planLimits[selectedPlan];
      if (!limits) throw new Error('Invalid plan selected');

      const now = new Date();
      const planEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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
        .eq('user_id', user.id);

      if (profileError) throw new Error(`Failed to update user profile: ${profileError.message}`);

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

      if (paymentError) throw new Error(`Failed to record free activation: ${paymentError.message}`);

      const { error: couponUpdateError } = await supabase
        .from('coupons')
        .update({
          used_count: (couponCheck.used_count || 0) + 1,
          last_used_at: now.toISOString()
        })
        .eq('id', couponCheck.id);

      if (couponUpdateError) throw new Error(`Failed to update coupon usage: ${couponUpdateError.message}`);

      toast({
        title: 'Plan Activated Successfully!',
        description: `Your ${selectedPlan} plan has been activated for free using coupon ${couponValidation.code}!`,
      });

      navigate(
        `/payment-success?plan=${selectedPlan}&type=subscription&amount=0&coupon=${couponValidation.code}&method=free`,
        { replace: true }
      );

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to activate plan');
    }
  };

  if (!canPurchase && currentPlan === selectedPlan && !isExpired) {
    return (
      <Card className="w-full max-w-md mx-auto border-2">
        <CardHeader className="text-center p-6">
          <div className={`bg-gradient-to-br ${plan.gradient} w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg`}>
            {plan.icon}
          </div>
          <CardTitle className="text-2xl">Already Subscribed</CardTitle>
          <CardDescription>
            You're already on the {plan.name} plan
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-6">
          <Badge className="mb-4">Current Plan</Badge>
          <p className="text-sm text-muted-foreground mb-4">
            You're currently enjoying all {plan.name} features
          </p>
          <Button onClick={() => navigate('/')} className="w-full" variant="outline">
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!canPurchase && !isExpired) {
    return (
      <Card className="w-full max-w-md mx-auto border-2 border-red-200">
        <CardHeader className="text-center p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Plan Change Not Allowed</CardTitle>
          <CardDescription>
            You can only upgrade from Pro to Premium. Downgrades are not allowed during active subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Current plan: <Badge variant="outline">{currentPlan}</Badge>
            {profile?.plan_expires_at && (
              <span className="block mt-1">
                Expires: {new Date(profile.plan_expires_at).toLocaleDateString()}
              </span>
            )}
          </p>
          <Button onClick={() => navigate('/payment')} className="w-full" variant="outline">
            View Available Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-2">
        {/* Header with gradient */}
        <div className={`bg-gradient-to-br ${plan.gradient} p-8 text-white rounded-t-lg`}>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/20 backdrop-blur-sm w-16 h-16 rounded-2xl flex items-center justify-center">
              {plan.icon}
            </div>
          </div>
          <CardTitle className="text-3xl text-center font-bold mb-2">
            {isUpgrade ? 'Upgrade to ' : isDowngrade ? 'Downgrade to ' : 'Subscribe to '}{plan.name}
          </CardTitle>
          <CardDescription className="text-center text-white/90 text-lg">
            {isChange ? `Change from ${currentPlan} to ${selectedPlan}` : 'Unlock premium voice cloning features'}
          </CardDescription>
        </div>

        <CardContent className="space-y-6 p-8">
          {currentPlan && currentPlan !== 'free' && (
            <div className="text-center">
              <Badge variant="outline" className="text-sm">
                Currently on {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
              </Badge>
            </div>
          )}

          {/* Plan Features - Enhanced */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <h4 className="font-semibold text-lg">Premium Features Included:</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-50 transition-all">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Coupon Section */}
          <div>
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-green-600">💰</span> Have a Coupon Code?
            </h4>
            <CouponInput
              amount={baseAmount}
              type="subscription"
              onCouponApplied={handleCouponApplied}
              disabled={isProcessing || isActivating}
            />
          </div>

          <Separator />

          {/* Pricing - Enhanced */}
          <div className="space-y-4 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
            <h4 className="font-semibold text-lg">Payment Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Plan Price</span>
                <span className="font-semibold text-lg">{pricing.symbol}{baseAmount}</span>
              </div>
              {couponValidation.isValid && (
                <div className="flex justify-between text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                  <span className="font-medium">Coupon Discount ({couponValidation.code})</span>
                  <span className="font-semibold">-{pricing.symbol}{discount}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span className={`text-2xl ${finalAmount === 0 ? 'text-green-600' : `bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}`}>
                  {pricing.symbol}{finalAmount}
                </span>
              </div>
              <div className="text-xs text-center text-muted-foreground bg-white/50 p-2 rounded">
                {finalAmount === 0 ? '🎉 Free activation with coupon' :
                 isExpired ? '🔄 Plan renewal • INR Currency Only' :
                 '📅 Billed monthly • INR Currency Only'}
              </div>
            </div>
          </div>

          {finalAmount === 0 && !couponValidation.isValid && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm text-red-600 font-semibold">⚠️ Invalid Free Activation</p>
              <p className="text-xs text-red-500 mt-1">A valid coupon code is required for free plan activation.</p>
            </div>
          )}

          {/* Payment Confirmation - Enhanced */}
          <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border-2 border-orange-200">
            <Checkbox
              id="confirm-payment"
              checked={confirmPayment}
              onCheckedChange={(checked) => setConfirmPayment(checked as boolean)}
              disabled={finalAmount === 0 && !couponValidation.isValid}
              className="mt-1"
            />
            <div className="text-sm flex-1">
              <label htmlFor="confirm-payment" className="cursor-pointer font-medium">
                I confirm {finalAmount === 0 ? 'the free activation' : `the payment of ${pricing.symbol}${finalAmount}`} for the {plan.name} plan.
                {finalAmount === 0 && couponValidation.isValid && ` Using coupon code: ${couponValidation.code}`}
              </label>
            </div>
          </div>

          {/* Payment Button - Enhanced */}
          <Button
            onClick={handlePayment}
            disabled={isProcessing || isActivating || !confirmPayment || (finalAmount === 0 && !couponValidation.isValid)}
            className={`w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all ${
              finalAmount === 0 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                : `bg-gradient-to-r ${plan.gradient}`
            }`}
            size="lg"
          >
            {isProcessing || isActivating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{finalAmount === 0 ? 'Activating...' : 'Processing...'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>{getPaymentButtonText()}</span>
              </div>
            )}
          </Button>

          {/* Security Notice */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <span className="text-xl">🔒</span>
              <span className="font-medium">{finalAmount === 0 ? 'Secure free activation' : 'Secure payment processing'}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {finalAmount === 0 ? 'Your account will be upgraded immediately upon confirmation' : 'Your payment information is encrypted and secure'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentGateway;
