"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ContactDialog } from '@/components/ContactDialog'

interface WelcomeStepProps {
  onProceed: () => void
}

export function WelcomeStep({ onProceed }: WelcomeStepProps) {
  const [showContact, setShowContact] = useState(false)

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 p-4">
          <p className="text-red-600 font-semibold text-center">
            KR Mangalam <u>Hostellers</u> - <u>DO NOT</u> book tickets from here. Your tickets are to be paid through ICloudEMS App.
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Upon completing the payment, you will receive the QR ticket through email.
          </p>
          <p className="text-xs">
            (Check your spam folder too)
          </p>
          <p className="mt-2">
            In case of any queries, you can contact us anytime.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setShowContact(true)}
            className="flex-1"
          >
            Contact Us
          </Button>
          <Button onClick={onProceed} className="flex-1">
            Book Ticket
          </Button>
        </div>
      </div>

      <ContactDialog open={showContact} onOpenChange={setShowContact} />
    </>
  )
}