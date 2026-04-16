import { NextRequest, NextResponse } from "next/server"

/**
 * CORS Configuration for Solesta Scanner Integration
 * Handles Cross-Origin Resource Sharing for mobile app and cross-domain requests
 */

const ALLOWED_ORIGINS = [
  // Local development
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",

  // Expo Go (uses dynamic IPs)
  "http://localhost:19000", // Expo Go web
  "http://localhost:19001",

  // Production domains
  "https://solesta.krmangalam.edu.in",
  "https://www.solesta.krmangalam.edu.in",

  // Development/Staging
  "https://staging.solesta.krmangalam.edu.in",
  "https://dev.solesta.krmangalam.edu.in",

  // Mobile app scanning (Expo Go doesn't require CORS origin)
  // Mobile apps use native fetch, so they don't send browser CORS headers
  // However, we allow requests without Origin header or with null origin
]

const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]

const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-API-Key",
  "X-Request-ID",
  "X-Device-ID",
  "X-App-Version",
]

/**
 * Get CORS headers for a response
 * @param request - The incoming request
 * @returns Response headers with CORS configuration
 */
export function getCorsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin")

  // Check if origin is allowed
  const isOriginAllowed =
    !origin || // No origin header (typical for mobile apps)
    origin === "null" || // Null origin (some mobile contexts)
    ALLOWED_ORIGINS.includes(origin) || // Explicitly allowed origin
    origin?.includes("localhost") || // Any localhost
    origin?.includes("127.0.0.1") // Any local IP

  const headers: HeadersInit = {
    "Access-Control-Allow-Methods": ALLOWED_METHODS.join(", "),
    "Access-Control-Allow-Headers": ALLOWED_HEADERS.join(", "),
    "Access-Control-Max-Age": "86400", // 24 hours
    "Access-Control-Allow-Credentials": "true",
  }

  if (isOriginAllowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin
  } else if (isOriginAllowed && !origin) {
    // For requests without origin (mobile apps), allow all
    headers["Access-Control-Allow-Origin"] = "*"
  }

  return headers
}

/**
 * Handle CORS preflight requests (OPTIONS)
 * @param request - The incoming request
 * @returns Preflight response
 */
export function handleCorsPreFlight(request: NextRequest): NextResponse {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: getCorsHeaders(request),
    })
  }

  return null as any // Not a preflight request
}

/**
 * Wrap an API response with CORS headers
 * @param response - The NextResponse to wrap
 * @param request - The incoming request
 * @returns Response with CORS headers added
 */
export function withCorsHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const corsHeaders = getCorsHeaders(request)

  // Add all CORS headers to the response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value as string)
  })

  return response
}

/**
 * Wrapper for API routes that need CORS support
 * Usage:
 * export async function GET(request: NextRequest) {
 *   return withCors(request, async () => {
 *     // Your route logic here
 *     return NextResponse.json({ data: "..." })
 *   })
 * }
 */
export async function withCors(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return handleCorsPreFlight(request) || new NextResponse(null, { status: 200 })
  }

  try {
    const response = await handler()
    return withCorsHeaders(response, request)
  } catch (error) {
    console.error("API error:", error)
    return withCorsHeaders(
      NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
      request
    )
  }
}
