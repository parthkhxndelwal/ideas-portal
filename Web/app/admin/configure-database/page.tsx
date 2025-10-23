"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import AdminLayout from "@/components/admin/AdminLayout"
import { Database } from "lucide-react"

type StudentRecord = {
  name: string
  rollnumber: string
  courseAndSemester: string
  year: string
}

export default function ConfigureDatabasePage() {
  const [jsonData, setJsonData] = useState("")
  const [parsedData, setParsedData] = useState<StudentRecord[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const validateData = (data: unknown): StudentRecord[] => {
    if (!Array.isArray(data)) {
      throw new Error("Data must be an array of student records")
    }

    return data.map((item, index) => {
      if (typeof item !== "object" || item === null) {
        throw new Error(`Item at index ${index} must be an object`)
      }

      const record = item as Partial<StudentRecord>
      const requiredFields: (keyof StudentRecord)[] = [
        "name",
        "rollnumber",
        "courseAndSemester",
        "year",
      ]

      for (const field of requiredFields) {
        const value = record[field]
        if (typeof value !== "string" || !value.trim()) {
          throw new Error(`Item at index ${index} is missing a valid "${field}" field`)
        }
      }

      return {
        name: record.name!.trim(),
        rollnumber: record.rollnumber!.trim(),
        courseAndSemester: record.courseAndSemester!.trim(),
        year: record.year!.trim(),
      }
    })
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError("")
    setSuccess("")
    setFileLoading(true)

    try {
      if (!file.name.toLowerCase().endsWith(".json")) {
        throw new Error("Please upload a valid .json file")
      }

      const text = await file.text()
      const validatedData = validateData(JSON.parse(text))

      setParsedData(validatedData)
      setFileName(file.name)
      setJsonData("")
      setSuccess(`Loaded ${validatedData.length} records from ${file.name}. Ready to upload.`)
    } catch (err) {
      setParsedData(null)
      setFileName("")
      setError(err instanceof Error ? err.message : "Failed to parse the uploaded file")
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setFileLoading(false)
    }
  }

  const handleClearFile = () => {
    setParsedData(null)
    setFileName("")
    setSuccess("")
    setError("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (!parsedData && !jsonData.trim()) {
        throw new Error("Please upload a JSON file or paste the student data")
      }

      const dataToUpload = parsedData ?? validateData(JSON.parse(jsonData))

      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/configure-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: dataToUpload }),
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(`Database updated successfully! Processed ${dataToUpload.length} records.`)
        setJsonData("")
        setParsedData(null)
        setFileName("")
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } else {
        setError(result.error || "Failed to update database")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid JSON format or missing required fields")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout title="Configure Roll Number Database" showBackButton>
      {/* 🎯 Page Title */}
      <h1 className="text-3xl font-bold text-center mb-8 text-neutral-900 dark:text-neutral-100">Configure Roll Number Database</h1>

      <Card className="bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Configure Roll Number Database
          </CardTitle>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Upload a <code>.json</code> file or paste the JSON array of student records to update the database.
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jsonFile" className="text-neutral-700 dark:text-neutral-300">
                Upload JSON File (optional)
              </Label>
              <input
                id="jsonFile"
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || fileLoading}
                  className="flex-1 sm:flex-none"
                >
                  {fileLoading ? "Processing..." : "Select JSON File"}
                </Button>
                {fileName && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearFile}
                    disabled={loading || fileLoading}
                    className="flex-1 sm:flex-none text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Remove File
                  </Button>
                )}
              </div>
              {fileName && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  File loaded: <span className="font-medium text-neutral-900 dark:text-neutral-100">{fileName}</span>
                  {parsedData && ` • ${parsedData.length} records ready`}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="jsonData" className="text-neutral-700 dark:text-neutral-300">Student Data (JSON Array)</Label>
              <Textarea
                id="jsonData"
                value={jsonData}
                onChange={(e) => {
                  setJsonData(e.target.value)
                  if (parsedData) {
                    setParsedData(null)
                    setFileName("")
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }
                  setError("")
                  setSuccess("")
                }}
                placeholder={`[
  {
    "name": "John Doe",
    "rollnumber": "2301350013",
    "courseAndSemester": "B.Tech CSE (FSD) - V",
    "year": "3rd Year"
  },
  ...
]`}
                rows={15}
                className="font-mono text-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600"
              />
            </div>

            {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">{error}</div>}

            {success && <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">{success}</div>}

            <div className="flex gap-4">
              <Button 
                type="button" 
                onClick={() => router.push("/admin")} 
                variant="outline" 
                className="flex-1 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                disabled={loading || fileLoading}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600" 
                disabled={loading || fileLoading}
              >
                {loading ? "Updating..." : "Update Database"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
