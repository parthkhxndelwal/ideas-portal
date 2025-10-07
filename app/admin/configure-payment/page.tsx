"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DollarSign, Loader2, CheckCircle, AlertCircle } from "lucide-react"

export default function ConfigurePaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentAmount, setCurrentAmount] = useState<number>(200)
  const [newAmount, setNewAmount] = useState<string>("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [fetchingAmount, setFetchingAmount] = useState(true)

  // Fetch current payment amount on component mount
  useEffect(() => {
    const fetchCurrentAmount = async () => {
      try {
        const response = await fetch("/api/payment/amount")
        if (response.ok) {
          const data = await response.json()
          setCurrentAmount(data.paymentAmount)
          setNewAmount(data.paymentAmount.toString())
        }
      } catch (error) {
        console.error("Error fetching current amount:", error)
        setMessage({ type: "error", text: "Failed to fetch current payment amount" })
      } finally {
        setFetchingAmount(false)
      }
    }

    fetchCurrentAmount()
  }, [])

  const handleUpdateAmount = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        router.push("/")
        return
      }

      const amount = parseFloat(newAmount)

      // Validation
      if (isNaN(amount) || amount < 0) {
        setMessage({ type: "error", text: "Please enter a valid positive number" })
        setLoading(false)
        return
      }

      const response = await fetch("/api/payment/amount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentAmount: amount }),
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentAmount(amount)
        setMessage({ type: "success", text: "Payment amount updated successfully!" })
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update payment amount" })
      }
    } catch (error) {
      console.error("Error updating payment amount:", error)
      setMessage({ type: "error", text: "An error occurred while updating the payment amount" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout title="Configure Payment">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-neutral-900 dark:text-neutral-100">
          Configure Payment Amount
        </h1>

        <Card className="border border-neutral-200/50 dark:border-neutral-700/50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              Registration Fee Configuration
            </CardTitle>
            <CardDescription>
              Set the registration fee amount that participants will pay during event registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Amount Display */}
            {fetchingAmount ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">Current Registration Fee</p>
                  <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">₹{currentAmount}</p>
                </div>

                {/* Update Form */}
                <form onSubmit={handleUpdateAmount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-neutral-900 dark:text-neutral-100">
                      New Payment Amount (₹)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="1"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="Enter amount in rupees"
                      className="text-lg"
                      disabled={loading}
                      required
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Enter the amount in Indian Rupees (e.g., 200 for ₹200)
                    </p>
                  </div>

                  {/* Message Display */}
                  {message && (
                    <Alert
                      className={
                        message.type === "success"
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                      }
                    >
                      {message.type === "success" ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                      <AlertDescription
                        className={
                          message.type === "success"
                            ? "text-green-800 dark:text-green-300"
                            : "text-red-800 dark:text-red-300"
                        }
                      >
                        {message.text}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Update Amount
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/admin")}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>

                {/* Info Box */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-300">
                      <p className="font-medium mb-1">Important Notes:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>This amount will apply to all new registrations immediately</li>
                        <li>Existing pending payments will retain their original amount</li>
                        <li>Make sure to inform participants before changing the fee</li>
                        <li>Changes are logged with your admin email for audit purposes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card className="mt-6 border border-neutral-200/50 dark:border-neutral-700/50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg">Payment Configuration Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <p>Set amount to <strong>0</strong> to make the event free</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <p>Common amounts: ₹100, ₹200, ₹250, ₹500</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <p>Razorpay charges 2% + GST on transactions</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <p>Minimum recommended amount: ₹1 (for testing)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
