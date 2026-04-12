"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api, getExternalAppId } from "@/lib/api"

interface CheckStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CheckStatusDialog({ open, onOpenChange }: CheckStatusDialogProps) {
  const [inputId, setInputId] = useState('')
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showTicket, setShowTicket] = useState(false)
  const [ticket, setTicket] = useState<any>(null)

  const handleSearch = async () => {
    if (!inputId) return
    setLoading(true)
    
    const result = await api.getRegistrationStatus(inputId)
    if (result.success && result.data) {
      setStatus(result.data)
    } else {
      setStatus(null)
    }
    setLoading(false)
  }

  const handleViewTicket = async () => {
    setLoading(true)
    const result = await api.getTicket(inputId)
    if (result.success && result.data) {
      setTicket(result.data)
      setShowTicket(true)
    }
    setLoading(false)
  }

  const handleResendTicket = async () => {
    if (ticket) {
      await api.resendTicket(inputId, ticket.referenceId)
      alert('Ticket sent to your email!')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check Registration Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!status && (
            <div className="flex gap-2">
              <input
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value.toUpperCase())}
                placeholder="Enter Reference ID"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2"
              />
              <Button onClick={handleSearch} disabled={!inputId || loading}>
                {loading ? '...' : 'Check'}
              </Button>
            </div>
          )}

          {status?.registration && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Reference ID</p>
                <p className="font-mono font-bold text-lg">{status.registration.referenceId}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{status.registration.name}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{status.registration.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Institution</p>
                  <p className="font-medium">{status.registration.isKrmu ? 'KRMU' : 'External'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Year</p>
                  <p className="font-medium">{status.registration.year}</p>
                </div>
              </div>
              
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Payment Status</p>
                <p className={`font-semibold text-lg ${status.registration.feePaid ? 'text-green-600' : 'text-yellow-600'}`}>
                  {status.registration.feePaid ? '✅ Paid' : '⏳ Pending'}
                </p>
                {status.registration.feePaid && (
                  <p className="text-sm text-muted-foreground">Amount: ₹{status.registration.feeAmount}</p>
                )}
              </div>
              
              {status.registration.isFresher !== undefined && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Fresher Competition</p>
                  <p className="font-medium">
                    {status.registration.isFresher ? '✅ Registered' : '❌ Not Participating'}
                  </p>
                </div>
              )}

              {status.registration.hasQrCode && (
                <Button onClick={handleViewTicket} className="w-full py-6 text-lg">
                  🎫 View Ticket
                </Button>
              )}

              <Button 
                variant="outline" 
                onClick={() => { setStatus(null); setInputId(''); }}
                className="w-full"
              >
                Search Another
              </Button>
            </div>
          )}

          {status && !status.registration && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No registration found for this reference ID.</p>
              <Button 
                variant="outline" 
                onClick={() => { setStatus(null); setInputId(''); }}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>

        {showTicket && ticket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 max-w-sm rounded-lg bg-white p-6 text-center">
              <h3 className="mb-4 text-xl font-bold">Your Ticket</h3>
              <div className="mb-4 rounded-lg border bg-white p-2">
                <img src={ticket.qrCode} alt="QR Code" className="mx-auto" />
              </div>
              <p className="mb-1 text-lg font-bold">{ticket.name}</p>
              <p className="mb-4 font-mono text-sm">{ticket.referenceId}</p>
              <Button onClick={handleResendTicket} variant="outline" className="mb-2 w-full">
                📧 Resend to Email
              </Button>
              <Button onClick={() => setShowTicket(false)} className="w-full">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}