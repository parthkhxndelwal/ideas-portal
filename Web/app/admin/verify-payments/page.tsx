"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  CheckCircle,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  Loader2,
  CreditCard
} from "lucide-react"
import Image from "next/image"

interface ReferenceIdData {
  _id: string
  userId: string
  referenceId: string
  status: "pending" | "verified" | "expired"
  createdAt: string
  updatedAt: string
  userName?: string
  userEmail?: string
  userRollNumber?: string
}

interface Stats {
  total: number
  pending: number
  verified: number
  expired: number
}

export default function VerifyPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [referenceIds, setReferenceIds] = useState<ReferenceIdData[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, verified: 0, expired: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const fetchReferenceIds = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("authToken")
      if (!token) {
        router.push("/")
        return
      }

      const params = new URLSearchParams()
      if (filterStatus !== "all") {
        params.set("status", filterStatus)
      }

      const response = await fetch(`/api/admin/verify-reference-id?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to fetch reference IDs")
        return
      }

      const data = await response.json()
      setReferenceIds(data.referenceIds || [])
      setStats(data.stats || { total: 0, pending: 0, verified: 0, expired: 0 })
    } catch (err) {
      console.error("Error fetching reference IDs:", err)
      setError("Failed to fetch reference IDs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (!token) {
      router.push("/")
      return
    }

    fetchReferenceIds()
  }, [filterStatus])

  const verifyReferenceId = async (referenceId: string) => {
    try {
      setSubmitting(true)
      setError("")
      setSuccess("")

      const token = localStorage.getItem("authToken")
      if (!token) {
        router.push("/")
        return
      }

      const response = await fetch("/api/admin/verify-reference-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referenceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to verify reference ID")
        return
      }

      setSuccess(`Reference ID ${referenceId} verified successfully`)
      fetchReferenceIds()
    } catch (err) {
      console.error("Error verifying reference ID:", err)
      setError("Failed to verify reference ID")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredIds = referenceIds.filter((ref) => {
    const matchesSearch =
      !searchTerm ||
      ref.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.userRollNumber?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === "all" || ref.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700/50">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        )
      case "expired":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700/50">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700/50">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <header className="w-full py-5 sm:py-6 px-4 bg-transparent backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Image
              src="/kr-logo.png"
              alt="KR Mangalam Logo"
              width={36}
              height={36}
              className="rounded-full w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0"
            />
            <Image
              src="/solesta-black.png"
              alt="Solesta Logo"
              width={96}
              height={24}
              className="dark:hidden w-[96px] h-[24px] sm:w-[120px] sm:h-[32px]"
            />
            <Image
              src="/solesta-white.png"
              alt="Solesta Logo"
              width={96}
              height={24}
              className="hidden dark:block w-[96px] h-[24px] sm:w-[120px] sm:h-[32px]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin")}
            className="border-neutral-300 dark:border-neutral-600"
          >
            Back to Admin
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Verify Payments
          </h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Total</p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {stats.total}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.pending}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Verified</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.verified}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Expired</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {stats.expired}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Payment References</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    placeholder="Search by ID, name, or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="expired">Expired</option>
                </select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchReferenceIds}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-2 text-sm text-green-600 dark:text-green-400">
                {success}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
              </div>
            ) : filteredIds.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No reference IDs found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIds.map((ref) => (
                    <TableRow key={ref._id}>
                      <TableCell className="font-mono font-medium">
                        {ref.referenceId}
                      </TableCell>
                      <TableCell>{ref.userName || "Unknown"}</TableCell>
                      <TableCell>{ref.userRollNumber || "N/A"}</TableCell>
                      <TableCell>{getStatusBadge(ref.status)}</TableCell>
                      <TableCell>
                        {new Date(ref.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {ref.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => verifyReferenceId(ref.referenceId)}
                            disabled={submitting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {submitting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            )}
                            Verify
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}