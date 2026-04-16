"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RegistrationsTab } from "./components/RegistrationsTab"
import { ScannerApiKeysTab } from "./components/ScannerApiKeysTab"
import { LogOut, Sun, Moon } from "lucide-react"
import { useTheme } from "@/app/admin/context/ThemeContext"

export default function DashboardPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [admin, setAdmin] = useState<{ name: string; username: string } | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"registrations" | "scanner">(
    "registrations"
  )

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/auth/me")
      if (!response.ok) {
        router.push("/admin/login")
        return
      }

      const data = await response.json()
      setAdmin(data.admin)
    } catch (error) {
      router.push("/admin/login")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
      router.push("/admin/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const isDark = theme === "dark"

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 dark:border-neutral-700 dark:border-t-neutral-400"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Floating Navbar */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <header className="rounded-xl border border-neutral-200 bg-white px-6 py-4 shadow-md dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Solesta '26 Admin
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Welcome, {admin?.name || admin?.username}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={toggleTheme}
                variant="outline"
                className="flex items-center gap-2 border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {isDark ? (
                  <>
                    <Sun className="h-4 w-4" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    <span className="hidden sm:inline">Dark</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2 border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pb-8">
        <div className="rounded-xl border border-neutral-200 bg-white shadow-md dark:border-neutral-800 dark:bg-neutral-900">
          {/* Tabs */}
          <div className="border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex">
              <button
                onClick={() => setActiveTab("registrations")}
                className={`flex-1 px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === "registrations"
                    ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                Registration Management
              </button>
              <button
                onClick={() => setActiveTab("scanner")}
                className={`flex-1 px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === "scanner"
                    ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                Scanner API Keys
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "registrations" && <RegistrationsTab />}
            {activeTab === "scanner" && <ScannerApiKeysTab />}
          </div>
        </div>
      </main>
    </div>
  )
}
