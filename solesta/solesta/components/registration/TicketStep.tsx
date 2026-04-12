"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api, getExternalAppId } from '@/lib/api'

export function TicketStep() {
  const [ticket, setTicket] = useState<{ referenceId: string; name: string; qrCode: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTicket = async () => {
      const result = await api.getTicket(getExternalAppId())
      if (result.success && result.data) {
        setTicket(result.data)
      } else {
        setError(result.message || 'Failed to load ticket')
      }
      setLoading(false)
    }
    fetchTicket()
  }, [])

  const handleResend = async () => {
    if (ticket) {
      await api.resendTicket(getExternalAppId(), ticket.referenceId)
      alert('Ticket sent to your email!')
    }
  }

  if (loading) {
    return <div className="text-center">Loading ticket...</div>
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>
  }

  if (!ticket) {
    return <div className="text-center">No ticket found</div>
  }

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-xl font-semibold">Your Ticket</h2>
      
      <div className="rounded-lg border bg-white p-4">
        <img src={ticket.qrCode} alt="QR Code" className="mx-auto max-w-[250px]" />
      </div>
      
      <div className="space-y-1">
        <p className="text-lg font-bold">{ticket.name}</p>
        <p className="font-mono text-sm">{ticket.referenceId}</p>
      </div>
      
      <Button onClick={handleResend} variant="outline" className="w-full">
        Resend to Email
      </Button>
    </div>
  )
}