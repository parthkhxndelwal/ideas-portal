"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Send } from "lucide-react"
import AdminLayout from "@/components/admin/AdminLayout"

export default function VolunteerQRPage() {
  const [formData, setFormData] = useState({
    rollNumber: "",
    personalEmail: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/volunteer-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess("Volunteer QR sent successfully!")
        setFormData({
          rollNumber: "",
          personalEmail: "",
        })
      } else {
        setError(result.error || "Failed to send QR")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout showBackButton title="Generate Volunteer QR">
      <Card className="bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-200">Generate Volunteer Entry QR</CardTitle>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Generate and send QR code for volunteer entry</p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rollNumber" className="text-neutral-700 dark:text-neutral-300">Roll Number</Label>
              <Input
                id="rollNumber"
                type="text"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                required
                className="bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <Label htmlFor="personalEmail" className="text-neutral-700 dark:text-neutral-300">Personal Email (Optional)</Label>
              <Input
                id="personalEmail"
                type="email"
                value={formData.personalEmail}
                onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                placeholder="Optional personal email"
                className="bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-700 p-3 rounded border dark:border-neutral-600">
              QR will be sent to: {formData.rollNumber}@krmu.edu.in
              {formData.personalEmail && ` and ${formData.personalEmail}`}
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
                className="flex-1 bg-red-600 hover:bg-red-700 text-white" 
                disabled={loading}
              >
                {loading ? "Sending..." : "Generate & Send QR"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
