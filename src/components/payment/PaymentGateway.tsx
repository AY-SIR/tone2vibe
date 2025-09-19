
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Crown, Star, Zap, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LocationService } from "@/services/locationService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentGatewayProps {
  selectedPlan: 'pro' | 'premium';
  onPayment: (plan: 'pro' | 'premium') => void;
  isProcessing: boolean;
}

export function PaymentGateway({ selectedPlan, onPayment, isProcessing }: PaymentGatewayProps) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [pricing, setPricing] = useState({
    currency: 'INR',
    symbol: '₹',
    plans: {
      pro: { price: 99, originalPrice: 99 },
      premium: { price: 299, originalPrice: 299 }
    }
  });

  useEffect(() => {
    loadPricing();
  }, [user]);

  const loadPricing = async () => {
    try {
      // Use saved location data instead of detecting again
      if (user) {
        const savedLocation = localStorage.getItem(`user_location_${user.id}`);
        if (savedLocation) {
          const locationData = JSON.parse(savedLocation);
          const userPricing = LocationService.getPricing();
          setPricing(userPricing);
          return;
        }
      }
      
      // Fallback to detection if no saved data
      const locationData = await LocationService.detectUserLocation();
      const userPricing = LocationService.getPricing();
      setPricing(userPricing);
    } catch (error) {
      console.error('Failed to load pricing:', error);
    }
  };
  
  const planDetails = {
    pro: {
      name: "Pro",
      price: pricing.plans.pro.price,
      originalPrice: pricing.plans.pro.originalPrice,
      features: [
        "10,000 words/month base limit",
        "Buy up to 41,000 total words",
        "25MB upload limit", 
        "High quality audio",
        "30 days history",
        "Priority support",
        "Basic Analytics",
      ],
      icon: <Crown className="h-4 w-4 sm:h-5 sm:w-5 " />,
      color: "bg-gray-700"
    },
    premium: {
      name: "Premium", 
      price: pricing.plans.premium.price,
      originalPrice: pricing.plans.premium.originalPrice,
      features: [
        "50,000 words/month base limit",
        "Buy up to 99,999 total words",
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
  const totalAmount = plan.price;
  
  const currentPlan = profile?.plan;
  const isUpgrade = currentPlan === 'pro' && selectedPlan === 'premium';
  const isDowngrade = currentPlan === 'premium' && selectedPlan === 'pro';
  const isChange = isUpgrade || isDowngrade;

  const canPurchase = currentPlan === 'free' || isChange;

  const handlePayment = async () => {
    if (!user || !confirmPayment) return;

    try {
      // Verify payment location matches login location
      const savedLocation = localStorage.getItem(`user_location_${user.id}`);
      if (savedLocation) {
        const currentLocation = await LocationService.getUserLocation();
        const userLocationData = JSON.parse(savedLocation);
        
        if (currentLocation?.country && userLocationData.country && 
            currentLocation.country !== userLocationData.country) {
          toast({
            title: "Location Verification",
            description: `Payment location (${currentLocation.country}) differs from login location (${userLocationData.country}). Proceeding with payment.`,
            variant: "default"
          });
        }
      }

      const { data, error } = await supabase.functions.invoke('create-stripe-payment', {
        body: { plan: selectedPlan }
      });

      if (error) throw error;

      if (data?.url) {
        // Open in new tab instead of redirecting
        window.open(data.url, '_blank');
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      let userFriendlyMessage = "We're having trouble processing your payment right now. Please try again in a moment.";
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          userFriendlyMessage = "Please check your internet connection and try again.";
        } else if (error.message.includes('unauthorized') || error.message.includes('auth')) {
          userFriendlyMessage = "Please sign in again and try your payment.";
        } else if (error.message.includes('rate limit')) {
          userFriendlyMessage = "Too many payment attempts. Please wait a moment before trying again.";
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
          <div className={`${plan.color} w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-4`}>
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
        <div className={`${plan.color} w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-4`}>
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

        {/* Pricing Breakdown */}
        <div className="space-y-2">
          <h4 className="font-medium text-xs sm:text-sm text-gray-900">Pricing Details:</h4>
          
          <div className="flex justify-between text-xs">
            <span>Plan Price</span>
            <span>{pricing.symbol}{plan.price}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between font-medium text-xs sm:text-sm">
            <span>Total Amount</span>
            <span>{pricing.symbol}{totalAmount}</span>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Billed monthly • Cancel anytime • Currency: {pricing.currency}
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
                I confirm the payment of <strong>{pricing.symbol}{totalAmount}</strong> 
                for the {plan.name} plan. This amount will be charged to my selected payment method.
              </label>
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          disabled={isProcessing || !confirmPayment}
          className={`w-full ${plan.color} hover:opacity-90 text-white text-xs sm:text-sm`}
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
                {isUpgrade ? `Upgrade for ${pricing.symbol}${totalAmount}` : 
                 isDowngrade ? `Downgrade for ${pricing.symbol}${totalAmount}` : 
                 `Subscribe for ${pricing.symbol}${totalAmount}`}
              </span>
            </div>
          )}
        </Button>

        {/* Security Notice */}
        <div className="text-xs text-gray-500 text-center">
          <div className="flex items-center justify-center space-x-1">
            <span></span>
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
