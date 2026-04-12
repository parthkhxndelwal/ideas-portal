"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

export function InstitutionSelector() {
  const { startRegistration, isLoading, error } = useRegistration()
  const [selected, setSelected] = useState<'krmu' | 'external' | null>(null)

  const handleClick = async (institution: 'krmu' | 'external') => {
    setSelected(institution)
    await startRegistration(institution)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Select Your Institution</h2>
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <div className="grid gap-3">
        <Button
          onClick={() => handleClick('krmu')}
          disabled={isLoading}
          className="w-full py-6 text-lg"
        >
          {selected === 'krmu' && isLoading ? 'Loading...' : 'KRMU Student'}
        </Button>
        
        <Button
          onClick={() => handleClick('external')}
          disabled={isLoading}
          variant="outline"
          className="w-full py-6 text-lg"
        >
          {selected === 'external' && isLoading ? 'Loading...' : 'External Student'}
        </Button>
      </div>
    </div>
  )
}