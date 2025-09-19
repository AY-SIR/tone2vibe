import { supabase } from '@/integrations/supabase/client';

export interface InstamojoPaymentRequest {
  amount: number;
  purpose: string;
  buyer_name: string;
  email: string;
  phone?: string;
  redirect_url: string;
  webhook?: string;
  allow_repeated_payments?: boolean;
}

export interface InstamojoResponse {
  success: boolean;
  payment_request?: {
    id: string;
    longurl: string;
    shorturl: string;
    status: string;
  };
  message?: string;
  payment_id?: string;
}

export class InstamojoService {
  /**
   * Create payment request for plan subscription
   */
  static async createPlanPayment(
    plan: 'pro' | 'premium',
    userEmail: string,
    userName: string
  ): Promise<InstamojoResponse> {
    try {
      const pricing = {
        pro: { amount: 99, name: 'Pro Plan - Monthly' },
        premium: { amount: 299, name: 'Premium Plan - Monthly' }
      };

      const planData = pricing[plan];
      if (!planData) {
        throw new Error('Invalid plan selected');
      }

      const paymentRequest: InstamojoPaymentRequest = {
        amount: planData.amount,
        purpose: planData.name,
        buyer_name: userName,
        email: userEmail,
        redirect_url: `${window.location.origin}/payment-success?plan=${plan}&type=subscription`,
        webhook: `${window.location.origin}/api/instamojo-webhook`,
        allow_repeated_payments: false
      };

      const { data, error } = await supabase.functions.invoke('create-instamojo-payment', {
        body: { 
          ...paymentRequest,
          type: 'subscription',
          plan 
        }
      });

      if (error) {
        throw new Error(error.message || 'Payment creation failed');
      }

      return {
        success: true,
        payment_request: data.payment_request,
        message: 'Payment request created successfully'
      };
    } catch (error) {
      console.error('Instamojo plan payment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment creation failed'
      };
    }
  }

  /**
   * Create payment request for word purchase
   */
  static async createWordPayment(
    wordCount: number,
    userEmail: string,
    userName: string
  ): Promise<InstamojoResponse> {
    try {
      const pricePerThousand = 31; // ₹31 per 1000 words
      const amount = Math.ceil((wordCount / 1000) * pricePerThousand);

      const paymentRequest: InstamojoPaymentRequest = {
        amount,
        purpose: `${wordCount.toLocaleString()} Words Purchase`,
        buyer_name: userName,
        email: userEmail,
        redirect_url: `${window.location.origin}/payment-success?type=words&count=${wordCount}`,
        webhook: `${window.location.origin}/api/instamojo-webhook`,
        allow_repeated_payments: false
      };

      const { data, error } = await supabase.functions.invoke('create-instamojo-payment', {
        body: { 
          ...paymentRequest,
          type: 'word_purchase',
          word_count: wordCount 
        }
      });

      if (error) {
        throw new Error(error.message || 'Payment creation failed');
      }

      return {
        success: true,
        payment_request: data.payment_request,
        message: 'Payment request created successfully'
      };
    } catch (error) {
      console.error('Instamojo word payment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment creation failed'
      };
    }
  }

  /**
   * Verify payment status
   */
  static async verifyPayment(
    paymentId: string,
    paymentRequestId: string
  ): Promise<InstamojoResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-instamojo-payment', {
        body: { 
          payment_id: paymentId,
          payment_request_id: paymentRequestId 
        }
      });

      if (error) {
        throw new Error(error.message || 'Payment verification failed');
      }

      return {
        success: true,
        payment_id: data.payment_id,
        message: 'Payment verified successfully'
      };
    } catch (error) {
      console.error('Instamojo payment verification error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment verification failed'
      };
    }
  }
}