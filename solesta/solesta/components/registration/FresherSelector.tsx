"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRegistration } from "@/hooks/useRegistration"

const FRESHER_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfeM5KvrB3Q7Kkwr78HKP57Qxn9vTBDuelTH9EHEuze6FFw9A/viewform"

export function FresherSelector() {
  const { submitFresher, goBack, isLoading, error } = useRegistration()
  const [hasClickedForm, setHasClickedForm] = useState(false)

  const handleOpenForm = () => {
    setHasClickedForm(true)
    window.open(FRESHER_FORM_URL, "_blank")
  }

  const handleContinue = async () => {
    // If user clicked the form link, send Yes, otherwise send No
    await submitFresher(hasClickedForm)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Mr. & Mrs. Fresher</h2>
      <p className="text-sm text-muted-foreground">
        Would you like to participate in the Mr. & Mrs. Fresher competition?
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm">
          Click the button below to open the registration form for Mr. & Mrs.
          Fresher competition. You can fill it out in a new tab while keeping
          this form open.
        </p>
        <Button
          onClick={handleOpenForm}
          variant={hasClickedForm ? "default" : "outline"}
          className="w-full py-6 text-lg"
          disabled={isLoading}
        >
          {hasClickedForm ? "✓ Form Opened" : "Open Registration Form"}
        </Button>
      </div>

      <div className="grid gap-3">
        <Button
          onClick={handleContinue}
          disabled={isLoading}
          className="w-full py-6 text-lg"
        >
          {isLoading ? "Processing..." : "Continue"}
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
