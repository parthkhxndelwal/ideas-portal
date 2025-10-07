"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

// Material Design Circular Loader Component
function CircularLoader() {
  return (
    <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  )
}

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(true)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rollNumber: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get("message")
    if (message) {
      setIsSignUp(false)
      setSuccess("Password reset successful! Please log in with your new password.")
      router.replace("/", { scroll: false }) // Remove query params
    }
  }, [searchParams, router])

  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp)
    setFormData({ email: "", password: "", rollNumber: "" })
    setError("")
    setSuccess("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (isSignUp) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        const data = await response.json()

        if (response.ok) {
          localStorage.setItem("pendingEmail", formData.email)
          router.push("/verify-email")
        } else {
          setError(data.error || "Registration failed")
        }
      } else {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          localStorage.setItem("authToken", data.token)
          localStorage.setItem("userData", JSON.stringify(data.user))

          if (data.user.role === "admin") {
            router.push("/admin")
          } else if (data.needsDetailsConfirmation) {
            localStorage.setItem("verifiedEmail", formData.email)
            router.push("/confirm-details")
          } else {
            router.push("/dashboard")
          }
        } else {
          setError(data.error || "Login failed")
        }
      }
    } catch (error) {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="transition-all duration-300 ease-in-out">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-100 mb-2">
            {isSignUp ? "Register for IDEAS 3.0" : "Welcome Back"}
          </h1>
          <p className="text-sm text-neutral-400">
            Please log in or sign up to Continue
          </p>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <Label htmlFor="email" className="text-neutral-200 mb-2 block">
                Email ID
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12 transition-all duration-200"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-neutral-200 mb-2 block">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12 transition-all duration-200"
                required
              />
            </div>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isSignUp
                  ? "max-h-24 opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <Label htmlFor="rollNumber" className="text-neutral-200 mb-2 block">
                Roll Number
              </Label>
              <Input
                id="rollNumber"
                type="text"
                value={formData.rollNumber}
                onChange={(e) =>
                  setFormData({ ...formData, rollNumber: e.target.value })
                }
                className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12 transition-all duration-200"
                required={isSignUp}
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-800 animate-in fade-in duration-200">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-400 text-sm bg-green-900/20 p-3 rounded border border-green-800 animate-in fade-in duration-200">
                {success}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <CircularLoader />
                  <span>Please wait...</span>
                </div>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          <div className="text-center space-y-2 pt-4 border-t border-neutral-700">
            <button
              type="button"
              onClick={handleModeSwitch}
              className="text-blue-400 text-sm hover:text-blue-300 hover:underline transition-colors duration-150"
            >
              {isSignUp ? "Already Registered? Sign In" : "New User? Sign Up"}
            </button>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                !isSignUp
                  ? "max-h-8 opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <Link
                href="/forgot-password"
                className="text-neutral-400 text-sm hover:text-neutral-300 hover:underline transition-colors duration-150"
              >
                Forgot Password?
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-neutral-500">
        In case of any queries,{" "}
        <a
          href="#"
          className="text-blue-400 hover:text-blue-300 hover:underline transition-colors duration-150"
        >
          Contact Us
        </a>
      </div>
    </div>
  )
}