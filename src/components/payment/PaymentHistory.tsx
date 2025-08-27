import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, Check, X, Clock, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Payment {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  plan?: string;
  created_at: string;
}

export function PaymentHistory() {
  const { user, profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async (refresh = false) => {
    if (!user) return;

    if (refresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const { data: paymentData, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Payment fetch error:', error);
        return;
      }

      const formattedPayments = (paymentData || []).map(p => ({
        id: p.id,
        payment_id: p.payment_id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        plan: p.plan,
        created_at: p.created_at
      }));

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <X className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user || !profile) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Authentication Required</CardTitle>
          <CardDescription>Please log in to view payment history</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 " />
              <span className="text-base sm:text-lg">Payment History</span>
            </CardTitle>
            <CardDescription className="mt-2">
              View your complete payment history
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPaymentHistory(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading payment history...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h3 className="font-medium text-lg flex items-center justify-between">
                <span>Payments</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {payments.length} payment{payments.length !== 1 ? 's' : ''}
                </Badge>
              </h3>
              
              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="mb-4">
                    <CreditCard className="h-12 w-12 mx-auto text-gray-300" />
                  </div>
                  <p className="font-medium">No payments found</p>
                  <p className="text-sm">Your payment history will appear here</p>
                </div>
              ) : (
                payments.map((payment) => (
                  <Card key={payment.id} className="border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(payment.status)}
                          <div>
                            <div className="font-medium text-base">
                              {payment.plan ? `${payment.plan.charAt(0).toUpperCase()}${payment.plan.slice(1)} Plan` : 'Payment'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Tone2Vibe Payment
                            </div>
                          </div>
                        </div>
                        <Badge className={`text-xs ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 text-xs">Amount</p>
                          <p className="font-medium text-base">
                            {payment.currency === 'USD' ? '$' : '₹'}{payment.amount.toFixed(2)} {payment.currency}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Payment Date</p>
                          <p className="font-medium text-sm">
                            {new Date(payment.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          ID: {payment.payment_id?.slice(-8) || 'N/A'}
                        </div>
                        {(payment.status === 'completed' || payment.status === 'paid' || payment.status === 'success') && (
                          <div className="flex items-center space-x-1 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            <span>Verified Payment</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
        
        <Separator />
        
        {/* Account Summary */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium mb-3 text-gray-900">Account Summary</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 text-xs">Current Plan</p>
              <p className="font-medium text-gray-900 capitalize">{profile.plan}</p>
              {profile.plan_expires_at && (
                <p className="text-xs text-gray-600">
                  Expires: {new Date(profile.plan_expires_at).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
            <div>
              <p className="text-gray-600 text-xs">Total Payments</p>
              <p className="font-medium text-gray-900">{payments.length}</p>
              <p className="text-xs text-gray-600">
                {payments.filter(p => ['completed', 'paid', 'success'].includes(p.status)).length} successful
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}