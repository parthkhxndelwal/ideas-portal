"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Image from "next/image"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [token, setToken] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const resetToken = searchParams.get("token")
    if (!resetToken) {
      router.push("/")
      return
    }
    setToken(resetToken)
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/?message=Password reset successful")
      } else {
        setError(data.error || "Password reset failed")
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
            <CardTitle className="text-xl font-bold text-neutral-100">Set New Password</CardTitle>
            <p className="text-sm text-neutral-400">Enter your new password</p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <Label htmlFor="password" className="text-neutral-200 mb-2 block">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12 transition-all duration-200"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-neutral-200 mb-2 block">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 h-12 transition-all duration-200"
                  required
                />
              </div>

              {error && <div className="text-red-400 text-sm">{error}</div>}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
