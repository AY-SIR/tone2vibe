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

const SUPABASE_URL = "https://msbmyiqhohtjdfbjmxlf.supabase.co";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshProfile, profile } = useAuth()
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [title, setTitle] = useState("Verifying Payment...")
  const [description, setDescription] = useState("Please wait while we confirm your transaction.")
  const [countdown, setCountdown] = useState(5) // Countdown for redirect

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

  // Track mount status
  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  // Countdown timer for redirect
  useEffect(() => {
    if (status !== "success") return

    const interval = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [status])

  // Auto navigate when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      navigate("/")
    }
  }, [countdown, navigate])

  useEffect(() => {
    if (hasProcessedRef.current || !profile?.id) return
    hasProcessedRef.current = true

    const verifyPayment = async () => {
      try {
        const paymentId = searchParams.get("payment_id")
        const paymentRequestId = searchParams.get("payment_request_id")
        const txId = searchParams.get("txId")
        const uniqueTransactionKey = paymentRequestId || paymentId || txId

        const type = searchParams.get("type")
        const plan = searchParams.get("plan")
        const count = searchParams.get("count")
        const amount = searchParams.get("amount")
        const coupon = searchParams.get("coupon")

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
         try {
  const session = await supabase.auth.getSession()
  const accessToken = session.data.session?.access_token

  if (accessToken) {
    await fetch(`${SUPABASE_URL}/functions/v1/purge-expired-history`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    await fetch(`${SUPABASE_URL}/functions/v1/purge-user-analytics`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  }
} catch (err) {
  console.error('Failed to purge data:', err)
}

        }

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

        if (!paymentId || !paymentRequestId) {
          navigate(`/payment-failed?reason=${encodeURIComponent('Missing payment information in URL')}&type=${type || 'subscription'}`, { replace: true })
          return
        }

        const { data, error } = await supabase.functions.invoke("verify-instamojo-payment", {
          body: { payment_id: paymentId, payment_request_id: paymentRequestId, type, plan },
        })

        if (error || !data?.success) {
          const message = (error && (error as any).message) || data?.error || 'Verification failed'
          navigate(`/payment-failed?reason=${encodeURIComponent(message)}&type=${type || 'subscription'}`, { replace: true })
          return
        }

        if (type === "words") {
          const added = count ? Number(count).toLocaleString() : "Your purchased"
          await onVerificationSuccess("Words Purchased!", `${added} words have been added to your account.`)
          try { sessionStorage.removeItem('pending_transaction') } catch {}
        } else if (type === "subscription") {
          await onVerificationSuccess("Plan Activated!", `Your ${plan} plan has been activated successfully.`)
        } else {
          await onVerificationSuccess("Payment Successful!", "Your purchase has been completed successfully.")
        }

      } catch (error) {
        if (!isMounted.current) return
        console.error("Payment verification error:", error)
        const message = error instanceof Error ? error.message : String(error)
        navigate(`/payment-failed?reason=${encodeURIComponent(message)}`, { replace: true })
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

          {status === "success" && (
            <p className="text-sm text-muted-foreground">
              Redirecting in {countdown} second{countdown > 1 ? 's' : ''}...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentSuccess
