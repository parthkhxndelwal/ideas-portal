"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useRegistration } from '@/hooks/useRegistration'
import {
  InstitutionSelector,
  WelcomeStep,
  RollNumberInput,
  EmailInput,
  OtpInput,
  DetailsInput,
  FresherSelector,
  ReferenceIdStep,
  PaymentStep,
  CompletedStep,
  TicketStep,
  DisplayFeeStep,
} from '@/components/registration'

interface RegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegistrationDialog({ open, onOpenChange }: RegistrationDialogProps) {
  const { step, proceedPastWelcome } = useRegistration()

  const handleClose = () => {
    onOpenChange(false)
  }

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeStep onProceed={proceedPastWelcome} />
      case 'select-institution':
        return <InstitutionSelector />
      case 'roll-number':
        return <RollNumberInput />
      case 'email':
        return <EmailInput />
      case 'otp':
        return <OtpInput />
      case 'details':
        return <DetailsInput />
      case 'display-fee':
        return <DisplayFeeStep />
      case 'fresher':
        return <FresherSelector />
      case 'reference-id':
        return <ReferenceIdStep />
      case 'payment':
        return <PaymentStep />
      case 'completed':
        return <CompletedStep />
      case 'ticket':
        return <TicketStep />
      default:
        return <InstitutionSelector />
    }
  }

  const getTitle = () => {
    switch (step) {
      case 'welcome':
        return 'Welcome to Solesta \'26'
      case 'select-institution':
        return 'Join Solesta \'26'
      case 'roll-number':
        return 'KRMU Registration'
      case 'email':
        return 'External Registration'
      case 'otp':
        return 'Verify Email'
      case 'details':
        return 'Your Details'
      case 'display-fee':
        return 'Confirm Details'
      case 'fresher':
        return 'Fresher Competition'
      case 'reference-id':
        return 'Reference ID'
      case 'payment':
        return 'Complete Payment'
      case 'completed':
        return 'Registration Complete'
      case 'ticket':
        return 'Your Ticket'
      default:
        return 'Solesta \'26'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {step !== 'completed' && step !== 'ticket' && (
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>
              {step === 'display-fee'
              ? 'Verify your information before proceeding'
              : 'Complete the steps below to register for Solesta \'26'}
            </DialogDescription>
          </DialogHeader>
        )}
        
        {step === 'completed' && (
          <DialogHeader>
            <DialogTitle>Registration Complete</DialogTitle>
            <DialogDescription>Thank you for registering!</DialogDescription>
          </DialogHeader>
        )}
        
        {step === 'ticket' && (
          <DialogHeader>
            <DialogTitle>Your Ticket</DialogTitle>
          </DialogHeader>
        )}
        
        <div className="mt-4">
          {renderStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}