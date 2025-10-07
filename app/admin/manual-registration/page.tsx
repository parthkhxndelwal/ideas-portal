"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { UserPlus, Eye, EyeOff } from "lucide-react"
import AdminLayout from "@/components/admin/AdminLayout"

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
        setSuccess("Student registered successfully!")
        setFormData({
          rollNumber: "",
          email: "",
          password: "",
          name: "",
          course: "",
          semester: "",
        })
      } else {
        setError(result.error || "Registration failed")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
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
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Register a student manually by entering their details</p>
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
                {loading ? "Registering..." : "Register Student"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
