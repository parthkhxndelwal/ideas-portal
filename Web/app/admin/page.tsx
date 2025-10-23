"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import AdminLayout from "@/components/admin/AdminLayout"
import {
  BarChart3,
  Database,
  UserPlus,
  QrCode,
  ScanLine,
  Ban,
  DollarSign,
  LogIn,
} from "lucide-react"

export default function AdminPage() {
  const router = useRouter()

  // 🔧 Actions with icons
  const adminActions = [
    {
      title: "Entry Scanner",
      description: "Scan QR codes at entry point and record participant entries",
      icon: LogIn,
      action: () => router.push("/scanner/iks-ybpm"),
      highlight: true,
    },
    {
      title: "View Statistics & Export Data",
      description: "View registration statistics and download data exports",
      icon: BarChart3,
      action: () => router.push("/admin/statistics"),
    },
    {
      title: "Configure Payment Amount",
      description: "Set the registration fee amount for participants",
      icon: DollarSign,
      action: () => router.push("/admin/configure-payment"),
    },
    {
      title: "Configure Roll Number Database",
      description: "Update the roll number database with student information",
      icon: Database,
      action: () => router.push("/admin/configure-database"),
    },
    {
      title: "Register a Student (Manually)",
      description: "Manually register a student by entering their details",
      icon: UserPlus,
      action: () => router.push("/admin/manual-registration"),
    },
    {
      title: "Generate a Volunteer Entry QR",
      description: "Generate QR code for volunteer entry",
      icon: QrCode,
      action: () => router.push("/admin/volunteer-qr"),
    },
    {
      title: "Verify QR Code",
      description: "Scan and verify volunteer QR codes",
      icon: ScanLine,
      action: () => router.push("/admin/verify-qr"),
    },
    {
      title: "Blacklist Management",
      description: "Add or remove roll numbers from the blacklist",
      icon: Ban,
      action: () => router.push("/admin/blacklist"),
    },
  ]

  return (
    <AdminLayout title="Main Dashboard">
      {/* 🎯 Page Title */}
      <h1 className="text-3xl font-bold text-center mb-8 text-neutral-900 dark:text-neutral-100">Admin Dashboard</h1>

      {/* 🗂️ Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {adminActions.map(({ title, description, icon: Icon, action, highlight }, i) => (
          <Card
            key={i}
            onClick={action}
            className={`cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 border ${
              highlight 
                ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-600" 
                : "border-neutral-200/50 dark:border-neutral-700/50 bg-white/80 dark:bg-neutral-900/80 hover:bg-white/90 dark:hover:bg-neutral-900/90 hover:border-neutral-300/60 dark:hover:border-neutral-600/60"
            } backdrop-blur-md group`}
          >
            <CardContent className="flex items-start gap-4 p-5">
              {/* Icon */}
              <div className={`p-3 rounded-md transition-all duration-300 group-hover:scale-110 ${
                highlight
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                  : "bg-transparent text-neutral-700 dark:text-neutral-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400"
              }`}>
                <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              </div>
              {/* Content */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  )
}
