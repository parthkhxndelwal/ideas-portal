"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

const OTP_LENGTH = 10

export function RollNumberInput() {
  const { submitRollNumber, goBack, isLoading, error } = useRegistration()
  const [rollNumber, setRollNumber] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [filled, setFilled] = useState(false)
  const input1Ref = useRef<HTMLInputElement>(null)
  const input2Ref = useRef<HTMLInputElement>(null)
  const input3Ref = useRef<HTMLInputElement>(null)
  const input4Ref = useRef<HTMLInputElement>(null)
  const input5Ref = useRef<HTMLInputElement>(null)
  const input6Ref = useRef<HTMLInputElement>(null)
  const input7Ref = useRef<HTMLInputElement>(null)
  const input8Ref = useRef<HTMLInputElement>(null)
  const input9Ref = useRef<HTMLInputElement>(null)
  const input10Ref = useRef<HTMLInputElement>(null)
  const inputRefs = [input1Ref, input2Ref, input3Ref, input4Ref, input5Ref, input6Ref, input7Ref, input8Ref, input9Ref, input10Ref]

  useEffect(() => {
    input1Ref.current?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    
    const newRollNumber = [...rollNumber]
    newRollNumber[index] = value.slice(-1)
    setRollNumber(newRollNumber)

    if (value && index < OTP_LENGTH - 1) {
      inputRefs[index + 1].current?.focus()
    }

    if (newRollNumber.every(d => d)) {
      setFilled(true)
      const fullNumber = newRollNumber.join('')
      submitRollNumber(fullNumber)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !rollNumber[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pastedData.length === OTP_LENGTH) {
      const newRollNumber = pastedData.split('')
      setRollNumber(newRollNumber)
      setFilled(true)
      submitRollNumber(pastedData)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fullNumber = rollNumber.join('')
    if (fullNumber.length === OTP_LENGTH && filled) {
      submitRollNumber(fullNumber)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-center">Enter Your Roll Number</h2>
      <p className="text-sm text-muted-foreground text-center">Enter your 10-digit KRMU roll number</p>
      
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      
      <div className="flex justify-center gap-1" onPaste={handlePaste}>
        {rollNumber.map((digit, index) => (
          <input
            key={index}
            ref={inputRefs[index] as any}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="h-14 w-9 rounded-lg border-2 border-input bg-background px-0 py-3 text-center text-xl font-mono font-bold tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        ))}
      </div>
      
      <Button type="submit" disabled={isLoading || !filled} className="w-full py-6 text-lg">
        {isLoading ? 'Verifying...' : 'Continue'}
      </Button>
      
      {goBack && (
        <Button type="button" variant="ghost" onClick={goBack} className="w-full">
          Back
        </Button>
      )}
    </form>
  )
}