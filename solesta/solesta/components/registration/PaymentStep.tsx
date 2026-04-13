"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRegistration } from "@/hooks/useRegistration"

export function PaymentStep() {
  const {
    referenceId,
    paymentLink,
    feeAmount,
    confirmPayment,
    goBack,
    isLoading,
    error,
    isKrmu,
  } = useRegistration()
  const [countdown, setCountdown] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
        if (countdown === 1 && !opened) {
          const link =
            paymentLink ||
            (isKrmu
              ? "https://p.ppsl.io/PYTMPS/Ro1Qfk"
              : "https://p.ppsl.io/PYTMPS/UYrQfk")
          // Try to open in new window, fallback to direct navigation on mobile
          const newWindow = window.open(link, "_blank")
          if (
            !newWindow ||
            newWindow.closed ||
            typeof newWindow.closed === "undefined"
          ) {
            // If popup blocked or on mobile, use direct navigation
            window.location.href = link
          }
          setOpened(true)
          setShowConfirm(true)
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown, isKrmu, paymentLink, opened])

  const handleOpenPayment = () => {
    setCountdown(3)
  }

  const handleConfirm = () => {
    confirmPayment()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Reference ID</p>
        <p className="font-mono text-xl font-bold">{referenceId}</p>
      </div>

      <div className="rounded-lg border-2 border-dashed p-6 text-center">
        <p className="mb-2 text-sm text-muted-foreground">Ticket Price</p>
        <p className="text-4xl font-bold">₹{feeAmount}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          {isKrmu ? "KRMU Student" : "Other University"} • Solesta 2026
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm font-medium">Payment Instructions:</p>
        <ol className="mt-2 list-decimal pl-4 text-sm text-muted-foreground">
          <li>Click the payment link below</li>
          <li>Complete your payment of ₹{feeAmount}</li>
          <li>Return here and click "I've Paid"</li>
        </ol>
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleOpenPayment}
          disabled={countdown > 0}
          className="w-full py-6 text-lg"
        >
          {countdown > 0
            ? `Redirecting in ${countdown}...`
            : "Continue to Payment"}
        </Button>

        <Button
          onClick={handleConfirm}
          disabled={isLoading}
          variant="outline"
          className="w-full py-6 text-lg"
        >
          {isLoading ? "Confirming..." : "I've Paid"}
        </Button>
      </div>

      {goBack && (
        <Button variant="ghost" onClick={goBack} className="w-full">
          Back
        </Button>
      )}
    </div>
  )
}
