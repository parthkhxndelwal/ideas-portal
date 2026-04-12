# Solesta '26 Telegram Registration Bot

A production-ready Telegram bot system for managing event registrations and payment coordination for Solesta '26 at KR Mangalam University.

## Features

- Multi-step registration flow with state machine persistence
- KRMU student verification via roll number lookup
- External student registration
- OTP verification via email (KRMU + external)
- Dynamic fee calculation (₹500 KRMU, ₹700 External)
- Unique reference ID generation (SOL26-XXXXX)
- Payment link reveal after confirmation
- QR code ticket generation
- Admin panel with statistics, filtering, and CSV export
- Student data import via JSON
- Reconciliation script for payment processing

## Prerequisites

- Node.js 18+ (LTS)
- MongoDB (Atlas or local)
- Telegram Bot Token

## Quick Start

```bash
# Clone and install
cd solesta-26-bot
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npx prisma generate

# Push schema to database
npm run db:push

# Import student data (optional)
npm run import:students -- ./students.json

# Start bot
npm run dev
```

## Environment Variables

| Variable | Description | Example |
|----------|------------|---------|
| BOT_TOKEN | Telegram bot token | 123456789:ABCdefGHIjklMNOpqrsTUVwxyz |
| DATABASE_URL | MongoDB connection string | mongodb+srv://... |
| ADMIN_TELEGRAM_IDS | Admin user IDs (comma-separated) | 123456789,987654321 |
| SMTP_HOST | SMTP server host | smtp.gmail.com |
| SMTP_PORT | SMTP port | 587 |
| SMTP_USER | SMTP username | your-email@gmail.com |
| SMTP_PASS | SMTP app password | xxxxxxxxxxxx |
| PAYMENT_LINK_INTERNAL | KRMU payment link | https://p.ppsl.io/PYTMPS/Ro1Qfk |
| PAYMENT_LINK_EXTERNAL | External payment link | https://p.ppsl.io/PYTMPS/UYrQfk |
| FEE_KRMU | KRMU registration fee | 500 |
| FEE_EXTERNAL | External registration fee | 700 |

## Registration Flow

```
1. /start
2. Select institution (KRMU / External)
3. For KRMU: Enter roll number
   For External: Enter email
4. OTP verification
5. Complete details (name, course, year)
6. Fresher competition (KRMU 1st year only)
7. View fee and reference ID
8. Confirm copy reference ID
9. Payment link revealed
10. Payment
11. Reconciliation marks as paid
12. Get ticket with QR code
```

## Admin Commands

- `/admin` - Open admin panel
- Statistics view with counts
- Filter by KRMU/External/Year/Fresher
- Export to CSV
- Import student JSON
- Manual registration
- Resend tickets

## Scripts

### Reconciliation

Process payment file (CSV or XLSX):

```bash
npm run reconcile -- ./payments.csv
```

Expected columns:
- reference_id (or referenceId)

### Import Students

Import student data from JSON:

```bash
npm run import:students -- ./students.json
```

JSON format:
```json
[
  {
    "rollNumber": "2105170011",
    "name": "John Doe",
    "courseAndSemester": "B.A. LL.B (H)",
    "year": "2021",
    "email": "john"
  }
]
```

## Production Deployment

### Using PM2

```bash
# Build TypeScript
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Or use the start script
npm start
```

### Logs

PM2 logs are written to:
- `logs/bot-error.log`
- `logs/bot-out.log`

## Project Structure

```
solesta-26-bot/
├── src/
│   ├── bot/
│   │   ├── commands/     # Command handlers
│   │   ├── handlers/    # Flow handlers
│   │   └── index.ts    # Bot entry point
│   ├── services/         # Business logic
│   │   ├── stateMachine.ts
│   │   ├── otp.ts
│   │   ├── registration.ts
│   │   ├── studentData.ts
│   │   └── email.ts
│   ├── db/
│   │   └── prisma.ts   # Database client
│   ├── utils/
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   └── crypto.ts
│   ├── scripts/
│   │   ├── reconcile.ts
│   │   └── importStudents.ts
│   └── keyboards/
│       └── index.ts    # Inline keyboards
├── prisma/
│   └── schema.prisma
├── ecosystem.config.js
├── package.json
└── tsconfig.json
```

## API-Free Design

This bot uses strictly rule-based logic with no AI/LLM dependencies:
- State machine for flow control
- Database persistence for user state
- Regex validation for inputs
- Hash comparison for OTP

## License

MIT