"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

export function EmailInput() {
  const { submitEmail, isLoading, error } = useRegistration()
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.includes('@')) {
      submitEmail(email)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Enter Your Email</h2>
      <p className="text-sm text-muted-foreground">We'll send an OTP to verify your email</p>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-full rounded-md border border-input bg-background px-4 py-3 text-lg"
      />
      
      <Button type="submit" disabled={isLoading || !email.includes('@')} className="w-full py-6 text-lg">
        {isLoading ? 'Sending OTP...' : 'Continue'}
      </Button>
    </form>
  )
}