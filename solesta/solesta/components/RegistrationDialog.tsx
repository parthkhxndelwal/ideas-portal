"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useRegistration } from '@/hooks/useRegistration'
import {
  InstitutionSelector,
  RollNumberInput,
  EmailInput,
  OtpInput,
  DetailsInput,
  FresherSelector,
  PaymentStep,
  CompletedStep,
  TicketStep,
} from '@/components/registration'

interface RegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegistrationDialog({ open, onOpenChange }: RegistrationDialogProps) {
  const { step, reset } = useRegistration()

  const handleClose = () => {
    onOpenChange(false)
    reset()
  }

  const renderStep = () => {
    switch (step) {
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
      case 'fresher':
        return <FresherSelector />
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
      case 'fresher':
        return 'Fresher Competition'
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
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {step === 'completed' || step === 'ticket'
              ? 'Thank you for registering!'
              : 'Complete the steps below to register for Solesta \'26'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {renderStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}