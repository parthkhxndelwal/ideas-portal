"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api, getExternalAppId } from "@/lib/api"

interface CheckStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CheckStatusDialog({
  open,
  onOpenChange,
}: CheckStatusDialogProps) {
  const [inputId, setInputId] = useState("")
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showTicket, setShowTicket] = useState(false)
  const [ticket, setTicket] = useState<any>(null)
  const [paymentCountdown, setPaymentCountdown] = useState<number | null>(null)
  const [showCopied, setShowCopied] = useState(false)

  // OTP states
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [otpMessage, setOtpMessage] = useState("")

  const handleSearch = async () => {
    if (!inputId) return
    setLoading(true)

    try {
      const result = await api.searchByReference(inputId)
      if (result.success && result.data?.exists) {
        setStatus(result.data)
      } else {
        setStatus(null)
      }
    } catch (error) {
      console.error("Search error:", error)
      setStatus(null)
    }
    setLoading(false)
  }

  const handleViewTicket = async () => {
    // Trigger OTP request first
    setOtpError("")
    setOtpMessage("")
    setLoading(true)

    try {
      const result = await api.requestOtpForTicket(status.registration.email)
      if (result.success) {
        setOtpMessage(
          result.message || `OTP sent to ${status.registration.email}`
        )
        setShowOtpModal(true)
        setOtp(["", "", "", "", "", ""])
        // Start cooldown
        setOtpCountdown(60)
      } else {
        setOtpError(result.message || "Failed to send OTP")
      }
    } catch (error) {
      console.error("OTP request error:", error)
      setOtpError("Failed to send OTP. Please try again.")
    }
    setLoading(false)
  }

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value

    setOtp(newOtp)

    // Auto-focus next field
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text")
    const digits = pastedData.replace(/\D/g, "").slice(0, 6)

    const newOtp = digits.split("")
    for (let i = 0; i < 6; i++) {
      newOtp[i] = newOtp[i] || ""
    }
    setOtp(newOtp as [string, string, string, string, string, string])

    // Focus last filled field or next empty field
    const lastFilledIndex = Math.min(digits.length - 1, 5)
    if (lastFilledIndex < 5) {
      setTimeout(() => {
        document.getElementById(`otp-${lastFilledIndex + 1}`)?.focus()
      }, 0)
    }
  }

  const handleVerifyOtp = async () => {
    const otpCode = otp.join("")
    if (otpCode.length !== 6) {
      setOtpError("Please enter a 6-digit OTP")
      return
    }

    setOtpLoading(true)
    setOtpError("")

    try {
      const result = await api.verifyOtpForTicket(
        status.registration.email,
        otpCode
      )
      if (result.success) {
        // OTP verified, now fetch and show ticket
        setShowOtpModal(false)
        setLoading(true)
        const ticketResult = await api.getTicket(inputId)
        if (ticketResult.success && ticketResult.data) {
          setTicket(ticketResult.data)
          setShowTicket(true)
        } else {
          setOtpError(ticketResult.message || "Failed to load ticket")
          setShowOtpModal(true)
        }
        setLoading(false)
      } else {
        setOtpError(result.message || "Invalid OTP")
      }
    } catch (error) {
      console.error("OTP verification error:", error)
      setOtpError("Failed to verify OTP. Please try again.")
    }
    setOtpLoading(false)
  }

  const handleResendOtp = async () => {
    setOtpLoading(true)
    setOtpError("")

    try {
      const result = await api.requestOtpForTicket(status.registration.email)
      if (result.success) {
        setOtpMessage(result.message || "OTP resent successfully")
        setOtp(["", "", "", "", "", ""])
        setOtpCountdown(60)
      } else {
        setOtpError(result.message || "Failed to resend OTP")
      }
    } catch (error) {
      console.error("Resend OTP error:", error)
      setOtpError("Failed to resend OTP")
    }
    setOtpLoading(false)
  }

  const handleDownloadQr = () => {
    if (!ticket?.qrCode) return

    const link = document.createElement("a")
    link.href = ticket.qrCode
    link.download = `solesta-qr-${ticket.referenceId}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleResendTicket = async () => {
    if (ticket) {
      await api.resendTicket(inputId, ticket.referenceId)
      alert("Ticket sent to your email!")
    }
  }

  const handleMakePayment = async () => {
    // Copy reference ID to clipboard
    const referenceId = status.registration.referenceId
    await navigator.clipboard.writeText(referenceId)

    // Show "Copied" message for 1 second
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1000)

    // Start countdown after 1 second delay
    setTimeout(() => {
      setPaymentCountdown(3)

      // Countdown timer
      const interval = setInterval(() => {
        setPaymentCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval)
            // Get payment link based on institution
            const paymentLink = status.registration.isKrmu
              ? "https://p.ppsl.io/PYTMPS/Ro1Qfk"
              : "https://p.ppsl.io/PYTMPS/UYrQfk"
            window.open(paymentLink, "_blank")
            setPaymentCountdown(null)
            return null
          }
          return prev - 1
        })
      }, 1000)
    }, 1000)
  }

  // OTP countdown effect
  useEffect(() => {
    if (otpCountdown <= 0) return

    const interval = setInterval(() => {
      setOtpCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [otpCountdown])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check Registration Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!status && (
            <div className="flex gap-2">
              <input
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value.toUpperCase())}
                placeholder="Enter Reference ID"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2"
              />
              <Button onClick={handleSearch} disabled={!inputId || loading}>
                {loading ? "..." : "Check"}
              </Button>
            </div>
          )}

          {status?.registration && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Reference ID</p>
                <p className="font-mono text-lg font-bold">
                  {status.registration.referenceId}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{status.registration.name}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{status.registration.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Institution</p>
                  <p className="font-medium">
                    {status.registration.isKrmu ? "KRMU" : "External"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Year</p>
                  <p className="font-medium">{status.registration.year}</p>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Payment Status</p>
                <p
                  className={`text-lg font-semibold ${status.registration.feePaid ? "text-green-600" : "text-amber-600"}`}
                >
                  {status.registration.feePaid ? "✅ Paid" : "🔄 Under Review"}
                </p>
                {status.registration.feePaid ? (
                  <p className="text-sm text-muted-foreground">
                    Amount: ₹{status.registration.feeAmount}
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your payment is being verified. Please wait 1-2 days.
                    </p>
                    <Button
                      onClick={handleMakePayment}
                      disabled={paymentCountdown !== null || showCopied}
                      className="mt-3 w-full"
                    >
                      {showCopied
                        ? "✅ Ref ID copied to clipboard"
                        : paymentCountdown !== null
                          ? `Redirecting in ${paymentCountdown}...`
                          : "Make Payment"}
                    </Button>
                    <p className="mt-2 text-xs text-yellow-600">
                      (Avoid if you have already paid)
                    </p>
                  </>
                )}
              </div>

              {status.registration.isFresher !== undefined &&
                status.registration.year === "2025" && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      Fresher Competition
                    </p>
                    <p className="font-medium">
                      {status.registration.isFresher
                        ? "✅ Registered"
                        : "❌ Not Participating"}
                    </p>
                  </div>
                )}

              {status.registration.hasQrCode && status.registration.feePaid && (
                <Button
                  onClick={handleViewTicket}
                  className="w-full py-6 text-lg"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "🎫 View Ticket"}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setStatus(null)
                  setInputId("")
                  setPaymentCountdown(null)
                }}
                className="w-full"
              >
                Search Another
              </Button>
            </div>
          )}

          {status && !status.registration && (
            <div className="py-4 text-center">
              <p className="text-muted-foreground">
                No registration found for this reference ID.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setStatus(null)
                  setInputId("")
                }}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* OTP Verification Modal */}
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 max-w-sm rounded-lg bg-white p-6">
              <h3 className="mb-2 text-xl font-bold">Verify Your Email</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {otpMessage ||
                  `Enter the OTP sent to ${status.registration.email}`}
              </p>

              {otpError && (
                <div className="mb-4 rounded-lg bg-red-50 p-3">
                  <p className="text-sm text-red-700">{otpError}</p>
                </div>
              )}

              <div className="mb-4 flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="h-12 w-12 rounded-lg border-2 border-input text-center text-lg font-bold focus:border-primary focus:outline-none"
                  />
                ))}
              </div>

              <div className="mb-4 flex gap-2">
                <Button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otp.join("").length !== 6}
                  className="flex-1"
                >
                  {otpLoading ? "Verifying..." : "Verify"}
                </Button>
                <Button
                  onClick={() => setShowOtpModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>

              {otpCountdown > 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Resend OTP in {otpCountdown}s
                </p>
              ) : (
                <Button
                  onClick={handleResendOtp}
                  variant="ghost"
                  className="w-full text-sm"
                  disabled={otpLoading}
                >
                  Resend OTP
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Ticket Display Modal */}
        {showTicket && ticket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 max-w-sm rounded-lg bg-white p-6 text-center">
              <h3 className="mb-4 text-xl font-bold">Your Ticket</h3>
              <div className="mb-4 rounded-lg border bg-white p-2">
                <img src={ticket.qrCode} alt="QR Code" className="mx-auto" />
              </div>
              <p className="mb-1 text-lg font-bold">{ticket.name}</p>
              <p className="mb-4 font-mono text-sm">{ticket.referenceId}</p>
              <div className="space-y-2">
                <Button onClick={handleDownloadQr} className="w-full">
                  ⬇️ Download QR
                </Button>
                <Button
                  onClick={handleResendTicket}
                  variant="outline"
                  className="w-full"
                >
                  📧 Resend to Email
                </Button>
                <Button
                  onClick={() => setShowTicket(false)}
                  variant="secondary"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
