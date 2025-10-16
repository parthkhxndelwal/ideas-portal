import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { hashPassword } from "@/lib/auth"

export async function POST(_request: NextRequest) {
  try {
    // Check if admin already exists
    const existingAdmin = await Database.findUserByEmail("admin@admin.com")
    if (existingAdmin) {
      return NextResponse.json({ message: "Admin user already exists" }, { status: 200 })
    }

    // Create admin user
    const hashedPassword = await hashPassword("admin123")
    const adminUser = await Database.createUser({
      email: "admin@admin.com",
      password: hashedPassword,
      name: "System Administrator",
      role: "admin",
      rollNumber: "ADMIN001",
      isEmailVerified: true,
      registrationStatus: "confirmed",
      paymentStatus: "completed",
    })

    console.log("Admin user created:", adminUser._id)
    return NextResponse.json({ 
      message: "Admin user created successfully",
      email: "admin@admin.com",
      defaultPassword: "admin123"
    })
  } catch (error) {
    console.error("Error creating admin user:", error)
    return NextResponse.json({ error: "Failed to create admin user" }, { status: 500 })
  }
}