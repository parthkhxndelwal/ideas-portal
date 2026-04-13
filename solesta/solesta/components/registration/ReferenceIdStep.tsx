"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRegistration } from "@/hooks/useRegistration"
import { Copy, Check } from "lucide-react"

export function ReferenceIdStep() {
  const { referenceId, feeAmount, proceedToPayment, isLoading, error } =
    useRegistration()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!referenceId) return
    await navigator.clipboard.writeText(referenceId)
    setCopied(true)

    setTimeout(() => {
      proceedToPayment()
    }, 750)
  }

  if (!referenceId) {
    return (
      <div className="space-y-4">
        <p className="text-center text-red-500">Loading reference ID...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-center text-xl font-semibold text-red-600">
        Attention!
      </h2>

      <p className="text-center text-sm text-muted-foreground">
        You must enter this Reference ID in the payment form:
      </p>
      <div className="flex items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground p-6">
        <span className="font-mono text-3xl font-bold tracking-wider">
          {referenceId}
        </span>
      </div>

      <p className="text-center text-lg">
        Fee Amount: <span className="font-bold text-white">₹{feeAmount}</span>
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        onClick={handleCopy}
        disabled={isLoading || copied || !referenceId}
        className="w-full py-6 text-lg"
      >
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Copied! Redirecting...
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" />
            Copy & Continue
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Click to copy reference ID and proceed to payment
      </p>
    </div>
  )
}
