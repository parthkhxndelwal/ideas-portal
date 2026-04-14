"use client"

import { useEffect, useState } from "react"
import { generateQRForRegistration } from "@/lib/server/qr-generator"

interface TicketPageProps {
  params: Promise<{ token: string }>
}

interface TicketData {
  registration: {
    referenceId: string
    name: string
    email: string
    rollNumber: string
  }
  qrCode: string
}

export default function TicketPage({ params }: TicketPageProps) {
  const [token, setToken] = useState<string>("")
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { token: linkToken } = await params
        setToken(linkToken)

        // Fetch ticket data from server
        const response = await fetch(`/api/ticket/ref/${linkToken}`)

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to download ticket")
        }

        const data = await response.json()
        setTicketData(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    })()
  }, [params])

  const handleDownload = async () => {
    if (!ticketData?.qrCode) return

    try {
      // Convert base64 to blob
      const base64Data = ticketData.qrCode.replace(
        /^data:image\/png;base64,/,
        ""
      )
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "image/png" })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Solesta_QR_${ticketData.registration.referenceId}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Download failed:", err)
      setError("Failed to download QR code")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500"></div>
          <p className="text-slate-300">Loading your ticket...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-md rounded-lg border border-red-500/50 bg-red-900/20 p-8">
          <h1 className="mb-2 text-xl font-bold text-red-400">Error</h1>
          <p className="mb-4 text-slate-300">{error}</p>
          <a
            href="/"
            className="text-emerald-400 underline hover:text-emerald-300"
          >
            Return to home
          </a>
        </div>
      </div>
    )
  }

  if (!ticketData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <p className="text-slate-300">No ticket data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-emerald-600">
            Solesta '26
          </h1>
          <p className="text-slate-600">Your Event Ticket</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-center rounded-lg bg-slate-50 p-4">
            <img src={ticketData.qrCode} alt="QR Code" className="h-64 w-64" />
          </div>
        </div>

        <div className="mb-8 space-y-4">
          <div className="border-t-2 border-slate-200 pt-4">
            <p className="mb-1 text-sm text-slate-500">Reference ID</p>
            <p className="text-lg font-bold text-slate-900">
              {ticketData.registration.referenceId}
            </p>
          </div>

          <div>
            <p className="mb-1 text-sm text-slate-500">Name</p>
            <p className="text-slate-900">{ticketData.registration.name}</p>
          </div>

          <div>
            <p className="mb-1 text-sm text-slate-500">Roll Number</p>
            <p className="text-slate-900">
              {ticketData.registration.rollNumber || "N/A"}
            </p>
          </div>

          <div>
            <p className="mb-1 text-sm text-slate-500">Email</p>
            <p className="text-slate-900">{ticketData.registration.email}</p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Download QR Code
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          Keep this QR code safe. You'll need it at the event.
        </p>
      </div>
    </div>
  )
}
