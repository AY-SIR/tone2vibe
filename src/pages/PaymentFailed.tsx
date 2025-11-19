import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  XCircle,
  Home,
  AlertCircle,
  Mail,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  const rawReason = searchParams.get("reason") || "";
  const type = searchParams.get("type") || "";

  const reason = decodeURIComponent(rawReason)
    .replace("Missing payment information in URL", "We couldn't verify your payment details.")
    .replace("Verification failed", "Your payment could not be verified.")
    .replace("Failed to fetch", "Network error. Please try again.")
    .replace("null", "Something went wrong.");

  // Countdown tick
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

  // Auto redirect when countdown hits zero
  useEffect(() => {
    if (countdown === 0) {
      navigate("/", { replace: true });
    }
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/50 shadow-xl">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto mb-4 p-4 bg-destructive/10 rounded-full w-fit">
            <XCircle className="h-14 w-14 text-destructive" />
          </div>

          <CardTitle className="text-2xl font-bold text-destructive">
            Payment Failed
          </CardTitle>

          <CardDescription className="text-base mt-2">
            We couldn't complete your {type === "words" ? "word purchase" : "subscription"}.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Details */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
            <p className="font-medium text-sm text-destructive mb-1">
              Error Details
            </p>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/", { replace: true })}
              variant="outline"
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          {/* Support Section */}
          

          {/* Countdown */}
          <p className="text-center text-xs text-muted-foreground">
            Redirecting in {countdown}s...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
