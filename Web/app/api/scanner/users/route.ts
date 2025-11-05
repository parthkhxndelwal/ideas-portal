import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    // Get all users with necessary fields for mobile scanning
    const db = await Database["getDb"]()

    // First, let's check total users and their statuses
    const totalUsers = await db.collection("users").countDocuments()
    const completedUsers = await db.collection("users").countDocuments({
      paymentStatus: "completed",
      registrationStatus: "completed"
    })
    
    console.log(`Total users in database: ${totalUsers}`)
    console.log(`Users with completed payment and registration: ${completedUsers}`)

    // TEMPORARY: Let's also check what statuses exist
    const statusCounts = await db.collection("users").aggregate([
      {
        $group: {
          _id: {
            paymentStatus: "$paymentStatus",
            registrationStatus: "$registrationStatus"
          },
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    console.log('Status distribution:', statusCounts)

    // Get users who have completed payment and are registered
    const users = await db.collection("users").find({
      paymentStatus: "completed",
      registrationStatus: "confirmed",
      transactionId: { $exists: true, $ne: null }
    }).project({
      _id: 1,
      name: 1,
      rollNumber: 1,
      email: 1,
      transactionId: 1,
      courseAndSemester: 1,
      year: 1,
      selectedSubEvent: 1,
      role: 1,
    }).toArray()

    console.log(`Found ${users.length} users with completed payment and registration`)
    console.log('Sample user:', users[0] ? {
      name: users[0].name,
      rollNumber: users[0].rollNumber,
      paymentStatus: users[0].paymentStatus,
      registrationStatus: users[0].registrationStatus,
      transactionId: users[0].transactionId
    } : 'No users found')

    // Transform to the format expected by mobile app
    const transformedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      rollNumber: user.rollNumber,
      email: user.email,
      transactionId: user.transactionId,
      courseAndSemester: user.courseAndSemester,
      year: user.year,
      selectedSubEvent: user.selectedSubEvent,
      role: user.role,
    }))

    console.log(`Returning ${transformedUsers.length} transformed users`)

    const response = NextResponse.json({
      success: true,
      users: transformedUsers,
      lastUpdated: new Date().toISOString(),
      totalCount: transformedUsers.length,
    })

    // Add CORS headers for mobile app access
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response

  } catch (error) {
    console.error("Error fetching user data:", error)
    const response = NextResponse.json({
      error: "Internal server error",
      success: false
    }, { status: 500 })

    // Add CORS headers for error responses too
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}