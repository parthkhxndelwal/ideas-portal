"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UserCog, CheckCircle, XCircle, Info, Loader2 } from "lucide-react"
import AdminLayout from "@/components/admin/AdminLayout"
import { toast } from "@/components/ui/use-toast"

interface StudentObject {
  transaction: {
    id: number | string
    amount: number
    time: string
    currency: string
    payment: {
      mode: string
      bankName: string
      gateway: string
    }
  }
  personalDetails: {
    name: string
    fatherMotherName: string
    contactNumber: number | string
    emailID: string
    rollNoEnrollmentNo: string
    activityParticipationDate: string
  }
  event: {
    name: string
    activityParticipationDate: string
  }
  mailStatus: {
    sent: boolean
    timestamp: string
    senderEmail: string
    receiverEmail: string
  }
}

interface RegistrationResult {
  email: string
  rollNumber: string
  success?: boolean
  error?: string
}

export default function SilentBulkRegistrationPage() {
  const [jsonInput, setJsonInput] = useState("")
  const [fileName, setFileName] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RegistrationResult[]>([])
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    setResults([])

    try {
      // Parse the JSON input
      let students: StudentObject[]
      try {
        const parsed = JSON.parse(jsonInput)
        // Check if it's an array or single object
        students = Array.isArray(parsed) ? parsed : [parsed]
      } catch (parseError) {
        setError("Invalid JSON format. Please check your input.")
        setLoading(false)
        return
      }

      // Validate that we have at least one student
      if (students.length === 0) {
        setError("No student data found in the input.")
        setLoading(false)
        return
      }

      // Send to API
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/silent-bulk-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ students }),
      })

      const result = await response.json()

      if (response.ok) {
        setResults(result.results || [])
        const successCount = result.results.filter((r: RegistrationResult) => r.success).length
        const failedCount = result.results.length - successCount
        
        toast({
          title: "Silent bulk registration complete",
          description: `Success: ${successCount}, Failed: ${failedCount}`,
        })
      } else {
        setError(result.error || "Silent bulk registration failed")
        toast({
          title: "Registration failed",
          description: result.error || "An error occurred",
          variant: "destructive",
        })
      }
    } catch (submitError) {
      console.error("Silent bulk registration error:", submitError)
      setError("An error occurred. Please try again.")
      toast({
        title: "Error",
        description: "An error occurred during registration",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const sampleJson = `[
  {
    "transaction": {
      "id": 20251031210500000191098048282394187,
      "amount": 300,
      "time": "2025-11-01 02:49:53",
      "currency": "INR",
      "payment": {
        "mode": "UPI",
        "bankName": "",
        "gateway": "Paytm"
      }
    },
    "personalDetails": {
      "name": "Ashish",
      "fatherMotherName": "Rammanohar maurya",
      "contactNumber": 6394567674,
      "emailID": "ashishmaurya8234@gmail.com",
      "rollNoEnrollmentNo": "Krmu2526109",
      "activityParticipationDate": "07/11/2025"
    },
    "event": {
      "name": "Exhibition Walk",
      "activityParticipationDate": "07/11/2025"
    },
    "mailStatus": {
      "sent": true,
      "timestamp": "2025-11-03T12:41:32.476019",
      "senderEmail": "krmuevents@krmangalam.edu.in",
      "receiverEmail": "ashishmaurya8234@gmail.com"
    }
  }
]`

  const handleLoadSample = () => {
    setJsonInput(sampleJson)
    setFileName("")
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.json')) {
      setError("Please upload a valid JSON file")
      toast({
        title: "Invalid file type",
        description: "Please upload a .json file",
        variant: "destructive",
      })
      return
    }

    setFileName(file.name)
    setError("")

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        // Validate JSON before setting
        JSON.parse(content)
        setJsonInput(content)
        toast({
          title: "File loaded",
          description: `Successfully loaded ${file.name}`,
        })
      } catch (parseError) {
        setError("Invalid JSON file format")
        setFileName("")
        toast({
          title: "Invalid JSON",
          description: "The uploaded file contains invalid JSON",
          variant: "destructive",
        })
      }
    }
    reader.onerror = () => {
      setError("Failed to read file")
      setFileName("")
      toast({
        title: "File read error",
        description: "Failed to read the uploaded file",
        variant: "destructive",
      })
    }
    reader.readAsText(file)
  }

  const handleClearFile = () => {
    setJsonInput("")
    setFileName("")
    setError("")
    setResults([])
    // Reset file input
    const fileInput = document.getElementById("jsonFile") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  return (
    <AdminLayout title="Silent Bulk Registration" showBackButton>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Silent Bulk Registration</h1>
        <p className="text-muted-foreground mt-2">
          Register multiple students without sending any emails
        </p>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Student Data Input
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload a JSON file containing student objects. Students will be registered silently without any email notifications.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jsonFile">Upload JSON File</Label>
              <Input
                id="jsonFile"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={loading}
              />
              {fileName && (
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Loaded: {fileName}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a .json file containing an array of student objects
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadSample}
                className="flex-1"
              >
                Load Sample Data
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFile}
                disabled={!jsonInput && !fileName}
                className="flex-1"
              >
                Clear
              </Button>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Important Notes</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                <li>No emails will be sent to registered students</li>
                <li>Students will be created with status "confirmed" and payment "completed"</li>
                <li>Transaction IDs must be unique</li>
                <li>Roll numbers will be validated for university students</li>
                <li>Default password will be: participant#[email username]</li>
              </ul>
            </AlertDescription>
          </Alert>

          {jsonInput && (
            <div className="space-y-2">
              <Label>Data Preview</Label>
              <div className="bg-muted p-4 rounded-md max-h-[300px] overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                  {(() => {
                    try {
                      const parsed = JSON.parse(jsonInput)
                      const students = Array.isArray(parsed) ? parsed : [parsed]
                      const preview = students.slice(0, 10)
                      const remaining = students.length - preview.length
                      
                      return JSON.stringify(preview, null, 2) + 
                        (remaining > 0 ? `\n\n... and ${remaining} more student${remaining > 1 ? 's' : ''}` : '')
                    } catch {
                      return 'Invalid JSON'
                    }
                  })()}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing preview of first {(() => {
                  try {
                    const parsed = JSON.parse(jsonInput)
                    const students = Array.isArray(parsed) ? parsed : [parsed]
                    return Math.min(10, students.length)
                  } catch {
                    return 0
                  }
                })()} of {(() => {
                  try {
                    const parsed = JSON.parse(jsonInput)
                    const students = Array.isArray(parsed) ? parsed : [parsed]
                    return students.length
                  } catch {
                    return 0
                  }
                })()} student{(() => {
                  try {
                    const parsed = JSON.parse(jsonInput)
                    const students = Array.isArray(parsed) ? parsed : [parsed]
                    return students.length !== 1 ? 's' : ''
                  } catch {
                    return 's'
                  }
                })()}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              onClick={() => router.push("/admin")}
              variant="outline"
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading || !jsonInput.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Register ${jsonInput ? (() => {
                  try {
                    const parsed = JSON.parse(jsonInput)
                    const count = Array.isArray(parsed) ? parsed.length : 1
                    return `${count} Student${count > 1 ? 's' : ''}`
                  } catch {
                    return 'Students'
                  }
                })() : 'Students'} Silently`
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-lg">Registration Results</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {results.map((result, index) => (
                  <Alert
                    key={index}
                    variant={result.success ? "default" : "destructive"}
                  >
                    {result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {result.rollNumber} - {result.email}
                    </AlertTitle>
                    <AlertDescription>
                      {result.success
                        ? "Successfully registered"
                        : result.error || "Registration failed"}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                Total: {results.length} | Success:{" "}
                {results.filter((r) => r.success).length} | Failed:{" "}
                {results.filter((r) => !r.success).length}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
