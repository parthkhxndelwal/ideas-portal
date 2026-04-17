"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Camera, Loader2 } from "lucide-react"
import { QRScanner } from "./components/QRScanner"
import { ScannerResult } from "./components/ScannerResult"
import { QRCodeHistory } from "./components/QRCodeHistory"

interface ScannedData {
  transactionId: string
  name: string
  email: string
  rollNumber: string
  courseAndSemester: string
  scanned: boolean
  scannedAt?: string
  scannedBy?: string
}

interface HistoryItem {
  id: string
  name?: string
  email?: string
  timestamp: string
  approved: boolean
  error?: string
}

export default function ScannerPage() {
  const [cameraActive, setCameraActive] = useState(false)
  const [manualQRCode, setManualQRCode] = useState("")
  const [result, setResult] = useState<ScannedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<HistoryItem[]>([])
  const [approvalStatus, setApprovalStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [approvalMessage, setApprovalMessage] = useState("")
  const [apiKey, setApiKey] = useState("")

  const validateAndApprove = async (transactionId: string) => {
    if (!transactionId.trim()) {
      setError("QR code is empty")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // First validate the QR code by fetching registration details
      const validateResponse = await fetch(
        `/api/scanner/validate/${transactionId}`,
        {
          method: "GET",
          headers: {
            "x-api-key": apiKey || "default-key",
            "Content-Type": "application/json",
          },
        }
      )

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json()
        throw new Error(errorData.error || "Failed to validate QR code")
      }

      const validateData = await validateResponse.json()

      if (!validateData.success) {
        throw new Error(validateData.error || "Validation failed")
      }

      setResult(validateData.data)

      // Approve the scan by recording the entry
      setApprovalStatus("loading")
      const approvalResponse = await fetch("/api/scanner/record-entry", {
        method: "POST",
        headers: {
          "x-api-key": apiKey || "default-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
          name: validateData.data.name,
          rollNumber: validateData.data.rollNumber,
          qrType: "attendance",
          deviceId: "web-scanner-" + new Date().getTime(),
          deviceName: "Web Scanner",
        }),
      })

      if (!approvalResponse.ok) {
        const errorData = await approvalResponse.json()
        throw new Error(errorData.error || "Failed to approve scan")
      }

      const approvalData = await approvalResponse.json()

      if (!approvalData.success && !approvalData.alreadyScanned) {
        throw new Error(approvalData.message || "Failed to record entry")
      }

      setApprovalStatus("success")
      setApprovalMessage(
        approvalData.alreadyScanned
          ? `Already scanned at ${approvalData.scannedAt}`
          : "Approved successfully!"
      )

      // Add to history
      setScanHistory((prev) => [
        {
          id: transactionId,
          name: validateData.data.name,
          email: validateData.data.email,
          timestamp: new Date().toISOString(),
          approved: true,
        },
        ...prev,
      ])

      // Reset after 2 seconds
      setTimeout(() => {
        setApprovalStatus("idle")
        setResult(null)
        setManualQRCode("")
        setCameraActive(true)
      }, 2000)
    } catch (err) {
      setApprovalStatus("error")
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred"
      setApprovalMessage(errorMessage)
      setError(errorMessage)

      // Add failed scan to history
      setScanHistory((prev) => [
        {
          id: transactionId,
          timestamp: new Date().toISOString(),
          approved: false,
          error: errorMessage,
        },
        ...prev,
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleQRCodeDetected = (qrContent: string) => {
    setManualQRCode(qrContent)
    setCameraActive(false)
    validateAndApprove(qrContent)
  }

  const handleManualSubmit = () => {
    if (manualQRCode.trim()) {
      validateAndApprove(manualQRCode)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 p-4 dark:from-neutral-950 dark:to-neutral-900">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            QR Code Scanner
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Scan QR codes to record attendance and validate registrations
          </p>
        </div>

        {/* API Key Input */}
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Scanner API Key (Optional)
          </label>
          <Input
            type="password"
            placeholder="Enter your API key if required"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="border-neutral-300 dark:border-neutral-700"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Scanner Result */}
        {approvalStatus !== "idle" && (
          <div className="mb-6">
            <ScannerResult
              status={approvalStatus}
              message={approvalMessage}
              data={result || undefined}
            />
          </div>
        )}

        {/* Camera Section */}
        {cameraActive && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-4">
              <h2 className="flex items-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                <Camera className="mr-2 h-5 w-5" />
                Camera Scanner
              </h2>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                Allow camera access when prompted by your browser
              </p>
            </div>

            <div className="mb-4">
              <QRScanner
                onScan={handleQRCodeDetected}
                onError={(err) => {
                  setError(err.message)
                  setCameraActive(false)
                }}
              />
            </div>

            <Button
              onClick={() => setCameraActive(false)}
              variant="outline"
              className="w-full"
            >
              Stop Camera
            </Button>
          </div>
        )}

        {/* Manual Entry Section */}
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {cameraActive
                ? "Or paste QR code manually"
                : "Scan or Enter QR Code"}
            </h2>
          </div>

          <div className="flex gap-3">
            <Input
              placeholder="Enter transaction ID or paste QR code..."
              value={manualQRCode}
              onChange={(e) => setManualQRCode(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleManualSubmit()
                }
              }}
              className="border-neutral-300 dark:border-neutral-700"
            />
            <Button
              onClick={handleManualSubmit}
              disabled={loading || !manualQRCode.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>

          {!cameraActive && (
            <Button
              onClick={() => setCameraActive(true)}
              variant="outline"
              className="mt-3 w-full"
            >
              Start Camera
            </Button>
          )}
        </div>

        {/* Scan History */}
        <QRCodeHistory
          history={scanHistory}
          onClear={() => setScanHistory([])}
        />
      </div>
    </div>
  )
}
