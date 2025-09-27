"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, XCircle, ArrowRight, Home } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import confetti from "canvas-confetti"

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [isVerifying, setIsVerifying] = useState(true)
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [title, setTitle] = useState("Verifying Payment...")
  const [description, setDescription] = useState("Please wait while we confirm your transaction.")
  const [confettiShown, setConfettiShown] = useState(false)
  const [isReturnVisit, setIsReturnVisit] = useState(false)
  const hasProcessedRef = useRef(false) // Prevent multiple processing attempts

  const fireConfetti = () => {
    if (confettiShown) return
    setConfettiShown(true)
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]
    confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, colors })
    confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, colors })
  }

  // Cleanup function to clear session storage on unmount
  useEffect(() => {
    return () => {
      const paymentId = searchParams.get("payment_id")
      const txId = searchParams.get("txId")
      const coupon = searchParams.get("coupon")

      // Clear session storage flags when component unmounts
      if (paymentId) {
        const toastKey = `toast_shown_${paymentId}`
        sessionStorage.removeItem(toastKey)
      }
      if (txId || coupon) {
        const toastKey = `toast_shown_free_${txId || coupon}`
        sessionStorage.removeItem(toastKey)
      }
    }
  }, [searchParams])

  const onVerificationSuccess = async (successTitle: string, successDescription: string, isNewPurchase = true) => {
    // First, update the state to show the checkmark icon
    setStatus("success")
    setTitle(successTitle)
    setDescription(successDescription)

    // Wait a moment for the checkmark to appear, then fire confetti
    setTimeout(() => {
      fireConfetti()
    }, 200) // 200ms delay

    // Always show toast for verification success
    const type = searchParams.get("type")
    if (isNewPurchase) {
      toast.success(type === 'subscription' ? "Plan Activated!" : "Words Purchased!")
    } else {
      toast.info("Welcome back! Your purchase is ready to use.")
    }

    await refreshProfile()

     // ✅ Auto-redirect after 3 seconds
  setTimeout(() => {
    navigate("/")  // or "/"
  }, 3000)
  }

  useEffect(() => {
    // Prevent multiple verification attempts
    if (hasProcessedRef.current) return
    hasProcessedRef.current = true

    const paymentId = searchParams.get("payment_id")
    const paymentRequestId = searchParams.get("payment_request_id")
    const txId = searchParams.get("txId")
    const type = searchParams.get("type")
    const plan = searchParams.get("plan")
    const count = searchParams.get("count")
    const amount = searchParams.get("amount")
    const coupon = searchParams.get("coupon")

    const verifyPayment = async () => {
      try {
        // Handle free transactions which don't have a paymentId
        if (amount === "0" && (coupon || txId)) {
          const toastKey = `toast_shown_free_${txId || coupon}`

          if (sessionStorage.getItem(toastKey)) {
            // This is a return visit
            setIsReturnVisit(true)
            if (type === "words" && count) {
              await onVerificationSuccess(
                "Welcome Back!",
                `Your ${Number(count).toLocaleString()} words are ready to use.`,
                false // This is a return visit, not new purchase
              )
            } else if (type === "subscription" && plan) {
              await onVerificationSuccess(
                "Welcome Back!",
                `Your ${plan} plan is active and ready to use.`,
                false // This is a return visit, not new purchase
              )
            } else {
              await onVerificationSuccess(
                "Welcome Back!",
                "Your free item is available in your account.",
                false // This is a return visit, not new purchase
              )
            }
            return
          }

          // New free transaction
          sessionStorage.setItem(toastKey, "1")
          if (type === "words" && count) {
            await onVerificationSuccess(
              "Words Added!",
              `${Number(count).toLocaleString()} words have been added using coupon ${coupon}.`,
              true // This is a new purchase
            )
          } else if (type === "subscription" && plan) {
            await onVerificationSuccess(
              "Plan Activated!",
              `Your ${plan} plan has been activated using coupon ${coupon}.`,
              true // This is a new purchase
            )
          }
          return
        }

        // For paid transactions, first validate that we have the required IDs
        if (!paymentId || !paymentRequestId) {
          throw new Error("Missing payment information in URL.")
        }

        const toastKey = `toast_shown_${paymentId}`

        if (sessionStorage.getItem(toastKey)) {
          // This is a return visit
          setIsReturnVisit(true)
          if (type === "words" && count) {
            await onVerificationSuccess(
              "Welcome Back!",
              `Your ${Number(count).toLocaleString()} words are ready to use.`,
              false // This is a return visit, not new purchase
            )
          } else if (type === "subscription" && plan) {
            await onVerificationSuccess(
              "Welcome Back!",
              `Your ${plan} plan is active and ready to use.`,
              false // This is a return visit, not new purchase
            )
          } else {
            await onVerificationSuccess(
              "Welcome Back!",
              "Your payment was processed successfully.",
              false // This is a return visit, not new purchase
            )
          }
          return
        }

        // New paid transaction - proceed to verify
        const { data, error } = await supabase.functions.invoke("verify-instamojo-payment", {
          body: { payment_id: paymentId, payment_request_id: paymentRequestId, type, plan },
        })

        if (error) throw error
        if (!data.success) throw new Error(data.error || "Verification failed")

        // Store verification flag
        sessionStorage.setItem(toastKey, "1")

        if (type === "words") {
          const added = count ? Number(count).toLocaleString() : "Your purchased"
          await onVerificationSuccess(
            "Words Purchased!",
            `${added} words have been added to your account.`,
            true // This is a new purchase
          )
        } else if (type === "subscription") {
          await onVerificationSuccess(
            "Plan Activated!",
            `Your ${plan} plan has been activated successfully.`,
            true // This is a new purchase
          )
        } else {
          await onVerificationSuccess(
            "Payment Successful!",
            "Your purchase has been completed successfully.",
            true // This is a new purchase
          )
        }
      } catch (error) {
        setStatus("error")
        setTitle("Verification Failed")
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred."
        setDescription(`Unable to verify your payment. Reason: ${errorMessage}`)
        toast.error("Verification Failed", { description: errorMessage })
      } finally {
        setIsVerifying(false)
      }
    }

    verifyPayment()
  }, [searchParams, refreshProfile, navigate])

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          {status === "success" ? (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          )}
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{description}</p>
          <div className="space-y-2 pt-4">
            {status === "success" ? (
              <div className="space-y-2">
                <Button onClick={() => navigate("/tool")} className="w-full">
                  Start Creating
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                  Go to Home
                  <Home className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={() => navigate("/payment")} className="w-full">
                Back to Payment Page
              </Button>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentSuccess
