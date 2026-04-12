"use client"

import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

export function CompletedStep() {
  const { referenceId, checkStatus, registrationStatus, reset } = useRegistration()

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-xl font-semibold">Registration Complete!</h2>
      <p className="text-muted-foreground">
        Your reference ID is <span className="font-mono font-bold">{referenceId}</span>
      </p>
      
      <p className="text-sm text-muted-foreground">
        Payment is being verified. You'll receive your ticket once verified by admin.
      </p>
      
      <div className="flex flex-col gap-2">
        <Button onClick={checkStatus} variant="outline" className="w-full">
          Check Status
        </Button>
        <Button onClick={reset} variant="ghost" className="w-full">
          Start New Registration
        </Button>
      </div>
    </div>
  )
}