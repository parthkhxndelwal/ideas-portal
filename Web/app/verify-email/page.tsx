"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const pendingEmail = localStorage.getItem("pendingEmail")
    if (!pendingEmail) {
      router.push("/")
      return
    }
    setEmail(pendingEmail)
  }, [router])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.removeItem("pendingEmail")
        localStorage.setItem("verifiedEmail", email)
        router.push("/confirm-details")
      } else {
        setError(data.error || "Verification failed")
      }
    } catch (_error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setResendLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setResendCooldown(60)
        setError("")
      } else {
        setError(data.error || "Failed to resend OTP")
      }
    } catch (_error) {
      setError("An error occurred. Please try again.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-neutral-950 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-neutral-950/60" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-4">
              <Image
                src="/kr-logo.png"
                alt="KR Mangalam Logo"
                width={56}
                height={56}
                className="rounded-full shadow-lg"
                priority
              />
              <Image
                src="/solesta-white.png"
                alt="Solesta Logo"
                width={160}
                height={48}
                className="drop-shadow-2xl"
                priority
              />
            </div>
            <p className="text-sm text-neutral-400">
              Securely verify your email to continue your Solesta journey.
            </p>
          </div>

          <Card className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 shadow-2xl">
            <CardHeader className="text-center space-y-1">
              <CardTitle className="text-2xl font-semibold text-neutral-50">
                Verify Your Email
              </CardTitle>
              <p className="text-sm text-neutral-400">
                We’ve sent a 6-digit code to <span className="text-neutral-200 font-medium">{email}</span>
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-neutral-300">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    required
                    className="h-12 border-neutral-700 bg-neutral-900 text-neutral-100 placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify Email"}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendOTP}
                    disabled={resendLoading || resendCooldown > 0}
                    className="text-sm text-neutral-400 hover:text-neutral-200"
                  >
                    {resendLoading
                      ? "Sending..."
                      : resendCooldown > 0
                        ? `Resend OTP in ${resendCooldown}s`
                        : "Resend OTP"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-neutral-500">
            Didn’t receive the email? Check your spam folder or request a new code above.
          </p>
        </div>
      </div>
    </div>
  )
}
