"use client"

import { Button } from "@/components/ui/button"
import { useRegistration } from "@/hooks/useRegistration"

export function RollNumberConfirm() {
  const { submitRollNumberConfirm, goBack, isLoading, error, userDetails } =
    useRegistration()
  const rollNumber = userDetails?.rollNumber || ""

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Confirm Roll Number</h2>
      <p className="text-sm text-muted-foreground">
        Are you sure <strong>{rollNumber}</strong> is your right roll number?
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-3">
        <Button
          onClick={() => submitRollNumberConfirm(true)}
          disabled={isLoading}
          className="w-full py-6 text-lg"
        >
          {isLoading ? "Processing..." : "Yes, that's correct"}
        </Button>

        <Button
          onClick={() => submitRollNumberConfirm(false)}
          disabled={isLoading}
          variant="outline"
          className="w-full py-6 text-lg"
        >
          {isLoading ? "Processing..." : "No, let me enter again"}
        </Button>
      </div>

      {goBack && (
        <Button variant="ghost" onClick={goBack} className="w-full">
          Back
        </Button>
      )}
    </div>
  )
}
