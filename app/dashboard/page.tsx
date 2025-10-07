"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { flushSync } from "react-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CheckCircle,
  Clock,
  Download,
  CreditCard,
  FileText,
  LogOut,
  User,
  Calendar,
  Award,
  TrendingUp,
  Sparkles,
  Sun,
  Moon,
  Eye,
  ChevronDown,
  ArrowLeft,
  X,
  ShieldCheck,
  Loader2
} from "lucide-react"
import Image from "next/image"
import { LoadingTransition } from "@/components/ui/loading-transition"

declare global {
  interface Window {
    Razorpay: any
  }
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Check if dark class was already applied by the script
    const isDarkApplied = document.documentElement.classList.contains('dark')
    
    if (isDarkApplied) {
      setTheme("dark")
    } else {
      // If no dark class, check localStorage and default to dark
      const saved = localStorage.getItem("theme") as "light" | "dark" | null
      const initial = saved || "dark" // Default to dark mode
      setTheme(initial)
      document.documentElement.classList.toggle("dark", initial === "dark")
    }
  }, [])

  const toggleTheme = async () => {
    if (!toggleRef.current || isTransitioning) return

    const currentTheme = theme
    const nextTheme = theme === "dark" ? "light" : "dark"
    setIsTransitioning(true)

    // Check if View Transition API is supported
    if (!document.startViewTransition) {
      // Fallback for browsers without View Transition API
      setTheme(nextTheme)
      localStorage.setItem("theme", nextTheme)
      document.documentElement.classList.toggle("dark", nextTheme === "dark")
      setIsTransitioning(false)
      return
    }

    // Get button position for the animation
    const { top, left, width, height } = toggleRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2

    // Calculate the maximum radius needed to cover the screen
    const right = window.innerWidth - x
    const bottom = window.innerHeight - y
    const maxRadius = Math.hypot(
      Math.max(x, right),
      Math.max(y, bottom)
    )

    // Add CSS for the circular reveal animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes reveal {
        from {
          clip-path: circle(0px at ${x}px ${y}px);
        }
        to {
          clip-path: circle(${maxRadius}px at ${x}px ${y}px);
        }
      }

      ::view-transition-old(root) {
        animation: none;
        mix-blend-mode: plus-lighter;
      }
      
      ::view-transition-new(root) {
        animation: reveal 0.5s ease-in-out;
        mix-blend-mode: normal;
      }
    `
    document.head.appendChild(style)

    // Start the view transition - only update DOM class, not React state
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        document.documentElement.classList.toggle("dark", nextTheme === "dark")
      })
    })

    // After transition completes, update React state and localStorage
    transition.finished.then(() => {
      document.head.removeChild(style)
      setTheme(nextTheme)
      localStorage.setItem("theme", nextTheme)
      setIsTransitioning(false)
    })
  }

  return { theme, toggleTheme, toggleRef, isTransitioning, setTheme }
}

interface User {
  id: string
  name: string
  email?: string
  rollNumber: string
  courseAndSemester: string
  registrationStatus: "pending" | "details_confirmed" | "confirmed"
  paymentStatus: "pending" | "completed"
  transactionId?: string
}

interface PendingTransaction {
  id: string
  transactionId: string
  amount: number
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [animating, setAnimating] = useState(false)
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState("")
  const [paymentAmount, setPaymentAmount] = useState<number>(200)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [allowDrawerClose, setAllowDrawerClose] = useState(true)
  const router = useRouter()
  const { theme, toggleTheme, toggleRef, isTransitioning, setTheme } = useTheme()

  const simpleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark"
    // Simple theme toggle without animation for dropdown
    localStorage.setItem("theme", nextTheme)
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
    // Update the theme state to match
    setTheme(nextTheme)
  }

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (!token) {
      router.push("/")
      return
    }
    fetchUserData(token)
  }, [router])

  const fetchUserData = async (token: string) => {
    try {
      // First check if user needs to confirm details
      const statusResponse = await fetch("/api/user/confirmation-status", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()

        // If user is admin, redirect to admin panel
        if (statusData.role === "admin") {
          router.push("/admin")
          return
        }

        if (statusData.needsDetailsConfirmation) {
          // User needs to confirm details, redirect to confirm details page
          localStorage.setItem("verifiedEmail", statusData.email)
          router.push("/confirm-details")
          return
        }
      }

      // If user has confirmed details, fetch full profile
      const response = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setPendingTransactions(data.pendingTransactions || [])
        setAnimating(true)
      } else {
        localStorage.removeItem("authToken")
        router.push("/")
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const paymentCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPaymentAmount = useCallback(async () => {
    try {
      const response = await fetch("/api/payment/amount")
      if (!response.ok) {
        return
      }

      const data = await response.json()
      if (typeof data.paymentAmount === "number") {
        setPaymentAmount(data.paymentAmount)
      }
    } catch (error) {
      console.error("Error fetching payment amount:", error)
    }
  }, [])

  const openPaymentDrawer = useCallback(() => {
    setPaymentError("")
    setPaymentSuccess(false)
    setPaymentLoading(false)
    setAllowDrawerClose(true)
    setShowPaymentDrawer(true)
    fetchPaymentAmount()
  }, [fetchPaymentAmount])

  const closePaymentDrawer = useCallback(() => {
    setShowPaymentDrawer(false)
    setAllowDrawerClose(true)
    // Small delay to let drawer animation complete
    setTimeout(() => {
      setPaymentLoading(false)
      setPaymentError("")
      setPaymentSuccess(false)
    }, 300)
  }, [])

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    if (!open && !allowDrawerClose) {
      // Prevent closing if we're in the middle of payment flow
      return
    }
    setShowPaymentDrawer(open)
    if (!open) {
      // Reset states when drawer is closed
      setTimeout(() => {
        setPaymentLoading(false)
        setPaymentError("")
        setPaymentSuccess(false)
        setAllowDrawerClose(true)
      }, 300)
    }
  }, [allowDrawerClose])

  async function verifyPayment(razorpayResponse: any, token: string) {
    try {
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setPaymentSuccess(true)
        setPaymentLoading(false)
        setPaymentError("")
        setUser((prev) =>
          prev
            ? {
                ...prev,
                paymentStatus: "completed",
                registrationStatus: "confirmed",
                transactionId: data.transactionId || prev.transactionId,
              }
            : prev
        )
      } else {
        setPaymentError(data.error || "Payment verification failed")
        setPaymentLoading(false)
      }
    } catch (error) {
      console.error("Verification error:", error)
      setPaymentError("Payment verification failed. Please contact support.")
      setPaymentLoading(false)
    }
  }

  const handleInitiatePayment = useCallback(async () => {
    if (!razorpayLoaded) {
      setPaymentError("Payment gateway is loading. Please wait...")
      return
    }

    const token = localStorage.getItem("authToken")
    if (!token) {
      router.push("/")
      return
    }

    setPaymentLoading(true)
    setPaymentError("")
    setAllowDrawerClose(false) // Prevent drawer from closing during payment

    try {
      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: paymentAmount }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPaymentError(data.error || "Failed to create payment order")
        setPaymentLoading(false)
        return
      }

      const options = {
        key: data.razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "IDEAS 3.0",
        description: "Event Registration Fee",
        image: "/ideas-black.png",
        handler: async (razorpayResponse: any) => {
          await verifyPayment(razorpayResponse, token)
          setAllowDrawerClose(true) // Allow drawer to be closed after successful payment
        },
        prefill: {
          email: user?.email || "",
          name: user?.name || "",
        },
        theme: {
          color: "#1d4ed8",
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false)
            setPaymentError("Payment cancelled. Please try again.")
            setAllowDrawerClose(true) // Allow drawer to be closed after cancellation
          },
          escape: false,
          backdropclose: false,
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error) {
      console.error("Payment error:", error)
      setPaymentError("An error occurred. Please try again.")
      setPaymentLoading(false)
      setAllowDrawerClose(true) // Allow drawer to be closed on error
    }
  }, [paymentAmount, razorpayLoaded, router, user, verifyPayment])

  const handleConfirmRegistration = () => {
    openPaymentDrawer()
  }

  const handleDismissPaymentDrawer = useCallback(() => {
    if (paymentLoading) {
      return
    }

    closePaymentDrawer()
  }, [closePaymentDrawer, paymentLoading])

  const handleDownloadRegistration = async () => {
    const token = localStorage.getItem("authToken")
    const response = await fetch("/api/documents/registration", {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "registration-document.pdf"
      a.click()
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "confirmed":
        return {
          icon: CheckCircle,
          color: "text-green-400",
          bgColor: "bg-green-300/20 dark:bg-green-900/20",
          borderColor: "border-green-700/50",
          label: "Confirmed",
          description: "Registration Complete"
        }
      case "details_confirmed":
        return {
          icon: Clock,
          color: "text-orange-400",
          bgColor: "bg-orange-900/20",
          borderColor: "border-orange-700/50",
          label: "Payment Pending",
          description: "Details Confirmed"
        }
      default:
        return {
          icon: Clock,
          color: "text-red-400",
          bgColor: "bg-red-900/20",
          borderColor: "border-red-700/50",
          label: "Pending",
          description: "Action Required"
        }
    }
  }

  useEffect(() => {
    return () => {
      if (paymentCloseTimer.current) {
        clearTimeout(paymentCloseTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!showPaymentDrawer) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        handleDismissPaymentDrawer()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [showPaymentDrawer, handleDismissPaymentDrawer])

  if (!user) {
    return (
      <LoadingTransition isLoading={loading}>
        {!loading && (
          <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-6">
            <div className="text-center space-y-3">
              <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">We couldn't load your dashboard</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Please try refreshing the page or sign in again.</p>
              <Button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-700 text-white">
                Return to Login
              </Button>
            </div>
          </div>
        )}
      </LoadingTransition>
    )
  }

  const statusConfig = getStatusConfig(user.registrationStatus)
  const StatusIcon = statusConfig.icon

  return (
    <LoadingTransition isLoading={loading}>
      <>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
          onLoad={() => setRazorpayLoaded(true)}
          onError={() => setPaymentError((prev) => prev || "Failed to load payment gateway")}
        />
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <header className="w-full py-5 sm:py-6 px-4 bg-transparent backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Image
              src="/kr-logo.png"
              alt="KR Mangalam Logo"
              width={36}
              height={36}
              className="rounded-full w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0"
            />
            <Image
              src="/ideas-black.png"
              alt="IDEAS Logo"
              width={96}
              height={24}
              className="dark:hidden w-[96px] h-[24px] sm:w-[120px] sm:h-[32px]"
            />
            <Image
              src="/ideas-white.png"
              alt="IDEAS Logo"
              width={96}
              height={24}
              className="hidden dark:block w-[96px] h-[24px] sm:w-[120px] sm:h-[32px]"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                  <Image
                    src="/default-user.png"
                    alt="User Profile"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover border border-neutral-300 dark:border-neutral-600"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 max-w-[22rem] bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-base font-semibold leading-none text-neutral-900 dark:text-neutral-100">{user.name}</p>
                    <p className="text-sm leading-none text-neutral-500 dark:text-neutral-400">{user.rollNumber}</p>
                    <p className="text-sm leading-none text-neutral-500 dark:text-neutral-400">{user.courseAndSemester}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-200 dark:bg-neutral-700" />
                <DropdownMenuItem
                  onClick={simpleToggleTheme}
                  className="cursor-pointer text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-base"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="w-4 h-4 mr-2" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 mr-2" />
                      Dark Mode
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-neutral-200 dark:bg-neutral-700" />
                <DropdownMenuItem
                  onClick={() => {
                    localStorage.removeItem("authToken")
                    localStorage.removeItem("userData")
                    localStorage.removeItem("verifiedEmail")
                    router.push("/")
                  }}
                  className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-base"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Welcome Section */}
        <div className={`text-center transition-all duration-700 ${animating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <Sparkles className="w-6 h-6 text-blue-400 dark:text-blue-500 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">Welcome back,</h1>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">{user.name}</h2>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">Participant Dashboard</p>
        </div>

        {/* Top priority: Finish registration banner (appears under welcome) */}
        {user.registrationStatus === "details_confirmed" && user.paymentStatus !== "completed" && (
          <div className="max-w-6xl mx-auto px-3 sm:px-4">
            <div className="mb-4">
              <div className="rounded-lg border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-blue-900/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Your registration is pending</h3>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">Your details are confirmed — complete the payment to finish registration.</p>
                </div>
                <div className="flex-shrink-0 w-full sm:w-auto">
                  <Button onClick={handleConfirmRegistration} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                    Continue to Payment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Overview */}
        <div className={`transition-all duration-700 delay-200 ${animating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Card className="bg-white dark:bg-neutral-800/80 backdrop-blur-md border-neutral-200 dark:border-neutral-700/50 shadow-2xl">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="flex flex-wrap items-center gap-2 sm:gap-3 text-neutral-900 dark:text-neutral-100">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 dark:text-blue-500" />
                Registration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-3 sm:gap-4 w-full">
                  <div className={`p-3 sm:p-4 rounded-full ${statusConfig.bgColor} border ${statusConfig.borderColor}`}>
                    <StatusIcon className={`w-7 h-7 sm:w-8 sm:h-8 ${statusConfig.color}`} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100">{statusConfig.label}</h3>
                    <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">{statusConfig.description}</p>
                  </div>
                </div>

                <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-end gap-3 sm:gap-6">
                  <div className="text-left sm:text-right">
                    <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Roll Number</div>
                    <div className="font-bold text-neutral-900 dark:text-neutral-100 break-words">{user.rollNumber}</div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Course & Semester</div>
                    <div className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">{user.courseAndSemester}</div>
                  </div>
                  {user.registrationStatus === "confirmed" && (
                    <div className="sm:text-right">
                      <Button
                        onClick={handleDownloadRegistration}
                        size="sm"
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Download Document
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={`grid grid-cols-1 gap-5 sm:gap-6 transition-all duration-700 delay-400 ${animating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Show payment status only when payment is completed */}
          {user.paymentStatus === "completed" && (
            <Card className="bg-white/90 dark:bg-neutral-800/80 backdrop-blur-md border-green-200 dark:border-neutral-700/50 shadow-xl hover:shadow-2xl hover:shadow-green-500/10 dark:hover:shadow-green-500/10 transition-all duration-300 hover:border-green-400 dark:hover:border-green-500/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-slate-800 dark:text-neutral-100">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 dark:text-green-400" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-neutral-100">Paid</div>
                    <div className="text-sm sm:text-base text-slate-600 dark:text-neutral-400">Payment completed successfully</div>
                  </div>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700/50 shadow-sm"
                  >
                    ₹200 Paid
                  </Badge>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-500 dark:text-neutral-400">Status</div>
                      <div className="font-medium text-slate-800 dark:text-neutral-100">Completed</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 dark:text-neutral-400">Amount</div>
                      <div className="font-medium text-slate-800 dark:text-neutral-100">₹200</div>
                    </div>
                    {user.transactionId && (
                      <div className="col-span-2">
                        <div className="text-sm text-slate-500 dark:text-neutral-400">Transaction ID</div>
                        <div className="font-medium text-slate-800 dark:text-neutral-100 font-mono text-sm">{user.transactionId}</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-6 sm:pt-8 border-t border-neutral-200 dark:border-neutral-700/50">
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            In case of any queries,{" "}
            <a href="#" className="text-blue-400 dark:text-blue-500 hover:text-blue-300 dark:hover:text-blue-400 hover:underline transition-colors">
              Contact Us
            </a>
          </p>
        </div>
      </main>
    </div>

        <Drawer open={showPaymentDrawer} onOpenChange={handleDrawerOpenChange}>
          <DrawerContent className="h-[96vh] max-h-none">
            <div className="mx-auto w-full max-w-5xl h-full overflow-auto flex flex-col">
              {paymentSuccess ? (
                <>
                  <DrawerHeader>
                    <DrawerTitle className="text-center text-2xl">Payment Successful!</DrawerTitle>
                    <DrawerDescription className="text-center">
                      Your registration is confirmed. You can close this window to return to the dashboard.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 pb-0 space-y-6">
                    <div className="flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 dark:bg-green-400/20 dark:text-green-300 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                    </div>
                    {user.transactionId && (
                      <div className="bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-xl p-4 text-sm text-neutral-600 dark:text-neutral-300">
                        Transaction ID:{" "}
                        <span className="font-mono text-xs sm:text-sm text-neutral-900 dark:text-neutral-100">{user.transactionId}</span>
                      </div>
                    )}
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Back to Dashboard
                      </Button>
                    </DrawerClose>
                  </DrawerFooter>
                </>
              ) : (
                <>
                  <DrawerHeader>
                    <DrawerTitle>Complete Your Payment</DrawerTitle>
                    <DrawerDescription>
                      Secure payment for IDEAS 3.0 registration
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 pb-0 space-y-6">
                    <div className="max-w-2xl mx-auto space-y-5">
                      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-900/60 p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Amount Due</p>
                            <p className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-50">₹{paymentAmount}</p>
                            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">IDEAS 3.0 Registration Fee</p>
                          </div>
                          <Badge className="bg-green-500/10 text-green-600 dark:bg-green-400/20 dark:text-green-200 border border-green-500/30">
                            One-time Payment
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Payment Breakdown</h3>
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/50 divide-y divide-neutral-200 dark:divide-neutral-700/60 overflow-hidden">
                          <div className="flex items-center justify-between bg-white dark:bg-neutral-800/80 px-4 py-3">
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">Registration Fee</span>
                            <span className="font-medium text-neutral-900 dark:text-neutral-50">₹{paymentAmount}</span>
                          </div>
                          <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/40 px-4 py-3">
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">Taxes & Convenience</span>
                            <span className="font-medium text-neutral-900 dark:text-neutral-50">Included</span>
                          </div>
                          <div className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-900/60 px-4 py-3">
                            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Total Payable</span>
                            <span className="text-lg font-bold text-neutral-900 dark:text-neutral-50">₹{paymentAmount}</span>
                          </div>
                        </div>
                      </div>

                      {paymentError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">
                          {paymentError}
                        </div>
                      )}
                    </div>
                  </div>
                  <DrawerFooter className="pt-4">
                    <Button
                      onClick={handleInitiatePayment}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base"
                      disabled={paymentLoading || !razorpayLoaded}
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : !razorpayLoaded ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Preparing secure checkout...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay ₹{paymentAmount} Now
                        </>
                      )}
                    </Button>
                    
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/50 bg-white/80 dark:bg-neutral-900/40 p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Need Help?</h4>
                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                        If your payment doesn't reflect within a few minutes, keep your payment reference handy and contact support.
                      </p>
                    </div>

                    <p className="text-xs text-center text-neutral-500 dark:text-neutral-400 pt-2">
                      By proceeding, you agree to our terms and conditions.
                    </p>

                    <DrawerClose asChild>
                      <Button variant="outline" disabled={paymentLoading}>Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    </LoadingTransition>
  )
}
