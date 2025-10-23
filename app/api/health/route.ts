import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Basic health check
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      service: "Ideas Portal API",
      environment: process.env.NODE_ENV || "development",
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    console.error("Health check failed:", error)

    const unhealthy = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Internal server error",
      uptime: process.uptime(),
      version: "1.0.0",
      service: "Ideas Portal API",
      environment: process.env.NODE_ENV || "development",
    }

    return NextResponse.json(unhealthy, { status: 503 })
  }
}