import clientPromise from "./mongodb"
import type { User, RollNumberData, BlacklistedRollNumber, Transaction, EventConfig } from "./models"

export class Database {
  private static async getDb() {
    try {
      const client = await clientPromise
      return client.db("ideas_portal")
    } catch (error) {
      console.error("Database connection error:", error)
      throw new Error("Failed to connect to database")
    }
  }

  static async createUser(userData: Omit<User, "_id" | "createdAt" | "updatedAt">) {
    try {
      const db = await this.getDb()
      const now = new Date()
      const user = {
        ...userData,
        createdAt: now,
        updatedAt: now,
      }
      const result = await db.collection("users").insertOne(user)
      console.log("User created with ID:", result.insertedId)
      return { ...user, _id: result.insertedId.toString() }
    } catch (error) {
      console.error("Error creating user:", error)
      throw new Error("Failed to create user")
    }
  }

  static async findUserByEmail(email: string) {
    try {
      const db = await this.getDb()
      const user = await db.collection("users").findOne({ email })
      console.log("User lookup result for", email, ":", user ? "found" : "not found")
      return user
    } catch (error) {
      console.error("Error finding user by email:", error)
      throw new Error("Failed to find user")
    }
  }

  static async findUserById(id: string) {
    try {
      const db = await this.getDb()
      const { ObjectId } = require("mongodb")
      const user = await db.collection("users").findOne({ _id: new ObjectId(id) })
      console.log("User lookup by ID result:", user ? "found" : "not found")
      return user
    } catch (error) {
      console.error("Error finding user by ID:", error)
      throw new Error("Failed to find user")
    }
  }

  static async findUserByRollNumber(rollNumber: string) {
    try {
      const db = await this.getDb()
      const user = await db.collection("users").findOne({ rollNumber })
      console.log("User lookup by roll number result:", user ? "found" : "not found")
      return user
    } catch (error) {
      console.error("Error finding user by roll number:", error)
      throw new Error("Failed to find user")
    }
  }

  static async updateUser(id: string, updates: Partial<User>) {
    try {
      const db = await this.getDb()
      const { ObjectId } = require("mongodb")
      const result = await db
        .collection("users")
        .updateOne({ _id: new ObjectId(id) }, { $set: { ...updates, updatedAt: new Date() } })
      console.log("User update result - modified count:", result.modifiedCount)
      return result.modifiedCount > 0
    } catch (error) {
      console.error("Error updating user:", error)
      throw new Error("Failed to update user")
    }
  }

  static async findRollNumberData(rollNumber: string) {
    try {
      const db = await this.getDb()
      const data = await db.collection("rollNumberData").findOne({ rollnumber: rollNumber })
      console.log("Roll number data lookup for", rollNumber, ":", data ? "found" : "not found")
      return data
    } catch (error) {
      console.error("Error finding roll number data:", error)
      throw new Error("Failed to find roll number data")
    }
  }

  static async updateRollNumberDatabase(data: RollNumberData[]) {
    const db = await this.getDb()
    await db.collection("rollNumberData").deleteMany({})
    if (data.length > 0) {
      await db.collection("rollNumberData").insertMany(data)
    }
  }

  static async createEmailVerification(email: string, otp: string) {
    try {
      const db = await this.getDb()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      await db.collection("emailVerifications").deleteMany({ email })
      const verification = {
        email,
        otp,
        expiresAt,
        createdAt: new Date(),
      }
      await db.collection("emailVerifications").insertOne(verification)
      console.log("Email verification created for:", email)
      return verification
    } catch (error) {
      console.error("Error creating email verification:", error)
      throw new Error("Failed to create email verification")
    }
  }

  static async verifyEmailOTP(email: string, otp: string) {
    try {
      const db = await this.getDb()
      const verification = await db.collection("emailVerifications").findOne({
        email,
        otp,
        expiresAt: { $gt: new Date() },
      })
      if (verification) {
        await db.collection("emailVerifications").deleteOne({ _id: verification._id })
        console.log("OTP verified and deleted for:", email)
        return true
      }
      console.log("OTP verification failed for:", email)
      return false
    } catch (error) {
      console.error("Error verifying OTP:", error)
      throw new Error("Failed to verify OTP")
    }
  }

