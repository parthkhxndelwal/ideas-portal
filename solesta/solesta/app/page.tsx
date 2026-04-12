"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { RegistrationDialog } from "@/components/RegistrationDialog"
import { CheckStatusDialog } from "@/components/CheckStatusDialog"

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDesktop(window.innerWidth >= 768)
  }, [])

  if (!mounted) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#5B1A1B]">
        <div className="absolute inset-0">
          <Image
            src="/Mobile.png"
            alt="Solesta 26 Mobile"
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      </div>
    )
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
            className="absolute bottom-[5%] left-1/2 h-[12%] w-[80%] -translate-x-1/2 cursor-pointer"
            aria-label="Register"
          />
        </div>
      )}

      {isDesktop && (
        <div className="relative z-10 flex min-h-screen flex-col">
          <main className="flex flex-1 items-end justify-center pb-8 md:pb-16">
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-full bg-white px-10 py-4 text-xl font-semibold text-black shadow-lg transition-shadow hover:shadow-xl"
              >
                Register <span className="font-bold">Now!</span>
              </button>
              <div className="flex gap-4">
                <Button
                  variant="link"
                  onClick={() => setIsStatusOpen(true)}
                  className="text-white"
                >
                  Check Status
                </Button>
              </div>
              <p className="px-4 text-center text-sm text-muted-foreground">
                by clicking register you agree to our{" "}
                <a href="#" className="underline hover:text-foreground">
                  terms of service
                </a>{" "}
                and{" "}
                <a href="#" className="underline hover:text-foreground">
                  privacy policy
                </a>
              </p>
            </div>
          </main>
        </div>
      )}

      <RegistrationDialog open={isModalOpen} onOpenChange={setIsModalOpen} />
      <CheckStatusDialog open={isStatusOpen} onOpenChange={setIsStatusOpen} />
    </div>
  )
}