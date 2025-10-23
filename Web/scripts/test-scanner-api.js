/**
 * Scanner API Test Script
 * 
 * This script tests the Scanner React Native API endpoints
 * Run with: node scripts/test-scanner-api.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
let deviceToken = ''
let deviceId = ''

async function testDeviceRegistration() {
  console.log('\n=== Testing Device Registration ===')
  
  const response = await fetch(`${BASE_URL}/api/scanner-react/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Scanner Device',
      location: 'Main Entrance',
      appVersion: '1.0.0'
    })
  })

  const data = await response.json()
  console.log('Status:', response.status)
  console.log('Response:', JSON.stringify(data, null, 2))

  if (response.ok) {
    deviceToken = data.token
    deviceId = data.deviceId
    console.log('✅ Device registered successfully')
    return true
  } else {
    console.log('❌ Device registration failed')
    return false
  }
}

async function testFetchRegistrations() {
  console.log('\n=== Testing Fetch Registrations ===')
  
  const response = await fetch(`${BASE_URL}/api/scanner-react/registrations`, {
    headers: { 
      'Authorization': `Bearer ${deviceToken}`
    }
  })

  const data = await response.json()
  console.log('Status:', response.status)
  console.log('Response:', JSON.stringify(data, null, 2))

  if (response.ok) {
    console.log('✅ Registrations fetched successfully')
    console.log(`   Found ${data.registrations.length} registrations`)
    return true
  } else {
    console.log('❌ Fetch registrations failed')
    return false
  }
}

async function testBatchUpload() {
  console.log('\n=== Testing Batch Upload ===')
  
  // Generate a unique scan ID
  const scanId = `TEST_SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const response = await fetch(`${BASE_URL}/api/scanner-react/scans/batch`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deviceToken}`
    },
    body: JSON.stringify({
      deviceId: deviceId,
      entries: [
        {
          _id: scanId,
          rollNumber: '2021BCS001',
          name: 'Test User',
          qrType: 'participant',
          transactionId: 'TXN_TEST_123',
          entryDate: today.toISOString().split('T')[0],
          entryTimestamp: now.toISOString(),
          scannedBy: deviceId,
          createdAt: now.toISOString()
        }
      ]
    })
  })

  const data = await response.json()
  console.log('Status:', response.status)
  console.log('Response:', JSON.stringify(data, null, 2))

  if (response.ok) {
    console.log('✅ Batch upload successful')
    console.log(`   Results:`, data.results)
    return true
  } else {
    console.log('❌ Batch upload failed')
    return false
  }
}

async function testFetchUpdates() {
  console.log('\n=== Testing Fetch Updates ===')
  
  // Use yesterday as the since timestamp
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  const response = await fetch(
    `${BASE_URL}/api/scanner-react/updates?since=${yesterday.toISOString()}`,
    {
      headers: { 
        'Authorization': `Bearer ${deviceToken}`
      }
    }
  )

  const data = await response.json()
  console.log('Status:', response.status)
  console.log('Response:', JSON.stringify(data, null, 2))

  if (response.ok) {
    console.log('✅ Updates fetched successfully')
    console.log(`   Found ${data.entryUpdates.length} updates`)
    return true
  } else {
    console.log('❌ Fetch updates failed')
    return false
  }
}

async function testUnauthorizedAccess() {
  console.log('\n=== Testing Unauthorized Access ===')
  
  const response = await fetch(`${BASE_URL}/api/scanner-react/registrations`, {
    headers: { 
      'Authorization': 'Bearer invalid_token_here'
    }
  })

  const data = await response.json()
  console.log('Status:', response.status)
  console.log('Response:', JSON.stringify(data, null, 2))

  if (response.status === 401) {
    console.log('✅ Unauthorized access correctly blocked')
    return true
  } else {
    console.log('❌ Authorization test failed')
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting Scanner API Tests')
  console.log('Base URL:', BASE_URL)
  console.log('=' .repeat(50))

  try {
    const results = []
    
    // Test 1: Device Registration
    results.push(await testDeviceRegistration())
    
    if (!deviceToken) {
      console.log('\n❌ Cannot proceed without device token')
      return
    }

    // Test 2: Fetch Registrations
    results.push(await testFetchRegistrations())
    
    // Test 3: Batch Upload
    results.push(await testBatchUpload())
    
    // Test 4: Fetch Updates
    results.push(await testFetchUpdates())
    
    // Test 5: Unauthorized Access
    results.push(await testUnauthorizedAccess())

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Test Summary')
    console.log('=' .repeat(50))
    const passed = results.filter(r => r).length
    const total = results.length
    console.log(`Passed: ${passed}/${total}`)
    
    if (passed === total) {
      console.log('✅ All tests passed!')
    } else {
      console.log('❌ Some tests failed')
    }

  } catch (error) {
    console.error('💥 Test suite failed with error:', error.message)
    console.error(error)
  }
}

// Run tests
runTests()
