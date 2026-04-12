"use client"

import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

export function PaymentStep() {
  const { referenceId, paymentLink, feeAmount, isKrmu, confirmPayment, isLoading, error } = useRegistration()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Payment</h2>
      <p className="text-sm text-muted-foreground">
        Reference ID: <span className="font-mono font-bold">{referenceId}</span>
      </p>
      
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
      
      <a
        href={paymentLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-md bg-green-600 px-4 py-3 text-center text-white font-semibold hover:bg-green-700"
      >
        Open Payment Link
      </a>
      
      <Button
        onClick={confirmPayment}
        disabled={isLoading}
        className="w-full py-6 text-lg"
      >
        {isLoading ? 'Confirming...' : "I've Paid"}
      </Button>
    </div>
  )
}