import { PrismaClient } from "@prisma/client"
import bcryptjs from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { username: "admin" },
    })

    if (existingAdmin) {
      console.log("Admin user already exists")
      return
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash("solesta2026", 10)

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        username: "admin",
        password: hashedPassword,
        name: "Administrator",
      },
    })

    console.log("✓ Admin user created successfully")
    console.log(`  Username: ${admin.username}`)
    console.log(`  Name: ${admin.name}`)
  } catch (error) {
    console.error("Error seeding database:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
