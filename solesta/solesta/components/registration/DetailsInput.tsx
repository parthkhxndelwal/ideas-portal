"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistration } from '@/hooks/useRegistration'

export function DetailsInput() {
  const { submitDetails, goBack, isLoading, error } = useRegistration()
  const [name, setName] = useState('')
  const [course, setCourse] = useState('')
  const [year, setYear] = useState('')
  const [college, setCollege] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.length >= 2 && course.length >= 2 && year) {
      submitDetails(name, course, year, college || undefined)
    }
  }

  const isValid = name.length >= 2 && course.length >= 2 && year

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Enter Your Details</h2>
      <p className="text-sm text-muted-foreground">Fill in your registration details</p>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full Name"
          className="w-full rounded-md border border-input bg-background px-4 py-3"
        />
        
        <input
          type="text"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder="Course (e.g., B.A. LL.B)"
          className="w-full rounded-md border border-input bg-background px-4 py-3"
        />
        
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-4 py-3"
        >
          <option value="">Select Year</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
          <option value="5">5th Year</option>
        </select>
        
        <input
          type="text"
          value={college}
          onChange={(e) => setCollege(e.target.value)}
          placeholder="College Name (optional)"
          className="w-full rounded-md border border-input bg-background px-4 py-3"
        />
      </div>
      
      <Button type="submit" disabled={isLoading || !isValid} className="w-full py-6 text-lg">
        {isLoading ? 'Creating...' : 'Complete Registration'}
      </Button>
      
      {goBack && (
        <Button type="button" variant="ghost" onClick={goBack} className="w-full">
          Back
        </Button>
      )}
    </form>
  )
}