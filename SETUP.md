# Solesta '26 Bot - Complete Setup Guide

This guide covers setting up the Solesta event registration system locally/offline with the same production data.

## Prerequisites

1. **Node.js** (v20+) - [Download](https://nodejs.org/)
2. **MongoDB** - Either:
   - Local MongoDB install: [Download](https://www.mongodb.com/try/download/community)
   - Or use MongoDB Atlas (cloud)
3. **PM2** (optional, for production): `npm install -g pm2`

---

## Project Structure

```
solesta_bot/          - Telegram bot + API server
solesta/solesta/      - Next.js web app
```

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/parthkhxndelwal/ideas-portal.git
cd ideas-portal
git checkout development
```

---

## Step 2: Bot Setup (solesta_bot)

### Create `.env` file

Create `solesta_bot/.env` with the following:

```env
# Telegram Bot Configuration
BOT_TOKEN=YOUR_BOT_TOKEN_HERE

# MongoDB Configuration (Prisma)
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Admin Telegram User IDs (comma-separated)
ADMIN_TELEGRAM_IDS=123456789

# Email/SMTP Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password

# Application URL
APP_URL=https://your-domain.com

# Payment Links
PAYMENT_LINK_INTERNAL=https://payment.link/internal
PAYMENT_LINK_EXTERNAL=https://payment.link/external

# Registration Fees
FEE_KRMU=500
FEE_EXTERNAL=700

# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_MAX_RETRIES=3

# Node Environment
NODE_ENV=production

# API Server
ENABLE_API=true
API_PORT=3001
SWAGGER_PORT=8888

# QR Encryption Key (32 chars)
QR_ENCRYPTION_KEY=YOUR_32_CHARACTER_SECRET_KEY
```

> **Note:** The values above are placeholders. Replace them with your actual production credentials.

# Node Environment
NODE_ENV=production

# API Server
ENABLE_API=true
API_PORT=3001
SWAGGER_PORT=8888

# QR Encryption Key (32 chars)
QR_ENCRYPTION_KEY=SOLESTA26SECRETKEY2026XXXX
```

### Install Dependencies

```bash
cd solesta_bot
npm install
```

### Generate Prisma Client

```bash
npx prisma generate
```

### Build the Project

```bash
npm run build
```

---

## Step 3: Web App Setup (solesta/solesta)

### Create `.env.local` file

Create `solesta/solesta/.env.local`:

```env
# API URL - Use your server IP or localhost
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=sk_live_YOUR_API_KEY_HERE
```

### Install Dependencies

```bash
cd solesta/solesta
npm install
```

### Generate API Key (Optional)

If you need a new API key, run in the bot folder:

```bash
cd solesta_bot
npx ts-node src/scripts/createApiKey.ts
```

This will output an API key. Update `.env.local` with this key.

---

## Step 4: Running the System

### Option A: Running Locally (Development Mode)

**Terminal 1 - Bot + API:**
```bash
cd solesta_bot
ENABLE_API=true node dist/bot/index.js
```

**Terminal 2 - Web App:**
```bash
cd solesta/solesta
npm run dev
```

- Web App: http://localhost:3000
- API: http://localhost:3001
- Swagger Docs: http://localhost:8888

---

### Option B: Running with PM2 (Production)

**Build the bot first:**
```bash
cd solesta_bot
npm run build
```

**Start with PM2:**
```bash
cd solesta_bot
pm2 start dist/bot/index.js --name solesta-bot
pm2 startup   # Shows startup command
pm2 save      # Saves process list
```

**Web App (separate terminal):**
```bash
cd solesta/solesta
npm run start   # For production
# Or
npm run dev     # For development
```

---

## Step 5: Database Sync (Same Data as Production)

The system uses the same MongoDB connection string in `.env`, so it will automatically connect to the production database and have all the same data.

**To verify:**
- Check existing registrations: `npx prisma studio`
- Start the bot and check Telegram for existing users

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/verify` | Verify API key |
| GET | `/api/v1/auth/user` | Get user status |
| POST | `/api/v1/registration/start` | Start registration |
| POST | `/api/v1/registration/roll-number` | Submit roll number |
| POST | `/api/v1/registration/email` | Submit email (external) |
| POST | `/api/v1/registration/otp/request` | Request OTP |
| POST | `/api/v1/registration/otp/verify` | Verify OTP |
| POST | `/api/v1/registration/details` | Submit details |
| POST | `/api/v1/registration/fresher` | Submit fresher answer |
| GET | `/api/v1/registration/status` | Get status |
| POST | `/api/v1/registration/confirm-payment` | Confirm payment |
| GET | `/api/v1/ticket` | Get QR ticket |
| POST | `/api/v1/ticket/resend` | Resend ticket |
| GET | `/api/v1/admin/registrations` | List registrations |
| GET | `/api/v1/admin/statistics` | Get statistics |
| GET | `/api/v1/admin/export` | Export CSV |

---

## Telegram Admin Commands

- `/admin` - Admin panel
- `/apikey generate <name>` - Generate API key
- `/apikey list` - List API keys
- `/resend <REF_ID>` - Resend QR ticket
- `/resendall` - Resend all pending tickets

---

## Troubleshooting

**Bot won't start (409 Conflict):**
```bash
# Stop the bot on server first
# The local bot will use long polling
```

**MongoDB Connection Error:**
- Verify the `DATABASE_URL` is correct
- Check network access to MongoDB Atlas

**Email not working:**
- Verify SMTP credentials are correct
- Check that SMTP user has permission to send emails

---

## Production Deployment

For deploying to a fresh server:

1. Copy the entire `solesta_bot` folder
2. Create `.env` with production values
3. Run `npm install && npm run build`
4. Start with PM2 or systemd
5. For web app, build and serve with Nginx

---

## File Locations

- **Bot Source:** `solesta_bot/src/`
- **API Routes:** `solesta_bot/src/api/routes/`
- **Web App:** `solesta/solesta/`
- **Database Schema:** `solesta_bot/prisma/schema.prisma`