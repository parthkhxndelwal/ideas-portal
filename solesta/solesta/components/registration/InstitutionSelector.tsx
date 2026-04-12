"use client"

import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

export function InstitutionSelector() {
  const { startRegistration, isLoading, error } = useRegistration()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Select Your Institution</h2>
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <div className="grid gap-3">
        <Button
          onClick={() => startRegistration('krmu')}
          disabled={isLoading}
          className="w-full py-6 text-lg"
        >
          {isLoading ? 'Loading...' : 'KRMU Student'}
        </Button>
        
        <Button
          onClick={() => startRegistration('external')}
          disabled={isLoading}
          variant="outline"
          className="w-full py-6 text-lg"
        >
          {isLoading ? 'Loading...' : 'External Student'}
        </Button>
      </div>
    </div>
  )
}