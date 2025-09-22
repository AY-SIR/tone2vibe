import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Crown, Star, Zap, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // adjust path if needed
// Mock components for demo
const CouponInput = ({ amount, type, onCouponApplied, disabled }) => (
  <div className="space-y-2">
    <input
      type="text"
      placeholder="Enter coupon code"
      className="w-full p-2 border rounded"
      disabled={disabled}
    />
    <Button size="sm" variant="outline" disabled={disabled}>Apply</Button>
  </div>
);

interface PaymentGatewayProps {
  selectedPlan: 'pro' | 'premium';
  onPayment: (plan: 'pro' | 'premium') => void;
  isProcessing: boolean;
}

export function PaymentGateway({ selectedPlan = 'pro', onPayment, isProcessing = false }: PaymentGatewayProps) {
  const { profile } = useAuth();
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [couponValidation, setCouponValidation] = useState({
    isValid: false,
    discount: 0,
    message: '',
    code: ''
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

  const currentPlan = profile?.plan || 'free';
  const isUpgrade = currentPlan === 'pro' && selectedPlan === 'premium';
  const isDowngrade = currentPlan === 'premium' && selectedPlan === 'pro';
  const isChange = isUpgrade || isDowngrade;

  const canPurchase = currentPlan === 'free' || isChange;

  const handleCouponApplied = (validation) => {
    setCouponValidation(validation);
  };

  const handlePayment = async () => {
    console.log('Payment initiated');
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
    <div className="w-full min-h-screen bg-gray-50" style={{ textAlign: 'initial' }}>
      {/* Mobile Layout */}
      <div className="block lg:hidden p-4 sm:p-6">
        <div className="w-full max-w-2xl mx-auto" style={{ textAlign: 'left' }}>
          <Card className="w-full">
                      <CardHeader className="text-center p-4 sm:p-6">
            <div className={`${plan.color} w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-white`}>
              {plan.icon}
            </div>
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              {isUpgrade ? 'Upgrade to ' : isDowngrade ? 'Downgrade to ' : 'Subscribe to '}{plan.name}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {isChange
                ? `Change your ${currentPlan} plan to ${selectedPlan} plan`
                : 'Choose your subscription plan and start creating amazing voice content'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            {/* Current Plan Badge */}
            {currentPlan && currentPlan !== 'free' && (
              <div className="text-center">
                <Badge variant="outline" className="mb-4 text-sm">
                  Currently on {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
                </Badge>
              </div>
            )}

            {/* Plan Features */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm sm:text-base text-gray-900">What's included:</h4>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
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
              disabled={isProcessing || isActivating}
            />

            <Separator />

            {/* Pricing Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm sm:text-base text-gray-900">Pricing Details:</h4>

              <div className="flex justify-between text-sm">
                <span>Plan Price</span>
                <span>{pricing.symbol}{baseAmount}</span>
              </div>

              {couponValidation.isValid && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Coupon Discount</span>
                  <span>-{pricing.symbol}{couponValidation.discount}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-medium text-sm sm:text-base">
                <span>Total Amount</span>
                <span className={finalAmount === 0 ? 'text-green-600 font-bold' : ''}>
                  {pricing.symbol}{finalAmount}
                  {finalAmount === 0 && ' (FREE!)'}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-gray-500 text-center">
                Billed monthly • Cancel anytime • INR Currency Only
              </div>
            </div>

            {/* Payment Confirmation */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="confirm-payment"
                  checked={confirmPayment}
                  onCheckedChange={(checked) => setConfirmPayment(checked as boolean)}
                />
                <div className="text-sm text-gray-600">
                  <label htmlFor="confirm-payment" className="cursor-pointer">
                    I confirm {finalAmount === 0 ? 'the activation' : `the payment of ${pricing.symbol}${finalAmount}`}
                    for the {plan.name} plan.
                    {finalAmount > 0 && ' This amount will be charged to my selected payment method.'}
                  </label>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={isProcessing || isActivating || !confirmPayment}
              className={`w-full ${finalAmount === 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'} text-white text-sm sm:text-base py-3 sm:py-4`}
            >
              {isProcessing || isActivating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{finalAmount === 0 ? 'Activating...' : 'Processing...'}</span>
                </div>
              ) : !confirmPayment ? (
                <span>Confirm to Continue</span>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>
                    {finalAmount === 0 ? `Activate ${plan.name} Plan (FREE!)` :
                     isUpgrade ? `Upgrade for ${pricing.symbol}${finalAmount}` :
                     isDowngrade ? `Downgrade for ${pricing.symbol}${finalAmount}` :
                     `Subscribe for ${pricing.symbol}${finalAmount}`}
                  </span>
                </div>
              )}
            </Button>

            {/* Security Notice */}
            <div className="text-xs sm:text-sm text-gray-500 text-center">
              <div className="flex items-center justify-center space-x-2">
                <span>🔒</span>
                <span>Secure payment processing</span>
              </div>
              <div className="mt-1">
                Your payment information is encrypted and secure
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Desktop/Tablet Layout - FIXED */}
      <div className="hidden lg:block min-h-screen p-4 lg:p-6 xl:p-8" style={{ textAlign: 'initial' }}>
        <div className="w-full" style={{ maxWidth: 'none', textAlign: 'left' }}>
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-12 h-full max-w-7xl mx-auto">
            {/* Left Column - Plan Details */}
            <div className="flex flex-col w-full">
              <Card className="flex-1 h-full w-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`${plan.color} w-12 h-12 rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                      {plan.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-xl lg:text-2xl truncate">
                        {plan.name} Plan
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {isChange
                          ? `Change your ${currentPlan} plan to ${selectedPlan} plan`
                          : 'Professional voice generation features'
                        }
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 flex-1">
                  {/* Current Plan Badge */}
                  {currentPlan && currentPlan !== 'free' && (
                    <div>
                      <Badge variant="outline" className="text-sm">
                        Currently on {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
                      </Badge>
                    </div>
                  )}

                  {/* Plan Features */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg text-gray-900">What's included:</h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Plan Comparison */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">Plan Benefits:</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-gray-600">Monthly Words:</span>
                        <div className="font-medium">
                          {selectedPlan === 'pro' ? '10,000' : '50,000'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-600">Upload Limit:</span>
                        <div className="font-medium">
                          {selectedPlan === 'pro' ? '25MB' : '100MB'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-600">History:</span>
                        <div className="font-medium">
                          {selectedPlan === 'pro' ? '30 days' : '90 days'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-600">Support:</span>
                        <div className="font-medium">
                          {selectedPlan === 'pro' ? 'Priority' : '24/7'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Payment Form */}
            <div className="flex flex-col w-full">
              <Card className="flex-1 h-full w-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Payment Details</CardTitle>
                  <CardDescription className="text-sm">
                    Complete your {plan.name} plan subscription
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 flex flex-col">
                  {/* Coupon Section */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Coupon Code</h4>
                    <CouponInput
                      amount={baseAmount}
                      type="subscription"
                      onCouponApplied={handleCouponApplied}
                      disabled={isProcessing || isActivating}
                    />
                  </div>

                  <Separator />

                  {/* Pricing Breakdown */}
                  <div className="space-y-4 flex-1">
                    <h4 className="font-medium text-gray-900">Pricing Breakdown</h4>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Plan Price</span>
                        <span className="text-sm font-medium">{pricing.symbol}{baseAmount}</span>
                      </div>

                      {couponValidation.isValid && (
                        <div className="flex justify-between text-green-600">
                          <span className="text-sm">Coupon Discount ({couponValidation.code})</span>
                          <span className="text-sm font-medium">-{pricing.symbol}{couponValidation.discount}</span>
                        </div>
                      )}

                      <Separator />

                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Amount</span>
                        <span className={finalAmount === 0 ? 'text-green-600' : 'text-gray-900'}>
                          {pricing.symbol}{finalAmount}
                          {finalAmount === 0 && (
                            <span className="text-sm font-normal text-green-600 ml-2">(FREE!)</span>
                          )}
                        </span>
                      </div>

                      <div className="text-sm text-gray-500 text-center">
                        Billed monthly • Cancel anytime • INR Currency Only
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Confirmation and Button - Bottom section */}
                  <div className="space-y-4 mt-auto">
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Checkbox
                        id="confirm-payment-desktop"
                        checked={confirmPayment}
                        onCheckedChange={(checked) => setConfirmPayment(checked as boolean)}
                      />
                      <div className="text-sm text-gray-600 flex-1">
                        <label htmlFor="confirm-payment-desktop" className="cursor-pointer">
                          I confirm {finalAmount === 0 ? 'the activation' : `the payment of ${pricing.symbol}${finalAmount}`}
                          for the {plan.name} plan.
                          {finalAmount > 0 && ' This amount will be charged to my selected payment method.'}
                        </label>
                      </div>
                    </div>

                    {/* Payment Button */}
                    <Button
                      onClick={handlePayment}
                      disabled={isProcessing || isActivating || !confirmPayment}
                      className={`w-full ${finalAmount === 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'} text-white text-sm py-3`}
                      size="lg"
                    >
                      {isProcessing || isActivating ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>{finalAmount === 0 ? 'Activating Plan...' : 'Processing Payment...'}</span>
                        </div>
                      ) : !confirmPayment ? (
                        <span>Please Confirm to Continue</span>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4" />
                          <span>
                            {finalAmount === 0 ? `Activate ${plan.name} Plan (FREE!)` :
                             isUpgrade ? `Upgrade for ${pricing.symbol}${finalAmount}` :
                             isDowngrade ? `Downgrade for ${pricing.symbol}${finalAmount}` :
                             `Subscribe for ${pricing.symbol}${finalAmount}`}
                          </span>
                        </div>
                      )}
                    </Button>

                    {/* Security Notice */}
                    <div className="text-sm text-gray-500 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <span>🔒</span>
                        <span>Secure payment processing</span>
                      </div>
                      <div className="mt-1">
                        Your payment information is encrypted and secure
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentGateway;