  static async findEmailVerification(email: string) {
    try {
      const db = await this.getDb()
      const verification = await db.collection("emailVerifications").findOne({ email })
      console.log("Email verification lookup for", email, ":", verification ? "found" : "not found")
      return verification
    } catch (error) {
      console.error("Error finding email verification:", error)
      throw new Error("Failed to find email verification")
    }
  }

  static async updateEmailVerification(email: string, otp: string) {
    try {
      const db = await this.getDb()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      const result = await db.collection("emailVerifications").updateOne(
        { email },
        {
          $set: {
            otp,
            expiresAt,
            createdAt: new Date(),
          },
        },
      )
      console.log("Email verification updated for:", email)
      return result.modifiedCount > 0
    } catch (error) {
      console.error("Error updating email verification:", error)
      throw new Error("Failed to update email verification")
    }
  }

  static async createTransaction(transactionData: Omit<Transaction, "_id" | "createdAt" | "updatedAt">) {
    const db = await this.getDb()
    const transaction = {
      ...transactionData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await db.collection("transactions").insertOne(transaction)
    return { ...transaction, _id: result.insertedId.toString() }
  }

  static async updateTransaction(
    transactionId: string, 
    updates: Partial<Omit<Transaction, "_id" | "createdAt">>
  ) {
    const db = await this.getDb()
    return await db.collection("transactions").updateOne(
      { transactionId }, 
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date() 
        } 
      }
    )
  }

  static async updateTransactionByRazorpayOrderId(
    razorpayOrderId: string,
    updates: Partial<Omit<Transaction, "_id" | "createdAt">>
  ) {
    const db = await this.getDb()
    return await db.collection("transactions").updateOne(
      { razorpayOrderId },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    )
  }

  static async findTransaction(transactionId: string) {
    const db = await this.getDb()
    return await db.collection("transactions").findOne({ transactionId })
  }

  static async findTransactionByRazorpayOrderId(razorpayOrderId: string) {
    const db = await this.getDb()
    return await db.collection("transactions").findOne({ razorpayOrderId })
  }

  static async findPendingTransactionsByUserId(userId: string) {
    const db = await this.getDb()
    return await db.collection("transactions").find({ 
      userId, 
      status: "pending" 
    }).sort({ createdAt: -1 }).toArray()
  }

  static async createPasswordReset(email: string, token: string) {
    try {
      const db = await this.getDb()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      await db.collection("passwordResets").deleteMany({ email })
      const resetRecord = {
        email,
        token,
        expiresAt,
        createdAt: new Date(),
      }
      await db.collection("passwordResets").insertOne(resetRecord)
      console.log("Password reset created for:", email)
      return resetRecord
    } catch (error) {
      console.error("Error creating password reset:", error)
      throw new Error("Failed to create password reset")
    }
  }

  static async findPasswordReset(token: string) {
    try {
      const db = await this.getDb()
      const resetRecord = await db.collection("passwordResets").findOne({ token })
      console.log("Password reset lookup:", resetRecord ? "found" : "not found")
      return resetRecord
    } catch (error) {
      console.error("Error finding password reset:", error)
      throw new Error("Failed to find password reset")
    }
  }

  static async deletePasswordReset(token: string) {
    try {
      const db = await this.getDb()
      const result = await db.collection("passwordResets").deleteOne({ token })
      console.log("Password reset deleted, count:", result.deletedCount)
      return result.deletedCount > 0
    } catch (error) {
      console.error("Error deleting password reset:", error)
      throw new Error("Failed to delete password reset")
    }
  }

  static async updateUserPassword(id: string, hashedPassword: string) {
    try {
      const db = await this.getDb()
      const { ObjectId } = require("mongodb")
      const result = await db
        .collection("users")
        .updateOne({ _id: new ObjectId(id) }, { $set: { password: hashedPassword, updatedAt: new Date() } })
      console.log("User password update result - modified count:", result.modifiedCount)
      return result.modifiedCount > 0
    } catch (error) {
      console.error("Error updating user password:", error)
      throw new Error("Failed to update user password")
    }
  }

  static async blacklistRollNumber(rollNumberData: Omit<BlacklistedRollNumber, "_id" | "blacklistedAt">) {
    const db = await this.getDb()
    const blacklisted = {
      ...rollNumberData,
      blacklistedAt: new Date(),
    }
    await db.collection("blacklistedRollNumbers").insertOne(blacklisted)
    return blacklisted
  }

  static async isRollNumberBlacklisted(rollNumber: string) {
    try {
      const db = await this.getDb()
      const blacklisted = await db.collection("blacklistedRollNumbers").findOne({ rollNumber })
      const result = !!blacklisted
      console.log("Blacklist check for", rollNumber, ":", result ? "blacklisted" : "not blacklisted")
      return result
    } catch (error) {
      console.error("Error checking blacklist:", error)
      throw new Error("Failed to check blacklist")
    }
  }

  static async getBlacklistedRollNumbers() {
    const db = await this.getDb()
    return await db.collection("blacklistedRollNumbers").find({}).toArray()
  }

  static async removeFromBlacklist(rollNumber: string) {
    const db = await this.getDb()
    return await db.collection("blacklistedRollNumbers").deleteOne({ rollNumber })
  }

  static async getRegistrationStatistics() {
    try {
      const db = await this.getDb()

      // Get total registrations
      const totalRegistrations = await db.collection("users").countDocuments({ role: "participant" })

      // Get confirmed registrations
      const confirmedRegistrations = await db.collection("users").countDocuments({
        role: "participant",
        registrationStatus: "confirmed",
      })

      // Get pending registrations
      const pendingRegistrations = await db.collection("users").countDocuments({
        role: "participant",
        registrationStatus: "pending",
      })

      // Get completed payments
      const completedPayments = await db.collection("users").countDocuments({
        role: "participant",
        paymentStatus: "completed",
      })

      // Get total revenue
      const revenueResult = await db
        .collection("transactions")
        .aggregate([{ $match: { status: "completed" } }, { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }])
        .toArray()

      const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0

      // Get registrations by course
      const courseBreakdown = await db
        .collection("users")
        .aggregate([
          { $match: { role: "participant" } },
          { $group: { _id: "$courseAndSemester", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray()

      // Get registrations over time (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const registrationTrends = await db
        .collection("users")
        .aggregate([
          {
            $match: {
              role: "participant",
              createdAt: { $gte: thirtyDaysAgo },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray()

      console.log("Registration statistics retrieved successfully")

      return {
        totalRegistrations,
        confirmedRegistrations,
        pendingRegistrations,
        completedPayments,
        totalRevenue,
        courseBreakdown,
        registrationTrends,
      }
    } catch (error) {
      console.error("Error getting registration statistics:", error)
      throw new Error("Failed to get registration statistics")
    }
  }

  static async getAllRegistrationData() {
    try {
      const db = await this.getDb()
      const registrations = await db
        .collection("users")
        .find(
          { role: "participant" },
          {
            projection: {
              password: 0, // Exclude password for security
              _id: 0, // Exclude MongoDB _id for cleaner export
            },
          },
        )
        .toArray()

      console.log("Registration data retrieved for export, count:", registrations.length)
      return registrations
    } catch (error) {
      console.error("Error getting registration data:", error)
      throw new Error("Failed to get registration data")
    }
  }

  static async getAllPaymentData() {
    try {
      const db = await this.getDb()
      const payments = await db.collection("transactions").find({}).toArray()

      console.log("Payment data retrieved for export, count:", payments.length)
      return payments
    } catch (error) {
      console.error("Error getting payment data:", error)
      throw new Error("Failed to get payment data")
    }
  }

  static async getEventConfig() {
    try {
      const db = await this.getDb()
      let config = await db.collection("eventConfig").findOne({})
      
      if (!config) {
        // Create default config if it doesn't exist
        const defaultConfig = {
          paymentAmount: 200,
          updatedAt: new Date(),
          updatedBy: "system",
        }
        const result = await db.collection("eventConfig").insertOne(defaultConfig)
        return { ...defaultConfig, _id: result.insertedId.toString() }
      }
      
      return config
    } catch (error) {
      console.error("Error getting event config:", error)
      throw new Error("Failed to get event config")
    }
  }

  static async updateEventConfig(paymentAmount: number, updatedBy: string) {
    try {
      const db = await this.getDb()
      const result = await db.collection("eventConfig").updateOne(
        {},
        {
          $set: {
            paymentAmount,
            updatedAt: new Date(),
            updatedBy,
          },
        },
        { upsert: true }
      )
      
      return result
    } catch (error) {
      console.error("Error updating event config:", error)
      throw new Error("Failed to update event config")
    }
  }
}
