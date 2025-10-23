"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScanLine, CheckCircle, XCircle, Users, Clock, AlertTriangle, Camera, CameraOff } from "lucide-react"
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode"

interface EntryInfo {
  name: string
  rollNumber: string
  courseAndSemester: string
  year: string
  qrType: "participant" | "volunteer"
  transactionId?: string
}

interface ScanResult {
  success: boolean
  alreadyEntered?: boolean
  entryInfo?: EntryInfo
  message?: string
}

export default function EntryScannerPage() {
  const [qrData, setQrData] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ScanResult | null>(null)
  const [stats, setStats] = useState({
    totalEntriesToday: 0,
    participantEntriesToday: 0,
    volunteerEntriesToday: 0,
  })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera")
  const [bypassMode, setBypassMode] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const scannerDivId = "qr-reader"

  useEffect(() => {
    // Check if admin is authenticated
    const token = localStorage.getItem("authToken")
    if (!token) {
      window.location.href = "/admin"
      return
    }
    setIsAuthenticated(true)
    
    // Load statistics and check bypass mode
    loadStatistics()
    checkBypassMode()
    
    // Refresh statistics every 30 seconds
    const interval = setInterval(loadStatistics, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Only initialize scanner if authenticated and in camera mode
    if (!isAuthenticated) return
    
    // Initialize scanner when camera mode is active
    if (scanMode === "camera" && !scannerActive) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeScanner()
      }, 100)
      return () => clearTimeout(timer)
    }

    // Cleanup scanner when switching modes or unmounting
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => {
          console.error("Error clearing scanner:", err)
        })
        scannerRef.current = null
        setScannerActive(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanMode, isAuthenticated])

  const initializeScanner = () => {
    if (scannerRef.current) {
      return // Scanner already initialized
    }

    // Check if the div exists
    const scannerDiv = document.getElementById(scannerDivId)
    if (!scannerDiv) {
      console.error("Scanner div not found")
      return
    }

    try {
      const scanner = new Html5QrcodeScanner(
        scannerDivId,
        {
          fps: 30, // Increased from 10 to 30 for faster scanning
          qrbox: { width: 300, height: 300 }, // Larger scan area for easier targeting
          aspectRatio: 1.0, // Square aspect ratio for better QR detection
          disableFlip: false, // Allow flipped scanning
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true, // Remember camera selection
          showTorchButtonIfSupported: true, // Show flashlight if available
          videoConstraints: {
            facingMode: "environment", // Use back camera by default
          },
        },
        false
      )

      scanner.render(
        (decodedText) => {
          // Success callback - QR code decoded
          setQrData(decodedText)
          handleScan(decodedText)
        },
        (errorMessage) => {
          // Error callback - can be ignored for scanning errors
          // Only log if it's not a "No QR code found" error
          if (!errorMessage.includes("NotFoundException")) {
            console.log("QR Scanner:", errorMessage)
          }
        }
      )

      scannerRef.current = scanner
      setScannerActive(true)
    } catch (err) {
      console.error("Error initializing scanner:", err)
      setError("Failed to initialize camera scanner. Please check camera permissions.")
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .clear()
        .then(() => {
          scannerRef.current = null
          setScannerActive(false)
        })
        .catch((err) => {
          console.error("Error stopping scanner:", err)
        })
    }
  }

  const switchToManualMode = () => {
    stopScanner()
    setScanMode("manual")
  }

  const switchToCameraMode = () => {
    setQrData("")
    setError("")
    setResult(null)
    setScanMode("camera")
  }

  const handleScan = async (scannedData: string) => {
    // Stop scanner temporarily while processing
    if (scannerRef.current) {
      scannerRef.current.pause(true)
    }

    await processEntry(scannedData)

    // Resume scanner after processing - reduced delay for faster scanning
    setTimeout(() => {
      if (scannerRef.current) {
        scannerRef.current.resume()
      }
    }, 1500) // Reduced from 3000ms to 1500ms for quicker next scan
  }

  const loadStatistics = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/scanner/entry-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to load statistics:", error)
    }
  }

  const checkBypassMode = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/scanner/bypass-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setBypassMode(data.bypassEnabled)
      }
    } catch (error) {
      console.error("Failed to check bypass mode:", error)
    }
  }

  const processEntry = async (scannedData: string) => {
    if (!scannedData.trim()) {
      setError("Invalid QR code data")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/scanner/entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qrData: scannedData }),
      })

      const data = await response.json()

      if (response.ok) {
        // Successful entry
        setResult(data)
        if (scanMode === "manual") {
          setQrData("") // Clear input only in manual mode
        }
        loadStatistics() // Refresh statistics
      } else {
        // Check if it's an "already entered" case
        if (data.alreadyEntered) {
          // Show the "already entered" result (not an error)
          setResult(data)
          if (scanMode === "manual") {
            setQrData("") // Clear input
          }
        } else {
          // Other errors
          setError(data.message || data.error || "Entry recording failed")
          setResult({ success: false, message: data.message || data.error })
        }
      }
    } catch (_error) {
      setError("Network error occurred")
      setResult({ success: false, message: "Network error" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await processEntry(qrData)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Entry Scanner
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Scan participant QR codes at entry
          </p>
          {bypassMode && (
            <div className="mt-4 inline-block">
              <Alert className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-800 dark:text-orange-400 font-medium">
                  ⚠️ BYPASS MODE ACTIVE - Multiple entries per day allowed
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Today</p>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                    {stats.totalEntriesToday}
                  </p>
                </div>
                <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Participants</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.participantEntriesToday}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Volunteers</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.volunteerEntriesToday}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scanner Card */}
        <Card className="bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700">
          <CardHeader>
            <CardTitle className="text-center text-neutral-800 dark:text-neutral-100 flex items-center justify-center gap-2">
              <ScanLine className="w-5 h-5" />
              QR Code Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <Button
                type="button"
                onClick={switchToCameraMode}
                className={`flex-1 ${
                  scanMode === "camera"
                    ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                    : "bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100"
                }`}
              >
                <Camera className="w-4 h-4 mr-2" />
                Camera Scan
              </Button>
              <Button
                type="button"
                onClick={switchToManualMode}
                className={`flex-1 ${
                  scanMode === "manual"
                    ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                    : "bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100"
                }`}
              >
                <CameraOff className="w-4 h-4 mr-2" />
                Manual Entry
              </Button>
            </div>

            {/* Camera Scanner */}
            {scanMode === "camera" && (
              <div className="mb-6">
                <div
                  id={scannerDivId}
                  className="rounded-lg overflow-hidden border-2 border-neutral-200 dark:border-neutral-600"
                ></div>
                {loading && (
                  <div className="text-center mt-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Processing entry...</p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Entry Form */}
            {scanMode === "manual" && (
              <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="qrData" className="text-neutral-700 dark:text-neutral-300">
                    QR Code Data
                  </Label>
                  <Input
                    id="qrData"
                    type="text"
                    value={qrData}
                    onChange={(e) => setQrData(e.target.value)}
                    placeholder="Paste QR code data here"
                    className="bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600 text-lg h-12"
                    autoFocus
                    autoComplete="off"
                  />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Paste the encrypted QR code data from an external scanner
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white h-12 text-lg"
                  disabled={loading}
                >
                  <ScanLine className="w-5 h-5 mr-2" />
                  {loading ? "Processing..." : "Record Entry"}
                </Button>
              </form>
            )}

            {/* Error and Result Display */}
            {error && (
              <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 mb-4">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="mb-4">
                {result.success && !result.alreadyEntered && (
                  <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-400">
                      <div>
                        <p className="font-semibold text-lg mb-2">✅ Entry Recorded Successfully</p>
                        {result.entryInfo && (
                          <div className="space-y-1 text-sm">
                            <p>
                              <strong>Name:</strong> {result.entryInfo.name}
                            </p>
                            <p>
                              <strong>Roll Number:</strong> {result.entryInfo.rollNumber}
                            </p>
                            <p>
                              <strong>Type:</strong>{" "}
                              {result.entryInfo.qrType === "participant" ? "Participant" : "Volunteer"}
                            </p>
                            <p>
                              <strong>Course:</strong> {result.entryInfo.courseAndSemester}
                            </p>
                            <p>
                              <strong>Year:</strong> {result.entryInfo.year}
                            </p>
                            {result.entryInfo.transactionId && (
                              <p>
                                <strong>Transaction ID:</strong> {result.entryInfo.transactionId}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {result.alreadyEntered && (
                  <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-400">
                      <div>
                        <p className="font-semibold text-lg mb-2">⚠️ Already Entered Today</p>
                        {result.entryInfo && (
                          <div className="space-y-1 text-sm">
                            <p>
                              <strong>Name:</strong> {result.entryInfo.name}
                            </p>
                            <p>
                              <strong>Roll Number:</strong> {result.entryInfo.rollNumber}
                            </p>
                            <p className="mt-2 text-yellow-700 dark:text-yellow-300">
                              This person has already entered today. QR code cannot be used again.
                            </p>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {!result.success && !result.alreadyEntered && (
                  <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-400">
                      <p className="font-semibold">❌ Entry Failed</p>
                      <p className="text-sm mt-1">{result.message || "Invalid QR code"}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-600">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                <strong>Instructions:</strong>
              </p>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                {scanMode === "camera" ? (
                  <>
                    <li>• Point the camera at the participant&apos;s QR code</li>
                    <li>• The scanner will automatically detect and process the QR code</li>
                    <li>• Wait for the confirmation message before scanning the next code</li>
                    <li>• Each QR code can only be used once per day</li>
                    <li>• Statistics update automatically after each successful scan</li>
                  </>
                ) : (
                  <>
                    <li>• Use an external QR scanner app to scan the QR code</li>
                    <li>• Copy the scanned data and paste it in the input field above</li>
                    <li>• Click &quot;Record Entry&quot; to log the entry</li>
                    <li>• Each QR code can only be used once per day</li>
                    <li>• Statistics update automatically after each scan</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/admin")}
            className="border-neutral-300 dark:border-neutral-600"
          >
            Back to Admin Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
