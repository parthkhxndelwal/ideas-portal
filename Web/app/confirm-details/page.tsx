"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingTransition } from "@/components/ui/loading-transition"
import { ConfirmDetailsModal } from "@/components/confirm-details-modal"

interface UserDetails {
  _id?: string
  name: string
  email?: string
  rollNumber: string
  courseAndSemester: string
  year: string
}

interface DetailsResponse {
  details: UserDetails
  isFromUniversity: boolean
  requiresManualEntry: boolean
}

export default function ConfirmDetailsPage() {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState("")
  const [userInfo, setUserInfo] = useState<{rollNumber?: string, email?: string, isFromUniversity?: boolean} | null>(null)
  const [rollNumberNotFound, setRollNumberNotFound] = useState(false)
  const [isEditingRollNumber, setIsEditingRollNumber] = useState(false)
  const [editableRollNumber, setEditableRollNumber] = useState("")
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [manualDetails, setManualDetails] = useState({
    name: "",
    rollNumber: "",
    courseAndSemester: "",
    year: "",
  })
  const router = useRouter()

  useEffect(() => {
    const verifiedEmail = localStorage.getItem("verifiedEmail")
    const authToken = localStorage.getItem("authToken")
    
    if (!verifiedEmail) {
      if (authToken) {
        fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        .then(response => response.json())
        .then(data => {
          if (data.user && data.user.registrationStatus !== "confirmed") {
            setEmail(data.user.email)
            fetchUserInfo(data.user.email)
            fetchUserDetails(data.user.email)
          } else {
            router.push("/dashboard")
          }
        })
        .catch(() => {
          router.push("/")
        })
      } else {
        router.push("/")
      }
      return
    }
    
    setEmail(verifiedEmail)
    fetchUserInfo(verifiedEmail)
    fetchUserDetails(verifiedEmail)
  }, [router])

  const fetchUserInfo = async (email: string) => {
    try {
      const response = await fetch("/api/user/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserInfo({ 
          email: data.userInfo.email, 
          rollNumber: data.userInfo.rollNumber,
          isFromUniversity: data.userInfo.isFromUniversity
        })
        if (data.userInfo.rollNumber) {
          setEditableRollNumber(data.userInfo.rollNumber)
        }
      } else {
        setUserInfo({ email })
      }
    } catch (_error) {
      setUserInfo({ email })
    }
  }

  const fetchUserDetails = async (email: string) => {
    try {
      const response = await fetch("/api/user/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data: DetailsResponse = await response.json()

      if (response.ok) {
        // Check if manual entry is required
        if (data.requiresManualEntry || !data.isFromUniversity) {
          setIsManualEntry(true)
          setManualDetails({
            name: data.details.name || "",
            rollNumber: data.details.rollNumber || "",
            courseAndSemester: data.details.courseAndSemester || "",
            year: data.details.year || "",
          })
          setUserDetails(null)
        } else {
          setUserDetails(data.details)
          setRollNumberNotFound(false)
        }
        setError("")
      } else {
        setUserDetails(null)
        setRollNumberNotFound(true)
        setError("")
      }
    } catch (_error) {
      setError("An error occurred. Please try again.")
      setRollNumberNotFound(false)
    } finally {
      setLoading(false)
    }
  }

  const handleYesContinue = async () => {
    try {
      const response = await fetch("/api/auth/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userDetails }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.removeItem("verifiedEmail")
        
        const userData = localStorage.getItem("userData")
        if (userData && userDetails) {
          const user = JSON.parse(userData)
          user.registrationStatus = "details_confirmed"
          user.name = userDetails.name
          user.courseAndSemester = userDetails.courseAndSemester
          user.year = userDetails.year
          localStorage.setItem("userData", JSON.stringify(user))
        }
        
        router.push("/dashboard")
      } else {
        setError(data.error || "Registration failed")
      }
    } catch (_error) {
      setError("An error occurred. Please try again.")
    }
  }

  const handleManualSubmit = async () => {
    // Validate manual entry
    if (!manualDetails.name || !manualDetails.rollNumber) {
      setError("Name and Roll Number are required")
      return
    }

    try {
      const response = await fetch("/api/auth/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userDetails: manualDetails }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.removeItem("verifiedEmail")
        
        const userData = localStorage.getItem("userData")
        if (userData) {
          const user = JSON.parse(userData)
          user.registrationStatus = "details_confirmed"
          user.name = manualDetails.name
          user.rollNumber = manualDetails.rollNumber
          user.courseAndSemester = manualDetails.courseAndSemester
          user.year = manualDetails.year
          localStorage.setItem("userData", JSON.stringify(user))
        }
        
        router.push("/dashboard")
      } else {
        setError(data.error || "Registration failed")
      }
    } catch (_error) {
      setError("An error occurred. Please try again.")
    }
  }

  const handleNo = () => {
    if (rollNumberNotFound) {
      setIsEditingRollNumber(true)
    } else {
      setShowModal(true)
    }
  }

  const handleRollNumberConfirmYes = () => {
    router.push("/roll-number-error")
  }

  const handleRollNumberConfirmNo = () => {
    setIsEditingRollNumber(true)
  }

  const handleUpdateRollNumber = async () => {
    if (!editableRollNumber.trim()) {
      setError("Please enter a valid roll number")
      return
    }

    try {
      const response = await fetch("/api/user/update-roll-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, rollNumber: editableRollNumber }),
      })

      const data = await response.json()

      if (response.ok) {
        setUserInfo(prev => prev ? {...prev, rollNumber: editableRollNumber} : {rollNumber: editableRollNumber})
        setIsEditingRollNumber(false)
        await fetchUserDetails(email)
      } else {
        setError(data.error || "Update failed")
      }
    } catch (_error) {
      setError("An error occurred. Please try again.")
    }
  }

  const handleCancelEdit = () => {
    setIsEditingRollNumber(false)
    setEditableRollNumber(userInfo?.rollNumber || "")
  }

  return (
    <LoadingTransition isLoading={loading}>
      <div className="relative min-h-screen bg-neutral-950 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-neutral-950/70" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-2xl space-y-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-4">
                <Image
                  src="/kr-logo.png"
                  alt="KR Mangalam Logo"
                  width={56}
                  height={56}
                  className="rounded-full shadow-lg"
                  priority
                />
                <Image
                  src="/ideas-white.png"
                  alt="IDEAS Logo"
                  width={180}
                  height={52}
                  className="drop-shadow-2xl"
                  priority
                />
              </div>
              <p className="text-sm text-neutral-400">
                {isManualEntry ? "Enter your details to complete registration" : "Verify your academic details to continue with your IDEAS 3.0 registration"}
              </p>
            </div>

            <Card className="bg-neutral-900/70 backdrop-blur-xl border border-neutral-800 shadow-2xl">
              <CardHeader className="text-center space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-400/80">
                  Verified Email
                </p>
                <p className="text-lg font-medium text-neutral-200">
                  {email}
                </p>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-inner shadow-black/30">
                  <h3 className="text-xl font-semibold text-neutral-100 text-center mb-6">
                    {isManualEntry ? "Enter your details" : "Confirm your details"}
                  </h3>

                  {/* Manual Entry Form for Non-University Users */}
                  {isManualEntry ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="name" className="text-xs uppercase tracking-wide text-neutral-400">Name *</Label>
                        <Input
                          id="name"
                          type="text"
                          value={manualDetails.name}
                          onChange={(e) => setManualDetails({...manualDetails, name: e.target.value})}
                          placeholder="Enter your full name"
                          className="h-12 border-neutral-700 bg-neutral-950/60 text-neutral-100 placeholder:text-neutral-500"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="rollNumber" className="text-xs uppercase tracking-wide text-neutral-400">Roll Number *</Label>
                        <Input
                          id="rollNumber"
                          type="text"
                          value={manualDetails.rollNumber}
                          onChange={(e) => setManualDetails({...manualDetails, rollNumber: e.target.value})}
                          placeholder="Enter your roll number"
                          className="h-12 border-neutral-700 bg-neutral-950/60 text-neutral-100 placeholder:text-neutral-500"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="courseAndSemester" className="text-xs uppercase tracking-wide text-neutral-400">Course & Semester (Optional)</Label>
                        <Input
                          id="courseAndSemester"
                          type="text"
                          value={manualDetails.courseAndSemester}
                          onChange={(e) => setManualDetails({...manualDetails, courseAndSemester: e.target.value})}
                          placeholder="E.g., B.Tech CSE Sem 5"
                          className="h-12 border-neutral-700 bg-neutral-950/60 text-neutral-100 placeholder:text-neutral-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="year" className="text-xs uppercase tracking-wide text-neutral-400">Year (Optional)</Label>
                        <Input
                          id="year"
                          type="text"
                          value={manualDetails.year}
                          onChange={(e) => setManualDetails({...manualDetails, year: e.target.value})}
                          placeholder="E.g., 2024"
                          className="h-12 border-neutral-700 bg-neutral-950/60 text-neutral-100 placeholder:text-neutral-500"
                        />
                      </div>
                      <Button
                        onClick={handleManualSubmit}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
                      >
                        Continue
                      </Button>
                    </div>
                  ) : userDetails ? (
                    /* Existing flow for university students */
                    <div className="space-y-6">
                      <div className="grid gap-4">
                        <div className="space-y-1">
                          <span className="text-xs uppercase tracking-wide text-neutral-400">Name</span>
                          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-neutral-100">
                            {userDetails.name}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs uppercase tracking-wide text-neutral-400">Roll Number</span>
                          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-neutral-100">
                            {userDetails.rollNumber}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs uppercase tracking-wide text-neutral-400">Course & Semester</span>
                          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-neutral-100">
                            {userDetails.courseAndSemester}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs uppercase tracking-wide text-neutral-400">Year</span>
                          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-neutral-100">
                            {userDetails.year}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                        <Button
                          onClick={handleNo}
                          variant="outline"
                          className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                        >
                          No, something's wrong
                        </Button>
                        <Button
                          onClick={handleYesContinue}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
                        >
                          Yes, Continue
                        </Button>
                      </div>
                    </div>
                  ) : rollNumberNotFound ? (
                    /* Roll number not found flow */
                    <div className="space-y-5">
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                        We couldn't find a matching roll number. Update it below to continue.
                      </div>

                      <div className="space-y-3">
                        <span className="text-xs uppercase tracking-wide text-neutral-400">Roll Number</span>
                        {isEditingRollNumber ? (
                          <div className="space-y-3">
                            <Input
                              type="text"
                              value={editableRollNumber}
                              onChange={(e) => setEditableRollNumber(e.target.value)}
                              placeholder="Enter your roll number"
                              className="h-12 border-neutral-700 bg-neutral-950/60 text-neutral-100 placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                            />
                            <div className="flex flex-col gap-3 sm:flex-row">
                              <Button
                                onClick={handleUpdateRollNumber}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                              >
                                Update
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                variant="outline"
                                className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-neutral-100">
                            {userInfo?.rollNumber || editableRollNumber || "No roll number found"}
                          </div>
                        )}
                      </div>

                      {!isEditingRollNumber && (
                        <div className="space-y-4">
                          <p className="text-sm text-neutral-400 text-center">
                            Is the roll number above correct?
                          </p>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                              onClick={handleRollNumberConfirmYes}
                              variant="outline"
                              className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                            >
                              Yes, it's correct
                            </Button>
                            <Button
                              onClick={handleRollNumberConfirmNo}
                              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                            >
                              No, edit it
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 px-4 py-6 text-center text-sm text-neutral-300">
                      {error ? "Please review the message below." : "Unable to fetch details right now. Please try again shortly."}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-center text-xs text-neutral-400">
                  Need help? <a href="#" className="text-blue-400 hover:text-blue-300">Contact our support team</a>
                </div>

                <div className="text-center">
                  <Button
                    onClick={() => {
                      localStorage.removeItem("authToken")
                      localStorage.removeItem("userData")
                      localStorage.removeItem("verifiedEmail")
                      router.push("/")
                    }}
                    variant="outline"
                    className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  >
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>

            {showModal && userDetails && (
              <ConfirmDetailsModal
                email={email}
                initialRollNumber={userDetails.rollNumber || ""}
                onClose={() => setShowModal(false)}
                onSuccess={() => {
                  setShowModal(false)
                  fetchUserInfo(email)
                  fetchUserDetails(email)
                }}
              />
            )}
          </div>
        </div>
      </div>
    </LoadingTransition>
  )
}
