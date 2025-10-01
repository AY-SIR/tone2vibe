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
  const { refreshProfile, profile } = useAuth()
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [title, setTitle] = useState("Verifying Payment...")
  const [description, setDescription] = useState("Please wait while we confirm your transaction.")

  const confettiFired = useRef(false)
  const hasProcessedRef = useRef(false)
  const isMounted = useRef(true)

  const fireConfetti = () => {
    if (confettiFired.current) return
    confettiFired.current = true
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]
    confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, colors })
    confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, colors })
  }

  useEffect(() => {
    return () => { isMounted.current = false } // track component mount status
  }, [])

  useEffect(() => {
    if (hasProcessedRef.current || !profile?.id) return
    hasProcessedRef.current = true

    const verifyPayment = async () => {
      try {
        // --- GET UNIQUE TRANSACTION KEY ---
        const paymentId = searchParams.get("payment_id")
        const paymentRequestId = searchParams.get("payment_request_id")
        const txId = searchParams.get("txId")
        const uniqueTransactionKey = paymentRequestId || paymentId || txId

        const type = searchParams.get("type")
        const plan = searchParams.get("plan")
        const count = searchParams.get("count")
        const amount = searchParams.get("amount")
        const coupon = searchParams.get("coupon")

        // --- SAFE SESSION STORAGE ---
        const userKey = `processed_${profile.id}`
        let processedTransactions: string[] = []
        try {
          processedTransactions = JSON.parse(sessionStorage.getItem(userKey) || "[]")
        } catch {
          processedTransactions = []
        }

        const onVerificationSuccess = async (successTitle: string, successDescription: string) => {
          if (!isMounted.current) return
          setStatus("success")
          setTitle(successTitle)
          setDescription(successDescription)
          fireConfetti()
          toast.success(type === 'subscription' ? "Plan Activated!" : "Words Purchased!")
          await refreshProfile()
          setTimeout(() => navigate("/"), 5000)
        }

        // --- CHECK IF ALREADY PROCESSED ---
        if (uniqueTransactionKey && processedTransactions.includes(uniqueTransactionKey)) {
          let welcomeTitle = "Welcome Back!"
          let welcomeDescription = "Your purchase is already confirmed and ready to use."
          if (type === "words" && count) {
            welcomeDescription = `Your ${Number(count).toLocaleString()} words are ready to use.`
          } else if (type === "subscription" && plan) {
            welcomeDescription = `Your ${plan} plan is active and ready to use.`
          }
          await onVerificationSuccess(welcomeTitle, welcomeDescription)
          return
        }

        // --- MARK AS PROCESSED ---
        if (uniqueTransactionKey) {
          processedTransactions.push(uniqueTransactionKey)
          sessionStorage.setItem(userKey, JSON.stringify(processedTransactions))
        }

        const isFree = amount === "0" && (coupon || txId)
        if (isFree) {
          if (type === "words" && count) {
            await onVerificationSuccess("Words Added!", `${Number(count).toLocaleString()} words have been added using coupon ${coupon}.`)
          } else if (type === "subscription" && plan) {
            await onVerificationSuccess("Plan Activated!", `Your ${plan} plan has been activated using coupon ${coupon}.`)
          } else {
            await onVerificationSuccess("Success!", "Your free item has been added to your account.")
          }
          return
        }

        // --- PAID TRANSACTION ---
        if (!paymentId || !paymentRequestId) throw new Error("Missing payment information in URL.")

        const { data, error } = await supabase.functions.invoke("verify-instamojo-payment", {
          body: { payment_id: paymentId, payment_request_id: paymentRequestId, type, plan },
        })

        if (error) throw error
        if (!data.success) throw new Error(data.error || "Verification failed")

        if (type === "words") {
          const added = count ? Number(count).toLocaleString() : "Your purchased"
          await onVerificationSuccess("Words Purchased!", `${added} words have been added to your account.`)
        } else if (type === "subscription") {
          await onVerificationSuccess("Plan Activated!", `Your ${plan} plan has been activated successfully.`)
        } else {
          await onVerificationSuccess("Payment Successful!", "Your purchase has been completed successfully.")
        }

      } catch (error) {
        if (!isMounted.current) return
        console.error("Payment verification error:", error)
        setStatus("error")
        setTitle("Verification Failed")
        setDescription("There was an issue while verifying your payment. Please contact support if the problem persists.")
        toast.error("Verification Failed", { description: error instanceof Error ? error.message : String(error) })
      }
    }

    verifyPayment()
  }, [searchParams, refreshProfile, navigate, profile?.id])

  if (status === 'verifying') {
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
      <Card className="w-full max-w-md animate-fade-in z-10">
        <CardHeader className="text-center">
          {status === "success" ? (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          )}
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{description}</p>
          {status === "success" && (
            <p className="text-sm text-muted-foreground">Redirecting in 5 seconds...</p>
          )}
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
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentSuccess
