'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768)
  }, [])

  const handleTelegramRedirect = () => {
    window.open('https://t.me/krmu_ticket_bot?start=register', '_blank')
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#5B1A1B]">
      {isDesktop && (
        <div className="absolute inset-0">
          <Image
            src="/Desktop.png"
            alt="Solesta 26 Desktop"
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>
      )}

      {!isDesktop && (
        <div className="absolute inset-0">
          <Image
            src="/Mobile.png"
            alt="Solesta 26 Mobile"
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[80%] h-[12%] cursor-pointer"
            aria-label="Register"
          />
        </div>
      )}

      {isDesktop && (
        <div className="relative z-10 flex flex-col min-h-screen">
          <main className="flex-1 flex items-end justify-center pb-8 md:pb-16">
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-white text-black px-10 py-4 rounded-full font-semibold text-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                Register <span className="font-bold">Now!</span>
              </button>
              <p className="text-sm text-muted-foreground text-center px-4">
                by clicking register you agree to our{' '}
                <a href="#" className="underline hover:text-foreground">
                  terms of service
                </a>{' '}
                and{' '}
                <a href="#" className="underline hover:text-foreground">
                  privacy policy
                </a>
              </p>
            </div>
          </main>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Solesta &apos;26</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p>To register for Solesta &apos;26, please follow these steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-foreground">
              <li>Login to your Telegram account</li>
              <li>Click the button below to open our bot</li>
              <li>Press the <strong>Start</strong> button in the bot</li>
            </ol>
            <p className="text-sm text-muted-foreground">
              Our bot will guide you through the registration process.
            </p>
          </div>
          <div className="flex justify-center mt-4">
            <Button
              onClick={handleTelegramRedirect}
              className="bg-black hover:bg-black/90 text-white text-xl px-12 py-6 rounded-3xl"
            >
              Book Tickets
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}