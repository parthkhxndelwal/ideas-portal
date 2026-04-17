"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library"
import { AlertCircle, Loader2 } from "lucide-react"

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: Error) => void
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const scanActiveRef = useRef(false)

  const handleScan = useCallback(
    (text: string) => {
      if (scanActiveRef.current) {
        scanActiveRef.current = false
        onScan(text)
      }
    },
    [onScan]
  )

  useEffect(() => {
    let isMounted = true
    scanActiveRef.current = true

    const initCamera = async () => {
      try {
        // Wait for DOM to be ready
        await new Promise((resolve) => setTimeout(resolve, 100))

        if (!isMounted || !videoRef.current) {
          if (isMounted) {
            setError("Camera element not ready")
          }
          return
        }

        const codeReader = new BrowserMultiFormatReader()
        codeReaderRef.current = codeReader

        // Try to get devices - this will prompt for permissions
        let devices = await codeReader.listVideoInputDevices()

        if (devices.length === 0) {
          // Retry once more in case permission was just granted
          await new Promise((resolve) => setTimeout(resolve, 500))
          devices = await codeReader.listVideoInputDevices()

          if (devices.length === 0) {
            if (isMounted) {
              setError("No camera devices found. Please check your device.")
            }
            return
          }
        }

        if (!isMounted) return

        const selectedDeviceId = devices[0].deviceId

        try {
          await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.current,
            (result, err) => {
              if (result && isMounted) {
                handleScan(result.getText())
              }
              if (err && !(err instanceof NotFoundException)) {
                console.debug("Scanning error:", err.message)
              }
            }
          )

          if (isMounted) {
            setIsInitializing(false)
            setError(null)
          }
        } catch (decodeErr) {
          if (isMounted) {
            const msg =
              decodeErr instanceof Error
                ? decodeErr.message
                : "Failed to start camera"
            setError(msg)
            setIsInitializing(false)
          }
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to initialize camera"
          setError(errorMessage)
          setIsInitializing(false)
          if (onError) onError(err as Error)
        }
      }
    }

    initCamera()

    return () => {
      isMounted = false
      scanActiveRef.current = false
      if (codeReaderRef.current) {
        codeReaderRef.current.reset()
      }
    }
  }, [handleScan, onError])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <AlertCircle className="mb-3 h-12 w-12 text-red-600 dark:text-red-400" />
        <p className="mb-2 text-center font-medium text-red-800 dark:text-red-200">
          Camera Error
        </p>
        <p className="text-center text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
        <p className="mt-4 text-center text-xs text-red-600 dark:text-red-400">
          Please check camera permissions and try again.
        </p>
      </div>
    )
  }

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-900">
        <Loader2 className="mb-3 h-12 w-12 animate-spin text-gray-400 dark:text-gray-600" />
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Initializing camera...
        </p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-blue-300 bg-black dark:border-blue-700">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="aspect-square w-full object-cover"
        style={{ display: "block" }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg
          className="h-64 w-64 text-blue-400 opacity-30"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 10 10 L 30 10 L 30 30 L 10 30 Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M 70 10 L 90 10 L 90 30 L 70 30 Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M 10 70 L 30 70 L 30 90 L 10 90 Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M 70 70 L 90 70 L 90 90 L 70 90 Z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  )
}
