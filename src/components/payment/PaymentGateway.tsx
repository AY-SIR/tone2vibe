import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Crown, Star, Zap, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LocationCacheService } from "@/services/locationCache";
import { InstamojoService } from "@/services/instamojo";
import { CouponInput } from "./CouponInput";
import type { CouponValidation } from "@/services/couponService";

interface PaymentGatewayProps {
  selectedPlan: 'pro' | 'premium';
  onPayment: (plan: 'pro' | 'premium') => void;
  isProcessing: boolean;
}

export function PaymentGateway({ selectedPlan, onPayment, isProcessing }: PaymentGatewayProps) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [couponValidation, setCouponValidation] = useState<CouponValidation>({
    isValid: false,
    discount: 0,
    message: ''
  });
  const [pricing] = useState({
    currency: 'INR',
    symbol: '₹',
    plans: {
      pro: { price: 99, originalPrice: 99 },
      premium: { price: 299, originalPrice: 299 }
    }
  });

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
  
  const currentPlan = profile?.plan;
  const isUpgrade = currentPlan === 'pro' && selectedPlan === 'premium';
  const isDowngrade = currentPlan === 'premium' && selectedPlan === 'pro';
  const isChange = isUpgrade || isDowngrade;

  const canPurchase = currentPlan === 'free' || isChange;

  const handleCouponApplied = (validation: CouponValidation) => {
    setCouponValidation(validation);
  };

  const handlePayment = async () => {
    if (!user || !confirmPayment) return;

    try {
      // Verify user is in India
      const location = await LocationCacheService.getLocation();
      if (!location.isIndian) {
        toast({
          title: "Access Denied",
          description: `This service is only available in India. Your location: ${location.country}`,
          variant: "destructive"
        });
        return;
      }

      // Create Instamojo payment
      const result = await InstamojoService.createPlanPayment(
        selectedPlan,
        user.email || '',
        user.user_metadata?.full_name || user.user_metadata?.display_name || 'User'
      );

      if (result.success && result.payment_request?.longurl) {
        // Redirect to Instamojo payment page
        window.location.href = result.payment_request.longurl;
      } else {
        throw new Error(result.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      let userFriendlyMessage = "We're having trouble processing your payment right now. Please try again in a moment.";
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          userFriendlyMessage = "Please check your internet connection and try again.";
        } else if (error.message.includes('unauthorized') || error.message.includes('auth')) {
          userFriendlyMessage = "Please sign in again and try your payment.";
        } else if (error.message.includes('India')) {
          userFriendlyMessage = "This service is only available for users in India.";
        }
      }
      
      toast({
        title: "Payment Issue",
        description: userFriendlyMessage,
        variant: "destructive"
      });
    }
  };

  if (!canPurchase && currentPlan === selectedPlan) {
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
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full text-xs sm:text-sm"
            variant="outline"
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

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
          <Button 
            onClick={() => window.location.href = '/payment'}
            className="w-full text-xs sm:text-sm"
            variant="outline"
          >
            View Available Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center p-3 sm:p-6">
        <div className={`${plan.color} w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white`}>
          {plan.icon}
        </div>
        <CardTitle className="text-base sm:text-lg md:text-2xl">
          {isUpgrade ? 'Upgrade to ' : isDowngrade ? 'Downgrade to ' : 'Subscribe to '}{plan.name}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {isChange 
            ? `Change your ${currentPlan} plan to ${selectedPlan} plan`
            : 'Choose your subscription plan and start creating amazing voice content'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
        {/* Current Plan Badge */}
        {currentPlan && currentPlan !== 'free' && (
          <div className="text-center">
            <Badge variant="outline" className="mb-4 text-xs">
              Currently on {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
            </Badge>
          </div>
        )}

        {/* Plan Features */}
        <div className="space-y-2">
          <h4 className="font-medium text-xs sm:text-sm text-gray-900">What's included:</h4>
          <ul className="space-y-1">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center space-x-2 text-xs">
                <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />
        
        {/* Coupon Section */}
        <CouponInput 
          amount={baseAmount}
          type="subscription"
          onCouponApplied={handleCouponApplied}
          disabled={isProcessing}
        />

        <Separator />

        {/* Pricing Breakdown */}
        <div className="space-y-2">
          <h4 className="font-medium text-xs sm:text-sm text-gray-900">Pricing Details:</h4>
          
          <div className="flex justify-between text-xs">
            <span>Plan Price</span>
            <span>{pricing.symbol}{baseAmount}</span>
          </div>
          
          {couponValidation.isValid && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Coupon Discount</span>
              <span>-{pricing.symbol}{couponValidation.discount}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between font-medium text-xs sm:text-sm">
            <span>Total Amount</span>
            <span>{pricing.symbol}{finalAmount}</span>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Billed monthly • Cancel anytime • INR Currency Only
          </div>
        </div>

        {/* Payment Confirmation */}
        <div className="space-y-3">
          <div className="flex items-start space-x-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
            <Checkbox 
              id="confirm-payment"
              checked={confirmPayment}
              onCheckedChange={(checked) => setConfirmPayment(checked as boolean)}
            />
            <div className="text-xs text-gray-600">
              <label htmlFor="confirm-payment" className="cursor-pointer">
                I confirm the payment of <strong>{pricing.symbol}{finalAmount}</strong> 
                for the {plan.name} plan. This amount will be charged to my selected payment method.
              </label>
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          disabled={isProcessing || !confirmPayment}
          className={`w-full bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm`}
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : !confirmPayment ? (
            <span>Confirm to Continue</span>
          ) : (
            <div className="flex items-center space-x-2">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>
                {isUpgrade ? `Upgrade for ${pricing.symbol}${finalAmount}` : 
                 isDowngrade ? `Downgrade for ${pricing.symbol}${finalAmount}` : 
                 `Subscribe for ${pricing.symbol}${finalAmount}`}
              </span>
            </div>
          )}
        </Button>

        {/* Security Notice */}
        <div className="text-xs text-gray-500 text-center">
          <div className="flex items-center justify-center space-x-1">
            <span>🔒</span>
            <span>Secure payment processing</span>
          </div>
          <div className="mt-1">
            Your payment information is encrypted and secure
          </div>
        </div>
      </CardContent>
    </Card>
  );
}