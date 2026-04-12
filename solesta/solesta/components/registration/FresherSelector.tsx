"use client"

import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

export function FresherSelector() {
  const { submitFresher, isLoading, error } = useRegistration()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Mr. & Mrs. Fresher</h2>
      <p className="text-sm text-muted-foreground">
        Would you like to participate in the Mr. & Mrs. Fresher competition?
      </p>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <div className="grid gap-3">
        <Button
          onClick={() => submitFresher(true)}
          disabled={isLoading}
          className="w-full py-6 text-lg"
        >
          {isLoading ? 'Processing...' : "Yes, I'm interested!"}
        </Button>
        
        <Button
          onClick={() => submitFresher(false)}
          disabled={isLoading}
          variant="outline"
          className="w-full py-6 text-lg"
        >
          {isLoading ? 'Processing...' : 'No, skip'}
        </Button>
      </div>
    </div>
  )
}