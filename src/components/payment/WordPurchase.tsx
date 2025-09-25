import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Package, AlertTriangle, IndianRupee } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LocationCacheService } from "@/services/locationCache";
import { InstamojoService } from "@/services/instamojo";
import { CouponInput } from "@/components/payment/couponInput";
import type { CouponValidation } from "@/services/couponService";
import { v4 as uuidv4 } from 'uuid';

export function WordPurchase() {
  // --- FIX 1: Added refreshProfile ---
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [wordsAmount, setWordsAmount] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [pricing] = useState({ currency: 'INR', pricePerThousand: 31, symbol: '₹' });
  const [couponValidation, setCouponValidation] = useState<CouponValidation>({
    isValid: false,
    discount: 0,
    message: '',
    code: ''
  });

  const calculatePrice = (words: number) => {
    const cost = (words / 1000) * pricing.pricePerThousand;
    return Math.ceil(cost);
  };

  const baseAmount = calculatePrice(wordsAmount);
  const finalAmount = Math.max(0, baseAmount - (couponValidation.isValid ? couponValidation.discount : 0));

  const canPurchaseWords = () => {
    if (!profile) return false;
    return profile.plan === 'pro' || profile.plan === 'premium';
  };

  const getMaxPurchaseLimit = () => {
    if (!profile) return 0;
    const maxPurchaseLimit = profile.plan === 'pro' ? 36000 : profile.plan === 'premium' ? 49000 : 0;
    const currentlyPurchased = profile.word_balance || 0;
    return Math.max(0, maxPurchaseLimit - currentlyPurchased);
  };

  const handleCouponApplied = (validation: CouponValidation) => {
    setCouponValidation(validation);
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

      if (finalAmount === 0) {
        if (!couponValidation.isValid || !couponValidation.code) {
          toast({
            title: "Invalid Coupon",
            description: "A valid coupon is required for free word purchases.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        await handleFreeWordPurchase();
        return;
      }

      const result = await InstamojoService.createWordPayment(
        wordsAmount,
        user!.email || '',
        user!.user_metadata?.full_name || 'User'
      );

      if (result.success && result.payment_request?.longurl) {
        const pendingTransaction = {
          type: 'word_purchase',
          amount: finalAmount,
          words: wordsAmount,
          payment_request_id: result.payment_request.id,
          coupon_code: couponValidation.isValid ? couponValidation.code : null,
          timestamp: Date.now()
        };
        sessionStorage.setItem('pending_transaction', JSON.stringify(pendingTransaction));
        window.location.href = result.payment_request.longurl;
      } else {
        throw new Error(result.message || 'Failed to create payment');
      }
    } catch (error) {
      toast({
        title: "Payment Issue",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // --- FIX 2: Updated this entire function ---
  const handleFreeWordPurchase = async () => {
    const wordsPurchased = wordsAmount;
    const couponCode = couponValidation.code;

    try {
      setLoading(true);
      const freeTransactionId = `COUPON_${couponCode}_${Date.now()}_${uuidv4().slice(0, 8)}`;

      const { data: couponCheck, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .in('type', ['words', 'both'])
        .single();
      if (couponError || !couponCheck) throw new Error('Coupon is no longer valid');
      if (couponCheck.max_uses && couponCheck.used_count >= couponCheck.max_uses)
        throw new Error('Coupon usage limit exceeded');

      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('word_balance')
        .eq('user_id', user!.id)
        .single();
      if (profileError) throw new Error('Failed to fetch current balance');

      const newBalance = (currentProfile?.word_balance || 0) + wordsPurchased;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ word_balance: newBalance, last_word_purchase_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('user_id', user!.id);
      if (updateError) throw new Error('Failed to update word balance');

      const { error: purchaseError } = await supabase
        .from('word_purchases')
        .insert({
          user_id: user!.id,
          words_purchased: wordsPurchased,
          amount_paid: 0,
          currency: 'INR',
          status: 'completed',
          payment_id: freeTransactionId,
          payment_method: 'coupon',
        });
      if (purchaseError) throw new Error('Failed to record purchase');

      const { error: couponUpdateError } = await supabase
        .from('coupons')
        .update({ used_count: (couponCheck.used_count || 0) + 1, last_used_at: new Date().toISOString() })
        .eq('id', couponCheck.id);
      if (couponUpdateError) throw new Error('Failed to update coupon usage');
      
      console.log("Free purchase successful in DB. Refreshing profile state now...");
      await refreshProfile();
      console.log("Profile state refreshed.");

      toast({
        title: 'Words Purchased Successfully!',
        description: `${wordsPurchased.toLocaleString()} words have been added to your account for free!`,
      });

      navigate(
        `/payment-success?type=words&count=${wordsPurchased}&amount=0&coupon=${couponCode}&txId=${freeTransactionId}`,
        { replace: true }
      );
      
      setWordsAmount(1000);
      setCouponValidation({ isValid: false, discount: 0, message: '', code: '' });
      setShowPaymentGateway(false);

    } catch (error) {
      toast({
        title: 'Error Processing Free Purchase',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-base sm:text-lg md:text-xl">Loading...</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Fetching your profile...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!canPurchaseWords()) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center justify-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span>Upgrade Required</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Word purchases are only available for Pro and Premium users.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            onClick={() => navigate('/payment')}
            className="bg-black hover:bg-gray-800 text-white text-xs sm:text-sm"
          >
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
              <div className="space-y-2">
                <Label htmlFor="words-input" className="text-xs sm:text-sm">Enter Words Amount</Label>
                <Input
                  id="words-input"
                  type="number"
                  placeholder="Minimum 1000 words"
                  min={1000}
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

              <CouponInput
                amount={baseAmount}
                type="words"
                onCouponApplied={handleCouponApplied}
                disabled={loading}
              />

              <div className="bg-black text-white rounded-lg p-3 text-center">
                <div className="text-xs opacity-75">
                  {finalAmount === 0 ? 'Total Price (After Coupon)' : 'Total Price'}
                </div>
                <div className="text-lg sm:text-xl font-bold">
                  ₹{finalAmount}
                </div>
                <div className="text-xs opacity-75">
                  {wordsAmount.toLocaleString()} words
                  {couponValidation.isValid && finalAmount === 0 && ' - FREE with coupon!'}
                </div>
              </div>

              <Button
                onClick={handlePurchase}
                disabled={loading || wordsAmount < 1000 || wordsAmount > maxAvailable}
                className="w-full bg-black hover:bg-gray-800 text-white text-xs sm:text-sm"
                size="lg"
              >
                <CreditCard className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {loading ? 'Processing...' : finalAmount === 0 ? `Get ${wordsAmount.toLocaleString()} Words FREE` : `Buy ${wordsAmount.toLocaleString()} Words`}
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <AlertTriangle className="h-8 w-8 sm:h-12 sm:w-12 text-orange-500 mx-auto mb-2" />
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

      <Dialog open={showPaymentGateway} onOpenChange={setShowPaymentGateway}>
        <DialogContent className="w-[95vw] max-w-[400px] p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-center text-base sm:text-lg font-semibold">
              Choose Payment Method
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-sm">Purchase Summary</p>
              <p className="text-xs text-gray-600">{wordsAmount.toLocaleString()} words</p>
              <p className="text-base sm:text-lg font-bold">
                ₹{finalAmount}
                {couponValidation.isValid && finalAmount === 0 && ' '}
              </p>
              {couponValidation.isValid && (
                <p className="text-xs text-green-600 mt-1">
                  Coupon: {couponValidation.code} (-₹{couponValidation.discount})
                </p>
              )}
            </div>

            <div className="space-y-2 px-2 sm:px-0">
              <Button
                onClick={handlePaymentGateway}
                disabled={loading || (finalAmount === 0 && !couponValidation.isValid)}
                className={`w-full flex items-center justify-center gap-2 sm:gap-3 ${
                  finalAmount === 0
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                } text-white text-xs sm:text-sm px-3 py-2 sm:py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed`}
                size="lg"
              >
                <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate text-center">
                  {finalAmount === 0 ? `Get ${wordsAmount.toLocaleString()} Words FREE` : `Pay ₹${finalAmount} - Secure Payment`}
                </span>
              </Button>

              <p className="text-[10px] sm:text-xs text-gray-500 text-center px-1 sm:px-0">
                {finalAmount === 0
                  ? 'Free word activation with valid coupon code.'
                  : 'Secure payment processing for India. No additional fees.'
                }
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
              }
