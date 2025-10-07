"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LoadingTransition } from "@/components/ui/loading-transition"
import { Button } from "@/components/ui/button"
import { Sun, Moon, LogOut, ArrowLeft } from "lucide-react"
import Image from "next/image"

// 🌙 Custom hook for theme (light/dark)
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const saved = localStorage.getItem("theme") as "light" | "dark" | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initial = saved || (prefersDark ? "dark" : "light")
    setTheme(initial)
    document.documentElement.classList.toggle("dark", initial === "dark")
  }, [])

  const toggleTheme = () => {
    if (!isClient) return
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  return { theme, toggleTheme, isClient }
}

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  showBackButton?: boolean
  loading?: boolean
}

export default function AdminLayout({ 
  children, 
  title, 
  showBackButton = false, 
  loading = false 
}: AdminLayoutProps) {
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()
  const { theme, toggleTheme, isClient } = useTheme()

  // ✅ Auth check
  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (!token) {
      router.push("/")
      return
    }

    const checkAdminAccess = async () => {
      try {
        const response = await fetch("/api/admin/verify", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          router.push("/")
        }
      } catch (error) {
        router.push("/")
      } finally {
        setAuthLoading(false)
      }
    }

    checkAdminAccess()
  }, [router])

  // Show full screen loading only during initial auth check
  return (
    <LoadingTransition isLoading={authLoading}>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: isClient ? `url('/admin-background${theme === "dark" ? "" : "-white"}.jpg')` : undefined,
          backgroundColor: theme === "dark" ? "#1a1a1a" : "#f9fafb" // Fallback colors
        }}
      >
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 🎯 Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Image
              src={isClient && theme === "dark" ? "/ideas-white.png" : "/ideas-black.png"}
              alt="IDEAS Logo"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
            />
            <div className="h-8 w-px bg-neutral-300 dark:bg-neutral-600"></div>
            <Image
              src="/kr-logo.png"
              alt="KR Logo"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div className="ml-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                Admin Dashboard
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showBackButton && (
              <Button
                variant="outline"
                onClick={() => router.push("/admin")}
                className="border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              variant="outline"
              onClick={toggleTheme}
              className="border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-800"
              onClick={() => {
                localStorage.removeItem("authToken")
                router.push("/")
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Content Area - Show loading state here if needed */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-neutral-600 dark:text-neutral-400">Loading...</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
    </LoadingTransition>
  )
}