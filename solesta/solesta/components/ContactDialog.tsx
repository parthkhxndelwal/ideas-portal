"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronDown } from "lucide-react"

interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = "selection" | "payment" | "ticket" | "general" | "contact"

const FAQS = [
  {
    id: "verification-time",
    question: "How long does payment verification take?",
    answer: "Payment verification takes 1-2 days after payment is done.",
  },
  {
    id: "admin-review",
    question: "Who verifies my payment?",
    answer:
      "An admin will review your payment and issue the QR code to your registered email ID.",
  },
  {
    id: "payment-methods",
    question: "What payment methods are available?",
    answer: "You can choose various payment methods at the payment form.",
  },
]

const CONTACT_WHATSAPP = "https://wa.me/919310189324"
const CONTACT_PHONE = "+919310189324"
const CONTACT_EMAIL = "krmuevents@krmangalam.edu.in"

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-lg border">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted"
      >
        <span className="font-medium">{question}</span>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="border-t bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">{answer}</p>
        </div>
      )}
    </div>
  )
}

function getTitleForStep(step: Step): string {
  switch (step) {
    case "selection":
      return "Contact Us"
    case "payment":
      return "Payment Related Support"
    case "ticket":
      return "Ticket Not Received"
    case "general":
      return "General Query Support"
    case "contact":
      return "Contact Details"
    default:
      return "Contact Us"
  }
}

export function ContactDialog({ open, onOpenChange }: ContactDialogProps) {
  const [step, setStep] = useState<Step>("selection")
  const [previousStep, setPreviousStep] = useState<Step | null>(null)
  const [expandedFAQs, setExpandedFAQs] = useState<Record<string, boolean>>({})

  const handleSelectQueryType = (
    queryType: "payment" | "ticket" | "general"
  ) => {
    setPreviousStep(step)
    setStep(queryType)
  }

  const handleNeedMoreHelp = () => {
    setPreviousStep(step)
    setStep("contact")
  }

  const handleBack = () => {
    if (previousStep) {
      setStep(previousStep)
      setPreviousStep(null)
    } else {
      setStep("selection")
    }
  }

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQs((prev) => ({
      ...prev,
      [faqId]: !prev[faqId],
    }))
  }

  const handleDialogClose = () => {
    setStep("selection")
    setPreviousStep(null)
    setExpandedFAQs({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitleForStep(step)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Query Type Selection */}
          {step === "selection" && (
            <div className="space-y-3">
              <button
                onClick={() => handleSelectQueryType("payment")}
                className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted"
              >
                <h3 className="font-semibold">Payment Related Support</h3>
                <p className="text-sm text-muted-foreground">
                  Questions about payment verification and processing
                </p>
              </button>

              <button
                onClick={() => handleSelectQueryType("general")}
                className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted"
              >
                <h3 className="font-semibold">General Query Support</h3>
                <p className="text-sm text-muted-foreground">
                  Other questions or inquiries
                </p>
              </button>

              <button
                onClick={() => handleSelectQueryType("ticket")}
                className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted"
              >
                <h3 className="font-semibold">Ticket Not Received</h3>
                <p className="text-sm text-muted-foreground">
                  Questions about ticket delivery
                </p>
              </button>
            </div>
          )}

          {/* Step 2a: Payment Related Support with FAQs */}
          {step === "payment" && (
            <div className="space-y-4">
              <div className="space-y-3">
                {FAQS.map((faq) => (
                  <FAQItem
                    key={faq.id}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={expandedFAQs[faq.id] || false}
                    onToggle={() => toggleFAQ(faq.id)}
                  />
                ))}
              </div>

              <Button
                onClick={handleNeedMoreHelp}
                className="w-full"
                variant="outline"
              >
                Need More Help
              </Button>

              <Button onClick={handleBack} variant="ghost" className="w-full">
                Back
              </Button>
            </div>
          )}

          {/* Step 2b: Ticket Not Received */}
          {step === "ticket" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-gray-700">
                  Your ticket will be mailed to you{" "}
                  <strong>1-2 days after the payment is done</strong>. Please
                  wait for the email on your registered email ID.
                </p>
              </div>

              <Button
                onClick={handleNeedMoreHelp}
                className="w-full"
                variant="outline"
              >
                Need More Help
              </Button>

              <Button onClick={handleBack} variant="ghost" className="w-full">
                Back
              </Button>
            </div>
          )}

          {/* Step 2c: General Query Support */}
          {step === "general" && (
            <div className="space-y-4">
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Contact us via WhatsApp for general queries
              </p>

              <a
                href={CONTACT_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 rounded-lg border bg-green-50 p-4 transition-colors hover:bg-green-100"
              >
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
                <span className="font-semibold text-green-600">
                  Open WhatsApp
                </span>
              </a>

              <Button onClick={handleBack} variant="ghost" className="w-full">
                Back
              </Button>
            </div>
          )}

          {/* Step 3: Contact Details */}
          {step === "contact" && (
            <div className="space-y-4">
              <a
                href={CONTACT_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <svg
                  className="h-5 w-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium text-green-600">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    Click to open WhatsApp
                  </p>
                </div>
              </a>

              <a
                href={`tel:${CONTACT_PHONE}`}
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6v1z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">Phone Call</p>
                  <p className="text-sm text-muted-foreground">
                    {CONTACT_PHONE}
                  </p>
                </div>
              </a>

              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {CONTACT_EMAIL}
                  </p>
                </div>
              </a>

              <Button onClick={handleBack} variant="ghost" className="w-full">
                Back
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
