"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { UserPlus, Eye, EyeOff, Upload, Download } from "lucide-react"
import AdminLayout from "@/components/admin/AdminLayout"
import { toast } from "@/components/ui/use-toast"

export default function ManualRegistrationPage() {
  const [formData, setFormData] = useState({
    rollNumber: "",
    email: "",
    password: "",
    name: "",
    course: "",
    semester: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState("")
  const [bulkSuccess, setBulkSuccess] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/manual-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          courseAndSemester: `${formData.course} ${formData.semester}`,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        const baseMessage = result.message || "Student registered and email sent!"
        const transactionMessage = result.transactionId ? ` Transaction ID: ${result.transactionId}.` : ""
        const displayMessage = `${baseMessage}${transactionMessage}`

        setSuccess(displayMessage)
        setFormData({
          rollNumber: "",
          email: "",
          password: "",
          name: "",
          course: "",
          semester: "",
        })
        toast({
          title: "Registration complete",
          description: displayMessage,
        })
      } else {
        setError(result.error || "Registration failed")
      }
    } catch (error) {
      console.error("Manual registration failed", error)
      setError("An error occurred. Please try again.")
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
      "Name,Roll Number,Email,Password,Course,Semester",
      "John Doe,2023IT001,john@example.com,Temp@123,B.Tech CSE,5",
      "Jane Smith,2023IT002,jane@example.com,Temp@456,B.Tech CSE,5",
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
      {/* 🎯 Page Title */}
      <h1 className="text-3xl font-bold text-center mb-8 text-neutral-900 dark:text-neutral-100">Manual Student Registration</h1>

      <Card className="bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg border border-neutral-200/50 dark:border-neutral-700/50 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Register Student
          </CardTitle>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Register a student manually by entering their details. Payment is recorded automatically and the participant receives their credentials, QR code, and entry document.</p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name and Roll Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-neutral-700 dark:text-neutral-300 mb-2 block">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600"
                  required
                />
              </div>
              <div>
                <Label htmlFor="rollNumber" className="text-neutral-700 dark:text-neutral-300 mb-2 block">Roll Number</Label>
                <Input
                  id="rollNumber"
                  type="text"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-neutral-700 dark:text-neutral-300 mb-2 block">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600"
                required
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-neutral-700 dark:text-neutral-300 mb-2 block">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Course and Semester */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course" className="text-neutral-700 dark:text-neutral-300 mb-2 block">Course</Label>
                <Input
                  id="course"
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600"
                  required
                />
              </div>
              <div>
                <Label htmlFor="semester" className="text-neutral-700 dark:text-neutral-300 mb-2 block">Semester</Label>
                <Input
                  id="semester"
                  type="text"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600"
                  required
                />
              </div>
            </div>

            {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">{error}</div>}

            {success && <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">{success}</div>}

            <div className="flex gap-4">
              <Button 
                type="button" 
                onClick={() => router.push("/admin")} 
                variant="outline" 
                className="flex-1 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-blue-100 border border-blue-400 hover:bg-blue-200 dark:bg-blue-950 dark:border-blue-900 dark:hover:bg-blue-700 text-blue-900 dark:text-blue-100 cursor-pointer" 
                disabled={loading}
              >
                {loading ? "Registering..." : "Register & Send Email"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg border border-neutral-200/50 dark:border-neutral-700/50 max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Upload Students
          </CardTitle>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Upload a CSV file to register multiple students. Use the sample template (Name, Roll Number, Email, Password, Course, Semester). Each entry is validated, payment recorded automatically, and email sent individually.</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleBulkUpload}
            ref={fileInputRef}
            disabled={bulkLoading}
            className="border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2"
          />
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 w-fit"
            onClick={handleDownloadSample}
          >
            <Download className="w-4 h-4" /> Download Sample CSV
          </Button>

          {bulkLoading && <p className="text-sm text-neutral-600 dark:text-neutral-300">Processing upload...</p>}
          {bulkError && <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">{bulkError}</div>}
          {bulkSuccess && <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">{bulkSuccess}</div>}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
