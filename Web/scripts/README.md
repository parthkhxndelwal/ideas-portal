# Database Scripts

This directory contains utility scripts for managing the database.

## Available Scripts

### Cleanup Recent Data

**File:** `cleanup-recent-data.ts`

Removes all users and transactions created in the last 2 hours. This is useful for cleaning up test data during development.

**What it deletes:**
- Users created in the last 2 hours
- Transactions created in the last 2 hours
- Related email verifications
- Related password resets
- Related entry records
- Related scan records

**Usage:**

```bash
npm run cleanup
```

Or directly with tsx:

```bash
npx tsx scripts/cleanup-recent-data.ts
```

**⚠️ Warning:** This action cannot be undone! The script will give you a 5-second countdown before proceeding with the deletion.

**When to use:**
- After testing the registration flow
- After testing payment integrations
- When you need to clean up test users quickly

**Safety features:**
- Shows exactly what will be deleted before proceeding
- 5-second confirmation delay
- Detailed logging of all deletions
- Summary report at the end

## Setup

Before running any scripts, make sure you have the required dependencies installed:

```bash
npm install
```

The `tsx` package is included in devDependencies for running TypeScript files directly.

## Environment Variables

All scripts use the same MongoDB connection as the main application. Ensure your `.env.local` file is properly configured with:

```
MONGODB_URI=your_mongodb_connection_string
```

## Adding New Scripts

When creating new database scripts:

1. Create a new `.ts` file in this directory
2. Import the necessary database utilities
3. Add clear logging to show what the script is doing
4. Add confirmation prompts for destructive operations
5. Update this README with documentation
6. Add a new script command to `package.json` if needed
