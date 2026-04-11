import { Database } from "../lib/database"
import { hashPassword } from "../lib/auth"

async function createAdmin() {
  try {
    const existingAdmin = await Database.findUserByEmail("admin@admin.com")
    if (existingAdmin) {
      console.log("Admin user already exists")
      return
    }

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

    console.log("Admin created:", adminUser._id)
    console.log("Email: admin@admin.com")
    console.log("Password: admin123")
  } catch (error) {
    console.error("Error:", error)
  }
}

createAdmin()