"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { api, generateExternalAppId, RegistrationStatus } from '@/lib/api'

type RegistrationStep =
  | 'welcome'
  | 'select-institution'
  | 'roll-number'
  | 'email'
  | 'otp'
  | 'details'
  | 'display-fee'
  | 'fresher'
  | 'reference-id'
  | 'payment'
  | 'completed'
  | 'ticket'

interface RegistrationContextType {
  step: RegistrationStep
  externalAppId: string
  email: string
  referenceId: string
  paymentLink: string
  isKrmu: boolean
  isFresher: boolean | null
  feeAmount: number
  isLoading: boolean
  error: string | null
  registrationStatus: RegistrationStatus | null
  userDetails: { name: string; email: string; rollNumber?: string; course: string; year: string } | null
  goBack: () => void
  startRegistration: (institution: 'krmu' | 'external') => Promise<void>
  submitRollNumber: (rollNumber: string) => Promise<void>
  submitEmail: (email: string) => Promise<void>
  requestOtp: () => Promise<void>
  verifyOtp: (otp: string) => Promise<void>
  submitDetails: (name: string, course: string, year: string, college?: string) => Promise<void>
  confirmDetails: () => Promise<void>
  proceedToPayment: () => void
  proceedPastWelcome: () => void
  submitFresher: (isFresher: boolean) => Promise<void>
  confirmPayment: () => Promise<void>
  checkStatus: () => Promise<void>
  reset: () => void
  restart: () => void
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined)

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<RegistrationStep>('welcome')
  const [externalAppId, setExternalAppId] = useState('')
  const [email, setEmail] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [isKrmu, setIsKrmu] = useState(false)
  const [isFresher, setIsFresher] = useState<boolean | null>(null)
  const [feeAmount, setFeeAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null)
  const [userDetails, setUserDetails] = useState<{ name: string; email: string; rollNumber?: string; course: string; year: string } | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [stepHistory, setStepHistory] = useState<RegistrationStep[]>([])

  function advanceStep(newStep: RegistrationStep) {
    setStepHistory(prev => [...prev, step])
    setStep(newStep)
  }

  const goBack = useCallback(() => {
    if (stepHistory.length > 0) {
      const previousStep = stepHistory[stepHistory.length - 1]
      setStepHistory(prev => prev.slice(0, -1))
      setStep(previousStep)
      setError(null)
      
      // If going back to email or roll-number, reset related state to allow fresh entry
      if (previousStep === 'email' || previousStep === 'roll-number') {
        // Clear email so user can enter a new one
        setEmail('')
      }
    }
  }, [stepHistory, step])

  const restart = useCallback(() => {
    setStep('welcome')
    setEmail('')
    setReferenceId('')
    setPaymentLink('')
    setIsKrmu(false)
    setIsFresher(null)
    setFeeAmount(0)
    setError(null)
    setRegistrationStatus(null)
    setUserDetails(null)
    setStepHistory([])
    setExternalAppId(generateExternalAppId())
    if (typeof window !== 'undefined') {
      localStorage.removeItem('solesta_external_id')
    }
  }, [])

  const reset = useCallback(() => {
    setStep('welcome')
    setEmail('')
    setReferenceId('')
    setPaymentLink('')
    setIsKrmu(false)
    setIsFresher(null)
    setFeeAmount(0)
    setError(null)
    setRegistrationStatus(null)
    setUserDetails(null)
    setStepHistory([])
  }, [])

   useEffect(() => {
    async function restoreState() {
      const storedId = localStorage.getItem('solesta_external_id')
      if (storedId) {
        setExternalAppId(storedId)
        setIsLoading(true)
        try {
          const result = await api.getUserStatus(storedId)
          if (result.success && result.data) {
            const state = result.data.state
            setIsKrmu(result.data.isKrmu || false)
            const detailsResult = await api.getRegistrationStatus(storedId)
            if (detailsResult.success && detailsResult.data?.registration) {
              const reg = detailsResult.data.registration
              setReferenceId(reg.referenceId)
              setPaymentLink(reg.feePaid ? '' : '')
              setFeeAmount(reg.feeAmount)
              if (reg.feePaid) {
                if (reg.hasQrCode) {
                  advanceStep('ticket')
                } else {
                  advanceStep('completed')
                }
                setIsLoading(false)
                setInitialized(true)
                return
              }
            }
            setIsLoading(false)
            // Always show welcome step first for new sessions
            // Only skip welcome for users who have already progressed
            if (state === 'FRESHER_SELECTION') {
              advanceStep('fresher')
            } else if (state === 'DISPLAY_FEE') {
              const userDet = detailsResult.data?.userDetails
              const reg = detailsResult.data?.registration
              const isKrmu = result.data.isKrmu
              if (userDet) {
                setUserDetails({
                  name: userDet.name || '',
                  email: userDet.email || '',
                  rollNumber: userDet.rollNumber || undefined,
                  course: userDet.course || '',
                  year: userDet.year || '',
                })
                setFeeAmount(isKrmu ? 500 : 700)
              } else if (reg) {
                setUserDetails({
                  name: reg.name || '',
                  email: reg.email || '',
                  rollNumber: reg.rollNumber || undefined,
                  course: reg.course || '',
                  year: reg.year || '',
                })
                setFeeAmount(reg.feeAmount || (isKrmu ? 500 : 700))
              }
              advanceStep('display-fee')
             } else if (state === 'ENTER_NAME' || state === 'MANUAL_DETAILS') {
               advanceStep('details')
             } else if (state === 'REFERENCE_ID' || state === 'PAYMENT_LINK') {
               // Restore reference ID and payment link from registration
               const reg = detailsResult.data?.registration
               if (reg) {
                 setReferenceId(reg.referenceId)
                 setPaymentLink(reg.feePaid ? '' : '')
                 setFeeAmount(reg.feeAmount)
               }
               advanceStep('reference-id')
             } else if (state === 'PAYMENT_CONFIRMED' || state === 'COMPLETED') {
               advanceStep('completed')
            } else if (state === 'OTP_VERIFICATION') {
              advanceStep('otp')
            } else {
              // For START state or any other initial state, show welcome step
              // Users need to explicitly proceed past welcome
              setStep('welcome')
            }
          }
        } catch (e) {
          console.error('Failed to restore state:', e)
        }
      } else {
        const newId = generateExternalAppId()
        setExternalAppId(newId)
        // New users start at welcome step
        setStep('welcome')
      }
      setInitialized(true)
    }
    restoreState()
  }, [])

  const startRegistration = useCallback(async (institution: 'krmu' | 'external') => {
    setIsLoading(true)
    setError(null)
    setIsKrmu(institution === 'krmu')

    const result = await api.startRegistration(externalAppId, institution)
    if (result.success) {
      advanceStep(institution === 'krmu' ? 'roll-number' : 'email')
    } else {
      setError(result.message || 'Failed to start registration')
    }
    setIsLoading(false)
  }, [externalAppId])

  const submitRollNumber = useCallback(async (rollNumber: string) => {
    setIsLoading(true)
    setError(null)

    const result = await api.submitRollNumber(externalAppId, rollNumber)
    if (result.success && result.data) {
      const data = result.data as any
      setEmail(data.email)
      
      if (data.alreadyVerified) {
        if (data.state === 'FRESHER_SELECTION') {
          advanceStep('fresher')
        } else if (data.state === 'DISPLAY_FEE') {
          setUserDetails({
            name: data.name || '',
            email: data.email || '',
            rollNumber: data.rollNumber || undefined,
            course: data.course || '',
            year: data.year || '',
          })
          setFeeAmount(data.feeAmount || 500)
          advanceStep('display-fee')
        } else if (data.state === 'ENTER_NAME' || data.state === 'MANUAL_DETAILS') {
          advanceStep('details')
        }
      } else {
        advanceStep('otp')
      }
    } else {
      setError(result.message || 'Invalid roll number')
    }
    setIsLoading(false)
  }, [externalAppId])

  const submitEmail = useCallback(async (emailInput: string) => {
    setIsLoading(true)
    setError(null)

    const result = await api.submitEmail(externalAppId, emailInput)
    if (result.success) {
      setEmail(emailInput)
      advanceStep('otp')
    } else {
      setError(result.message || 'Invalid email')
    }
    setIsLoading(false)
  }, [externalAppId])

  const requestOtp = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await api.requestOtp(externalAppId)
    if (!result.success) {
      const data = result.data as any
      if (data?.alreadyVerified) {
        const state = data.state
        if (state === 'FRESHER_SELECTION') {
          advanceStep('fresher')
        } else if (state === 'DISPLAY_FEE') {
          setUserDetails({
            name: data.name || '',
            email: data.email || '',
            rollNumber: data.rollNumber || undefined,
            course: data.course || '',
            year: data.year || '',
          })
          setFeeAmount(data.feeAmount || 500)
          advanceStep('display-fee')
        } else if (state === 'ENTER_NAME' || state === 'MANUAL_DETAILS') {
          advanceStep('details')
        }
        setIsLoading(false)
        return
      }
      setError(result.message || 'Failed to send OTP')
    }
    setIsLoading(false)
  }, [externalAppId])

  const verifyOtp = useCallback(async (otp: string) => {
    setIsLoading(true)
    setError(null)

    const result = await api.verifyOtp(externalAppId, otp)
    if (result.success && result.data) {
      const data = result.data as any
      const state = data.state
      if (state === 'FRESHER_SELECTION') {
        advanceStep('fresher')
      } else if (state === 'DISPLAY_FEE') {
        setUserDetails({
          name: data.name || '',
          email: data.email || '',
          rollNumber: data.rollNumber || undefined,
          course: data.course || '',
          year: data.year || '',
        })
        setFeeAmount(data.feeAmount || 500)
        advanceStep('display-fee')
      } else if (state === 'ENTER_NAME' || state === 'MANUAL_DETAILS') {
        advanceStep('details')
      }
    } else {
      setError(result.message || 'Invalid OTP')
    }
    setIsLoading(false)
  }, [externalAppId])

   const submitDetails = useCallback(async (name: string, course: string, year: string, college?: string) => {
    setIsLoading(true)
    setError(null)

    const result = await api.submitDetails(externalAppId, name, course, year, college)
    if (result.success && result.data) {
      setReferenceId(result.data.referenceId)
      setPaymentLink(result.data.paymentLink)
      setFeeAmount(isKrmu ? 500 : 700)
      advanceStep('reference-id')
    } else {
      setError(result.message || 'Failed to create registration')
    }
    setIsLoading(false)
  }, [externalAppId, isKrmu])

  const confirmDetails = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await api.confirmDetails(externalAppId)
    if (result.success && result.data) {
      setReferenceId(result.data.referenceId)
      setPaymentLink(result.data.paymentLink)
      setIsFresher(result.data.isFresher)
      setFeeAmount(isKrmu ? 500 : 700)
      advanceStep('reference-id')
    } else {
      setError(result.message || 'Failed to confirm details')
    }
    setIsLoading(false)
  }, [externalAppId, isKrmu])

  const proceedToPayment = useCallback(() => {
    advanceStep('payment')
  }, [])

  const proceedPastWelcome = useCallback(() => {
    advanceStep('select-institution')
  }, [])

  const submitFresher = useCallback(async (fresher: boolean) => {
    setIsLoading(true)
    setError(null)

    const result = await api.submitFresher(externalAppId, fresher)
    if (result.success && result.data) {
      setReferenceId(result.data.referenceId)
      setPaymentLink(result.data.paymentLink)
      setIsFresher(fresher)
      setFeeAmount(isKrmu ? 500 : 700)
      advanceStep('reference-id')
    } else {
      setError(result.message || 'Failed to create registration')
    }
    setIsLoading(false)
  }, [externalAppId, isKrmu])

  const confirmPayment = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await api.confirmPayment(referenceId)
    if (result.success) {
      advanceStep('completed')
      await checkStatus()
    } else {
      setError(result.message || 'Failed to confirm payment')
    }
    setIsLoading(false)
  }, [referenceId])

  const checkStatus = useCallback(async () => {
    const result = await api.getRegistrationStatus(externalAppId)
    if (result.success && result.data) {
      setRegistrationStatus(result.data)
      if (result.data.registration?.feePaid) {
        setReferenceId(result.data.registration.referenceId)
        if (result.data.registration.hasQrCode) {
          advanceStep('ticket')
        }
      }
    }
  }, [externalAppId])

  return (
    <RegistrationContext.Provider
      value={{
        step,
        externalAppId,
        email,
        referenceId,
        paymentLink,
        isKrmu,
        isFresher,
        feeAmount,
        isLoading,
        error,
        registrationStatus,
        userDetails,
        goBack,
        startRegistration,
        submitRollNumber,
        submitEmail,
        requestOtp,
        verifyOtp,
        submitDetails,
        confirmDetails,
        proceedToPayment,
        proceedPastWelcome,
        submitFresher,
        confirmPayment,
        checkStatus,
        reset,
        restart,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  )
}

export function useRegistration() {
  const context = useContext(RegistrationContext)
  if (context === undefined) {
    throw new Error('useRegistration must be used within a RegistrationProvider')
  }
  return context
}