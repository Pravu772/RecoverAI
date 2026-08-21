<p align="center">
  <img src="./frontend/public/logo-brand.png" alt="RecoverAI Logo" width="340"/>
</p>

# RecoverAI — AI-Powered Payment Failure Recovery System

> **Fintech Hackathon** | Razorpay-style Revenue Recovery Track  
> Autonomous agent that classifies failed payments, selects recovery actions, and audits every decision.

---

## 🚀 Quick Start (No Docker Required)

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

## 🎬 Demo Flow (~30 seconds)

1. Click **"Generate Batch"** → 50 synthetic failed transactions appear
2. Click **"Classify All"** → AI classifies each with confidence scores
3. Click **"Run Recovery"** → actions execute, ₹ recovered counter climbs
4. Click any transaction row → full audit trail drawer slides out
5. Check the **Exceptions** panel → transactions flagged for human review
6. Click **"Advance Time"** → simulates 2-day cooldown passing (for scheduled retries)

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transactions/generate` | Generate synthetic batch (param: `count`) |
| POST | `/api/transactions/classify-batch` | Classify all pending transactions |
| POST | `/api/transactions/:id/classify` | Classify one transaction |
| POST | `/api/transactions/recover-batch` | Run recovery for all classified |
| POST | `/api/transactions/:id/recover` | Recover one transaction |
| GET | `/api/transactions` | List all (filter: `status`, `reason`) |
| GET | `/api/audit/:transaction_id` | Full audit trail for one transaction |
| GET | `/api/dashboard/summary` | Recovery metrics & breakdown |
| POST | `/api/simulate/advance-time` | Fast-forward simulated time (days param) |

---

## 🏗️ Architecture

```
Failed Transaction
       │
       ▼
Classification Service
  ├─ Rule-based (known codes) → confidence 1.0
  └─ Gemini AI (ambiguous)   → JSON-mode structured output
       │
       ▼ confidence ≥ 0.6?
      YES → Recovery Decision Engine
              ├─ insufficient_funds  → scheduled_retry_2days
              ├─ card_expired        → email_alt_payment
              ├─ bank_timeout        → immediate_retry
              ├─ mandate_expired     → escalate_human
              └─ network_error       → immediate_retry
       NO → Exception (human review)
       │
       ▼
Bounded Execution (max 3 attempts, opted-out guard, cooldown, idempotency)
       │
       ▼
Audit Log (every decision recorded with human-readable reasoning)
```

---

## 🔒 Production-Readiness Features
- **Rate limiting** on all API routes (express-rate-limit)
- **Idempotency** keys prevent double-execution
- **Max 3 retry** hard limit per transaction
- **Opted-out guard** — customer opt-out is always respected
- **Gemini fallback** — API failures mark as exception, never crash
- **Audit trail** — every classification + recovery + outcome logged

---

## 📁 Project Structure

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
