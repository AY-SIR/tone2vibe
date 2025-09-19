
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Package, AlertCircle, Globe, IndianRupee } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LocationCacheService } from "@/services/locationCache";
import { InstamojoService } from "@/services/instamojo";

export function WordPurchase() {
  const { user, profile, locationData } = useAuth();
  const { toast } = useToast();
  const [wordsAmount, setWordsAmount] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [pricing] = useState({ currency: 'INR', pricePerThousand: 31, symbol: '₹' });

  // Removed pricing loading - fixed to INR only

  const canPurchaseWords = () => {
    if (!profile) return false;
    return profile.plan === 'pro' || profile.plan === 'premium';
  };

  const calculatePrice = (words: number) => {
    const cost = (words / 1000) * pricing.pricePerThousand;
    return Math.ceil(cost); // Always round up for INR
  };

  const getMaxPurchaseLimit = () => {
    if (!profile) return 0;
    // Max purchase limits: Pro can buy up to 36k, Premium up to 49k
    const maxPurchaseLimit = profile.plan === 'pro' ? 36000 : profile.plan === 'premium' ? 49000 : 0;
    const currentlyPurchased = profile.word_balance || 0;
    return Math.max(0, maxPurchaseLimit - currentlyPurchased);
  };

  const isIndianUser = () => {
    return pricing.currency === 'INR';
  };

  const handlePurchase = () => {
    if (!user || !profile) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase words.",
        variant: "destructive"
      });
      return;
    }

    if (!canPurchaseWords()) {
      toast({
        title: "Upgrade Required",
        description: "Word purchases are only available for Pro and Premium users.",
        variant: "destructive"
      });
      return;
    }

    if (wordsAmount < 1000) {
      toast({
        title: "Minimum Purchase Required",
        description: "Minimum purchase is 1000 words.",
        variant: "destructive"
      });
      return;
    }

    const maxAvailable = getMaxPurchaseLimit();
    if (wordsAmount > maxAvailable) {
      toast({
        title: "Limit Exceeded",
        description: `You can only purchase up to ${maxAvailable.toLocaleString()} more words.`,
        variant: "destructive"
      });
      return;
    }

    setShowPaymentGateway(true);
  };

  const handlePaymentGateway = async () => {
    setLoading(true);

    try {
      // Verify user is in India
      const location = await LocationCacheService.getLocation();
      if (!location.isIndian) {
        toast({
          title: "Access Denied",
          description: `This service is only available in India. Your location: ${location.country}`,
          variant: "destructive"
        });
        setLoading(false);
        setShowPaymentGateway(false);
        return;
      }

      // Create Instamojo payment for word purchase
      const result = await InstamojoService.createWordPayment(
        wordsAmount,
        user!.email || '',
        user!.user_metadata?.full_name || 'User'
      );

      if (result.success && result.payment_request?.longurl) {
        // Redirect to Instamojo payment page
        window.location.href = result.payment_request.longurl;
        toast({
          title: "Payment Initiated",
          description: "Redirecting to secure payment page...",
        });
        setShowPaymentGateway(false);
      } else {
        throw new Error(result.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      let friendlyMessage = "Something went wrong with your payment. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('India')) {
          friendlyMessage = "This service is only available for users in India.";
        } else if (error.message.includes('create payment')) {
          friendlyMessage = "Unable to start payment process. Please try again.";
        }
      }
      
      toast({
        title: "Payment Issue",
        description: friendlyMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-base sm:text-lg md:text-xl">Authentication Required</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Please log in to purchase additional words</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!canPurchaseWords()) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center justify-center space-x-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span>Upgrade Required</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Word purchases are only available for Pro and Premium users.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button className="bg-black hover:bg-gray-800 text-white text-xs sm:text-sm">
            Upgrade to Pro Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const maxAvailable = getMaxPurchaseLimit();

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg md:text-xl">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Buy Additional Words</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Purchase more words for your {profile.plan} account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-3 sm:p-6">
          {/* Current Usage */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="font-medium mb-2 text-xs sm:text-sm">Current Usage</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Plan Used</p>
                <p className="font-medium">{(profile.plan_words_used || 0).toLocaleString()}/{(profile.words_limit || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Available</p>
                <p className="font-medium text-green-600">
                  {Math.max(0, (profile.words_limit || 0) - (profile.plan_words_used || 0) + (profile.word_balance || 0)).toLocaleString()}
                </p>
              </div>
            </div>
            
            {/* Only show purchased words if user actually has some */}
            {(profile.word_balance || 0) > 0 && (
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Purchased Words:</span>
                  <span className="font-medium text-blue-600">{(profile.word_balance || 0).toLocaleString()} (never expire)</span>
                </div>
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p><strong>Plan:</strong> {profile.plan.toUpperCase()} - {profile.plan === 'free' ? '1,000' : profile.plan === 'pro' ? '10,000' : '50,000'} words/month</p>
              {profile.plan !== 'free' && (
                <p><strong>Can Purchase:</strong> Up to {profile.plan === 'pro' ? '36,000' : '49,000'} additional words</p>
              )}
            </div>
          </div>

          {maxAvailable > 0 ? (
            <>
              {/* Word Input */}
              <div className="space-y-2">
                <Label htmlFor="words-input" className="text-xs sm:text-sm">Enter Words Amount</Label>
                <Input
                  id="words-input"
                  type="number"
                  placeholder="Minimum 1000 words"
                  min="1000"
                  max={maxAvailable}
                  value={wordsAmount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1000;
                    setWordsAmount(Math.min(value, maxAvailable));
                  }}
                  className="text-center text-sm"
                />
                <p className="text-xs text-gray-500 text-center">
                  Min: 1,000 • Max: {maxAvailable.toLocaleString()} • Price: ₹{pricing.pricePerThousand} per 1,000 words
                </p>
              </div>

              {/* Price Display */}
              <div className="bg-black text-white rounded-lg p-3 text-center">
                <div className="text-xs opacity-75">Total Price</div>
                <div className="text-lg sm:text-xl font-bold">
                  ₹{calculatePrice(wordsAmount)}
                </div>
                <div className="text-xs opacity-75">
                  {wordsAmount.toLocaleString()} words
                </div>
              </div>

              {/* Purchase Button */}
              <Button
                onClick={handlePurchase}
                disabled={loading || wordsAmount < 1000 || wordsAmount > maxAvailable}
                className="w-full bg-black hover:bg-gray-800 text-white text-xs sm:text-sm"
                size="lg"
              >
                <CreditCard className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {loading ? 'Processing...' : `Buy ${wordsAmount.toLocaleString()} Words`}
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-orange-500 mx-auto mb-2" />
              <p className="text-gray-600 font-medium text-xs sm:text-sm">Word Purchase Limit Reached</p>
              <p className="text-xs text-gray-500 mt-1">
                You've reached the maximum word limit for your {profile.plan} plan.
              </p>
              {profile.plan === 'pro' && (
              <p className="text-xs text-gray-500 mt-2">
                Upgrade to Premium for higher purchase limits (49k additional words).
              </p>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            Words will be added to your account after payment confirmation.
          </p>
        </CardContent>
      </Card>

      {/* Payment Gateway Selection Dialog */}
      <Dialog open={showPaymentGateway} onOpenChange={setShowPaymentGateway}>
        <DialogContent className="w-[95vw] max-w-[400px] p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-center text-base sm:text-lg font-semibold">Choose Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-sm">Purchase Summary</p>
              <p className="text-xs text-gray-600">{wordsAmount.toLocaleString()} words</p>
              <p className="text-base sm:text-lg font-bold">
                ₹{calculatePrice(wordsAmount)}
              </p>
            </div>

            <div className="space-y-2">
              {/* Instamojo Payment (India Only) */}
              <Button
                onClick={handlePaymentGateway}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm"
                size="lg"
              >
                <IndianRupee className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Pay ₹{calculatePrice(wordsAmount)} - Secure Payment
                <Badge className="ml-2 bg-green-500 text-xs">Safe & Fast</Badge>
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Secure payment processing for India • No additional fees
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
