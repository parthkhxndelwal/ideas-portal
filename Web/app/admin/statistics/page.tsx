"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Users, CheckCircle, Clock, DollarSign, TrendingUp } from "lucide-react"
import AdminLayout from "@/components/admin/AdminLayout"

interface Statistics {
  totalRegistrations: number
  confirmedRegistrations: number
  pendingRegistrations: number
  completedPayments: number
  totalRevenue: number
  courseBreakdown: Array<{ _id: string; count: number }>
  registrationTrends: Array<{ _id: string; count: number }>
}

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchStatistics = async (token: string) => {
      try {
        const response = await fetch("/api/admin/statistics", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setStatistics(data.statistics)
        } else {
          router.push("/admin")
        }
      } catch (error) {
        console.error("Error fetching statistics:", error)
        router.push("/admin")
      }
    }

    const token = localStorage.getItem("authToken")
    if (token) {
      fetchStatistics(token)
    }
  }, [router])

  const handleDownload = async (type: "registrations" | "payments") => {
    setDownloading(type)
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`/api/admin/export-${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${type}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error(`Error downloading ${type}:`, error)
    } finally {
      setDownloading(null)
    }
  }

  if (!statistics) {
    return (
      <AdminLayout title="Registration Statistics" showBackButton loading>
        <div>Loading statistics...</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Registration Statistics" showBackButton>
      {/* 🎯 Page Title */}
      <h1 className="text-3xl font-bold text-center mb-8 text-neutral-900 dark:text-neutral-200">Registration Statistics</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-lg border border-neutral-200/50 dark:border-neutral-700/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-md bg-blue-100/80 dark:bg-blue-900/80 backdrop-blur-sm">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-500">Total Registrations</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{statistics.totalRegistrations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-lg border border-neutral-200/50 dark:border-neutral-700/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-md bg-green-100/80 dark:bg-green-900/80 backdrop-blur-sm">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-500">Confirmed</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{statistics.confirmedRegistrations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-lg border border-neutral-200/50 dark:border-neutral-700/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-md bg-orange-100/80 dark:bg-orange-900/80 backdrop-blur-sm">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-500">Pending</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{statistics.pendingRegistrations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-lg border border-neutral-200/50 dark:border-neutral-700/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-md bg-green-100/80 dark:bg-green-900/80 backdrop-blur-sm">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-500">Total Revenue</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">₹{statistics.totalRevenue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Breakdown */}
      <Card className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-lg border border-neutral-200/50 dark:border-neutral-700/50 mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-neutral-900 dark:text-neutral-200">
            <TrendingUp className="w-5 h-5" />
            Course-wise Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statistics.courseBreakdown.map((course, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-neutral-50/80 dark:bg-neutral-800/90 backdrop-blur-sm rounded-md">
                <span className="font-medium text-neutral-900 dark:text-neutral-200">{course._id || "Not specified"}</span>
                <span className="bg-blue-100/80 dark:bg-blue-900/80 backdrop-blur-sm text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-bold">
                  {course.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-lg border border-neutral-200/50 dark:border-neutral-700/50 mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-neutral-900 dark:text-neutral-200">
            <Download className="w-5 h-5" />
            Data Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleDownload("registrations")}
              disabled={downloading === "registrations"}
              className="bg-blue-100 border border-blue-400 hover:bg-blue-200 dark:bg-blue-950 dark:border-blue-900 dark:hover:bg-blue-700 text-blue-900 dark:text-blue-100 cursor-pointer"
            >
              {downloading === "registrations" ? "Downloading..." : "Download Registration Data"}
            </Button>
            <Button
              onClick={() => handleDownload("payments")}
              disabled={downloading === "payments"}
              className="bg-green-100 border border-green-400 hover:bg-green-200 dark:bg-green-950 dark:border-green-900 dark:hover:bg-green-700 text-green-900 dark:text-green-100 cursor-pointer"
            >
              {downloading === "payments" ? "Downloading..." : "Download Payment Data"}
            </Button>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-500 mt-4">
            Downloads will be in CSV format and include all relevant data for analysis.
          </p>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
