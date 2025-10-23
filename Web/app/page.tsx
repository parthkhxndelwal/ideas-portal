"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { LoadingTransition } from "@/components/ui/loading-transition"
import { verifyJWT } from "@/lib/jwt-utils"
import Image from "next/image"

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const token = localStorage.getItem("authToken")

      if (token) {
        try {
          // First check if it's an admin token (synchronous check)
          const decoded = verifyJWT(token)
          if (decoded && decoded.role === "admin") {
            // Admin users: redirect immediately without loading screen
            router.push("/admin")
            return
          }

          // For non-admin users, show loading while checking status
          setLoading(true)
          const response = await fetch("/api/user/confirmation-status", {
            headers: { Authorization: `Bearer ${token}` },
          })

          if (response.ok) {
            const data = await response.json()

            if (data.needsDetailsConfirmation) {
              // User needs to confirm details first
              localStorage.setItem("verifiedEmail", data.email)
              router.push("/confirm-details")
            } else {
              // User is fully authenticated and confirmed
              router.push("/dashboard")
            }
            return
          } else {
            // Invalid token, remove it
            localStorage.removeItem("authToken")
            localStorage.removeItem("userData")
          }
        } catch (_error) {
          // Network error or invalid token
          localStorage.removeItem("authToken")
          localStorage.removeItem("userData")
        }
      }

      // No valid token or authentication failed, show login form
      setLoading(false)
    }

    checkAuthAndRedirect()
  }, [router])

  return (
    <LoadingTransition isLoading={loading}>
      <div className="min-h-screen bg-neutral-900">
        {/* Mobile Layout - Stacked */}
        <div className="lg:hidden">
          {/* Mobile Banner with padding and rounded borders */}
          <div className="p-4 pt-8">
            <div className="w-full rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/IDEAS.png"
                alt="IDEAS Banner"
                width={800}
                height={400}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>

          {/* Mobile Login Form */}
          <div className="p-6">
            <LoginForm />
          </div>
        </div>

        {/* Desktop Layout - Side by Side */}
        <div className="hidden lg:flex min-h-screen">
          {/* Left side - Login functionality */}
          <div className="flex-1 flex items-center justify-center p-8 bg-neutral-900">
            <LoginForm />
          </div>

          {/* Right side - Full height banner image */}
          <div className="flex-1 relative">
            <Image
              src="/IDEAS.png"
              alt="IDEAS Banner"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </LoadingTransition>
  )
}
