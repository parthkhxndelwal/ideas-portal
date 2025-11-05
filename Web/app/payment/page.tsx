"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  image?: string
  handler: (response: RazorpayResponse) => void
  prefill: {
    name?: string
    email: string
  }
  theme: {
    color: string
  }
  modal?: {
    ondismiss?: () => void
  }
}

interface RazorpayInstance {
  open(): void
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

export default function PaymentPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [paymentAmount, setPaymentAmount] = useState<number>(200)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (!token) {
      router.push("/")
      return
    }

    fetch("/api/payment/amount")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.paymentAmount) {
          setPaymentAmount(data.paymentAmount)
        }
      })
      .catch((err) => console.error("Error fetching payment amount:", err))

    fetch("/api/user/confirmation-status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.role === "admin") {
          router.push("/admin")
          return
        }

        if (data.needsDetailsConfirmation) {
          localStorage.setItem("verifiedEmail", data.email)
          router.push("/confirm-details")
        }

        if (data.needsSubEventSelection) {
          router.push("/dashboard")
        }
      })
      .catch((err) => {
        console.error("Error checking confirmation status:", err)
        router.push("/")
      })
  }, [router])

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      setError("Payment gateway is loading. Please wait...")
      return
    }

    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("authToken")

      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: paymentAmount }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create payment order")
        setLoading(false)
        return
      }

      const options = {
        key: data.razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "IDEAS 3.0",
        description: "Event Registration Fee",
        image: "/ideas-black.png",
        handler: async function (response: RazorpayResponse) {
          await verifyPayment(response, token!)
        },
        prefill: {
          email: "",
        },
        theme: {
          color: "#1d4ed8",
        },
        modal: {
          ondismiss: function () {
            setLoading(false)
            setError("Payment cancelled. Please try again.")
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error) {
      console.error("Payment error:", error)
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  const verifyPayment = async (razorpayResponse: RazorpayResponse, token: string) => {
    try {
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setPaymentSuccess(true)
        setLoading(false)
      } else {
        setError(data.error || "Payment verification failed")
        setLoading(false)
      }
    } catch (error) {
      console.error("Verification error:", error)
      setError("Payment verification failed. Please contact support.")
      setLoading(false)
    }
  }

  const handleBackToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
        onError={() => setError("Failed to load payment gateway")}
      />

      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 px-4 py-6 sm:py-10">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/kr-logo.png"
                alt="KR Mangalam Logo"
                width={40}
                height={40}
                className="rounded-full"
              />
              <Image
                src="/ideas-black.png"
                alt="IDEAS Logo"
                width={120}
                height={34}
                className="dark:hidden"
              />
              <Image
                src="/ideas-white.png"
                alt="IDEAS Logo"
                width={120}
                height={34}
                className="hidden dark:block"
              />
            </div>
            <Badge className="w-fit bg-blue-600/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200 border border-blue-500/30 px-3 py-1 text-xs sm:text-sm">
              Secure Payment Portal
            </Badge>
          </header>

          <Card className="bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl text-neutral-900 dark:text-neutral-100">
                {paymentSuccess ? "Payment Successful" : "Complete Your Registration"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {!paymentSuccess ? (
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="lg:w-1/2 space-y-5">
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-900/60 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Amount Due</p>
                          <p className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-50">₹{paymentAmount}</p>
                          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">IDEAS 3.0 Registration Fee</p>
                        </div>
                        <Badge className="bg-green-500/10 text-green-600 dark:bg-green-400/20 dark:text-green-200 border border-green-500/30">
                          One-time Payment
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Payment Breakdown</h3>
                      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/50 divide-y divide-neutral-200 dark:divide-neutral-700/60 overflow-hidden">
                        <div className="flex items-center justify-between bg-white dark:bg-neutral-800/80 px-4 py-3">
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">Registration Fee</span>
                          <span className="font-medium text-neutral-900 dark:text-neutral-50">₹{paymentAmount}</span>
                        </div>
                        <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/40 px-4 py-3">
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">Taxes & Convenience</span>
                          <span className="font-medium text-neutral-900 dark:text-neutral-50">Included</span>
                        </div>
                        <div className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-900/60 px-4 py-3">
                          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Total Payable</span>
                          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-50">₹{paymentAmount}</span>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">
                        {error}
                      </div>
                    )}

                    <Button
                      onClick={handlePayment}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base"
                      disabled={loading || !razorpayLoaded}
                    >
                      {loading
                        ? "Processing..."
                        : !razorpayLoaded
                          ? "Preparing Secure Checkout..."
                          : `Pay ₹${paymentAmount} Now`}
                    </Button>

                    <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
                      By proceeding, you agree to our terms and conditions
                    </p>
                  </div>

                  <div className="lg:w-1/2 space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Secure Payment via Razorpay</h4>
                          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                            Payments are processed through Razorpay with support for UPI, Cards, Net Banking, and Wallets.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {["UPI", "Cards", "Net Banking", "Wallets"].map((method) => (
                              <span
                                key={method}
                                className="text-xs px-2 py-1 rounded-full bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-700/50 text-neutral-600 dark:text-neutral-300"
                              >
                                {method}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/50 bg-white/80 dark:bg-neutral-900/40 p-4 sm:p-5 space-y-3">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Need Help?</h4>
                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                        If your payment doesn&apos;t reflect within a few minutes, keep your payment reference handy and contact the IDEAS support team.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        onClick={() => router.push("/dashboard#support")}
                      >
                        Contact Support
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="text-green-600 dark:text-green-400">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">Payment Successful!</h3>
                    <p className="text-neutral-600 dark:text-neutral-300 mt-2">
                      Your registration has been confirmed.
                    </p>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700/60 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      A confirmation email has been sent to your registered email address with your entry QR code.
                    </p>
                  </div>

                  <Button
                    onClick={handleBackToDashboard}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            <p>Powered by Razorpay • Secure Payments by KR Mangalam University</p>
          </div>
        </div>
      </div>
    </>
  )
}
