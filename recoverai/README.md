<p align="center">
  <img src="./frontend/public/logo-brand.png" alt="RecoverAI Logo" width="340"/>
</p>

# RecoverAI — AI-Powered Payment Failure Recovery System

> **Fintech Hackathon** | Razorpay-style Revenue Recovery Track  
> Autonomous agent that classifies failed payments, selects recovery actions, and audits every decision.

---

## Quick Start 

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas free tier)
- Google Gemini API Key ([get one free](https://makersuite.google.com/app/apikey))

### 1. Clone & Install

```bash
git clone <repo-url>
cd recoverai

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# In /backend, copy the example and fill in your values
cp .env.example .env
```

Edit `backend/.env`:
```env
MONGO_URI=mongodb://localhost:27017/recoverai
# OR use Atlas: mongodb+srv://<user>:<pass>@cluster.mongodb.net/recoverai
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

### 3. Run (Two Terminals)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Vite starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Demo Flow (~30 seconds)

1. Click **"Generate Batch"** -> 50 synthetic failed transactions appear
2. Click **"Classify All"** -> AI classifies each with confidence scores
3. Click **"Run Recovery"** -> actions execute, recovered counter climbs
4. Click any transaction row -> full audit trail drawer slides out
5. Check the **Exceptions** panel -> transactions flagged for human review
6. Click **"Advance Time"** -> simulates 2-day cooldown passing (for scheduled retries)

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transactions/generate` | Generate synthetic batch (param: `count`) |
| POST | `/api/transactions/classify-batch` | Classify all pending transactions |
| POST | `/api/transactions/:id/classify` | Classify one transaction |
| POST | `/api/transactions/recover-batch` | Run recovery for all classified |
| POST | `/api/transactions/:id/recover` | Recover one transaction |
| GET | `/api/transactions` | List all (filter: `status`, `reason`, `stream`) |
| GET | `/api/audit/:transaction_id` | Full audit trail for one transaction |
| GET | `/api/audit/:transaction_id/verify-chain` | Cryptographically verify SHA-256 hash chain integrity |
| GET | `/api/dashboard/summary` | Aggregate recovery metrics & breakdown |
| GET | `/api/dashboard/batch-report` | Comprehensive verifiable batch report with baseline comparison |
| POST | `/api/simulate/inject-failure` | Inject controlled chaos failure (`gemini_api_down`, `database_timeout`, `invalid_transaction_data`) |
| POST | `/api/simulate/advance-time` | Fast-forward simulated time (days param) |

---

## Architecture

```
Failed Transaction
       │
       ▼
Classification Service
  ├─ Fast-Path Cache Lookup  -> in-memory LRU prompt cache (measured sub-ms)
  ├─ Rule-based (known codes) -> confidence 1.0
  └─ Gemini AI with Circuit Breaker (ambiguous) -> JSON-mode structured output
       │
       ▼ confidence >= 0.60?
      YES -> Recovery Decision Engine
              ├─ insufficient_funds  -> scheduled_retry_2days
              ├─ card_expired        -> email_alt_payment
              ├─ bank_timeout        -> immediate_retry
              ├─ mandate_expired     -> smart_payday_retry
              ├─ checkout_abandon    -> whatsapp_checkout_link (simulated preview)
              └─ overdue_invoice     -> b2b_dunning_escalation / hinglish_voice_call
       NO -> Exception (quarantined for human review)
       │
       ▼
Bounded Execution Invariants (max 3 attempts, opt-out guard, cooldowns, idempotency)
       │
       ▼
Audit Ledger (SHA-256 cryptographically hash-linked decision chain)
```

---

## Verified Production-Readiness Features
- **Cryptographically Verifiable Audit Chain**: Every decision is linked via SHA-256 hash chaining, verified via `/verify-chain`.
- **Circuit Breaker & Graceful Fallback**: Trips to `OPEN` under upstream AI outages and falls back to deterministic rule paths without crashing.
- **Idempotency Guard**: Protects mutating routes from duplicate charges and redundant action dispatches.
- **Max 3 Retries Invariant**: Hard stop to prevent customer harassment and protect credit standings.
- **Customer Opt-Out Enforcement**: Customers who opt out are guaranteed never to receive automated messages.
- **Rate Limiting**: Configured with `express-rate-limit` on all mutating routes.
- **Multi-Currency Math**: Real-time currency conversions across INR, USD, EUR, and GBP.

---

## Automated Feature Verification

Run the end-to-end verification test suite:

```bash
cd backend
node test/verify_features.js
```

---

## Project Structure


```
recoverai/
├── backend/
│   ├── src/
│   │   ├── config/        # DB & Gemini client
│   │   ├── models/        # Transaction, AuditLog schemas
│   │   ├── services/      # classification, recovery, audit
│   │   ├── controllers/   # request handlers
│   │   ├── routes/        # API routes
│   │   └── utils/         # data generator, idempotency, scheduler
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios client
│   │   ├── components/    # UI components
│   │   └── pages/         # Dashboard page
│   └── tailwind.config.js
└── README.md
```
