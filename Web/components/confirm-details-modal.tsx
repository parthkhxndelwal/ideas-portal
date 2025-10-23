"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"

interface ConfirmDetailsModalProps {
  email: string
  initialRollNumber: string
  onClose: () => void
  onSuccess: () => void
}

export function ConfirmDetailsModal({ email, initialRollNumber, onClose, onSuccess }: ConfirmDetailsModalProps) {
  const [rollNumber, setRollNumber] = useState(initialRollNumber)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const hasChanged = rollNumber !== initialRollNumber
  const buttonText = hasChanged ? "Update" : "Confirm"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (hasChanged) {
        // Update the roll number
        const response = await fetch("/api/user/update-roll-number", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, rollNumber }),
        })

        const data = await response.json()

        if (response.ok) {
          // Check if the new roll number exists in database
          const detailsResponse = await fetch("/api/user/details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          })

          if (detailsResponse.ok) {
            // Roll number found in database, close modal and refresh details
            onSuccess()
          } else {
            // Roll number not found in database, redirect to error page
            router.push("/roll-number-error")
          }
        } else {
          setError(data.error || "Update failed")
        }
      } else {
        // User confirmed the same roll number, but it's not in database
        router.push("/roll-number-error")
      }
    } catch (_error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md bg-neutral-900/80 border border-neutral-800 backdrop-blur-md">
        <DialogHeader className="text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <Image src="/kr-logo.png" alt="KR" width={48} height={48} className="rounded-full" />
            <Image src="/ideas-white.png" alt="IDEAS" width={140} height={36} />
          </div>
          <DialogTitle className="text-lg text-neutral-50">Verify Roll Number</DialogTitle>
          <DialogDescription className="text-sm text-neutral-400">Check that the entered roll number is correct. If not, correct it.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="rollNumber" className="text-neutral-300">Roll Number</Label>
            <Input
              id="rollNumber"
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              required
              className="h-12 bg-neutral-950/30 border-neutral-800 text-neutral-100"
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="mr-2">Cancel</Button>
            </DialogClose>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-500" disabled={loading}>
              {loading ? "Please wait..." : buttonText}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  )
}
