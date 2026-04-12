"use client"

import { useState } from 'react'
import { useRegistration } from '@/hooks/useRegistration'
import { Copy, Check } from 'lucide-react'

export function CompletedStep() {
  const { referenceId, registrationStatus, error } = useRegistration()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referenceId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 text-center mb-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <p className="text-muted-foreground flex flex-col items-center justify-center gap-2 text-lg">
        Your reference ID is <span className="font-mono font-bold text-xl">{referenceId}</span>
        <button onClick={handleCopy} className="p-1 hover:bg-muted rounded">
          {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
        </button>
      </p>
      
      <p className="text-base text-muted-foreground">
        Your ticket will be mailed to you within 1-2 days.
      </p>
      
      <p className="text-sm text-muted-foreground">
        If you haven't received the ticket after 2 days, contact support.
      </p>

      {error && (
        <p className="text-base text-red-500">{error}</p>
      )}

      {registrationStatus?.registration?.feePaid && (
        <div className="rounded-lg bg-green-50 p-3 text-base text-green-700">
          ✓ Payment confirmed! Your ticket is being processed.
        </div>
      )}
    </div>
  )
}