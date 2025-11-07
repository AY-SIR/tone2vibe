import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, Package, Crown, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  plan?: string;
  created_at: string;
  payment_id: string;
}

interface WordPurchase {
  id: string;
  words_purchased: number;
  amount_paid: number;
  currency: string;
  status: string;
  payment_id: string;
  payment_method?: string;
  created_at: string;
}

export function PaymentHistoryTabs() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [wordPurchases, setWordPurchases] = useState<WordPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const { data: wordPurchasesData, error: wordPurchasesError } = await supabase
        .from('word_purchases')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (wordPurchasesError) throw wordPurchasesError;

      setPayments(paymentsData || []);
      setWordPurchases(wordPurchasesData || []);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 transition-colors",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 transition-colors",
    failed: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 transition-colors",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 transition-colors"

    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro': return <Zap className="h-4 w-4" />;
      case 'premium': return <Crown className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-8xl mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto animate-pulse"></div>
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center justify-between animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/6"></div>
            </div>
          ))}
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-8xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
  {/* Icon size changes with screen */}
  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />

  {/* Text size changes with screen */}
<span className="text-sm md:text-base lg:text-lg xl:text-xl font-semibold">
    Payment History
  </span>
</CardTitle>

        <CardDescription >
          View your complete payment and purchase history
        </CardDescription>


      </CardHeader>

      <CardContent>
        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="plans" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Plan Payments</span>
            </TabsTrigger>
            <TabsTrigger value="words" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Word Purchases</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No plan payments found</p>
                <p className="text-sm">Your plan subscription payments will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (

            <Card key={payment.id} className="border border-gray-200">
  <CardContent className="p-4">
    {/* Row 1: Plan icon + name (left) and amount (right) */}
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {getPlanIcon(payment.plan || '')}
        <div className="font-medium">
          {payment.plan ? `${payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)} Plan` : 'Plan Payment'}
        </div>
      </div>
      <div className="font-bold">
        ₹{payment.amount.toFixed(2)}
      </div>
    </div>

    {/* Row 2: Payment ID on left */}
    <div className="mt-2 text-xs text-gray-400 break-words">
      Payment ID: {payment.payment_id}
    </div>

    {/* Row 3: Status on left, date on right */}
    <div className="mt-1 flex justify-between items-center text-sm text-gray-500">
      <div className="flex items-center space-x-2 mt-1">
                            {getStatusBadge(payment.status)}
                          </div>
      <div>
        {formatDate(payment.created_at)}
      </div>
    </div>
  </CardContent>
</Card>



                ))}
              </div>

            )}
          </TabsContent>

          <TabsContent value="words" className="space-y-4">
            {wordPurchases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No word purchases found</p>
                <p className="text-sm">Your additional word purchases will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {wordPurchases.map((purchase) => (
                <Card key={purchase.id} className="border border-gray-200">
  <CardContent className="p-4">
    {/* Row 1: Icon + words purchased (left) and amount (right) */}
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Package className="h-4 w-4" />
        <div className="font-medium">
          {purchase.words_purchased.toLocaleString()} Words

        </div>
      </div>
      <div className="text-right font-bold">
        ₹{purchase.amount_paid.toFixed(2)}
      </div>
    </div>



 <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>Payment ID: {purchase.payment_id}</span>
                        {purchase.payment_method && (
                          <span>Method: {purchase.payment_method}</span>
                        )}
                      </div>

    {/* Row 4: Status (left) and Date (right) */}
    <div className="mt-1 flex justify-between items-center text-sm text-gray-500">
      <div className="flex items-center space-x-2 mt-1">
                            {getStatusBadge(purchase.status)}
                          </div>
      <div>
        {formatDate(purchase.created_at)}
      </div>
    </div>
  </CardContent>
</Card>


                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}