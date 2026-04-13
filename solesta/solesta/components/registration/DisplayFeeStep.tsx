"use client"

import { Button } from "@/components/ui/button"
import { useRegistration } from "@/hooks/useRegistration"

export function DisplayFeeStep() {
  const { userDetails, feeAmount, confirmDetails, goBack, isLoading, error } =
    useRegistration()

  const handleConfirm = () => {
    confirmDetails()
  }

  if (!userDetails) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">No details available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Name</span>
          <span className="font-medium">{userDetails.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{userDetails.email}</span>
        </div>
        {userDetails.rollNumber && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Roll Number</span>
            <span className="font-medium">{userDetails.rollNumber}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Course</span>
          <span className="font-medium">{userDetails.course}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Year</span>
          <span className="font-medium">Year {userDetails.year}</span>
        </div>
        <div className="flex justify-between border-t pt-3">
          <span className="font-semibold">Registration Fee</span>
          <span className="font-semibold text-white">₹{feeAmount}</span>
        </div>
      </div>

      <Button
        onClick={handleConfirm}
        disabled={isLoading}
        className="w-full py-6 text-lg"
      >
        {isLoading ? "Processing..." : "Proceed to Payment"}
      </Button>

      {goBack && (
        <Button variant="ghost" onClick={goBack} className="w-full">
          Back
        </Button>
      )}
    </div>
  )
}
