"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { validateEmailWithTLD } from "@/lib/utils"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [formSubmitted, setFormSubmitted] = useState(false)
  const emailValidationTimeout = useRef<NodeJS.Timeout | null>(null)
  const _router = useRouter()

  const getEmailClientInfo = (email: string) => {
    if (!email || !email.includes("@")) return null

    const domain = email.split("@")[1].toLowerCase()

    if (domain === "gmail.com") {
      return {
        url: "https://mail.google.com",
        name: "Gmail"
      }
    } else if (domain === "krmu.edu.in") {
      return {
        url: "https://outlook.office.com",
        name: "Outlook"
      }
    } else if (domain.includes("yahoo")) {
      return {
        url: "https://mail.yahoo.com",
        name: "Yahoo Mail"
      }
    } else if (domain.includes("outlook") || domain.includes("live") || domain.includes("hotmail")) {
      return {
        url: "https://outlook.live.com",
        name: "Outlook"
      }
    }

    return null
  }

  const handleOpenEmailClient = () => {
    const clientInfo = getEmailClientInfo(email)
    if (clientInfo) {
      window.open(clientInfo.url, "_blank")
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    
    // Clear any existing timeout
    if (emailValidationTimeout.current) {
      clearTimeout(emailValidationTimeout.current)
    }
    
    // Clear error immediately when user types
    setEmailError("")
    
    // Validate email after 500ms of no typing
    if (newEmail) {
      emailValidationTimeout.current = setTimeout(() => {
        const validation = validateEmailWithTLD(newEmail)
        if (!validation.isValid && validation.error) {
          setEmailError(validation.error)
        }
      }, 500)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailValidationTimeout.current) {
        clearTimeout(emailValidationTimeout.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    // Validate email before submission
    const emailValidation = validateEmailWithTLD(email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || "Invalid email")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setFormSubmitted(true)
        setMessage("Password reset link sent! Check your email for instructions.")
      } else {
        setError(data.error || "Failed to send reset email")
      }
    } catch (_error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Image
              src="/kr-logo.png"
              alt="KR Logo"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
            <Image
              src="/solesta-white.png"
              alt="Solesta Logo"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </div>
        </div>

        <Card className="bg-neutral-800 border-neutral-700 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-neutral-100">
              {formSubmitted ? "Check Your Email" : "Reset Password"}
            </CardTitle>
            <p className="text-sm text-neutral-400">
              {formSubmitted 
                ? "We've sent a password reset link to your email" 
                : "Enter your email to receive a reset link"
              }
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {!formSubmitted ? (
                <div>
                  <Label htmlFor="email" className="text-neutral-200 mb-2 block">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Enter your email"
                    className={`bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12 transition-all duration-200 ${
                      emailError ? "border-red-500 focus:border-red-500" : ""
                    }`}
                    required
                  />
                  {emailError && (
                    <p className="text-red-400 text-xs mt-1">{emailError}</p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <Label className="text-neutral-200 mb-2 block">Email Address</Label>
                  <div className="bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-neutral-100 h-12 flex items-center justify-center">
                    {email}
                  </div>
                </div>
              )}

              {error && <div className="text-red-400 text-sm">{error}</div>}
              {message && <div className="text-green-400 text-sm">{message}</div>}

              {!formSubmitted && (
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              )}

              {formSubmitted && getEmailClientInfo(email) && (
                <Button
                  type="button"
                  onClick={handleOpenEmailClient}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Open {getEmailClientInfo(email)?.name}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}

              {formSubmitted && !getEmailClientInfo(email) && (
                <div className="text-center text-neutral-400 text-sm">
                  Check your email app for the password reset link
                </div>
              )}

              <div className="text-center">
                <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-300">
                  Back to Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
