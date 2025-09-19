import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, ArrowLeft, Star, Zap, Shield, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PaymentGateway } from "@/components/payment/PaymentGateway";
import { WordPurchase } from "@/components/payment/WordPurchase";
import { PaymentHistory } from "@/components/payment/PaymentHistory";
import { LocationService } from "@/services/locationService";

const Payment = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'premium'>('pro');
  const [activeTab, setActiveTab] = useState('plans');
  const [pricing, setPricing] = useState({
    currency: 'INR',
    symbol: '₹',
    plans: {
      pro: { price: 99, originalPrice: 99 },
      premium: { price: 299, originalPrice: 299 }
    },
    words: { pricePerThousand: 31 }
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadPricing();
  }, [user, navigate]);

  const loadPricing = async () => {
    try {
      await LocationService.detectUserLocation();
      const userPricing = LocationService.getPricing();
      setPricing(userPricing);
    } catch (error) {
      console.error('Failed to load pricing:', error);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      subtitle: 'Perfect for trying out voice cloning',
      price: 0,
      currency: pricing.currency,
      period: '/month',
      features: [
        '1,000 words/month',
        '10MB upload limit',
        'Basic voice quality',
        '24 Hours History',
        'Last 3 voices in History',
        'AI-generated voices',
        'Email support'
      ],
      buttonText: 'Current Plan',
      popular: false,
      current: !profile?.plan || profile?.plan === 'free'
    },
    {
      id: 'pro',
      name: 'Pro',
      subtitle: 'Best for content creators and professionals',
      price: pricing.plans.pro.price,
      currency: pricing.currency,
      period: '/month',
      features: [
        '10,000 words/month base limit',
        'Buy up to 41,000 total words',
        `${pricing.symbol}${pricing.words.pricePerThousand} per 1,000 additional words`,
        '25MB upload limit',
        'High quality audio',
        'Last 30 voices history',
        '30 Days History',
        'Voice storage & reuse',
        'Priority support',
        'Speed & pitch control',
        'Usage analytics & charts',
      ],
      buttonText: profile?.plan === 'pro' ? 'Current Plan' : 'Upgrade',
      popular: true,
      current: profile?.plan === 'pro',
      canUpgrade: !profile?.plan || profile?.plan === 'free' || (profile?.plan_expires_at && new Date(profile.plan_expires_at) < new Date())
    },
    {
      id: 'premium',
      name: 'Premium',
      subtitle: 'For teams and heavy users',
      price: pricing.plans.premium.price,
      currency: pricing.currency,
      period: '/month',
      features: [
        '50,000 words/month base limit',
        'Buy up to 99,000 total words',
        `${pricing.symbol}${pricing.words.pricePerThousand} per 1,000 additional words`,
        '100MB upload limit',
        'Ultra-high quality',
        'Last 90 voices history',
        '90 Days History',
        'Voice storage & reuse',
        'Advanced Speed & pitch control',
        '24/7 priority support',
        'Advanced analytics & insights',
        'Language usage tracking',
        'Response time analytics',
      ],
      buttonText: profile?.plan === 'premium' ? 'Current Plan' : 'Upgrade',
      popular: false,
      current: profile?.plan === 'premium',
      canUpgrade: !profile?.plan || profile?.plan === 'free' || profile?.plan === 'pro' || (profile?.plan_expires_at && new Date(profile.plan_expires_at) < new Date())
    }
  ];

  const handlePlanSelect = async (planId: string) => {
    if (planId === 'free') {
      toast({
        title: "You're already on the free plan",
        description: "Upgrade to Pro or Premium for more features!",
      });
      return;
    }

    const isExpired = profile?.plan_expires_at && new Date(profile.plan_expires_at) < new Date();

    if (planId === profile?.plan && !isExpired) {
      toast({
        title: "Already subscribed",
        description: `You're already on the ${planId} plan. Use word purchase to buy additional words.`,
      });
      setActiveTab('words');
      return;
    }

    if (user?.id === 'guest') {
      toast({
        title: "Guest Access",
        description: "Please sign up for an account to upgrade your plan.",
        variant: "destructive"
      });
      return;
    }

    if (profile?.plan && profile.plan !== 'free' && planId !== profile.plan && !isExpired) {
      if (profile?.plan === 'premium' && planId === 'pro') {
        toast({
          title: "Downgrade Not Allowed",
          description: "You cannot downgrade while your plan is active. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Plan Change Restricted",
        description: "You can only change plans after your current plan expires on " +
          (profile?.plan_expires_at ? new Date(profile.plan_expires_at).toLocaleDateString() : 'N/A'),
        variant: "destructive"
      });
      return;
    }

    await handlePlanPurchase(planId);
  };

  const handlePlanPurchase = async (planId: string) => {
    try {
      setSelectedPlan(planId as 'pro' | 'premium');
      setShowPaymentGateway(true);
    } catch (error) {
      console.error('Error initiating plan purchase:', error);
      toast({
        title: "Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'pro': return <Zap className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'premium': return <Crown className="h-4 w-4 sm:h-5 sm:w-5" />;
      default: return <Star className="h-4 w-4 sm:h-5 sm:w-5" />;
    }
  };

  const formatPlanExpiry = () => {
    if (!profile?.plan_expires_at) return null;
    const expiryDate = new Date(profile.plan_expires_at);
    return {
      date: expiryDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
    };
  };

  const planExpiry = formatPlanExpiry();
  const isLoggedInUser = user?.id !== 'guest';

  if (!user || !profile) return null;

  if (showPaymentGateway) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setShowPaymentGateway(false)}
              className="flex items-center space-x-2 mx-auto text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Plans</span>
            </Button>
          </div>
          <PaymentGateway
            selectedPlan={selectedPlan}
            onPayment={() => {}}
            isProcessing={loading !== null}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="flex items-center space-x-2 text-sm">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="text-xs sm:text-sm text-gray-600">
            Current Plan: <span className="font-medium capitalize">{profile?.plan || 'Free'}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-12 max-w-6xl">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 sm:mb-8 bg-gray-100">
            <TabsTrigger value="plans" className="data-[state=active]:bg-black data-[state=active]:text-white text-xs sm:text-sm">Plan Management</TabsTrigger>
            <TabsTrigger value="words" disabled={!['pro', 'premium'].includes(profile?.plan || '')} className="data-[state=active]:bg-black data-[state=active]:text-white text-xs sm:text-sm">
              Buy Words {!['pro', 'premium'].includes(profile?.plan || '') && '(Paid)'}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-black data-[state=active]:text-white text-xs sm:text-sm">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6 sm:space-y-8">
            <div className="text-center mb-6 sm:mb-12">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
                Unlock the full potential of AI voice cloning with our flexible pricing plans.
              </p>
            </div>

            {isLoggedInUser && profile.plan !== 'free' && (
              <div className="mb-4 sm:mb-8 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                    <span className="text-gray-800 font-medium text-sm sm:text-base">
                      You're currently on the <span className="capitalize">{profile.plan}</span> plan
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Words used: {profile.plan_words_used?.toLocaleString() || 0} / {profile.words_limit?.toLocaleString() || 0}
                  </p>
                  {planExpiry && <p className="text-gray-600 text-xs">Expires: {planExpiry.date}</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-12">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative transition-all duration-300 hover:shadow-xl ${
                    plan.popular ? 'border-black shadow-lg scale-105' : plan.current ? 'border-gray-500 bg-gray-50' : 'border-gray-200'
                  }`}
                >
                  {plan.popular && !plan.current && <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 text-xs">Most Popular</Badge>}
                  {plan.current && isLoggedInUser && <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-500 text-white px-2 py-1 text-xs">Current Plan</Badge>}

                  <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center mb-2">
                      {getPlanIcon(plan.id)}
                      <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold ml-2">{plan.name}</CardTitle>
                    </div>
                    <CardDescription className="text-gray-600 min-h-[2.5rem] flex items-center justify-center text-xs sm:text-sm md:text-base px-2">{plan.subtitle}</CardDescription>
                    <div className="flex items-baseline justify-center space-x-1 mt-4">
                      <span className="text-gray-500 text-sm sm:text-base md:text-lg">{pricing.symbol}</span>
                      <span className="text-2xl sm:text-3xl md:text-4xl font-bold">{plan.price}</span>
                      <span className="text-gray-500 text-xs sm:text-sm md:text-base">{plan.period}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 sm:space-y-4 md:space-y-6">
                    <ul className="space-y-1 sm:space-y-2 md:space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-2 sm:space-x-3">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-xs sm:text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-2">
                      <Button
                        onClick={() => handlePlanSelect(plan.id)}
                        disabled={loading === plan.id || (plan.current && plan.canUpgrade === false)}
                        className={`w-full text-sm ${plan.current ? 'bg-gray-100 text-gray-800 cursor-not-allowed' : plan.popular ? 'bg-black hover:bg-gray-800 text-white' : 'bg-gray-800 hover:bg-black text-white'}`}
                        variant={plan.current ? "outline" : "default"}
                      >
                        {loading === plan.id ? 'Processing...' : plan.buttonText}
                      </Button>
                      {plan.current && plan.id !== 'free' && (
                        <Button onClick={() => setActiveTab('words')} variant="outline" className="w-full text-sm">
                          <Package className="h-4 w-4 mr-2" />
                          Buy Additional Words
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center text-gray-600 mt-6 sm:mt-8">
              <p className="mb-4 text-xs sm:text-sm md:text-base px-4">
                All paid plans include the ability to purchase additional words at {pricing.symbol}{pricing.words.pricePerThousand} per 1,000 words.
                Pro users can buy up to 41,000 total words, Premium users can buy up to 99,000 total words.
              </p>
              <div className="text-xs sm:text-sm">
                Location: भारत | India • Currency: ₹ INR Only
              </div>
            </div>
          </TabsContent>

          <TabsContent value="words" className="flex justify-center">
            <WordPurchase />
          </TabsContent>

          <TabsContent value="history" className="flex justify-center">
            <PaymentHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Payment;