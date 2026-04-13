"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useRegistration } from "@/hooks/useRegistration"

const FRESHER_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfeM5KvrB3Q7Kkwr78HKP57Qxn9vTBDuelTH9EHEuze6FFw9A/viewform"

export function FresherSelector() {
  const { submitFresher, goBack, isLoading, error } = useRegistration()
  const [showRegistrationLink, setShowRegistrationLink] = useState(false)

  const handleYesClick = () => {
    setShowRegistrationLink(true)
  }

  const handleLinkModalClose = () => {
    setShowRegistrationLink(false)
  }

  const handleContinueAfterRegistration = async () => {
    setShowRegistrationLink(false)
    await submitFresher(true)
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Mr. & Mrs. Fresher</h2>
        <p className="text-sm text-muted-foreground">
          Would you like to participate in the Mr. & Mrs. Fresher competition?
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="grid gap-3">
          <Button
            onClick={handleYesClick}
            disabled={isLoading}
            className="w-full py-6 text-lg"
          >
            {isLoading ? "Processing..." : "Yes, I'm interested!"}
          </Button>

          <Button
            onClick={() => submitFresher(false)}
            disabled={isLoading}
            variant="outline"
            className="w-full py-6 text-lg"
          >
            {isLoading ? "Processing..." : "No, skip"}
          </Button>
        </div>

        {goBack && (
          <Button variant="ghost" onClick={goBack} className="w-full">
            Back
          </Button>
        )}
      </div>

      <Dialog open={showRegistrationLink} onOpenChange={handleLinkModalClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mr. & Mrs. Fresher Registration</DialogTitle>
            <DialogDescription>
              Click the button below to register for the Mr. or Mrs. Fresher
              competition
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              You will be redirected to a registration form. Please fill it out
              with your details and preferences.
            </p>

            <a
              href={FRESHER_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full py-6 text-lg">
                Open Registration Form
              </Button>
            </a>

            <Button
              onClick={handleContinueAfterRegistration}
              variant="outline"
              className="w-full"
            >
              I've completed the registration
            </Button>

            <Button
              onClick={handleLinkModalClose}
              variant="ghost"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
