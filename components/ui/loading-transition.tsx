"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface LoadingTransitionProps {
  isLoading: boolean
  children: React.ReactNode
  className?: string
}

interface Particle {
  id: number
  left: string
  top: string
  animationDelay: string
  animationDuration: string
}

// Test mode variable - set to false for normal behavior
const Test = false

export function LoadingTransition({ isLoading, children, className = "" }: LoadingTransitionProps) {
  const [showLoading, setShowLoading] = useState(isLoading)
  const [animateOut, setAnimateOut] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [isClient, setIsClient] = useState(false)
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null)
  const [waitingForTap, setWaitingForTap] = useState(false)

  // Initialize particles only on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)
    const particleArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${3 + Math.random() * 2}s`
    }))
    setParticles(particleArray)
  }, [])

  useEffect(() => {
    if (isLoading) {
      setShowLoading(true)
      setAnimateOut(false)
      setWaitingForTap(false)

      if (!loadingStartTime) {
        setLoadingStartTime(Date.now())
      }
    } else if (loadingStartTime) {
      if (Test) {
        // Test mode: Wait for user tap after minimum loading time
        const elapsedTime = Date.now() - loadingStartTime
        const minLoadingTime = 2000 // 2 seconds minimum
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime)

        const timer = setTimeout(() => {
          setWaitingForTap(true)
        }, remainingTime)

        return () => clearTimeout(timer)
      } else {
        // Normal mode: Original behavior
        const elapsedTime = Date.now() - loadingStartTime
        const minLoadingTime = 100 // 2 seconds minimum
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime)

        const timer = setTimeout(() => {
          setAnimateOut(true)
          const animationTimer = setTimeout(() => {
            setShowLoading(false)
            setLoadingStartTime(null)
          }, 800)

          return () => clearTimeout(animationTimer)
        }, remainingTime)

        return () => clearTimeout(timer)
      }
    }
  }, [isLoading, loadingStartTime])

  // Handle tap/click to dismiss loading in test mode
  const handleScreenTap = () => {
    if (Test && waitingForTap) {
      setAnimateOut(true)
      const _animationTimer = setTimeout(() => {
        setShowLoading(false)
        setLoadingStartTime(null)
        setWaitingForTap(false)
      }, 800)
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Content */}
      <div 
        className={`transition-all duration-800 ease-in-out ${
          showLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {children}
      </div>

      {/* Loading Overlay */}
      {showLoading && (
        <div 
          className={`fixed inset-0 z-50 bg-neutral-900 flex items-center justify-center transition-transform duration-800 ease-in-out ${
            animateOut 
              ? "transform translate-x-full" 
              : "transform translate-x-0"
          } ${Test && waitingForTap ? "cursor-pointer" : ""}`}
          style={{
            background: "linear-gradient(135deg, #200000ff 0%, #06002fff 100%)"
          }}
          onClick={handleScreenTap}
        >
          {/* Loading Content */}
          <div className="text-center relative">
            {/* Logo Animation */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="relative">
                <Image
                  src="/kr-logo.png"
                  alt="KR Mangalam Logo"
                  width={64}
                  height={64}
                  className="rounded-full shadow-2xl transform transition-all duration-1000 hover:scale-110"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
              </div>
              
              <div className="relative">
                <Image
                  src="/ideas-white.png"
                  alt="IDEAS Logo"
                  width={160}
                  height={42}
                  className="drop-shadow-2xl transform transition-all duration-1000 hover:scale-105"
                />
                <div className="absolute -inset-2 bg-gradient-to-r from-red-400/10 to-pink-400/10 blur-sm animate-pulse"></div>
              </div>
            </div>

            {/* Loading Text with Typewriter Effect */}
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white">
                Welcome to IDEAS 3.0
              </h2>
              <p className="text-neutral-300 text-lg">
                KR Mangalam University
              </p>
              

            </div>

            {/* Progress Bar */}
            <div className="mt-8 w-64 mx-auto">
              <div className="w-full bg-neutral-700 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded-full animate-progress"></div>
              </div>
            </div>
          </div>

          {/* Particle Effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {isClient && particles.map((particle) => (
              <div
                key={particle.id}
                className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
                style={{
                  left: particle.left,
                  top: particle.top,
                  animationDelay: particle.animationDelay,
                  animationDuration: particle.animationDuration
                }}
              ></div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}