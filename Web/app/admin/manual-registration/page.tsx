"use client"

import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { UserPlus, Upload, Download, CheckCircle, XCircle, Info } from "lucide-react"
import AdminLayout from "@/components/admin/AdminLayout"
import { toast } from "@/components/ui/use-toast"

export default function ManualRegistrationPage() {
  const [subEvents, setSubEvents] = useState<Array<{id: string, name: string, maxParticipants?: number, participantCount?: number}>>([])
  const [loading, setLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState("")
  const [bulkSuccess, setBulkSuccess] = useState("")
  const [registrationSuccess, setRegistrationSuccess] = useState("")
  const [registrationError, setRegistrationError] = useState("")
  const [rollNumberValidating, setRollNumberValidating] = useState(false)
  const [rollNumberError, setRollNumberError] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      rollNumber: "",
      email: "",
      name: "",
      course: "",
      semester: "",
      transactionId: "",
      isFromUniversity: true,
      selectedSubEvent: "",
      paymentMethod: "Paytm",
      customPaymentMethod: "",
    },
    mode: "onChange"
  })

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = form
  const isFromUniversity = watch("isFromUniversity")
  const paymentMethod = watch("paymentMethod")

  useEffect(() => {
    // Register selectedSubEvent validation
    register("selectedSubEvent", { 
      required: "Please select a subevent",
      validate: (value) => {
        if (!value || value === "") {
          return "Please select a subevent"
        }
        return true
      }
    })
  }, [register])

  useEffect(() => {
    loadSubEvents()
  }, [])

  // Validate roll number when it changes and university checkbox is ticked
  useEffect(() => {
    const rollNumber = watch("rollNumber")
    if (rollNumber && isFromUniversity) {
      const timeoutId = setTimeout(() => {
        validateRollNumber(rollNumber, isFromUniversity)
      }, 500) // Debounce validation

      return () => clearTimeout(timeoutId)
    } else {
      setRollNumberError("")
    }
  }, [watch("rollNumber"), isFromUniversity])

  const loadSubEvents = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/subevents", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setSubEvents(data)
      }
    } catch (error) {
      console.error("Error loading subevents:", error)
    }
  }

  const validateRollNumber = async (rollNumber: string, isFromUniversity: boolean) => {
    if (!rollNumber || !isFromUniversity) {
      setRollNumberError("")
      return
    }

    setRollNumberValidating(true)
    setRollNumberError("")

    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`/api/admin/validate-roll-number?rollNumber=${encodeURIComponent(rollNumber)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.exists) {
          setRollNumberError("Roll number not found in KR Mangalam University database")
        } else {
          setRollNumberError("")
        }
      } else {
        setRollNumberError("Unable to validate roll number")
      }
    } catch (error) {
      console.error("Error validating roll number:", error)
      setRollNumberError("Unable to validate roll number")
    } finally {
      setRollNumberValidating(false)
    }
  }

  const onSubmit = async (data: any) => {
    setLoading(true)
    setRegistrationSuccess("")
    setRegistrationError("")

    // Check roll number validation for university students
    if (data.isFromUniversity && rollNumberError) {
      setRegistrationError("Please fix the roll number validation error before submitting")
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem("authToken")
      
      // Generate default password: participant#emailBefore@
      const emailUsername = data.email.split('@')[0]
      const defaultPassword = `participant#${emailUsername}`
      
      const response = await fetch("/api/admin/manual-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          password: defaultPassword,
          courseAndSemester: `${data.course} ${data.semester}`,
          paymentMethod: data.paymentMethod === "Custom" ? data.customPaymentMethod : data.paymentMethod,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        const baseMessage = result.message || "Student registered and email sent!"
        const transactionMessage = result.transactionId ? ` Transaction ID: ${result.transactionId}.` : ""
        const displayMessage = `${baseMessage}${transactionMessage}`

        setRegistrationSuccess(displayMessage)
        toast({
          title: "Registration complete",
          description: displayMessage,
        })
        reset()
      } else {
        const errorMessage = result.error || "Registration failed"
        setRegistrationError(errorMessage)
        toast({
          title: "Registration failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Manual registration failed", error)
      const errorMessage = "An error occurred. Please try again."
      setRegistrationError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBulkLoading(true)
    setBulkError("")
    setBulkSuccess("")

    try {
      const token = localStorage.getItem("authToken")
      const uploadData = new FormData()
      uploadData.append("file", file)

      const response = await fetch("/api/admin/manual-registration?bulk=1", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
      })

      const result = await response.json()
      if (response.ok) {
        setBulkSuccess(result.message || "Bulk registration completed")
        toast({ title: "Bulk upload complete", description: result.message })
      } else {
        setBulkError(result.error || "Bulk registration failed")
      }
    } catch (uploadError) {
      console.error("Bulk upload failed", uploadError)
      setBulkError("Bulk upload failed. Please try again.")
    } finally {
      setBulkLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDownloadSample = () => {
    const sampleCsv = [
      "Name,Roll Number,Email,Course,Semester,Transaction ID,Is From University,Selected Sub Event,Payment Method",
      "John Doe,2023IT001,john@example.com,B.Tech CSE,5,TXN001,true,subevent_123,Paytm",
      "Jane Smith,2023IT002,jane@example.com,B.Tech CSE,5,TXN002,true,subevent_456,Cash",
      "External User,EXT001,external@example.com,,,TXN003,false,subevent_789,Paytm",
    ].join("\n")

    const blob = new Blob([sampleCsv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const tempLink = document.createElement("a")
    tempLink.href = url
    tempLink.download = "manual-registration-sample.csv"
    document.body.appendChild(tempLink)
    tempLink.click()
    document.body.removeChild(tempLink)
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout title="Manual Student Registration" showBackButton>
      {/* Page Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Manual Student Registration</h1>
        <p className="text-muted-foreground mt-2">
          Register individual students with automatic email delivery and QR code generation
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Register Student
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Fill in the participant details below. Password will be auto-generated and credentials sent via email.
          </p>
        </CardHeader>
        <CardContent>
          {registrationSuccess && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Registration Successful</AlertTitle>
              <AlertDescription>{registrationSuccess}</AlertDescription>
            </Alert>
          )}

          {registrationError && (
            <Alert variant="destructive" className="mb-6">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Registration Failed</AlertTitle>
              <AlertDescription>{registrationError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* University Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFromUniversity"
                checked={isFromUniversity}
                onCheckedChange={(checked) => setValue("isFromUniversity", !!checked)}
              />
              <Label htmlFor="isFromUniversity" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                From KR Mangalam University
              </Label>
            </div>

            {/* Name and Roll Number */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  {...register("name", { required: "Name is required" })}
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rollNumber">Roll Number</Label>
                <div className="relative">
                  <Input
                    id="rollNumber"
                    {...register("rollNumber", { required: "Roll number is required" })}
                    placeholder="e.g., 2023IT001"
                    className={rollNumberError ? "border-red-500" : ""}
                  />
                  {rollNumberValidating && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    </div>
                  )}
                </div>
                {errors.rollNumber && (
                  <p className="text-sm text-destructive">{errors.rollNumber.message}</p>
                )}
                {rollNumberError && (
                  <p className="text-sm text-destructive">{rollNumberError}</p>
                )}
                {isFromUniversity && !rollNumberError && watch("rollNumber") && !rollNumberValidating && (
                  <p className="text-sm text-green-600">✓ Roll number validated</p>
                )}
              </div>
            </div>

            {/* Transaction ID */}
            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID</Label>
              <Input
                id="transactionId"
                {...register("transactionId", { required: "Transaction ID is required" })}
                placeholder="Enter unique transaction ID"
              />
              {errors.transactionId && (
                <p className="text-sm text-destructive">{errors.transactionId.message}</p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={watch("paymentMethod")} 
                onValueChange={(value) => {
                  setValue("paymentMethod", value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paytm">Paytm</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Payment Method - Conditional */}
            {paymentMethod === "Custom" && (
              <div className="space-y-2">
                <Label htmlFor="customPaymentMethod">Custom Payment Method</Label>
                <Input
                  id="customPaymentMethod"
                  {...register("customPaymentMethod", { 
                    required: paymentMethod === "Custom" ? "Custom payment method is required" : false 
                  })}
                  placeholder="e.g., Cash, Card, Bank Transfer"
                />
                {errors.customPaymentMethod && (
                  <p className="text-sm text-destructive">{errors.customPaymentMethod.message}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email", { 
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address"
                  }
                })}
                placeholder="participant@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Password will be auto-generated as: participant#[email username]
              </p>
            </div>

            {/* Course and Semester - Conditional for non-university */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course">
                  Course {isFromUniversity ? "" : "(Optional)"}
                </Label>
                <Input
                  id="course"
                  {...register("course", { 
                    required: isFromUniversity ? "Course is required for university students" : false 
                  })}
                  placeholder="e.g., B.Tech CSE"
                />
                {errors.course && (
                  <p className="text-sm text-destructive">{errors.course.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">
                  Semester {isFromUniversity ? "" : "(Optional)"}
                </Label>
                <Input
                  id="semester"
                  {...register("semester", { 
                    required: isFromUniversity ? "Semester is required for university students" : false 
                  })}
                  placeholder="e.g., 5"
                />
                {errors.semester && (
                  <p className="text-sm text-destructive">{errors.semester.message}</p>
                )}
              </div>
            </div>

            {/* Subevent Selection - REQUIRED */}
            <div className="space-y-2">
              <Label htmlFor="selectedSubEvent">Subevent</Label>
              <Select 
                value={watch("selectedSubEvent")} 
                onValueChange={(value) => {
                  setValue("selectedSubEvent", value, { shouldValidate: true })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subevent" />
                </SelectTrigger>
                <SelectContent>
                  {subEvents.map((subEvent) => {
                    const isAtCapacity = subEvent.maxParticipants && subEvent.participantCount !== undefined && subEvent.participantCount >= subEvent.maxParticipants
                    
                    return (
                      <SelectItem 
                        key={subEvent.id} 
                        value={subEvent.id}
                        disabled={!!isAtCapacity}
                      >
                        {subEvent.name} 
                        {subEvent.maxParticipants 
                          ? ` (${subEvent.participantCount || 0}/${subEvent.maxParticipants})` 
                          : " (Unlimited)"
                        }
                        {isAtCapacity ? " - FULL" : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {errors.selectedSubEvent && (
                <p className="text-sm text-destructive">{errors.selectedSubEvent.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                All participants must select a subevent. Full subevents are disabled.
              </p>
            </div>

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
                type="submit" 
                className="flex-1" 
                disabled={loading || (isFromUniversity && (rollNumberValidating || !!rollNumberError))}
              >
                {loading ? "Registering..." : "Register & Send Email"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 my-8 max-w-2xl mx-auto">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground font-medium">OR</span>
        <Separator className="flex-1" />
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Upload Students
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file to register multiple students at once. Each registration will be validated and processed individually.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-file">CSV File</Label>
            <Input
              id="bulk-file"
              type="file"
              accept=".csv"
              onChange={handleBulkUpload}
              ref={fileInputRef}
              disabled={bulkLoading}
            />
            <p className="text-sm text-muted-foreground">
              File should contain: Name, Roll Number, Email, Course, Semester, Transaction ID, Is From University, Selected Sub Event, Payment Method
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 w-fit"
            onClick={handleDownloadSample}
          >
            <Download className="w-4 h-4" /> Download Sample CSV
          </Button>

          {bulkLoading && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Processing...</AlertTitle>
              <AlertDescription>Processing bulk upload...</AlertDescription>
            </Alert>
          )}

          {bulkError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Upload Failed</AlertTitle>
              <AlertDescription>{bulkError}</AlertDescription>
            </Alert>
          )}

          {bulkSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Upload Complete</AlertTitle>
              <AlertDescription>{bulkSuccess}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
