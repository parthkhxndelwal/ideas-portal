import clientPromise from "./mongodb"
import { ObjectId } from "mongodb"
import type { User, RollNumberData, BlacklistedRollNumber, Transaction, EntryRecord, ScannerDevice, ScanRecord } from "./models"

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
      // Transform data to remove _id field and let MongoDB auto-generate it
      const transformedData = data.map(({ _id, ...rest }) => rest)
      await db.collection("rollNumberData").insertMany(transformedData)
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
      const payments = await db.collection("transactions").find({}, {
        projection: {
          _id: 0, // Exclude MongoDB _id for cleaner export
        },
      }).toArray()

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
      const config = await db.collection("eventConfig").findOne({})
      
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

  /**
   * Record an entry for a user
   * @param entryData - Entry record data
   * @returns The created entry record
   */
  static async recordEntry(entryData: Omit<EntryRecord, "_id" | "createdAt">) {
    try {
      const db = await this.getDb()
      const now = new Date()
      const entry = {
        ...entryData,
        createdAt: now,
      }
      const result = await db.collection("entries").insertOne(entry)
      console.log("Entry recorded with ID:", result.insertedId)
      return { ...entry, _id: result.insertedId.toString() }
    } catch (error) {
      console.error("Error recording entry:", error)
      throw new Error("Failed to record entry")
    }
  }

  /**
   * Check if a user has already entered today
   * @param rollNumber - The user's roll number
   * @param bypassDayCheck - If true, allows multiple entries per day (for testing/special cases)
   * @returns True if user has already entered today
   */
  static async hasEnteredToday(rollNumber: string, bypassDayCheck: boolean = false): Promise<boolean> {
    try {
      // If bypass is enabled, always return false (allowing entry)
      if (bypassDayCheck) {
        console.log("Entry check for", rollNumber, "today: BYPASSED - multiple entries allowed")
        return false
      }

      const db = await this.getDb()
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of today
      
      const entry = await db.collection("entries").findOne({
        rollNumber,
        entryDate: { $gte: today }
      })
      
      const result = !!entry
      console.log("Entry check for", rollNumber, "today:", result ? "already entered" : "not entered")
      return result
    } catch (error) {
      console.error("Error checking entry:", error)
      throw new Error("Failed to check entry")
    }
  }

  /**
   * Get all entries for a specific date
   * @param date - The date to get entries for
   * @returns Array of entry records
   */
  static async getEntriesByDate(date: Date) {
    try {
      const db = await this.getDb()
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const entries = await db
        .collection("entries")
        .find({
          entryDate: { $gte: startOfDay, $lte: endOfDay }
        })
        .sort({ entryTimestamp: -1 })
        .toArray()
      
      console.log("Entries retrieved for date:", entries.length)
      return entries
    } catch (error) {
      console.error("Error getting entries:", error)
      throw new Error("Failed to get entries")
    }
  }

  /**
   * Get entry statistics
   * @returns Entry statistics object
   */
  static async getEntryStatistics() {
    try {
      const db = await this.getDb()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Total entries today
      const totalEntriesToday = await db.collection("entries").countDocuments({
        entryDate: { $gte: today }
      })
      
      // Participant entries today
      const participantEntriesToday = await db.collection("entries").countDocuments({
        entryDate: { $gte: today },
        qrType: "participant"
      })
      
      // Volunteer entries today
      const volunteerEntriesToday = await db.collection("entries").countDocuments({
        entryDate: { $gte: today },
        qrType: "volunteer"
      })
      
      // Total unique entries (all time)
      const totalUniqueEntries = await db.collection("entries").distinct("rollNumber")
      
      console.log("Entry statistics retrieved successfully")
      
      return {
        totalEntriesToday,
        participantEntriesToday,
        volunteerEntriesToday,
        totalUniqueEntries: totalUniqueEntries.length,
      }
    } catch (error) {
      console.error("Error getting entry statistics:", error)
      throw new Error("Failed to get entry statistics")
    }
  }

  // ==================== SCANNER API METHODS ====================

  /**
   * Register a new scanner device
   */
  static async createScannerDevice(deviceData: Omit<ScannerDevice, "_id" | "createdAt" | "updatedAt">) {
    try {
      const db = await this.getDb()
      const now = new Date()
      const device = {
        ...deviceData,
        createdAt: now,
        updatedAt: now,
      }
      const result = await db.collection("scannerDevices").insertOne(device)
      console.log("Scanner device created with ID:", result.insertedId)
      return { ...device, _id: result.insertedId.toString() }
    } catch (error) {
      console.error("Error creating scanner device:", error)
      throw new Error("Failed to create scanner device")
    }
  }

  /**
   * Find scanner device by device ID
   */
  static async findScannerDevice(deviceId: string) {
    try {
      const db = await this.getDb()
      const device = await db.collection("scannerDevices").findOne({ deviceId })
      console.log("Scanner device lookup result:", device ? "found" : "not found")
      return device
    } catch (error) {
      console.error("Error finding scanner device:", error)
      throw new Error("Failed to find scanner device")
    }
  }

  /**
   * Find scanner device by token
   */
  static async findScannerDeviceByToken(token: string) {
    try {
      const db = await this.getDb()
      const device = await db.collection("scannerDevices").findOne({ token, isActive: true })
      console.log("Scanner device by token lookup result:", device ? "found" : "not found")
      return device
    } catch (error) {
      console.error("Error finding scanner device by token:", error)
      throw new Error("Failed to find scanner device by token")
    }
  }

  /**
   * Update scanner device
   */
  static async updateScannerDevice(deviceId: string, updates: Partial<ScannerDevice>) {
    try {
      const db = await this.getDb()
      const result = await db
        .collection("scannerDevices")
        .updateOne({ deviceId }, { $set: { ...updates, updatedAt: new Date() } })
      console.log("Scanner device update result - modified count:", result.modifiedCount)
      return result.modifiedCount > 0
    } catch (error) {
      console.error("Error updating scanner device:", error)
      throw new Error("Failed to update scanner device")
    }
  }

  /**
   * Get confirmed participants for scanner app
   * Returns only essential fields and handles delta sync
   */
  static async getConfirmedRegistrations(since?: Date, limit?: number) {
    try {
      const db = await this.getDb()
      
      const query: any = {
        role: "participant",
        registrationStatus: "confirmed",
        paymentStatus: "completed",
        isEmailVerified: true,
      }

      if (since) {
        query.updatedAt = { $gt: since }
      }

      const cursor = db
        .collection("users")
        .find(query, {
          projection: {
            _id: 1,
            email: 1,
            rollNumber: 1,
            name: 1,
            courseAndSemester: 1,
            year: 1,
            transactionId: 1,
            registrationStatus: 1,
            paymentStatus: 1,
            isEmailVerified: 1,
            createdAt: 1,
            updatedAt: 1,
            role: 1,
          },
        })
        .sort({ updatedAt: -1 })

      if (limit) {
        cursor.limit(limit)
      }

      const registrations = await cursor.toArray()
      console.log("Confirmed registrations retrieved, count:", registrations.length)
      
      return registrations
    } catch (error) {
      console.error("Error getting confirmed registrations:", error)
      throw new Error("Failed to get confirmed registrations")
    }
  }

  /**
   * Create a scan record with idempotency support
   */
  static async createScanRecord(scanData: Omit<ScanRecord, "_id" | "createdAt" | "updatedAt">) {
    try {
      const db = await this.getDb()
      const now = new Date()

      // Check if scan already exists (idempotency)
      const existingScan = await db.collection("scanRecords").findOne({ scanId: scanData.scanId })
      
      if (existingScan) {
        console.log("Scan record already exists with scanId:", scanData.scanId)
        return existingScan
      }

      const scan = {
        ...scanData,
        createdAt: now,
        updatedAt: now,
      }

      const result = await db.collection("scanRecords").insertOne(scan)
      console.log("Scan record created with ID:", result.insertedId)
      return { ...scan, _id: result.insertedId.toString() }
    } catch (error) {
      console.error("Error creating scan record:", error)
      throw new Error("Failed to create scan record")
    }
  }

  /**
   * Find scan record by scanId
   */
  static async findScanRecord(scanId: string) {
    try {
      const db = await this.getDb()
      const scan = await db.collection("scanRecords").findOne({ scanId })
      return scan
    } catch (error) {
      console.error("Error finding scan record:", error)
      throw new Error("Failed to find scan record")
    }
  }

  /**
   * Update scan record status
   */
  static async updateScanRecord(scanId: string, updates: Partial<ScanRecord>) {
    try {
      const db = await this.getDb()
      const result = await db
        .collection("scanRecords")
        .updateOne({ scanId }, { $set: { ...updates, updatedAt: new Date() } })
      console.log("Scan record update result - modified count:", result.modifiedCount)
      return result.modifiedCount > 0
    } catch (error) {
      console.error("Error updating scan record:", error)
      throw new Error("Failed to update scan record")
    }
  }

  /**
   * Get entry updates since a timestamp (for conflict resolution)
   */
  static async getEntryUpdates(since: Date, deviceId?: string) {
    try {
      const db = await this.getDb()
      
      const query: any = {
        createdAt: { $gt: since }
      }

      // Optionally exclude entries from requesting device
      if (deviceId) {
        query.scannedBy = { $ne: deviceId }
      }

      const entries = await db
        .collection("entries")
        .find(query, {
          projection: {
            rollNumber: 1,
            entryTimestamp: 1,
            entryDate: 1,
            scannedBy: 1,
          },
        })
        .sort({ entryTimestamp: -1 })
        .toArray()

      console.log("Entry updates retrieved, count:", entries.length)
      return entries
    } catch (error) {
      console.error("Error getting entry updates:", error)
      throw new Error("Failed to get entry updates")
    }
  }

  /**
   * Check if entry already exists for roll number on a specific date
   */
  static async findEntryByRollNumberAndDate(rollNumber: string, date: Date) {
    try {
      const db = await this.getDb()
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const entry = await db.collection("entries").findOne({
        rollNumber,
        entryDate: { $gte: startOfDay, $lte: endOfDay }
      })
      
      return entry
    } catch (error) {
      console.error("Error finding entry by roll number and date:", error)
      throw new Error("Failed to find entry")
    }
  }

  /**
   * Check if any scan record exists for roll number on a specific date
   * This prevents multiple scans of the same QR per day, regardless of outcome
   */
  static async findScanRecordByRollNumberAndDate(rollNumber: string, date: Date) {
    try {
      const db = await this.getDb()
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const scanRecord = await db.collection("scanRecords").findOne({
        rollNumber,
        entryDate: { $gte: startOfDay, $lte: endOfDay }
      })
      
      return scanRecord
    } catch (error) {
      console.error("Error finding scan record by roll number and date:", error)
      throw new Error("Failed to find scan record")
    }
  }

  /**
   * Get scan statistics for a device
   */
  static async getScanStatistics(deviceId?: string) {
    try {
      const db = await this.getDb()
      
      const query: any = {}
      if (deviceId) {
        query.deviceId = deviceId
      }

      const totalScans = await db.collection("scanRecords").countDocuments(query)
      const acceptedScans = await db.collection("scanRecords").countDocuments({ ...query, status: "accepted" })
      const conflictScans = await db.collection("scanRecords").countDocuments({ ...query, status: "conflict" })
      const rejectedScans = await db.collection("scanRecords").countDocuments({ ...query, status: "rejected" })

      console.log("Scan statistics retrieved successfully")
      
      return {
        totalScans,
        acceptedScans,
        conflictScans,
        rejectedScans,
      }
    } catch (error) {
      console.error("Error getting scan statistics:", error)
      throw new Error("Failed to get scan statistics")
    }
  }
}
