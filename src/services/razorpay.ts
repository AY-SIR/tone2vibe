import { supabase } from '@/integrations/supabase/client';

export interface RazorpayPaymentRequest {
  amount: number;
  purpose: string;
  buyer_name: string;
  email: string;
  phone?: string;
  redirect_url?: string;
}

export interface RazorpayResponse {
  success: boolean;
  order_id?: string;
  razorpay_key?: string;
  amount?: number;
  currency?: string;
  message?: string;
  payment_id?: string;
}

export class RazorpayService {
  /**
   * Create payment order for plan subscription
   */
  static async createPlanPayment(
    plan: 'pro' | 'premium',
    userEmail: string,
    userName: string,
    couponCode?: string
  ): Promise<RazorpayResponse> {
    try {
      const pricing = {
        pro: { amount: 99, name: 'Pro Plan - Monthly' },
        premium: { amount: 299, name: 'Premium Plan - Monthly' }
      };

      const planData = pricing[plan];
      if (!planData) {
        throw new Error('Invalid plan selected');
      }

      const { data, error } = await supabase.functions.invoke('create-razorpay-payment', {
        body: { 
          amount: planData.amount * 100, // Razorpay expects paise
          purpose: planData.name,
          buyer_name: userName,
          email: userEmail,
          type: 'subscription',
          plan,
          coupon_code: couponCode
        }
      });

      if (error) {
        throw new Error(error.message || 'Payment creation failed');
      }

      return {
        success: true,
        order_id: data.order_id,
        razorpay_key: data.razorpay_key,
        amount: data.amount,
        currency: data.currency,
        message: 'Payment order created successfully'
      };
    } catch (error) {
      console.error('Razorpay plan payment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment creation failed'
      };
    }
  }

  /**
   * Create payment order for word purchase
   */
  static async createWordPayment(
    wordCount: number,
    userEmail: string,
    userName: string,
    userPlan: string = 'free'
  ): Promise<RazorpayResponse> {
    try {
      // Get pricing based on user's plan
      let pricePerThousand = 31; // Default for free plan (shouldn't be used)
      if (userPlan === 'pro') {
        pricePerThousand = 11;
      } else if (userPlan === 'premium') {
        pricePerThousand = 9;
      }
      
      const amount = Math.ceil((wordCount / 1000) * pricePerThousand);

      const { data, error } = await supabase.functions.invoke('create-razorpay-payment', {
        body: { 
          amount: amount * 100, // Razorpay expects paise
          purpose: `${wordCount.toLocaleString()} Words Purchase`,
          buyer_name: userName,
          email: userEmail,
          type: 'word_purchase',
          word_count: wordCount 
        }
      });

      if (error) {
        throw new Error(error.message || 'Payment creation failed');
      }

      return {
        success: true,
        order_id: data.order_id,
        razorpay_key: data.razorpay_key,
        amount: data.amount,
        currency: data.currency,
        message: 'Payment order created successfully'
      };
    } catch (error) {
      console.error('Razorpay word payment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment creation failed'
      };
    }
  }

  /**
   * Verify payment signature
   */
  static async verifyPayment(
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string
  ): Promise<RazorpayResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        }
      });

      if (error) {
        throw new Error(error.message || 'Payment verification failed');
      }

      return {
        success: true,
        payment_id: data.payment_id,
        message: data.message || 'Payment verified successfully'
      };
    } catch (error) {
      console.error('Razorpay verification error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment verification failed'
      };
    }
  }

  /**
   * Open Razorpay checkout modal
   */
  static openCheckout(
    order_id: string,
    razorpay_key: string,
    amount: number,
    currency: string,
    name: string,
    email: string,
    phone: string,
    description: string,
    onSuccess: (response: any) => void,
    onFailure: (error: any) => void
  ) {
    const options = {
      key: razorpay_key,
      amount: amount,
      currency: currency,
      name: 'Tone2Vibe',
      description: description,
      order_id: order_id,
      prefill: {
        name: name,
        email: email,
        contact: phone
      },
      theme: {
        color: '#000000'
      },
      handler: function (response: any) {
        onSuccess(response);
      },
      modal: {
        ondismiss: function () {
          onFailure({ message: 'Payment cancelled by user' });
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      onFailure(response.error);
    });
    rzp.open();
  }
}
