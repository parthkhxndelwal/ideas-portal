"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

const OTP_LENGTH = 6

export function OtpInput() {
  const { email, requestOtp, verifyOtp, goBack, isLoading, error } = useRegistration()
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [canResend, setCanResend] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [filled, setFilled] = useState(false)
  const otpRequestedRef = useRef(false)
  
  const input1Ref = useRef<HTMLInputElement>(null)
  const input2Ref = useRef<HTMLInputElement>(null)
  const input3Ref = useRef<HTMLInputElement>(null)
  const input4Ref = useRef<HTMLInputElement>(null)
  const input5Ref = useRef<HTMLInputElement>(null)
  const input6Ref = useRef<HTMLInputElement>(null)
  const inputRefs = [input1Ref, input2Ref, input3Ref, input4Ref, input5Ref, input6Ref]

  useEffect(() => {
    // Only request OTP once when component mounts
    if (!otpRequestedRef.current) {
      otpRequestedRef.current = true
      requestOtp()
      setCanResend(false)
      setCountdown(60)
    }
    input1Ref.current?.focus()
  }, [requestOtp])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < OTP_LENGTH - 1) {
      inputRefs[index + 1].current?.focus()
    }

    if (newOtp.every(d => d)) {
      setFilled(true)
      const fullOtp = newOtp.join('')
      verifyOtp(fullOtp)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pastedData.length === OTP_LENGTH) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      setFilled(true)
      verifyOtp(pastedData)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fullOtp = otp.join('')
    if (fullOtp.length === OTP_LENGTH && filled) {
      verifyOtp(fullOtp)
    }
  }

  const handleResend = () => {
    requestOtp()
    setCanResend(false)
    setCountdown(60)
    setOtp(Array(OTP_LENGTH).fill(''))
    setFilled(false)
    input1Ref.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Verify Your Email</h2>
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit OTP sent to <span className="font-medium">{email}</span>
      </p>
      <p className="text-xs text-muted-foreground italic">
        (Check your spam folder if you don't see the email)
      </p>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={inputRefs[index] as any}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="h-12 w-10 rounded-lg border-2 border-input bg-background px-0 py-2 text-center text-xl font-mono font-bold tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        ))}
      </div>
      
      <Button type="submit" disabled={isLoading || !filled} className="w-full py-6 text-lg">
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