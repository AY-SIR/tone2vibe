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
      console.error('Error fetching payment history:', error);
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
      completed: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200"
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
          <Calendar className="h-5 w-5" />
          <span>Payment History</span>
        </CardTitle>
        <CardDescription>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getPlanIcon(payment.plan || '')}
                          <div>
                            <div className="font-medium">
                              {payment.plan ? `${payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)} Plan` : 'Plan Payment'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(payment.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            ₹{payment.amount.toFixed(2)}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {getStatusBadge(payment.status)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        Payment ID: {payment.payment_id}
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Package className="h-4 w-4" />
                          <div>
                            <div className="font-medium">
                              {purchase.words_purchased.toLocaleString()} Words
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(purchase.created_at)}
                            </div>
                            {purchase.payment_method === 'coupon' && (
                              <div className="text-xs text-green-600 mt-1">
                                FREE - Applied Coupon
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            ₹{purchase.amount_paid.toFixed(2)}
                            {purchase.amount_paid === 0 && (
                              <span className="text-sm text-green-600 ml-2">FREE</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {getStatusBadge(purchase.status)}
                          </div>
                        </div>
                      </div>
                      {/* --- THIS IS THE FIXED BLOCK --- */}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>Payment ID: {purchase.payment_id}</span>
                        {purchase.payment_method && (
                          <span>Method: {purchase.payment_method}</span>
                        )}
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
