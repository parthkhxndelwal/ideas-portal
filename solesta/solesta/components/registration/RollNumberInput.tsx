"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

export function RollNumberInput() {
  const { submitRollNumber, isLoading, error } = useRegistration()
  const [rollNumber, setRollNumber] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rollNumber.length === 10) {
      submitRollNumber(rollNumber)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Enter Your Roll Number</h2>
      <p className="text-sm text-muted-foreground">Enter your 10-digit KRMU roll number</p>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <input
        type="text"
        value={rollNumber}
        onChange={(e) => setRollNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
        placeholder="10-digit roll number"
        className="w-full rounded-md border border-input bg-background px-4 py-3 text-lg"
        maxLength={10}
      />
      
      <Button type="submit" disabled={isLoading || rollNumber.length !== 10} className="w-full py-6 text-lg">
        {isLoading ? 'Verifying...' : 'Continue'}
      </Button>
    </form>
  )
}