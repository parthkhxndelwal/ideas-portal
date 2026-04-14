"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, LogIn } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Login failed")
        return
      }

      // Redirect to dashboard
      router.push("/admin/dashboard")
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100 px-4 pb-8 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-neutral-300 bg-slate-900/50 p-6 shadow-2xl backdrop-blur sm:p-8 dark:border-neutral-700">
          <div className="mb-6 flex justify-center sm:mb-8">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 sm:p-3">
              <Lock className="h-6 w-6 text-neutral-600 sm:h-8 sm:w-8 dark:text-neutral-400" />
            </div>
          </div>

          <h1 className="mb-1 text-center text-xl font-bold text-white sm:mb-2 sm:text-2xl">
            Admin Panel
          </h1>
          <p className="mb-6 text-center text-xs text-neutral-500 sm:mb-8 sm:text-sm dark:text-neutral-400">
            Solesta '26 - Registration Management
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={loading}
                className="h-12 border-neutral-300 bg-slate-800 text-base text-white placeholder:text-slate-500 dark:border-neutral-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={loading}
                className="h-12 border-neutral-300 bg-slate-800 text-base text-white placeholder:text-slate-500 dark:border-neutral-700"
              />
            </div>

            {error && (
              <div className="rounded border border-red-500/50 bg-red-900/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !username || !password}
              className="h-12 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <span className="mr-2 inline-block animate-spin">⏳</span>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 inline h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
