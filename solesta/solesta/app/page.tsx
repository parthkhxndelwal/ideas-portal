"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { RegistrationDialog } from "@/components/RegistrationDialog"
import { CheckStatusDialog } from "@/components/CheckStatusDialog"
import { ContactDialog } from "@/components/ContactDialog"

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#5B1A1B]">
      {/* Background Image */}
      {/* Mobile Background - 100% height, horizontally centered */}
      <div
        className="absolute inset-0 md:hidden"
        style={{ filter: "brightness(0.8)" }}
      >
        <Image
          src="/solesta-bg.jpeg"
          alt="Solesta 26 Mobile"
          fill
          className="object-cover"
          priority
          unoptimized
        />
      </div>

      {/* Desktop Background - 100% width, vertically centered */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{ filter: "brightness(0.8)" }}
      >
        <Image
          src="/solesta-bg.jpeg"
          alt="Solesta 26 Desktop"
          fill
          className="object-cover"
          priority
          unoptimized
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Frame Image - Centered in middle on desktop */}
        <div className="flex flex-1 items-center justify-center md:flex-1">
          <div className="relative mb-4 h-96 w-96 md:h-96 md:w-96 md:scale-[1.8]">
            <Image
              src="/Frame.svg"
              alt="Solesta Frame"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        </div>

        {/* Bottom section - Register, Links, Terms */}
        <div className="flex flex-col items-center gap-4 px-4 pb-4 md:pb-6">
          {/* Register Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-full bg-white px-6 py-3 text-base font-semibold text-black shadow-lg transition-shadow hover:shadow-xl md:px-10 md:py-4 md:text-xl"
          >
            Register <span className="font-bold">Now!</span>
          </button>

          {/* Navigation Links */}
          <div className="flex items-center justify-center gap-2 rounded-lg bg-black/40 px-3 py-2 md:gap-4 md:rounded-full md:px-4 md:py-1">
            <Button
              variant="link"
              onClick={() => setIsStatusOpen(true)}
              className="text-xs whitespace-nowrap text-white md:text-base"
            >
              Check Status
            </Button>
            <Button
              variant="link"
              asChild
              className="text-xs whitespace-nowrap text-white md:text-base"
            >
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSfeM5KvrB3Q7Kkwr78HKP57Qxn9vTBDuelTH9EHEuze6FFw9A/viewform"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mr. & Ms. Fresher
              </a>
            </Button>
            <Button
              variant="link"
              onClick={() => setIsContactOpen(true)}
              className="text-xs whitespace-nowrap text-white md:text-base"
            >
              Contact
            </Button>
          </div>

          {/* Privacy Policy Line */}
          <p className="text-center text-xs text-muted-foreground md:text-sm">
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
      </div>

      {/* Dialogs */}
      <RegistrationDialog open={isModalOpen} onOpenChange={setIsModalOpen} />
      <CheckStatusDialog open={isStatusOpen} onOpenChange={setIsStatusOpen} />
      <ContactDialog open={isContactOpen} onOpenChange={setIsContactOpen} />
    </div>
  )
}
