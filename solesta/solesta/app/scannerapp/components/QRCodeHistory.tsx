"use client"

import { CheckCircle, XCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HistoryItem {
  id: string
  name?: string
  email?: string
  timestamp: string
  approved: boolean
  error?: string
}

interface QRCodeHistoryProps {
  history: HistoryItem[]
  onClear: () => void
}

export function QRCodeHistory({ history, onClear }: QRCodeHistoryProps) {
  if (history.length === 0) {
    return null
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Scan History
        </h2>
        <Button
          onClick={onClear}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="space-y-2">
        {history.slice(0, 10).map((item) => (
          <div
            key={`${item.id}-${item.timestamp}`}
            className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
          >
            <div className="flex flex-1 items-center gap-3">
              {item.approved ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {item.name || item.id}
                </p>
                {item.error && (
                  <p className="truncate text-xs text-red-600 dark:text-red-400">
                    {item.error}
                  </p>
                )}
              </div>
            </div>
            <span className="ml-2 flex-shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
              {formatTime(item.timestamp)}
            </span>
          </div>
        ))}
      </div>

      {history.length > 10 && (
        <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
          Showing last 10 scans of {history.length} total
        </p>
      )}
    </div>
  )
}
