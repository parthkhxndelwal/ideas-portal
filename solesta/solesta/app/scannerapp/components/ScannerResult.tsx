"use client"

import { CheckCircle, XCircle, Clock } from "lucide-react"

interface ScannerResultProps {
  status: "idle" | "loading" | "success" | "error"
  message: string
  data?: {
    name: string
    email: string
    rollNumber?: string
    courseAndSemester?: string
    scannedAt?: string
  }
}

export function ScannerResult({ status, message, data }: ScannerResultProps) {
  if (status === "idle") {
    return null
  }

  if (status === "loading") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <div className="flex items-center">
          <Clock className="mr-3 h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-blue-800 dark:text-blue-200">
            Processing scan...
          </span>
        </div>
      </div>
    )
  }

  const isSuccess = status === "success"

  return (
    <div
      className={`rounded-lg border p-4 ${
        isSuccess
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
          : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
      }`}
    >
      <div className="flex items-start gap-3">
        {isSuccess ? (
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
        )}
        <div className="flex-1">
          <p
            className={`font-medium ${
              isSuccess
                ? "text-green-800 dark:text-green-200"
                : "text-red-800 dark:text-red-200"
            }`}
          >
            {message}
          </p>
          {data && isSuccess && (
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-neutral-700 dark:text-neutral-300">
                <span className="font-medium">Name:</span> {data.name}
              </p>
              <p className="text-neutral-700 dark:text-neutral-300">
                <span className="font-medium">Email:</span> {data.email}
              </p>
              {data.rollNumber && (
                <p className="text-neutral-700 dark:text-neutral-300">
                  <span className="font-medium">Roll Number:</span>{" "}
                  {data.rollNumber}
                </p>
              )}
              {data.courseAndSemester && (
                <p className="text-neutral-700 dark:text-neutral-300">
                  <span className="font-medium">Course:</span>{" "}
                  {data.courseAndSemester}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
