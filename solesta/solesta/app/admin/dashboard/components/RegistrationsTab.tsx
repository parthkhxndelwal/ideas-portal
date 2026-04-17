"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Trash2, Send, RotateCcw } from "lucide-react"
import { useTheme } from "@/app/admin/context/ThemeContext"

interface Registration {
  id: string
  referenceId: string
  name: string
  email: string
  rollNumber: string | null
  course: string
  year: string
  feePaid: boolean
  qrSentEmail: boolean
  createdAt: string
  updatedAt: string
}

interface Student {
  rollNumber: string | null
  name: string
  courseAndSemester: string
  year: string
  email: string | null
}

interface FormData {
  rollNumber: string
  name: string
  email: string
  course: string
  year: string
  college: string
  studentType: "krmu" | "external"
}

export function RegistrationsTab() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMarkPaidConfirm, setShowMarkPaidConfirm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [counts, setCounts] = useState({ all: 0, paid: 0, unpaid: 0 })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
  })

  const [formData, setFormData] = useState<FormData>({
    rollNumber: "",
    name: "",
    email: "",
    course: "",
    year: "",
    college: "",
    studentType: "krmu",
  })

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (value: string) => {
    setPaymentFilter(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  useEffect(() => {
    fetchRegistrations()
  }, [searchQuery, paymentFilter, pagination.page])

  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append("q", searchQuery)
      if (paymentFilter !== "all") params.append("payment", paymentFilter)
      params.append("limit", pagination.limit.toString())
      params.append(
        "skip",
        ((pagination.page - 1) * pagination.limit).toString()
      )

      const response = await fetch(
        `/api/admin/registrations?${params.toString()}`
      )
      const data = await response.json()

      if (data.success) {
        setRegistrations(data.data)
        if (data.counts) {
          setCounts(data.counts)
        }
        if (data.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: data.pagination.total,
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching registrations:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const startItem = (pagination.page - 1) * pagination.limit + 1
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }))
    }
  }

  // Check if roll number is valid (10 digits starting with 2)
  const isValidRollNumber = /^[2]\d{9}$/.test(formData.rollNumber.trim())

  // Check if email is valid
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return `${diffSec}s ago`
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`
    return `${diffDay}d ago`
  }

  const handleLookupStudent = async (rollNumber: string) => {
    if (!rollNumber.trim()) {
      setFormData({ ...formData, name: "", course: "", year: "" })
      return
    }

    try {
      setLookupLoading(true)
      const response = await fetch(
        `/api/admin/students?q=${encodeURIComponent(rollNumber)}&limit=1`
      )
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        const student = data.data[0]
        setFormData({
          ...formData,
          name: student.name,
          course: student.courseAndSemester,
          year: student.year,
        })
      }
    } catch (error) {
      console.error("Error looking up student:", error)
    } finally {
      setLookupLoading(false)
    }
  }

  const handleCreate = async () => {
    if (formData.studentType === "krmu") {
      if (!formData.name || !formData.email || !formData.rollNumber) {
        alert("Please fill in all required fields (Roll Number, Name, Email)")
        return
      }
    } else {
      if (!formData.name || !formData.email || !formData.college) {
        alert("Please fill in all required fields (Name, Email, College)")
        return
      }
    }

    try {
      setCreating(true)
      const response = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          rollNumber: formData.studentType === "krmu" ? formData.rollNumber : undefined,
          college: formData.studentType === "external" ? formData.college : undefined,
          course: formData.course,
          year: formData.year,
          isKrmu: formData.studentType === "krmu",
          paymentMode: "verified", // Mark as paid immediately
        }),
      })
      const data = await response.json()

      if (data.success) {
        if (data.emailSent) {
          alert(
            `Registration created successfully! Ticket email sent to ${formData.email}`
          )
        } else {
          alert("Registration created successfully! (Email could not be sent)")
        }
        setFormData({
          rollNumber: "",
          name: "",
          email: "",
          course: "",
          year: "",
          college: "",
          studentType: "krmu",
        })
        setShowCreateDialog(false)
        fetchRegistrations()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert("Failed to create registration")
    } finally {
      setCreating(false)
    }
  }

  const handleSendTicket = async (id: string) => {
    try {
      const response = await fetch(
        `/api/admin/registrations/${id}/send-ticket`,
        {
          method: "POST",
        }
      )
      const data = await response.json()

      if (data.success) {
        alert("Ticket sent successfully!")
        fetchRegistrations()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert("Failed to send ticket")
    }
  }

  const handleMarkPaid = async () => {
    if (!selectedId) return

    try {
      const response = await fetch(
        `/api/admin/registrations/${selectedId}/mark-paid`,
        {
          method: "POST",
        }
      )
      const data = await response.json()

      if (data.success) {
        alert("Marked as paid!")
        fetchRegistrations()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert("Failed to mark as paid")
    } finally {
      setSelectedId(null)
      setShowMarkPaidConfirm(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return

    try {
      const response = await fetch(`/api/admin/registrations/${selectedId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (data.success) {
        alert("Deleted successfully!")
        fetchRegistrations()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert("Failed to delete registration")
    } finally {
      setSelectedId(null)
      setShowDeleteConfirm(false)
    }
  }

  const confirmMarkPaid = (id: string) => {
    setSelectedId(id)
    setShowMarkPaidConfirm(true)
  }

  const confirmDelete = (id: string) => {
    setSelectedId(id)
    setShowDeleteConfirm(true)
  }

  // Check if search query looks like a roll number (10 digits starting with 2)
  const isRollNumber = /^[2]\d{9}$/.test(searchQuery.trim())

  const handleQuickCreate = () => {
    if (!isRollNumber) return
    setFormData({
      rollNumber: searchQuery.trim(),
      name: "",
      email: "",
      course: "",
      year: "",
      college: "",
      studentType: "krmu",
    })
    setShowCreateDialog(true)
  }

  return (
    <div className="space-y-4">
      {/* Header Section - Responsive */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Input
            placeholder="Search by name, email, roll number, or reference ID..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleSearchChange(e.target.value)
            }
            className="h-10 w-full border-neutral-300 bg-white pr-24 text-slate-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
          {isRollNumber && (
            <Button
              onClick={handleQuickCreate}
              size="sm"
              className="absolute top-1 right-1 h-8 bg-neutral-700 text-xs font-medium text-neutral-100 transition-transform hover:bg-neutral-800 active:scale-98 dark:bg-neutral-300 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Quick Create
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs value={paymentFilter} onValueChange={handleFilterChange}>
          <TabsList className="h-10 flex-shrink-0 bg-neutral-100 dark:bg-neutral-800">
            <TabsTrigger
              value="all"
              className="h-10 px-3 text-xs data-[state=active]:bg-neutral-700 data-[state=active]:text-neutral-100 sm:px-4 sm:text-sm dark:data-[state=active]:bg-neutral-300 dark:data-[state=active]:text-neutral-900"
            >
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger
              value="paid"
              className="h-10 px-3 text-xs data-[state=active]:bg-neutral-700 data-[state=active]:text-neutral-100 sm:px-4 sm:text-sm dark:data-[state=active]:bg-neutral-300 dark:data-[state=active]:text-neutral-900"
            >
              Paid ({counts.paid})
            </TabsTrigger>
            <TabsTrigger
              value="unpaid"
              className="h-10 px-3 text-xs data-[state=active]:bg-neutral-700 data-[state=active]:text-neutral-100 sm:px-4 sm:text-sm dark:data-[state=active]:bg-neutral-300 dark:data-[state=active]:text-neutral-900"
            >
              Unpaid ({counts.unpaid})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Create Button */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="h-10 bg-neutral-700 px-4 font-medium text-neutral-100 hover:bg-neutral-800 sm:px-5 dark:bg-neutral-300 dark:text-neutral-900 dark:hover:bg-neutral-200">
              <Plus className="mr-1 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Registration</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-neutral-200 bg-white text-slate-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
            <DialogHeader>
              <DialogTitle className="text-neutral-900 dark:text-neutral-100">
                Create New Registration
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Student Type Selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Student Type *
                </label>
                <div className="flex gap-3">
                  <Button
                    onClick={() =>
                      setFormData({ ...formData, studentType: "krmu" })
                    }
                    variant={
                      formData.studentType === "krmu" ? "default" : "outline"
                    }
                    className={`flex-1 ${
                      formData.studentType === "krmu"
                        ? "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900"
                        : ""
                    }`}
                  >
                    KRMU Student
                  </Button>
                  <Button
                    onClick={() =>
                      setFormData({ ...formData, studentType: "external" })
                    }
                    variant={
                      formData.studentType === "external" ? "default" : "outline"
                    }
                    className={`flex-1 ${
                      formData.studentType === "external"
                        ? "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900"
                        : ""
                    }`}
                  >
                    External Student
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Roll Number - Only for KRMU */}
                {formData.studentType === "krmu" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Roll Number *
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="e.g., 2301350013"
                        value={formData.rollNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setFormData({
                            ...formData,
                            rollNumber: e.target.value,
                          })
                        }}
                        onBlur={() =>
                          handleLookupStudent(formData.rollNumber)
                        }
                        className="h-10 border-neutral-300 bg-white text-slate-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      />
                      {lookupLoading && (
                        <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-500 dark:text-neutral-400" />
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Name *
                  </label>
                  <Input
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="h-10 border-neutral-300 bg-white text-slate-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Email *
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder={
                      formData.studentType === "krmu"
                        ? "student@krmu.edu.in"
                        : "student@university.edu"
                    }
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="h-10 border-neutral-300 bg-white pr-24 text-slate-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  {formData.studentType === "krmu" &&
                    isValidRollNumber && (
                      <Button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            email: `${formData.rollNumber}@krmu.edu.in`,
                          })
                        }}
                        size="sm"
                        className="absolute top-1 right-1 h-8 bg-neutral-700 text-xs font-medium text-neutral-100 transition-transform hover:bg-neutral-800 active:scale-98 dark:bg-neutral-300 dark:text-neutral-900 dark:hover:bg-neutral-200"
                      >
                        College Email
                      </Button>
                    )}
                </div>
              </div>

              {/* College - Only for External */}
              {formData.studentType === "external" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    College/University *
                  </label>
                  <Input
                    placeholder="e.g., Delhi University"
                    value={formData.college}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, college: e.target.value })
                    }
                    className="h-10 border-neutral-300 bg-white text-slate-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Course
                  </label>
                  <Input
                    placeholder="e.g., B.Tech CSE"
                    value={formData.course}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, course: e.target.value })
                    }
                    className="border-neutral-300 bg-white text-slate-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Year
                  </label>
                  <Input
                    placeholder="e.g., 2025"
                    value={formData.year}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    className="border-neutral-300 bg-white text-slate-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                Registration will be marked as PAID immediately upon creation.
                Fee: ₹
                {formData.studentType === "krmu" ? "500 (KRMU Student)" : "700 (External Student)"}
              </p>

              <Button
                onClick={handleCreate}
                disabled={
                  creating ||
                  !formData.name ||
                  !isValidEmail ||
                  (formData.studentType === "krmu"
                    ? !formData.rollNumber
                    : !formData.college)
                }
                className="w-full bg-neutral-800 text-neutral-100 hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Registration
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-xl border border-neutral-300 sm:block dark:border-neutral-700">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <TableHead className="text-neutral-700 dark:text-neutral-300">
                Reference ID
              </TableHead>
              <TableHead className="text-neutral-700 dark:text-neutral-300">
                Name
              </TableHead>
              <TableHead className="text-neutral-700 dark:text-neutral-300">
                Roll Number
              </TableHead>
              <TableHead className="text-neutral-700 dark:text-neutral-300">
                Email
              </TableHead>
              <TableHead className="text-neutral-700 dark:text-neutral-300">
                Payment
              </TableHead>
              <TableHead className="text-neutral-700 dark:text-neutral-300">
                QR Status
              </TableHead>
              <TableHead className="text-neutral-700 dark:text-neutral-300">
                Actions
              </TableHead>
              <TableHead className="text-neutral-700 dark:text-neutral-300">
                Time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-b border-neutral-300 dark:border-neutral-800">
                <TableCell colSpan={8} className="py-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" />
                </TableCell>
              </TableRow>
            ) : registrations.length === 0 ? (
              <TableRow className="border-b border-neutral-300 dark:border-neutral-800">
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-neutral-500 dark:text-neutral-400"
                >
                  No registrations found
                </TableCell>
              </TableRow>
            ) : (
              registrations.map((reg) => (
                <TableRow
                  key={reg.id}
                  className="border-b border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50"
                >
                  <TableCell className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
                    {reg.referenceId}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">
                    {reg.name}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">
                    {reg.rollNumber || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                    {reg.email}
                  </TableCell>
                  <TableCell>
                    {reg.feePaid ? (
                      <Badge className="bg-green-600 text-white hover:bg-green-600 dark:bg-green-700">
                        Paid
                      </Badge>
                    ) : (
                      <Badge className="bg-red-600 text-white hover:bg-red-600 dark:bg-red-700">
                        Unpaid
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {reg.qrSentEmail ? (
                      <Badge
                        variant="secondary"
                        className="border border-blue-700 bg-blue-600 text-white dark:bg-blue-900/50 dark:text-blue-300"
                      >
                        Sent
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-slate-600 text-neutral-500 dark:text-neutral-400"
                      >
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {!reg.feePaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => confirmMarkPaid(reg.id)}
                          className="border-neutral-400 text-xs text-neutral-700 hover:bg-neutral-200 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        >
                          Mark Paid
                        </Button>
                      )}
                      {reg.feePaid && !reg.qrSentEmail && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSendTicket(reg.id)}
                          className="bg-neutral-700 text-xs hover:bg-neutral-800 dark:bg-neutral-300"
                        >
                          <Send className="mr-1 h-3 w-3" />
                          Send QR
                        </Button>
                      )}
                      {reg.feePaid && reg.qrSentEmail && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendTicket(reg.id)}
                          className="border-neutral-400 text-xs text-neutral-700 hover:bg-neutral-200 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Resend
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => confirmDelete(reg.id)}
                        className="border border-red-700 bg-red-600 text-white hover:bg-red-700 dark:border-red-700 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-neutral-500 dark:text-neutral-400">
                    {getRelativeTime(reg.updatedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 sm:hidden">
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-neutral-300 bg-white py-12 dark:border-neutral-700 dark:bg-neutral-900">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="rounded-xl border border-neutral-300 bg-white py-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-neutral-500 dark:text-neutral-400">
              No registrations found
            </p>
          </div>
        ) : (
          registrations.map((reg) => (
            <div
              key={reg.id}
              className="rounded-xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {reg.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {reg.rollNumber || "No roll number"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {reg.feePaid ? (
                    <Badge className="bg-green-600 text-white dark:bg-green-700">
                      Paid
                    </Badge>
                  ) : (
                    <Badge className="bg-red-600 text-white dark:bg-red-700">
                      Unpaid
                    </Badge>
                  )}
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {getRelativeTime(reg.updatedAt)}
                  </span>
                </div>
              </div>
              <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
                {reg.email}
              </p>
              <div className="mb-3 flex items-center gap-2">
                {reg.qrSentEmail ? (
                  <Badge
                    variant="secondary"
                    className="border border-blue-700 bg-blue-600 text-white dark:bg-blue-900/50 dark:text-blue-300"
                  >
                    QR Sent
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-slate-600 text-neutral-500 dark:text-neutral-400"
                  >
                    QR Pending
                  </Badge>
                )}
                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  {reg.referenceId}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                {!reg.feePaid && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirmMarkPaid(reg.id)}
                    className="flex-1 border-neutral-400 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Mark Paid
                  </Button>
                )}
                {reg.feePaid && !reg.qrSentEmail && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleSendTicket(reg.id)}
                    className="flex-1 bg-neutral-700 text-xs hover:bg-neutral-800 dark:bg-neutral-300"
                  >
                    Send QR
                  </Button>
                )}
                {reg.feePaid && reg.qrSentEmail && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendTicket(reg.id)}
                    className="flex-1 border-neutral-400 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Resend QR
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => confirmDelete(reg.id)}
                  className="border border-red-700 bg-red-600 text-white hover:bg-red-700 dark:border-red-700 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.total > pagination.limit && (
        <div className="mt-4 flex items-center justify-between border-t border-neutral-300 pt-4 dark:border-neutral-800">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Showing {startItem} to {endItem} of {pagination.total} registrations
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              &lt;&lt;
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              &lt;
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={
                      pagination.page === pageNum ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className={
                      pagination.page === pageNum
                        ? "bg-neutral-800 hover:bg-neutral-900 dark:bg-neutral-200 dark:hover:bg-neutral-300"
                        : "border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                    }
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              &gt;
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={pagination.page === totalPages}
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              &gt;&gt;
            </Button>
          </div>
        </div>
      )}

      {/* Mark Paid Confirmation Dialog */}
      <AlertDialog
        open={showMarkPaidConfirm}
        onOpenChange={setShowMarkPaidConfirm}
      >
        <AlertDialogContent className="border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-900 dark:text-neutral-100">
              Confirm Payment
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-500 dark:text-neutral-400">
              Are you sure you want to mark this registration as paid?
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-neutral-300 bg-neutral-50 text-neutral-900 hover:bg-slate-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkPaid}
              className="bg-neutral-800 hover:bg-neutral-900 dark:bg-neutral-200 dark:hover:bg-neutral-300"
            >
              Confirm Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-900 dark:text-neutral-100">
              Delete Registration
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-500 dark:text-neutral-400">
              Are you sure you want to delete this registration?
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-neutral-300 bg-neutral-50 text-neutral-900 hover:bg-slate-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
