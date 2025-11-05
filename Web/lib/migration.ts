import { Database } from "@/lib/database"

export async function migrateManualRegistrations() {
  return await Database.runMigration(async (db) => {
    try {
      // Find all users with paymentStatus "completed" and registrationStatus "subevent_selected"
      // These are likely manually registered users that need to be updated to "confirmed"
      const usersToUpdate = await db.collection("users").find({
        paymentStatus: "completed",
        registrationStatus: "subevent_selected",
        transactionId: { $exists: true, $ne: null }
      }).toArray()

      console.log(`Found ${usersToUpdate.length} users to migrate`)

      if (usersToUpdate.length > 0) {
        const result = await db.collection("users").updateMany(
          {
            paymentStatus: "completed",
            registrationStatus: "subevent_selected",
            transactionId: { $exists: true, $ne: null }
          },
          {
            $set: {
              registrationStatus: "confirmed",
              updatedAt: new Date()
            }
          }
        )

        console.log(`Migrated ${result.modifiedCount} users from subevent_selected to confirmed`)
        return { success: true, migrated: result.modifiedCount }
      }

      return { success: true, migrated: 0 }
    } catch (error) {
      console.error("Migration failed:", error)
      return { success: false, error: String(error) }
    }
  })
}

export async function createScanRecordsUniqueIndex() {
  return await Database.runMigration(async (db) => {
    try {
      // Create unique index on transactionId and entryDay to prevent duplicate scans per day
      const collection = db.collection("scanRecords")
      
      // Check if index already exists
      const existingIndexes = await collection.indexes()
      const indexExists = existingIndexes.some((index: any) => 
        index.name === "transactionId_1_entryDay_1" || 
        (index.key.transactionId === 1 && index.key.entryDay === 1 && index.unique === true)
      )

      if (indexExists) {
        console.log("Unique index on transactionId and entryDay already exists")
        return { success: true, message: "Index already exists" }
      }

      // Create a partial unique index that only applies to documents where entryDay exists
      const result = await collection.createIndex(
        { transactionId: 1, entryDay: 1 },
        { 
          unique: true,
          name: "transactionId_1_entryDay_1",
          partialFilterExpression: { entryDay: { $exists: true } }
        }
      )

      console.log("Created partial unique index on scanRecords: transactionId + entryDay (where entryDay exists)")
      return { success: true, indexName: result }
    } catch (error) {
      console.error("Failed to create unique index:", error)
      return { success: false, error: String(error) }
    }
  })
}