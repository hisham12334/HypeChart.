# 🛍️ Brand Order System

A white-label e-commerce order management platform designed for Instagram D2C brands. Built with a modern monorepo architecture using pnpm workspaces, featuring real-time inventory management, Razorpay payment integration, WhatsApp Business notifications, and a full financial ledger.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Development](#-development)
- [Database](#-database)
- [API Documentation](#-api-documentation)
- [Architecture Highlights](#-architecture-highlights)
- [Documentation](#-documentation)
- [Deployment](#-deployment)
- [Recent Changes](#-recent-changes)
- [Contributing](#-contributing)

---

## ✨ Features

### Admin Panel
- 🔐 Secure authentication with JWT
- 📦 Product management with variants (size, color, etc.)
- 🖼️ Image upload to Cloudinary (with S3-compatible URLs)
- 📊 Real-time inventory tracking with reservation system
- 📅 Product drop scheduling with early access
- 👥 Customer relationship management (CRM) — auto-updated on every order
- 📈 Order management and fulfillment with WhatsApp status updates
- 🚚 Shipping tracking integration
- 💰 Payment settings with two-tier system (Starter / Pro)
- 📱 Activity logs and analytics
- ⚙️ Settings page for payment gateway & WhatsApp Business configuration
- 💳 **Payments Dashboard** — live balance (processing / available / paid-out) with paginated transaction ledger

### Checkout Experience
- 🎨 White-label branded checkout pages
- 🛒 Persistent Cart (LocalStorage) with multi-item support
- 💳 Razorpay payment integration with strict metadata enforcement
- 📱 WhatsApp order notifications (sent immediately after payment)
- 🔒 Secure payment verification with dynamic signature validation (platform or brand keys)
- 📦 Real-time stock availability checking
- 🎯 Product drop countdown timers
- 🔄 Automatic retry handling for failed payments
- 🔎 Audit Trail — guaranteed 1:1 link between Razorpay IDs and Database IDs
- 🛍️ Dynamic product pages with variant selection and correct image display
- ✅ Stock validation before checkout
- 🚚 **Shipping Fee Logic** — free shipping on orders ≥ ₹1,000, otherwise ₹99 (validated server-side)

### Backend API
- ⚡ Express.js REST API with organized route structure
- 🔄 Redis caching for performance
- 🔐 JWT authentication & authorization
- 📊 PostgreSQL with Prisma ORM
- 🎫 Automatic inventory reservation system (session-scoped)
- 💸 Razorpay webhook handling with signature verification
- 🔁 Idempotency middleware for payment operations
- 📝 Comprehensive webhook event logging
- 📱 WhatsApp Business API integration (Meta Cloud API v19.0) with fallback strategy
- 🔒 Encrypted payment credentials storage (AES-256-GCM)
- 🛡️ Rate limiting for API protection
- 🏪 Store API for public product access
- 💳 Payment settings API for multi-tier gateway configuration
- 💰 **Financial Ledger** — explicit Razorpay fee (2%) and platform fee (0.7%) split recorded per transaction
- 🏦 **Payout System** — atomic payout record creation with race-condition guard

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI, Lucide Icons
- **State Management**: React Hooks
- **HTTP Client**: Axios / fetch

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs

### Database & Cache
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Migrations**: Prisma Migrate

### Infrastructure
- **Monorepo**: pnpm Workspaces
- **Containerization**: Docker & Docker Compose
- **Storage**: Cloudinary (image hosting)
- **Payment**: Razorpay (Platform & BYOG)
- **Notifications**: WhatsApp Business API (Meta Cloud API v19.0)

---

## 📁 Project Structure

```
brand-order-system/
├── apps/
│   ├── admin/              # Next.js admin dashboard
│   │   └── app/
│   │       ├── (auth)/     # Authentication pages
│   │       │   └── login/
│   │       └── (dashboard)/  # Protected dashboard pages
│   │           ├── dashboard/
│   │           ├── products/
│   │           ├── orders/
│   │           ├── payments/       # NEW: Payments ledger & balance
│   │           ├── analytics/
│   │           └── settings/       # Payment gateway & WhatsApp settings
│   │
│   ├── api/                # Express.js backend
│   │   └── src/
│   │       ├── controllers/
│   │       │   ├── auth.controller.ts
│   │       │   ├── product.controller.ts
│   │       │   ├── checkout.controller.ts       # Atomic order creation
│   │       │   ├── payment.controller.ts        # BYOG + subscription logic
│   │       │   ├── payments.controller.ts       # NEW: Ledger, balance, payout
│   │       │   ├── payment-settings.controller.ts
│   │       │   ├── store.controller.ts          # Public store API
│   │       │   ├── webhook.controller.ts
│   │       │   └── whatsapp-settings.controller.ts  # NEW: WA config
│   │       ├── routes/
│   │       ├── services/
│   │       │   ├── order.service.ts             # Atomic order + WA dispatch
│   │       │   ├── order-update.service.ts      # Idempotent pay marking
│   │       │   ├── whatsapp.service.ts          # Meta Cloud API + fallback
│   │       │   └── ...
│   │       ├── middlewares/
│   │       │   ├── auth.middleware.ts
│   │       │   └── idempotency.middleware.ts
│   │       └── utils/
│   │           ├── crypto.util.ts               # AES-256-GCM encrypt/decrypt
│   │           └── logger.ts
│   │
│   ├── checkout/           # Next.js checkout app
│   │   └── app/
│   │       ├── p/[productId]/  # Dynamic product pages (images fixed)
│   │       ├── cart/
│   │       ├── checkout/
│   │       └── success/
│   │
│   └── web/                # Marketing / landing site (Next.js)
│       └── app/
│           ├── page.tsx         # Landing page
│           ├── pricing/
│           ├── about/
│           ├── shipping/        # NEW: Shipping & delivery policy
│           ├── refund/
│           ├── privacy/
│           └── terms/
│
├── packages/
│   ├── database/           # Prisma schema & client
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   ├── types/              # Shared TypeScript types
│   └── ui/                 # Shared UI components
│
├── scripts/
│   ├── setup-dev.sh
│   ├── deploy.sh
│   └── backup-db.sh
│
├── docs/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .env.example
```

---

## 📋 Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **Docker** & **Docker Compose**
- **Git**

### Install pnpm

```bash
npm install -g pnpm
```

### Install Docker

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows/Mac)
- [Docker Engine](https://docs.docker.com/engine/install/) (Linux)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd brand-order-system
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your actual configuration values (see [Environment Variables](#-environment-variables)).

### 3. Automated Setup (Recommended)

```bash
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

### 4. Manual Setup (Alternative)

```bash
# Install dependencies
pnpm install

# Start Docker services (PostgreSQL & Redis)
docker-compose up -d

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed the database (creates admin@hypechart.com / password123)
pnpm db:seed
```

### 5. Start Development Servers

```bash
# Terminal 1: API Server (Port 4000)
cd apps/api && pnpm dev

# Terminal 2: Admin Panel (Port 3000)
cd apps/admin && pnpm dev

# Terminal 3: Checkout App (Port 3002)
cd apps/checkout && pnpm dev

# Terminal 4: Marketing Web (Port 3001)
cd apps/web && pnpm dev
```

### 6. Access the Applications

| App | URL |
|---|---|
| Admin Panel | http://localhost:3000 |
| API Server | http://localhost:4000 |
| Checkout | http://localhost:3002 |
| Marketing Site | http://localhost:3001 |

---

## 🔐 Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://branduser:brandpassword@localhost:5432/brandorder"

# Redis Cache
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
ENCRYPTION_KEY="your-32-byte-encryption-key-for-razorpay-secrets"

# Application URLs
ADMIN_URL="http://localhost:3000"
CHECKOUT_URL="http://localhost:3002"
PORT=4000
```

### Optional Variables

```bash
# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Razorpay (platform payment gateway)
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"
RAZORPAY_WEBHOOK_SECRET="your-razorpay-webhook-secret"

# WhatsApp Business API (Meta Cloud API)
# These are set per-brand in the admin settings UI (not global env vars)

# Frontend Environment Variables (Next.js apps)
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxx"
```

---

## 💻 Development

### Available Scripts

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Run all apps in development mode
pnpm build            # Build all apps for production
pnpm lint             # Lint across all packages
pnpm test             # Run tests

# Database commands
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed initial admin user
```

### Working with Individual Apps

```bash
pnpm --filter admin dev
pnpm --filter api build
pnpm --filter @brand-order-system/database db:generate
```

---

## 🗄️ Database

### Schema Overview

| Model | Purpose |
|---|---|
| `User` | Brand owners — auth, payment config, WhatsApp credentials |
| `Product` | Product catalog with Cloudinary image URLs |
| `Variant` | Size / colour variations with absolute price |
| `Inventory` | Stock management |
| `Order` | Order tracking (linked to Customer, Address, Razorpay IDs) |
| `OrderItem` | Line items per order |
| `Customer` | CRM — auto-created/updated on each purchase |
| `Address` | Shipping addresses |
| `CartReservation` | Temporary inventory holds (session-scoped) |
| `Transaction` | Financial ledger — gross, Razorpay fee, platform fee, net |
| `Payout` | Payout records linking settled transactions |
| `IdempotencyKey` | Double-spend prevention |
| `ActivityLog` | Audit trail |

### Database Commands

```bash
cd packages/database

# Create a new migration
pnpm prisma migrate dev --name migration_name

# Apply migrations (production)
pnpm prisma migrate deploy

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Open Prisma Studio (GUI)
pnpm prisma studio
```

### Backup & Restore

```bash
./scripts/backup-db.sh

# Restore from backup
docker exec -i brand_db psql -U branduser -d brandorder < backup.sql
```

---

## 📡 API Documentation

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
```

### Products (Protected)

```http
GET  /api/products
POST /api/products
PUT  /api/products/:id
DELETE /api/products/:id
```

### Store API (Public — no auth required)

#### Get Product by Checkout Slug
```http
GET /api/store/product/:slug
```
Returns product with variants, real-time `availableCount`, brand info and Cloudinary image URLs.

#### Check Stock Availability
```http
POST /api/store/stock
Content-Type: application/json

{ "items": [{ "variantId": "uuid", "quantity": 2 }] }
```

### Checkout

#### Create Order (reserves inventory + creates Razorpay order)
```http
POST /api/checkout/create-order
Content-Type: application/json
Idempotency-Key: <client-generated-uuid>

{
  "items": [{ "variantId": "uuid", "quantity": 1 }],
  "amount": 999
}
```

Response includes `keyId` (either platform or brand's own Razorpay key) so the frontend can initialise the correct Razorpay checkout.

#### Verify Payment (atomic order creation + WhatsApp notification)
```http
POST /api/checkout/verify
Content-Type: application/json

{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "sig",
  "brandId": "uuid",
  "customerDetails": { ... },
  "orderItems": [{ "variantId": "uuid", "quantity": 1 }]
}
```

### Payments Ledger (Protected)

#### Get Balance
```http
GET /api/payments/balance
Authorization: Bearer <token>
```
Returns `processing`, `available`, `paidOutThisMonth`, and `nextSettlementEta`.

#### Get Transactions (Paginated)
```http
GET /api/payments/transactions?page=1&limit=20
Authorization: Bearer <token>
```
Returns rows with `grossAmount`, `razorpayFee`, `platformFee`, `netAmount`, status, and linked `orderNumber`.

#### Create Payout
```http
POST /api/payments/payout
Authorization: Bearer <token>
```
Atomically links all `SETTLED` transactions to a new `Payout` record and marks them `PAID_OUT`.

### Payment Settings (Protected)

```http
POST /api/store/connect-bank    # Starter tier — bank account linking
POST /api/store/save-keys       # Pro tier — save brand Razorpay keys (AES-256-GCM encrypted)
GET  /api/store/payment-settings
```

### WhatsApp Settings (Protected)

```http
GET  /api/store/whatsapp-settings    # Returns masked token (last 6 chars visible)
POST /api/store/whatsapp-settings    # Save Phone Number ID, Access Token, enable/disable
```

### Order Management (Protected)

```http
GET  /api/orders
GET  /api/orders/:id
PUT  /api/orders/:id/status    # Triggers WhatsApp status update notification
```

---

## 🏗️ Architecture Highlights

### Two-Tier Payment System

| Tier | Platform Fee | How It Works |
|---|---|---|
| **Starter** | 0.7% | Payments via platform Razorpay; revenue routed to brand via Razorpay Route |
| **Pro** | 0% | Brand supplies their own Razorpay key/secret (BYOG); payments go directly |

- Pro brand credentials are stored **AES-256-GCM encrypted** in the database
- The correct Razorpay instance (platform or brand) is selected dynamically at order creation **and** payment verification — preventing cross-brand key spoofing
- `brandId` is sent from the frontend at verification time so the backend knows which secret to use for HMAC validation

### Fee Calculation & Financial Ledger

Every successful payment creates a `Transaction` record with an explicit fee breakdown:

```
Gross Amount (order total)
  − Razorpay Fee    (2% of gross)
  − Platform Fee    (0.7% of gross for Starter; 0% for Pro)
  = Net Amount      (what the brand actually receives)
```

- Fee percentages are embedded in Razorpay order notes (`platform_fee_percent`) so they survive any backend restart
- Both `order.service.ts` (checkout flow) and `payment.controller.ts` (subscription/standalone flow) apply the same formula
- Transactions cycle through statuses: `CAPTURED → SETTLED → PAID_OUT`

### Subscription Payment Flow (Hypechart Pro Activation)

1. Brand clicks "Upgrade to Pro" in admin
2. Backend creates a Razorpay order with `type: "subscription_activation"` and `userId` in notes
3. After payment, `verifyPayment` detects the subscription type, upgrades the user's `plan` to `PRO` automatically

### WhatsApp Business API Integration

Implemented via the **Meta Cloud API (v19.0)** with a resilient two-phase send strategy:

1. **Primary**: sends a custom UTILITY template (`order_placed`, `order_confirmed`, `order_shipped`, `order_delivered`)
2. **Fallback**: if the custom template is missing or not yet approved (Meta error codes `132001`, `132000`), automatically sends the pre-approved `hello_world` template so the customer still receives a notification

- WhatsApp notifications are fired **outside the DB transaction** so a Meta API failure never rolls back an order
- Per-brand credentials (Phone Number ID + Access Token) are stored in the `User` row and managed via the admin Settings UI
- Tokens are masked on read (only the last 6 characters are shown)
- Phone numbers are normalised to E.164 format (Indian 10-digit numbers get `91` prefix)

### Image Handling (Cloudinary)

- Product images are uploaded to **Cloudinary** and stored as full HTTPS URLs in the database
- The store API returns these URLs directly; the checkout/product pages use them via `next/image` with the Cloudinary domain whitelisted in `next.config`
- This resolved a previous issue where images appeared broken after product creation

### Inventory Reservation System

- When a customer adds items to cart, inventory is **session-scoped reserved** (prevents overselling)
- On successful payment, inventory is **atomically committed** inside a Prisma `$transaction`:
  - `inventoryCount` decremented
  - `reservedCount` decremented
  - Matching `CartReservation` record deleted (so cron jobs don't double-release)
- If payment fails, reservations expire and are cleaned up by a background cron job

### Idempotency & Double-Spend Protection

- Every `checkout/verify` request is guarded by an `IdempotencyKey` row created inside the DB transaction
- If the same `razorpay_order_id` arrives twice (network retry, duplicate webhook), the second request returns the stored response without re-running any business logic
- `sessionId` is embedded in Razorpay order notes so the exact cart reservation is cleared on payment

### Security Features

| Feature | Implementation |
|---|---|
| Authentication | JWT (RS256) |
| Password storage | bcryptjs (10 rounds) |
| Razorpay credentials | AES-256-GCM encrypted at rest |
| Signature verification | HMAC-SHA256 — uses brand's own secret for PRO brands |
| Cross-brand spoofing guard | `brand_id` in Razorpay notes compared against DB on verify |
| Price alteration guard | Server recalculates cart total from DB; rejects if mismatch > ₹1 |
| CORS | Whitelisted origins; `Idempotency-Key` header explicitly allowed |
| Security headers | Helmet.js |
| Rate limiting | 100 req/15 min (general); 10 req/hr (checkout) |

### Shipping Fee Logic

| Cart Total | Shipping Fee |
|---|---|
| < ₹1,000 | ₹99 |
| ≥ ₹1,000 | Free |

The fee is calculated both on the frontend (display) and **re-verified server-side** during payment verification to prevent tampering.

### API Route Organization

| Prefix | Access | Purpose |
|---|---|---|
| `/api/auth/*` | Public | Registration, login |
| `/api/store/*` | Public + Protected | Product fetch, stock check, payment/WhatsApp settings |
| `/api/checkout/*` | Public (with idempotency) | Order creation & payment verification |
| `/api/webhooks/*` | Razorpay-signed | Payment events |
| `/api/products/*` | JWT required | Product CRUD |
| `/api/orders/*` | JWT required | Order management |
| `/api/payments/*` | JWT required | Ledger, balance, payouts |
| `/api/analytics/*` | JWT required | Reporting |

---

## 📚 Documentation

### Payment & Webhooks
- **[Webhook Setup Guide](./docs/WEBHOOK_SETUP.md)** — Razorpay webhook configuration, testing, troubleshooting
- **[Webhook Quick Reference](./docs/WEBHOOK_QUICK_REFERENCE.md)** — Quick commands & checklist
- **[Payment Security](./docs/PAYMENT_SECURITY.md)** — Idempotency, inventory locking, security features

### System Documentation
- **[Idempotency Guide](./docs/IDEMPOTENCY.md)** — Preventing duplicate charges
- **[Idempotency Implementation](./IDEMPOTENCY_IMPLEMENTATION.md)** — Technical implementation details

### Testing Scripts
- **[Test Webhooks](./docs/test-webhook.sh)**
- **[Test Idempotency](./docs/test-idempotency.sh)**

---

## 🎯 Implementation Status

### ✅ Completed

#### Infrastructure
- [x] Monorepo setup with pnpm workspaces
- [x] PostgreSQL database with Prisma ORM
- [x] Redis caching layer
- [x] Docker containerization (multi-stage Dockerfile)
- [x] TypeScript across all packages

#### Authentication & Security
- [x] JWT-based authentication
- [x] Password hashing with bcryptjs
- [x] AES-256-GCM encrypted credential storage
- [x] CORS with idempotency header support
- [x] Helmet.js security headers
- [x] Rate limiting on all endpoints
- [x] Cross-brand spoofing protection
- [x] Price alteration attack prevention

#### Product Management
- [x] Product CRUD with variants
- [x] Cloudinary image upload & correct URL display
- [x] Inventory tracking with reservation
- [x] Product slugs for checkout URLs

#### Payment Integration
- [x] Two-tier Razorpay routing (Starter / Pro BYOG)
- [x] Dynamic key selection at order creation & verification
- [x] Webhook signature verification
- [x] Webhook event logging and deduplication
- [x] Idempotency middleware
- [x] Fee calculation ledger (Razorpay 2% + Platform 0.7%)
- [x] Subscription payment & auto-upgrade to PRO
- [x] Payments dashboard (balance, paginated transactions, payouts)

#### Order Management
- [x] Atomic order creation inside Prisma transaction
- [x] Inventory committed and reservation cleared on payment
- [x] CRM auto-updated (totalOrders, totalSpent, lastOrderAt)
- [x] Shipping fee server-side validation

#### WhatsApp Notifications
- [x] Meta Cloud API v19.0 integration
- [x] Per-brand credentials (stored & masked in settings UI)
- [x] Order placed notification (fires after payment)
- [x] Order status update notifications (confirmed, shipped, delivered)
- [x] Fallback to `hello_world` template if custom template not approved
- [x] WA failures never roll back orders

#### Frontend Applications
- [x] Admin dashboard (Next.js) with mobile-responsive layout
- [x] Checkout application with correct image loading
- [x] Dynamic product pages with variant selection
- [x] Cart with stock validation
- [x] Payment UI integration (platform or brand Razorpay key)
- [x] Payments dashboard page (balance cards + transaction table)
- [x] Settings pages (payment gateway + WhatsApp Business)
- [x] Marketing / landing site with pricing, about, policy pages

### 🚧 In Progress / Planned

- [ ] Cloudinary → AWS S3 migration option
- [ ] Product drop scheduling UI
- [ ] Razorpay Route activation (requires Razorpay manual review)
- [ ] Email notifications
- [ ] Order tracking portal for customers
- [ ] Advanced analytics and reporting
- [ ] Automated testing suite
- [ ] Input validation with Zod

---

## 🚀 Deployment

### Production Build

```bash
pnpm build

cd apps/api && pnpm start
cd apps/admin && pnpm start
cd apps/checkout && pnpm start
cd apps/web && pnpm start
```

### Docker Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Checklist

- [ ] Strong `JWT_SECRET` (≥ 32 chars) and `ENCRYPTION_KEY` (exactly 32 bytes)
- [ ] Production `DATABASE_URL`
- [ ] Cloudinary credentials configured
- [ ] Razorpay production keys set
- [ ] Razorpay Webhook Secret configured
- [ ] HTTPS / SSL certificates enabled
- [ ] CORS origins locked to production domains
- [ ] WhatsApp Business API — templates approved in Meta Business Manager
- [ ] Monitoring and logging configured
- [ ] Database backup strategy in place
- [ ] CDN for static assets

---

## 📋 Recent Changes

### v0.4.0 — Fee Calculation & Financial Ledger (2026-03-01)

- **Fixed Fee Calculations**: Every transaction now records explicit `grossAmount`, `razorpayFee` (2%), `platformFee` (0.7%), and `netAmount` — calculated consistently in both `order.service.ts` and `payment.controller.ts`
- **Platform Fee Updated**: Default platform fee changed from 1% → **0.7%**
- **Payments Dashboard**: New admin page (`/payments`) showing real-time balance cards (Processing / Available / Paid Out this month) and a paginated, sortable transaction table with fee breakdown per row
- **Payout System**: `POST /api/payments/payout` atomically links all `SETTLED` unlinked transactions to a `Payout` record; double-guard inside the Prisma `$transaction` prevents race-condition double-linking

### v0.3.1 — Image Loading Fix (2026-03-01)

- **Root Cause**: Product images stored as Cloudinary URLs were not being displayed correctly on product, cart, and checkout pages
- **Fix Applied**: Corrected image URL field mapping in the store API response; added Cloudinary hostname to `next.config` `remotePatterns` for both checkout and admin apps
- **Result**: Images load correctly across all pages after product creation

### v0.3.0 — WhatsApp Business Notifications (2026-02-27 – 2026-02-28)

- **Meta Cloud API Integration**: WhatsApp messages now sent via the official Meta Cloud API (v19.0) using approved UTILITY templates
- **Template Strategy**: Custom templates (`order_placed`, `order_confirmed`, `order_shipped`, `order_delivered`) with automatic **fallback to `hello_world`** if a custom template is not yet approved (error codes 132001 / 132000 / 132007)
- **Per-Brand Credentials**: Each brand stores their own WhatsApp Phone Number ID and Access Token via the Settings UI — token is masked on retrieval (last 6 characters shown)
- **Non-Blocking**: WhatsApp dispatch runs outside the DB transaction — a Meta API failure never causes an order rollback
- **Order Status Updates**: Admin can trigger WhatsApp notifications at each fulfilment stage (confirmed → shipped → delivered)
- **Phone Normalisation**: Indian 10-digit numbers automatically prefixed with `91` (E.164 format)

### v0.2.5 — Razorpay Verification Fix (2026-02-24)

- **BYOG Verification**: `brandId` is now required from the frontend during payment verification; the backend fetches the brand's plan and, if PRO, uses the brand's own encrypted secret for HMAC verification and order fetching — prevents "invalid signature" errors for Pro brands
- **Cross-Brand Spoofing Guard**: `brand_id` from Razorpay notes is compared against the DB-resolved merchant; mismatch throws a security error
- **Price Alteration Guard**: Server recalculates the total from the DB variant prices + shipping; rejects if Razorpay amount differs by more than ₹1

### v0.2.0 — Two-Tier Payment System & Store API (2026-02-26)

- **Payment Settings UI**: New settings page for configuring Starter (bank linking) and Pro (BYOG) tiers
- **Dynamic Razorpay Routing**: Order creation and verification dynamically picks the correct Razorpay instance based on brand's plan and stored (encrypted) credentials
- **Subscription Activation**: Dedicated endpoint & auto-upgrade flow for Hypechart Pro monthly billing
- **Store API**: Public endpoints for product fetch and stock check
- **Rate Limiting**: 100 req/15 min general; 10 req/hr checkout
- **Idempotency Middleware**: Prevents duplicate order creation and charge on network retries

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- TypeScript everywhere
- ESLint + Prettier
- Meaningful commit messages
- Comments on non-obvious logic
- Update this README for new features

---

## 📝 License

This project is proprietary and confidential.

---

**Made with ❤️ for Instagram D2C Brands**
