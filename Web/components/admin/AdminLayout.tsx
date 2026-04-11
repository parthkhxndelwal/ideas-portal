"use client"

import { useEffect, useLayoutEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sun, Moon, LogOut, ArrowLeft } from "lucide-react"
import Image from "next/image"

// 🌙 Custom hook for theme (light/dark)
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [isClient, setIsClient] = useState(false)
  const [themeReady, setThemeReady] = useState(false)

  useLayoutEffect(() => {
    setIsClient(true)

    const root = document.documentElement
    const saved = localStorage.getItem("theme") as "light" | "dark" | null
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
    const existingDarkClass = root.classList.contains("dark")

    const resolvedTheme =
      saved || (existingDarkClass ? "dark" : prefersDark ? "dark" : "light")

    setTheme(resolvedTheme)
    root.classList.toggle("dark", resolvedTheme === "dark")
    setThemeReady(true)
  }, [])

  const toggleTheme = () => {
    if (!isClient) return
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  return { theme, toggleTheme, isClient, themeReady }
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
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme, isClient, themeReady } = useTheme()
  const [isReady, setIsReady] = useState(false)

  // ✅ Auth check (background, no loading screen)
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
      } catch (_error) {
        router.push("/")
      }
    }

    checkAdminAccess()
  }, [router])

  // Show loading screen only on main /admin page once theme is ready
  useEffect(() => {
    if (!themeReady) return

    if (pathname === "/admin") {
      setIsReady(false)
      const timer = setTimeout(() => setIsReady(true), 300)
      return () => clearTimeout(timer)
    }

    setIsReady(true)
  }, [pathname, themeReady])

  if (!themeReady) {
    return <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900" />
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
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
            <Link href="/admin" className="cursor-pointer">
              <Image
                src={isClient && theme === "dark" ? "/solesta-white.png" : "/solesta-black.png"}
                alt="Solesta Logo"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <div className="h-8 w-px bg-neutral-300 dark:bg-neutral-600"></div>
            <Link href="/admin" className="cursor-pointer">
              <Image
                src="/kr-logo.png"
                alt="KR Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
            </Link>
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
  )
}