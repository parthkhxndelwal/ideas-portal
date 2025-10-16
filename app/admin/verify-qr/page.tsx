"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScanLine, CheckCircle, XCircle } from "lucide-react"
import AdminLayout from "@/components/admin/AdminLayout"

interface VolunteerInfo {
  name: string
  rollNumber: string
  courseAndSemester: string
  year: string
}

interface VerificationResult {
  valid: boolean
  volunteerInfo?: VolunteerInfo
  qrType?: "volunteer" | "participant" | "unknown"
  transactionId?: string | null
}

export default function VerifyQRPage() {
  const [qrData, setQrData] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<VerificationResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/verify-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qrData }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "QR verification failed")
        setResult({ valid: false })
      }
    } catch (_error) {
      setError("Network error occurred")
      setResult({ valid: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout title="Verify QR Code" showBackButton>
      {/* 🎯 Page Title */}
      <h1 className="text-3xl font-bold text-center mb-8 text-neutral-900 dark:text-neutral-100">Verify QR Code</h1>

      <Card className="bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-neutral-800 dark:text-neutral-100 flex items-center justify-center gap-2">
            <ScanLine className="w-5 h-5" />
            QR Code Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="qrData" className="text-neutral-700 dark:text-neutral-300">QR Code Data</Label>
              <Input
                id="qrData"
                type="text"
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="Paste or scan QR code data here"
                className="bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600"
                required
              />
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Paste the encrypted QR code data or use a QR scanner app to get the data
              </p>
            </div>

            {error && (
              <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className={`border-${result.valid ? 'green' : 'red'}-200 dark:border-${result.valid ? 'green' : 'red'}-800 bg-${result.valid ? 'green' : 'red'}-50 dark:bg-${result.valid ? 'green' : 'red'}-900/20`}>
                {result.valid ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <AlertDescription className={`text-${result.valid ? 'green' : 'red'}-800 dark:text-${result.valid ? 'green' : 'red'}-400`}>
                  {result.valid ? (
                    <div>
                      <p className="font-semibold">
                        ✅ Valid {result.qrType === "participant" ? "Participant" : "Volunteer"} QR Code
                      </p>
                      {result.volunteerInfo && (
                        <div className="mt-2 space-y-1">
                          <p><strong>Name:</strong> {result.volunteerInfo.name}</p>
                          <p><strong>Roll Number:</strong> {result.volunteerInfo.rollNumber}</p>
                          <p><strong>Course:</strong> {result.volunteerInfo.courseAndSemester}</p>
                          <p><strong>Year:</strong> {result.volunteerInfo.year}</p>
                          {result.qrType === "participant" && result.transactionId && (
                            <p><strong>Transaction ID:</strong> {result.transactionId}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="font-semibold">❌ Invalid QR Code</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600" 
              disabled={loading}
            >
              <ScanLine className="w-4 h-4 mr-2" />
              {loading ? "Verifying..." : "Verify QR Code"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-600">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              <strong>Instructions:</strong>
            </p>
            <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
              <li>• Use any QR scanner app to scan the volunteer&apos;s QR code</li>
              <li>• Copy the scanned data and paste it in the field above</li>
              <li>• Click &quot;Verify QR Code&quot; to validate the volunteer</li>
              <li>• Only valid encrypted QR codes will show volunteer details</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}