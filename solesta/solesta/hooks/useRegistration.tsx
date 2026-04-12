"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { api, generateExternalAppId, RegistrationStatus } from '@/lib/api'

type RegistrationStep =
  | 'select-institution'
  | 'roll-number'
  | 'email'
  | 'otp'
  | 'details'
  | 'fresher'
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
  startRegistration: (institution: 'krmu' | 'external') => Promise<void>
  submitRollNumber: (rollNumber: string) => Promise<void>
  submitEmail: (email: string) => Promise<void>
  requestOtp: () => Promise<void>
  verifyOtp: (otp: string) => Promise<void>
  submitDetails: (name: string, course: string, year: string, college?: string) => Promise<void>
  submitFresher: (isFresher: boolean) => Promise<void>
  confirmPayment: () => Promise<void>
  checkStatus: () => Promise<void>
  reset: () => void
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined)

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<RegistrationStep>('select-institution')
  const [externalAppId, setExternalAppId] = useState(generateExternalAppId())
  const [email, setEmail] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [isKrmu, setIsKrmu] = useState(false)
  const [isFresher, setIsFresher] = useState<boolean | null>(null)
  const [feeAmount, setFeeAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null)

  const startRegistration = useCallback(async (institution: 'krmu' | 'external') => {
    setIsLoading(true)
    setError(null)
    setIsKrmu(institution === 'krmu')

    const result = await api.startRegistration(externalAppId, institution)
    if (result.success) {
      setStep(institution === 'krmu' ? 'roll-number' : 'email')
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
      setEmail(result.data.email)
      setStep('otp')
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
      setStep('otp')
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
      setError(result.message || 'Failed to send OTP')
    }
    setIsLoading(false)
  }, [externalAppId])

  const verifyOtp = useCallback(async (otp: string) => {
    setIsLoading(true)
    setError(null)

    const result = await api.verifyOtp(externalAppId, otp)
    if (result.success && result.data) {
      const state = result.data.state
      if (state === 'FRESHER_SELECTION') {
        setStep('fresher')
      } else if (state === 'ENTER_NAME' || state === 'MANUAL_DETAILS') {
        setStep('details')
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
      setStep('payment')
    } else {
      setError(result.message || 'Failed to create registration')
    }
    setIsLoading(false)
  }, [externalAppId, isKrmu])

  const submitFresher = useCallback(async (fresher: boolean) => {
    setIsLoading(true)
    setError(null)

    const result = await api.submitFresher(externalAppId, fresher)
    if (result.success && result.data) {
      setReferenceId(result.data.referenceId)
      setPaymentLink(result.data.paymentLink)
      setIsFresher(fresher)
      setFeeAmount(isKrmu ? 500 : 700)
      setStep('payment')
    } else {
      setError(result.message || 'Failed to create registration')
    }
    setIsLoading(false)
  }, [externalAppId, isKrmu])

  const confirmPayment = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await api.confirmPayment(externalAppId, referenceId)
    if (result.success) {
      setStep('completed')
      await checkStatus()
    } else {
      setError(result.message || 'Failed to confirm payment')
    }
    setIsLoading(false)
  }, [externalAppId, referenceId])

  const checkStatus = useCallback(async () => {
    const result = await api.getRegistrationStatus(externalAppId)
    if (result.success && result.data) {
      setRegistrationStatus(result.data)
      if (result.data.registration?.feePaid) {
        setReferenceId(result.data.registration.referenceId)
        if (result.data.registration.hasQrCode) {
          setStep('ticket')
        }
      }
    }
  }, [externalAppId])

  const reset = useCallback(() => {
    setStep('select-institution')
    setEmail('')
    setReferenceId('')
    setPaymentLink('')
    setIsKrmu(false)
    setIsFresher(null)
    setFeeAmount(0)
    setError(null)
    setRegistrationStatus(null)
    setExternalAppId(generateExternalAppId())
  }, [])

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
        startRegistration,
        submitRollNumber,
        submitEmail,
        requestOtp,
        verifyOtp,
        submitDetails,
        submitFresher,
        confirmPayment,
        checkStatus,
        reset,
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