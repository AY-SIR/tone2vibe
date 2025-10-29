import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { XCircle, Home, RefreshCcw, AlertCircle, Mail, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(10);

  const reason = searchParams.get("reason") || "Payment could not be completed.";
  const type = searchParams.get("type") || "subscription";
  const plan = searchParams.get("plan") || "";
  const amount = searchParams.get("amount") || "";

  // Auto-redirect countdown (optional)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Log failure for analytics
  useEffect(() => {
    console.log("Payment Failed:", {
      type,
      reason,
      plan,
      amount,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    // Add your analytics/telemetry here
    // Example: analytics.track('payment_failed', { type, reason, plan });
  }, [type, reason, plan, amount, user]);

  const handleTryAgain = () => {
    if (type === "words") {
      navigate("/payment?tab=words");
    } else if (type === "subscription") {
      navigate(plan ? `/payment/checkout?plan=${plan}` : "/payment");
    } else {
      navigate("/payment");
    }
  };

  const getErrorCategory = (errorReason: string): string => {
    const lowerReason = errorReason.toLowerCase();

    if (lowerReason.includes("cancel")) return "cancelled";
    if (lowerReason.includes("network") || lowerReason.includes("connection")) return "network";
    if (lowerReason.includes("coupon") || lowerReason.includes("code")) return "coupon";
    if (lowerReason.includes("balance") || lowerReason.includes("insufficient")) return "balance";
    if (lowerReason.includes("verification") || lowerReason.includes("verify")) return "verification";
    if (lowerReason.includes("timeout")) return "timeout";
    if (lowerReason.includes("card") || lowerReason.includes("bank")) return "card";

    return "unknown";
  };

  const errorCategory = getErrorCategory(reason);

  const getHelpfulTips = (category: string): string[] => {
    const tips: Record<string, string[]> = {
      cancelled: [
        "You can retry the payment anytime",
        "Your cart/selection has been saved",
        "No charges were made to your account"
      ],
      network: [
        "Check your internet connection",
        "Try using a different network",
        "Wait a few minutes and retry"
      ],
      coupon: [
        "Verify the coupon code is correct",
        "Check if the coupon is still valid",
        "Ensure coupon applies to this plan"
      ],
      balance: [
        "Check your account balance",
        "Try a different payment method",
        "Contact your bank if needed"
      ],
      verification: [
        "Payment details couldn't be verified",
        "Try a different payment method",
        "Contact support if issue persists"
      ],
      timeout: [
        "The payment process took too long",
        "Your bank may have declined",
        "Try again with a stable connection"
      ],
      card: [
        "Verify your card details are correct",
        "Check if your card is active",
        "Try a different card or payment method"
      ],
      unknown: [
        "An unexpected error occurred",
        "Try again in a few minutes",
        "Contact support if problem continues"
      ]
    };

    return tips[category] || tips.unknown;
  };

  const tips = getHelpfulTips(errorCategory);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/50 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 p-4 bg-destructive/10 rounded-full w-fit">
            <XCircle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">Payment Failed</CardTitle>
          <CardDescription className="text-base mt-2">
            {type === "subscription" ? "Subscription" : "Word Purchase"} could not be completed
          </CardDescription>
          {plan && (
            <Badge variant="outline" className="mt-2 text-sm">
              Plan: {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Message */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-destructive mb-1">Error Details</p>
                <p className="text-sm text-muted-foreground">{reason}</p>
              </div>
            </div>
          </div>

          {/* Helpful Tips */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              What you can do:
            </h4>
            <ul className="space-y-2">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleTryAgain}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Home
            </Button>
          </div>

          {/* Support Section */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-center">Need Help?</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => window.location.href = "mailto:support@yourapp.com"}
              >
                <Mail className="mr-2 h-3 w-3" />
                Email Support
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => navigate("/support")}
              >
                <Phone className="mr-2 h-3 w-3" />
                Contact Us
              </Button>
            </div>
          </div>

          {/* Transaction Info (if available) */}
          {(plan || amount) && (
            <div className="text-center text-xs text-muted-foreground space-y-1 pt-2">
              {plan && <p>Attempted Plan: {plan}</p>}
              {amount && <p>Amount: ₹{amount}</p>}
              <p className="text-[10px]">Reference: {Date.now()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}