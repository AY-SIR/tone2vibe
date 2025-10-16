import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, Home, RefreshCcw } from "lucide-react";

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reason = searchParams.get("reason") || "Payment could not be completed.";
  const type = searchParams.get("type") || "subscription";

  useEffect(() => {
    // placeholder for telemetry/logging if needed
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{reason}</p>
          <div className="space-y-2 pt-4">
            <Button onClick={() => navigate(type === "words" ? "/payment?tab=words" : "/payment")} className="w-full">
              Try Again
              <RefreshCcw className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Go to Home
              <Home className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
