"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Trash2, Plus, Loader2, AlertCircle, Check } from "lucide-react"

interface ApiKey {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  lastUsedAt: string | null
}

export function ScannerApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState("")
  const [generatedKey, setGeneratedKey] = useState<{
    key: string
    name: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/scanner/api-keys")
      if (!response.ok) throw new Error("Failed to fetch API keys")

      const data = await response.json()
      setApiKeys(data.keys || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch API keys")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) {
      setError("Please enter a name for the API key")
      return
    }

    try {
      setGenerating(true)
      setError(null)

      const response = await fetch("/api/admin/scanner/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          name: newKeyName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to generate API key")
      }

      const data = await response.json()
      setGeneratedKey({
        key: data.apiKey,
        name: data.name,
      })
      setNewKeyName("")
      await fetchApiKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate API key")
    } finally {
      setGenerating(false)
    }
  }

  const handleDeactivateKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to deactivate this API key?")) return

    try {
      setDeleting(keyId)
      setError(null)

      const response = await fetch("/api/admin/scanner/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deactivate",
          keyId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to deactivate API key")
      }

      await fetchApiKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate API key")
    } finally {
      setDeleting(null)
    }
  }

  const handleCopyKey = () => {
    if (!generatedKey) return
    navigator.clipboard.writeText(generatedKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Generated Key Display */}
      {generatedKey && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <div className="mb-3 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              API Key Generated Successfully
            </h3>
          </div>
          <p className="mb-2 text-sm text-green-700 dark:text-green-300">
            <strong>Name:</strong> {generatedKey.name}
          </p>
          <div className="mb-3 rounded bg-white p-3 font-mono text-sm dark:bg-neutral-900">
            {generatedKey.key}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCopyKey}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy Key"}
            </Button>
            <p className="flex items-center text-xs text-green-600 dark:text-green-400">
              Keep this key safe. You won't be able to see it again.
            </p>
          </div>
        </div>
      )}

      {/* Generate New Key Form */}
      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="mb-4 font-semibold text-neutral-900 dark:text-neutral-100">
          Generate New API Key
        </h3>
        <form onSubmit={handleGenerateKey} className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Main Gate, Registration Desk"
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              disabled={generating}
            />
          </div>
          <Button
            type="submit"
            disabled={generating || !newKeyName.trim()}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Generate API Key
              </>
            )}
          </Button>
        </form>
      </div>

      {/* API Keys List */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Active API Keys ({apiKeys.length})
          </h3>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {apiKeys.length === 0 ? (
            <div className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No API keys generated yet
            </div>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <div className="flex-1">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {key.name}
                  </p>
                  <div className="mt-1 flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>Created: {formatDate(key.createdAt)}</span>
                    <span>Last used: {formatDate(key.lastUsedAt)}</span>
                    <span
                      className={`inline-block w-fit rounded px-2 py-1 ${
                        key.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {key.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => handleDeactivateKey(key.id)}
                  disabled={!key.isActive || deleting === key.id}
                  variant="outline"
                  className="ml-4 flex items-center gap-2"
                >
                  {deleting === key.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Deactivating...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {key.isActive ? "Deactivate" : "Inactive"}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <h4 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
          ℹ️ How to use API Keys
        </h4>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• Generate a new API key for each scanning device</li>
          <li>• Share the key with device operators</li>
          <li>• Users enter the key in the mobile app on first launch</li>
          <li>• Deactivate a key if a device is lost or compromised</li>
          <li>• Track device usage via "Last used" timestamp</li>
        </ul>
      </div>
    </div>
  )
}
