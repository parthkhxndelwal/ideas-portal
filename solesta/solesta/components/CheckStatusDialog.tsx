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
  const [paymentCountdown, setPaymentCountdown] = useState<number | null>(null)

  const [showCopied, setShowCopied] = useState(false)

  const handleSearch = async () => {
    if (!inputId) return
    setLoading(true)
    
    try {
      const result = await api.searchByReference(inputId)
      if (result.success && result.data?.exists) {
        setStatus(result.data)
      } else {
        setStatus(null)
      }
    } catch (error) {
      console.error('Search error:', error)
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

  const handleMakePayment = async () => {
    // Copy reference ID to clipboard
    const referenceId = status.registration.referenceId
    await navigator.clipboard.writeText(referenceId)
    
    // Show "Copied" message for 1 second
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1000)
    
    // Start countdown after 1 second delay
    setTimeout(() => {
      setPaymentCountdown(3)
      
      // Countdown timer
      const interval = setInterval(() => {
        setPaymentCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval)
            // Get payment link based on institution
            const paymentLink = status.registration.isKrmu
              ? 'https://p.ppsl.io/PYTMPS/Ro1Qfk'
              : 'https://p.ppsl.io/PYTMPS/UYrQfk'
            window.location.href = paymentLink
            setPaymentCountdown(null)
            return null
          }
          return prev - 1
        })
      }, 1000)
    }, 1000)
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
                  <p className={`font-semibold text-lg ${status.registration.feePaid ? 'text-green-600' : 'text-amber-600'}`}>
                    {status.registration.feePaid ? '✅ Paid' : '🔄 Under Review'}
                  </p>
                  {status.registration.feePaid ? (
                    <p className="text-sm text-muted-foreground">Amount: ₹{status.registration.feeAmount}</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your payment is being verified. Please wait 1-2 days.
                      </p>
                        <Button 
                          onClick={handleMakePayment}
                          disabled={paymentCountdown !== null || showCopied}
                          className="w-full mt-3"
                        >
                          {showCopied
                            ? '✅ Ref ID copied to clipboard'
                            : paymentCountdown !== null
                            ? `Redirecting in ${paymentCountdown}...`
                            : 'Make Payment'}
                        </Button>
                    </>
                  )}
                </div>
              
               {status.registration.isFresher !== undefined && status.registration.year === '2025' && (
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
                onClick={() => { setStatus(null); setInputId(''); setPaymentCountdown(null); }}
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