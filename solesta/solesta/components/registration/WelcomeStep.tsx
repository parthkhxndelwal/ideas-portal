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

        <div className="rounded-lg border border-blue-200 p-4">
          <p className="text-sm font-medium text-blue-900 mb-3">Ticket Prices</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-blue-600">Internal</p>
              <p className="text-lg font-bold text-blue-700">₹500</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">External</p>
              <p className="text-lg font-bold text-blue-700">₹700</p>
            </div>
          </div>
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