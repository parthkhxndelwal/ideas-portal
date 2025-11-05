"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { validateEmailWithTLD } from "@/lib/utils"

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showIncomingForm, setShowIncomingForm] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rollNumber: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailError, setEmailError] = useState("")
  const emailValidationTimeout = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Handle mode switching with robust scale animation
  const handleModeSwitch = () => {
    if (isTransitioning) return // Prevent multiple transitions

    const newMode = !isSignUp
    setIsTransitioning(true)

    // Clear form data and error immediately
    setFormData({ email: "", password: "", rollNumber: "" })
    setError("")
    setEmailError("")

    // Start showing the incoming form after current form completely disappears
    setTimeout(() => {
      setShowIncomingForm(true)
    }, 600) // Wait for current form to fully disappear (matches duration-600)

    // Complete the transition after incoming form animation
    setTimeout(() => {
      setIsSignUp(newMode)
      setShowIncomingForm(false)
      setIsTransitioning(false)
    }, 1050) // 600ms (disappear) + 450ms (appear) = 1050ms total
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setFormData({ ...formData, email: newEmail })
    
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
    
    // Validate email before submission
    const emailValidation = validateEmailWithTLD(formData.email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || "Invalid email")
      setLoading(false)
      return
    }

    console.log("Form submission started, isSignUp:", isSignUp)

    try {
      if (isSignUp) {
        console.log("Attempting signup for:", formData.email)
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        const data = await response.json()
        console.log("Signup response status:", response.status)

        if (response.ok) {
          console.log("Signup successful, redirecting to verify email")
          localStorage.setItem("pendingEmail", formData.email)
          router.push("/verify-email")
        } else {
          console.log("Signup failed:", data.error)
          setError(data.error || "Registration failed")
        }
      } else {
        console.log("Attempting signin for:", formData.email)
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        })

        const data = await response.json()
        console.log("Signin response status:", response.status)

        if (response.ok) {
          console.log("Signin successful, user role:", data.user.role)
          localStorage.setItem("authToken", data.token)
          localStorage.setItem("userData", JSON.stringify(data.user))

          if (data.user.role === "admin") {
            router.push("/admin")
          } else if (data.needsPasswordChange) {
            // User needs to set their password first (manually registered)
            router.push("/set-password")
          } else if (data.needsDetailsConfirmation) {
            // User is a participant but hasn't confirmed details yet
            localStorage.setItem("verifiedEmail", formData.email)
            router.push("/confirm-details")
          } else {
            // User has confirmed details, go to dashboard
            router.push("/dashboard")
          }
        } else {
          console.log("Signin failed:", data.error)
          setError(data.error || "Login failed")
        }
      }
    } catch (error) {
      console.error("Network error:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="relative overflow-hidden">
        {/* Current Form */}
        <div className={`transition-all duration-600 ease-in-out origin-center ${
          isTransitioning 
            ? "transform scale-90 translate-y-4 opacity-0" 
            : "transform scale-100 translate-y-0 opacity-100"
        }`}>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-100 mb-2">{isSignUp ? "Register for IDEAS 3.0" : "Welcome Back"}</h1>
            <p className="text-sm text-neutral-400">Please log in or sign up to Continue</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-neutral-300">To get started, fill in below details:</p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <Label htmlFor="email" className="text-neutral-200 mb-2 block">Email ID</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  className={`bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12 ${
                    emailError ? "border-red-500 focus:border-red-500" : ""
                  }`}
                  required
                />
                {emailError && (
                  <p className="text-red-400 text-xs mt-1">{emailError}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-neutral-200 mb-2 block">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12"
                  required
                />
              </div>

              {isSignUp && (
                <div>
                  <Label htmlFor="rollNumber" className="text-neutral-200 mb-2 block">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12"
                    required
                  />
                </div>
              )}

              {error && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-800">{error}</div>}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? "Please wait..." : "Continue"}
              </Button>
            </form>

            <div className="text-center space-y-2 pt-4 border-t border-neutral-700">
              <button
                type="button"
                onClick={handleModeSwitch}
                className="text-blue-400 text-sm hover:text-blue-300 hover:underline"
                disabled={isTransitioning}
              >
                {isSignUp ? "Already Registered? Sign In" : "New User? Sign Up"}
              </button>

              {!isSignUp && (
                <div>
                  <Link href="/forgot-password" className="text-neutral-400 text-sm hover:text-neutral-300 hover:underline">
                    Forgot Password?
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Incoming Form - fades in during transition */}
        {showIncomingForm && (
          <div className="absolute inset-0 transition-all duration-450 ease-out opacity-100 scale-100">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-neutral-100 mb-2">{!isSignUp ? "Register for IDEAS 3.0" : "Welcome Back"}</h1>
              <p className="text-sm text-neutral-400">Please log in or sign up to Continue</p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-neutral-300">To get started, fill in below details:</p>

              <form className="space-y-3.5">
                <div>
                  <Label htmlFor="email-new" className="text-neutral-200 mb-2 block">Email ID</Label>
                  <Input
                    id="email-new"
                    type="email"
                    className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12"
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="password-new" className="text-neutral-200 mb-2 block">Password</Label>
                  <Input
                    id="password-new"
                    type="password"
                    className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12"
                    disabled
                  />
                </div>

                {!isSignUp && (
                  <div>
                    <Label htmlFor="rollNumber-new" className="text-neutral-200 mb-2 block">Roll Number</Label>
                    <Input
                      id="rollNumber-new"
                      type="text"
                      className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12"
                      disabled
                    />
                  </div>
                )}

                <Button type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled>
                  Continue
                </Button>
              </form>

              <div className="text-center space-y-2 pt-4 border-t border-neutral-700">
                <button
                  type="button"
                  className="text-blue-400 text-sm hover:text-blue-300 hover:underline"
                  disabled
                >
                  {!isSignUp ? "Already Registered? Sign In" : "New User? Sign Up"}
                </button>

                {isSignUp && (
                  <div>
                    <Link href="/forgot-password" className="text-neutral-400 text-sm hover:text-neutral-300 hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-neutral-500">
        In case of any queries,{" "}
        <a href="#" className="text-blue-400 hover:text-blue-300 hover:underline">
          Contact Us
        </a>
      </div>
    </div>
  )
}
