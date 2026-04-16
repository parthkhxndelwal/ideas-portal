import { prisma } from "@/lib/server/prisma"

/**
 * Validates scanner API key
 * Checks if the provided key exists and is active
 */
export async function validateScannerApiKey(apiKey: string): Promise<boolean> {
  try {
    if (!apiKey) {
      return false
    }

    // Check for master key (for development/setup)
    const masterKey = process.env.SCANNER_MASTER_KEY
    if (masterKey && apiKey === masterKey) {
      return true
    }

    // Check if API key exists and is active
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
    })

    if (!key || !key.isActive) {
      return false
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { key: apiKey },
      data: { lastUsedAt: new Date() },
    })

    return true
  } catch (error) {
    console.error("Error validating API key:", error)
    return false
  }
}

/**
 * Generate a new API key for scanner devices
 */
export async function generateScannerApiKey(name: string): Promise<string> {
  try {
    const key = `scanner_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    
    await prisma.apiKey.create({
      data: {
        key,
        name,
        isActive: true,
      },
    })

    return key
  } catch (error) {
    console.error("Error generating API key:", error)
    throw error
  }
}

/**
 * Deactivate an API key
 */
export async function deactivateScannerApiKey(key: string): Promise<void> {
  try {
    await prisma.apiKey.update({
      where: { key },
      data: { isActive: false },
    })
  } catch (error) {
    console.error("Error deactivating API key:", error)
    throw error
  }
}
