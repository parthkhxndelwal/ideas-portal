"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Ban, Trash2, Users, CheckCircle, XCircle } from "lucide-react"
import AdminLayout from "@/components/admin/AdminLayout"

interface BlacklistedStudent {
  _id: string
  rollNumber: string
  name: string
  courseAndSemester: string
  year: string
  blacklistedAt: string
}

export default function BlacklistManagementPage() {
  // Add to blacklist states
  const [rollNumbers, setRollNumbers] = useState("")
  const [bulkResults, setBulkResults] = useState<{rollNumber: string, success: boolean, message: string}[]>([])
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState("")
  const [addSuccess, setAddSuccess] = useState("")

  // View blacklist states
  const [blacklistedStudents, setBlacklistedStudents] = useState<BlacklistedStudent[]>([])
  const [viewLoading, setViewLoading] = useState(true)
  const [viewError, setViewError] = useState("")

  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (token) {
      fetchBlacklist()
    }
  }, [])

  // Add to blacklist functions
  const handleAddToBlacklist = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError("")
    setAddSuccess("")
    setBulkResults([])

    if (!rollNumbers.trim()) {
      setAddError("Please enter roll number(s)")
      return
    }

    setAddLoading(true)

    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        router.push("/admin")
        return
      }

      // Parse roll numbers (comma-separated)
      const rollNumberList = rollNumbers.split(",").map(r => r.trim()).filter(r => r.length > 0)

      if (rollNumberList.length === 0) {
        setAddError("Please enter valid roll number(s)")
        return
      }

      if (rollNumberList.length === 1) {
        // Single roll number - fetch details first, then blacklist
        try {
          // First, get student details
          const detailsResponse = await fetch("/api/admin/get-student-details", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ rollNumber: rollNumberList[0] }),
          })

          const detailsResult = await detailsResponse.json()

          if (!detailsResponse.ok) {
            setAddError(detailsResult.error || "Student not found")
            return
          }

          // Now blacklist with both roll number and student details
          const response = await fetch("/api/admin/blacklist", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              rollNumber: rollNumberList[0],
              studentDetails: detailsResult.details
            }),
          })

          const result = await response.json()

          if (response.ok) {
            setAddSuccess(`Student ${rollNumberList[0]} has been added to blacklist`)
            setRollNumbers("")
            fetchBlacklist() // Refresh the list
          } else {
            setAddError(result.error || "Failed to add student to blacklist")
          }
        } catch (_error) {
          setAddError("An error occurred while processing the request")
        }
      } else {
        // Bulk addition
        const results: {rollNumber: string, success: boolean, message: string}[] = []

        for (const rollNumber of rollNumberList) {
          try {
            // First get student details
            const detailsResponse = await fetch("/api/admin/get-student-details", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ rollNumber }),
            })

            const detailsResult = await detailsResponse.json()

            if (!detailsResponse.ok) {
              results.push({ rollNumber, success: false, message: detailsResult.error || "Student not found" })
              continue
            }

            // Now blacklist with details
            const response = await fetch("/api/admin/blacklist", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                rollNumber,
                studentDetails: detailsResult.details
              }),
            })

            const result = await response.json()

            if (response.ok) {
              results.push({ rollNumber, success: true, message: "Added successfully" })
            } else {
              results.push({ rollNumber, success: false, message: result.error || "Failed to add" })
            }
          } catch (_error) {
            results.push({ rollNumber, success: false, message: "Network error" })
          }
        }

        setBulkResults(results)
        const successCount = results.filter(r => r.success).length
        setAddSuccess(`Bulk operation completed: ${successCount}/${rollNumberList.length} students added successfully`)
        setRollNumbers("")
        fetchBlacklist() // Refresh the list
      }
    } catch (_error) {
      setAddError("An error occurred while processing the request")
    } finally {
      setAddLoading(false)
    }
  }

  // View blacklist functions
  const fetchBlacklist = async () => {
    setViewLoading(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/view-blacklist", {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()

      if (response.ok) {
        setBlacklistedStudents(result.blacklist)
        setViewError("")
      } else {
        setViewError(result.error || "Failed to fetch blacklist")
      }
    } catch (_error) {
      setViewError("An error occurred. Please try again.")
    } finally {
      setViewLoading(false)
    }
  }

  const handleRemoveFromBlacklist = async (rollNumber: string) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/remove-blacklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rollNumber }),
      })

      if (response.ok) {
        setBlacklistedStudents((prev) => prev.filter((student) => student.rollNumber !== rollNumber))
        setViewError("")
      } else {
        setViewError("Failed to remove from blacklist")
      }
    } catch (_error) {
      setViewError("An error occurred. Please try again.")
    }
  }

  return (
    <AdminLayout title="Blacklist Management" showBackButton>
      <h1 className="text-3xl font-bold text-center mb-8 text-neutral-900 dark:text-neutral-100">
        Blacklist Management
      </h1>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Add to Blacklist Section */}
        <Card className="bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Add Students to Blacklist
            </CardTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Enter roll number(s) to add students to the blacklist. Use commas to separate multiple roll numbers for bulk addition.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleAddToBlacklist} className="space-y-4">
              <div>
                <Label htmlFor="rollNumbers" className="text-neutral-700 dark:text-neutral-300">
                  Roll Number(s) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rollNumbers"
                  type="text"
                  value={rollNumbers}
                  onChange={(e) => setRollNumbers(e.target.value)}
                  className="bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600"
                  placeholder="Enter roll number(s) separated by commas (e.g., 123456, 789012, 345678)"
                  required
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  For single student: enter one roll number. For bulk: separate with commas.
                </p>
              </div>

              {addError && (
                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                  {addError}
                </div>
              )}

              {addSuccess && (
                <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                  {addSuccess}
                </div>
              )}

              {/* Bulk Results */}
              {bulkResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-neutral-800 dark:text-neutral-200">Bulk Operation Results:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {bulkResults.map((result, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className="font-medium">{result.rollNumber}:</span>
                        <span className={result.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                          {result.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={() => router.push("/admin")}
                  variant="outline"
                  className="flex-1 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                >
                  Back to Dashboard
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white"
                  disabled={addLoading}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  {addLoading ? "Processing..." : "Add to Blacklist"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* View Blacklist Section */}
        <Card className="bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Current Blacklist ({blacklistedStudents.length})
            </CardTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Students currently on the blacklist cannot register for IDEAS 3.0
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {viewError && (
              <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 mb-4">
                {viewError}
              </div>
            )}

            {viewLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                <p className="text-neutral-600 dark:text-neutral-400 mt-2">Loading blacklist...</p>
              </div>
            ) : blacklistedStudents.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No students are currently blacklisted</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blacklistedStudents.map((student) => (
                  <div
                    key={student._id}
                    className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {student.name}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Roll Number: {student.rollNumber}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {student.courseAndSemester} - {student.year}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                        Blacklisted on: {new Date(student.blacklistedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemoveFromBlacklist(student.rollNumber)}
                      variant="destructive"
                      size="sm"
                      className="ml-4 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
