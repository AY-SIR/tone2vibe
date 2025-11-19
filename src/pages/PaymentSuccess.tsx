"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle, ArrowRight, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

const SUPABASE_URL = "https://msbmyiqhohtjdfbjmxlf.supabase.co";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile, profile } = useAuth();

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [title, setTitle] = useState("Verifying Payment...");
  const [description, setDescription] = useState(
    "Please wait while we confirm your transaction."
  );
  const [countdown, setCountdown] = useState(5);

  const confettiFired = useRef(false);
  const hasProcessedRef = useRef(false);

  const fireConfetti = () => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.5 },
    });
  };

  useEffect(() => {
    if (status !== "success") return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (countdown === 0) navigate("/");
  }, [countdown]);

  useEffect(() => {
    if (!profile?.id) return;
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const verify = async () => {
      try {
        const type = searchParams.get("type") || "";
        const words = searchParams.get("words") || searchParams.get("count") || "";
        const plan = searchParams.get("plan") || "";
        const coupon = searchParams.get("coupon") || "";

        // Razorpay params
        const rp_order = searchParams.get("razorpay_order_id");
        const rp_payment = searchParams.get("razorpay_payment_id");
        const rp_sig = searchParams.get("razorpay_signature");

        const txId = searchParams.get("txId");
        const uniqueKey = rp_order || txId || `free-${coupon}`;

        // Avoid double processing
        const localKey = `processed_${profile.id}`;
        const prev = JSON.parse(sessionStorage.getItem(localKey) || "[]");

        if (!prev.includes(uniqueKey)) {
          prev.push(uniqueKey);
          sessionStorage.setItem(localKey, JSON.stringify(prev));
        }

        const success = async (t: string, d: string) => {
          setStatus("success");
          setTitle(t);
          setDescription(d);
          fireConfetti();
          await refreshProfile();
        };

        // ---------------------------------------------------------------
        // ✔ FREE WORD PURCHASE (ZERO PAYMENT)
        // ---------------------------------------------------------------
        if (type === "free") {
          return success(
            "Words Added Successfully!",
            `${Number(words).toLocaleString()} words have been added using coupon ${coupon}.`
          );
        }

        // ---------------------------------------------------------------
        // ✔ RAZORPAY — MUST HAVE ALL PARAMS
        // ---------------------------------------------------------------
        if (rp_order && rp_payment && rp_sig) {
          const { data, error } = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              razorpay_order_id: rp_order,
              razorpay_payment_id: rp_payment,
              razorpay_signature: rp_sig,
            },
          });

          if (!data?.success || error) {
            return navigate(
              `/payment-failed?reason=${encodeURIComponent("Payment verification failed")}&type=${type}`,
              { replace: true }
            );
          }
        } else {
          // Missing Razorpay details → FAIL only for paid purchases
          return navigate(
            `/payment-failed?reason=${encodeURIComponent(
              "We couldn't verify your payment details."
            )}&type=${type}`,
            { replace: true }
          );
        }

        // ---------------------------------------------------------------
        // ✔ FINAL SCREEN (based on type)
        // ---------------------------------------------------------------
        if (type === "words") {
          return success(
            "Words Purchased!",
            `${Number(words).toLocaleString()} words have been added to your account.`
          );
        }

        if (type === "subscription") {
          return success("Plan Activated!", `Your ${plan} plan is now active.`);
        }

        return success("Payment Successful!", "Your purchase is confirmed.");
      } catch (err) {
        navigate(
          `/payment-failed?reason=${encodeURIComponent(
            "Something went wrong while processing your payment."
          )}`,
          { replace: true }
        );
      }
    };

    verify();
  }, [profile?.id]);

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin" />
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{description}</p>

          <div className="pt-4 space-y-2">
            <Button onClick={() => navigate("/tool")} className="w-full">
              Start Creating <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Go Home <Home className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Redirecting in {countdown}s...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
