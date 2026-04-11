"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  CreditCard, 
  LinkIcon, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Globe,
  Building2,
  Users
} from "lucide-react"

type PaymentMode = "manual" | "razorpay"

const paymentModeOptions = [
  {
    value: "manual",
    label: "Manual / External",
    description: "Users get a Reference ID and pay at an external portal",
    icon: LinkIcon,
  },
  {
    value: "razorpay",
    label: "Razorpay (Online)",
    description: "Users pay directly via Razorpay gateway",
    icon: CreditCard,
  },
] as const

export default function ConfigurePaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentConfig, setCurrentConfig] = useState<{
    paymentAmount: number
    paymentMode: PaymentMode
    externalPaymentUrl: string
    krMangalamPaymentUrl: string
    nonKrMangalamPaymentUrl: string
    referenceIdPrefix: string
    subEventSelectionMandatory: boolean
  } | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [fetchingConfig, setFetchingConfig] = useState(true)
  
  // Form state
  const [step, setStep] = useState<1 | 2>(1)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("manual")
  const [amount, setAmount] = useState<string>("")
  const [referenceIdPrefix, setReferenceIdPrefix] = useState<string>("EVT-")
  const [externalPaymentUrl, setExternalPaymentUrl] = useState<string>("")
  const [krMangalamPaymentUrl, setKrMangalamPaymentUrl] = useState<string>("")
  const [nonKrMangalamPaymentUrl, setNonKrMangalamPaymentUrl] = useState<string>("")
  const [subEventSelectionMandatory, setSubEventSelectionMandatory] = useState<boolean>(false)
  const [showUrlHelp, setShowUrlHelp] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/payment/amount")
        if (response.ok) {
          const data = await response.json()
          const config = {
            paymentAmount: data.paymentAmount || 200,
            paymentMode: data.paymentMode || "manual",
            externalPaymentUrl: data.externalPaymentUrl || "",
            krMangalamPaymentUrl: data.krMangalamPaymentUrl || "",
            nonKrMangalamPaymentUrl: data.nonKrMangalamPaymentUrl || "",
            referenceIdPrefix: data.referenceIdPrefix || "EVT-",
            subEventSelectionMandatory: data.subEventSelectionMandatory ?? false,
          }
          setCurrentConfig(config)
          
          // Set form state from config
          setPaymentMode(config.paymentMode)
          setAmount(config.paymentAmount.toString())
          setReferenceIdPrefix(config.referenceIdPrefix)
          setExternalPaymentUrl(config.externalPaymentUrl)
          setKrMangalamPaymentUrl(config.krMangalamPaymentUrl)
          setNonKrMangalamPaymentUrl(config.nonKrMangalamPaymentUrl)
          setSubEventSelectionMandatory(config.subEventSelectionMandatory)
        }
      } catch (error) {
        console.error("Error fetching config:", error)
        setMessage({ type: "error", text: "Failed to fetch payment configuration" })
      } finally {
        setFetchingConfig(false)
      }
    }

    fetchConfig()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        router.push("/")
        return
      }

      const paymentAmount = paymentMode === "razorpay" ? parseFloat(amount) : 0

      if (paymentMode === "razorpay" && (isNaN(paymentAmount) || paymentAmount <= 0)) {
        setMessage({ type: "error", text: "Please enter a valid payment amount" })
        setLoading(false)
        return
      }

      const response = await fetch("/api/payment/amount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          paymentAmount,
          paymentMode,
          externalPaymentUrl: externalPaymentUrl.trim(),
          krMangalamPaymentUrl: krMangalamPaymentUrl.trim(),
          nonKrMangalamPaymentUrl: nonKrMangalamPaymentUrl.trim(),
          referenceIdPrefix: referenceIdPrefix.trim(),
          subEventSelectionMandatory,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentConfig({
          paymentAmount,
          paymentMode,
          externalPaymentUrl,
          krMangalamPaymentUrl,
          nonKrMangalamPaymentUrl,
          referenceIdPrefix,
          subEventSelectionMandatory,
        })
        setMessage({ type: "success", text: "Payment configuration saved successfully!" })
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save configuration" })
      }
    } catch (error) {
      console.error("Error saving configuration:", error)
      setMessage({ type: "error", text: "An error occurred while saving" })
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentModeChange = (mode: PaymentMode) => {
    setPaymentMode(mode)
    setStep(2)
  }

  const canProceed = () => {
    if (step === 1) return true
    if (paymentMode === "razorpay") {
      return amount && parseFloat(amount) > 0
    }
    // For manual mode, at least one URL is recommended but not required
    return true
  }

  if (fetchingConfig) {
    return (
      <AdminLayout title="Configure Payment">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Configure Payment">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            step === 1 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
          }`}>
            {step === 1 ? (
              <Settings className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">1. Mode</span>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            step === 2 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
          }`}>
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">2. Settings</span>
          </div>
        </div>

        {message && (
          <Alert className={message.type === "success" ? "bg-green-50 dark:bg-green-900/20 border-green-200" : "bg-red-50 dark:bg-red-900/20 border-red-200"}>
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === "success" ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {step === 1 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Select Payment Mode
              </CardTitle>
              <CardDescription>
                Choose how participants will make payments for event registration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentModeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePaymentModeChange(option.value as PaymentMode)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    paymentMode === option.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600"
                  }`}
                >
                  <div className={`p-3 rounded-full ${
                    paymentMode === option.value
                      ? "bg-blue-100 dark:bg-blue-800"
                      : "bg-neutral-100 dark:bg-neutral-800"
                  }`}>
                    <option.icon className={`w-5 h-5 ${
                      paymentMode === option.value
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{option.label}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{option.description}</p>
                  </div>
                  {paymentMode === option.value && (
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-auto" />
                  )}
                </button>
              ))}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Continue to Settings
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {paymentMode === "manual" ? (
                  <LinkIcon className="w-5 h-5 text-amber-600" />
                ) : (
                  <CreditCard className="w-5 h-5 text-blue-600" />
                )}
                {paymentMode === "manual" ? "Manual Payment Settings" : "Razorpay Settings"}
              </CardTitle>
              <CardDescription>
                {paymentMode === "manual" 
                  ? "Configure external payment URLs for manual payments"
                  : "Configure Razorpay payment amount"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Mode Badge */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-neutral-500"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  paymentMode === "manual"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}>
                  {paymentMode === "manual" ? "Manual / External" : "Razorpay (Online)"}
                </span>
              </div>

              <Separator />

              {/* Razorpay Amount */}
              {paymentMode === "razorpay" && (
                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="200"
                      className="pl-7 text-lg"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">
                    Amount in Indian Rupees that participants will pay via Razorpay
                  </p>
                </div>
              )}

              {/* Manual Payment Settings */}
              {paymentMode === "manual" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="prefix">Reference ID Prefix</Label>
                    <Input
                      id="prefix"
                      type="text"
                      value={referenceIdPrefix}
                      onChange={(e) => setReferenceIdPrefix(e.target.value)}
                      placeholder="EVT-"
                      disabled={loading}
                    />
                    <p className="text-xs text-neutral-500">
                      Prefix for generated reference IDs (e.g., "EVT-" produces "EVT-ABC123")
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Payment URLs</Label>
                        <p className="text-xs text-neutral-500">
                          Configure where different user types will redirect to pay
                        </p>
                      </div>
                      <Dialog open={showUrlHelp} onOpenChange={setShowUrlHelp}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Help
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Payment URL Configuration</DialogTitle>
                            <DialogDescription>
                              Configure different payment URLs for different user types. At least one URL should be configured for manual payments to work.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 text-sm">
                            <div className="flex items-start gap-3 p-3 rounded-lg bgneutral-50 dark:bg-neutral-800">
                              <Globe className="w-5 h-5 text-neutral-500 mt-0.5" />
                              <div>
                                <p className="font-medium">Default URL (Fallback)</p>
                                <p className="text-neutral-500 text-xs">Used when specific URLs are not set</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bgneutral-50 dark:bg-neutral-800">
                              <Building2 className="w-5 h-5 text-blue-500 mt-0.5" />
                              <div>
                                <p className="font-medium">KR Mangalam URL</p>
                                <p className="text-neutral-500 text-xs">For students from KR Mangalam University</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bgneutral-50 dark:bg-neutral-800">
                              <Users className="w-5 h-5 text-amber-500 mt-0.5" />
                              <div>
                                <p className="font-medium">Non-KR Mangalam URL</p>
                                <p className="text-neutral-500 text-xs">For external students (not from KR Mangalam)</p>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="paymentUrl" className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Default URL
                        </Label>
                        <Input
                          id="paymentUrl"
                          type="url"
                          value={externalPaymentUrl}
                          onChange={(e) => setExternalPaymentUrl(e.target.value)}
                          placeholder="https://payment.example.com/pay"
                          disabled={loading}
                        />
                        <p className="text-xs text-neutral-500">Fallback URL for all users</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="krPaymentUrl" className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          KR Mangalam URL
                        </Label>
                        <Input
                          id="krPaymentUrl"
                          type="url"
                          value={krMangalamPaymentUrl}
                          onChange={(e) => setKrMangalamPaymentUrl(e.target.value)}
                          placeholder="https://kr-payment.example.com/pay"
                          disabled={loading}
                        />
                        <p className="text-xs text-neutral-500">For KR Mangalam University students</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nonKrPaymentUrl" className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Non-KR Mangalam URL
                        </Label>
                        <Input
                          id="nonKrPaymentUrl"
                          type="url"
                          value={nonKrMangalamPaymentUrl}
                          onChange={(e) => setNonKrMangalamPaymentUrl(e.target.value)}
                          placeholder="https://external-payment.example.com/pay"
                          disabled={loading}
                        />
                        <p className="text-xs text-neutral-500">For external students outside KR Mangalam</p>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                      In manual mode, amount is set on the external payment portal. Users will be redirected to the configured URL after generating their Reference ID.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <Separator />

              {/* Subevent Setting */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Subevent Selection Mandatory</Label>
                  <p className="text-xs text-neutral-500">
                    Users must select a subevent before proceeding to payment
                  </p>
                </div>
                <Switch
                  checked={subEventSelectionMandatory}
                  onCheckedChange={setSubEventSelectionMandatory}
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Mode
              </Button>
              <Button onClick={handleSave} disabled={loading || !canProceed()}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                <p className="font-medium mb-1">Current Configuration</p>
                {currentConfig && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      currentConfig.paymentMode === "manual"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {currentConfig.paymentMode === "manual" ? "Manual / External" : "Razorpay"}
                    </span>
                    {currentConfig.paymentMode === "razorpay" && (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        ₹{currentConfig.paymentAmount}
                      </span>
                    )}
                    {currentConfig.subEventSelectionMandatory && (
                      <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        Subevent Required
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}