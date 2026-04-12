"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

export function OtpInput() {
  const { email, requestOtp, verifyOtp, goBack, isLoading, error } = useRegistration()
  const [otp, setOtp] = useState('')
  const [canResend, setCanResend] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const otpRequestedRef = useRef(false)

  useEffect(() => {
    // Only request OTP once when component mounts
    if (!otpRequestedRef.current) {
      otpRequestedRef.current = true
      requestOtp()
      setCanResend(false)
      setCountdown(60)
    }
  }, [requestOtp])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length === 6) {
      verifyOtp(otp)
    }
  }

  const handleResend = () => {
    requestOtp()
    setCanResend(false)
    setCountdown(60)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Verify Your Email</h2>
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit OTP sent to <span className="font-medium">{email}</span>
      </p>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="Enter 6-digit OTP"
        className="w-full rounded-md border border-input bg-background px-4 py-3 text-lg text-center tracking-widest"
        maxLength={6}
      />
      
      <Button type="submit" disabled={isLoading || otp.length !== 6} className="w-full py-6 text-lg">
        {isLoading ? 'Verifying...' : 'Verify OTP'}
      </Button>
      
      <div className="text-center text-sm text-muted-foreground">
        {canResend ? (
          <button type="button" onClick={handleResend} className="text-primary hover:underline">
            Resend OTP
          </button>
        ) : (
          <span>Resend OTP in {countdown}s</span>
        )}
      </div>
      
      {goBack && (
        <Button type="button" variant="ghost" onClick={goBack} className="w-full">
          Back
        </Button>
      )}
    </form>
  )
}