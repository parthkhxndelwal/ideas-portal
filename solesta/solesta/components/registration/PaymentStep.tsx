"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

export function PaymentStep() {
  const { referenceId, paymentLink, feeAmount, confirmPayment, goBack, isLoading, error, isKrmu } = useRegistration()
  const [countdown, setCountdown] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
        if (countdown === 1 && !opened) {
          const link = paymentLink || (isKrmu 
            ? 'https://p.ppsl.io/PYTMPS/Ro1Qfk' 
            : 'https://p.ppsl.io/PYTMPS/UYrQfk')
          window.open(link, '_blank')
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
      <h2 className="text-xl font-semibold">Payment</h2>
      
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Reference ID</p>
        <p className="font-mono text-xl font-bold">{referenceId}</p>
      </div>
      
      <p className="text-lg">
        Fee Amount: <span className="font-bold">₹{feeAmount}</span>
      </p>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm font-medium">Payment Instructions:</p>
        <ol className="mt-2 list-decimal pl-4 text-sm text-muted-foreground">
          <li>Click the payment link below</li>
          <li>Complete your payment of ₹{feeAmount}</li>
          <li>Return here and click "I've Paid"</li>
        </ol>
      </div>
      
      {countdown > 0 ? (
        <Button disabled className="w-full py-6 text-lg">
          Redirecting in {countdown}...
        </Button>
      ) : showConfirm ? (
        <Button
          onClick={handleConfirm}
          disabled={isLoading}
          className="w-full py-6 text-lg"
        >
          {isLoading ? 'Confirming...' : "I've Paid"}
        </Button>
      ) : (
        <Button
          onClick={handleOpenPayment}
          className="w-full py-6 text-lg"
        >
          Open Payment Link
        </Button>
      )}
      
      {(!showConfirm || isLoading) && goBack && (
        <Button variant="ghost" onClick={goBack} className="w-full">
          Back
        </Button>
      )}
    </div>
  )
}