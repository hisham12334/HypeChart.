# 🛍️ Brand Order System

A white-label e-commerce order management platform designed for Instagram D2C brands. Built with a modern monorepo architecture using pnpm workspaces, featuring real-time inventory management, Razorpay payment integration, and WhatsApp notifications.

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
- [Documentation](#-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## ✨ Features

### Admin Panel
- 🔐 Secure authentication with JWT
- 📦 Product management with variants (size, color, etc.)
- 🖼️ Image upload to AWS S3
- 📊 Real-time inventory tracking with reservation system
- 📅 Product drop scheduling with early access
- 👥 Customer relationship management (CRM)
- 📈 Order management and fulfillment
- 🚚 Shipping tracking integration
- 💰 Razorpay payment gateway configuration
- 📱 Activity logs and analytics

### Checkout Experience
- 🎨 White-label branded checkout pages
- 🛒 Persistent Cart (LocalStorage) with multi-item support
- 💳 Razorpay payment integration with strict metadata enforcement
- 📱 WhatsApp order notifications
- 🔒 Secure payment verification with signature validation
- 📦 Real-time stock availability
- 🎯 Product drop countdown timers
- 🔄 Automatic retry handling for failed payments
- 🔎 Audit Trail: Guaranteed 1:1 link between Razorpay IDs and Database IDs


### Backend API
- ⚡ Express.js REST API
- 🔄 Redis caching for performance
- 🔐 JWT authentication & authorization
- 📊 PostgreSQL with Prisma ORM
- 🎫 Automatic inventory reservation system
- 💸 Razorpay webhook handling with signature verification
- 🔁 Idempotency middleware for payment operations
- 📝 Comprehensive webhook event logging
- 📱 WhatsApp notification service
- 🔒 Encrypted payment credentials storage
- 🛡️ CORS configuration for cross-origin requests

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI, Lucide Icons
- **State Management**: React Hooks
- **HTTP Client**: Axios

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
- **Storage**: AWS S3
- **Payment**: Razorpay
- **Notifications**: WhatsApp Business API

## 📁 Project Structure

```
brand-order-system/
├── apps/
│   ├── admin/              # Next.js admin dashboard
│   │   ├── app/
│   │   │   ├── (auth)/     # Authentication pages
│   │   │   │   └── login/
│   │   │   └── (dashboard)/ # Protected dashboard pages
│   │   │       ├── dashboard/
│   │   │       ├── products/
│   │   │       ├── orders/
│   │   │       └── customers/
│   │   ├── components/     # React components
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   └── lib/            # Utilities & API client
│   │
│   ├── api/                # Express.js backend
│   │   └── src/
│   │       ├── controllers/
│   │       ├── routes/
│   │       ├── services/
│   │       ├── middleware/
│   │       └── index.ts
│   │
│   └── checkout/           # Next.js checkout app
│       └── app/
│
├── packages/
│   ├── database/           # Prisma schema & client
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── index.ts
│   │
│   ├── types/              # Shared TypeScript types
│   │   └── index.ts
│   │
│   └── ui/                 # Shared UI components
│       └── components/
│
├── scripts/
│   ├── setup-dev.sh        # Development setup script
│   ├── deploy.sh           # Deployment script
│   └── backup-db.sh        # Database backup script
│
├── docker-compose.yml      # Docker services configuration
├── pnpm-workspace.yaml     # Monorepo workspace config
└── .env.example            # Environment variables template
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

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

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd brand-order-system
```

### 2. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Edit `.env` with your actual configuration values (see [Environment Variables](#-environment-variables) section).

### 3. Automated Setup (Recommended)

Run the setup script to install dependencies and start services:

```bash
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

### 4. Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Install dependencies
pnpm install

# Start Docker services (PostgreSQL & Redis)
docker-compose up -d

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Build shared packages
pnpm --filter @brand-order-system/types build
pnpm --filter @brand-order-system/ui build
```

### 5. Start Development Servers

Open three terminal windows:

```bash
# Terminal 1: API Server (Port 4000)
cd apps/api
pnpm dev

# Terminal 2: Admin Panel (Port 3000)
cd apps/admin
pnpm dev

# Terminal 3: Checkout App (Port 3002)
cd apps/checkout
pnpm dev
```

### 6. Access the Applications

- **Admin Panel**: http://localhost:3000
- **API Server**: http://localhost:4000
- **Checkout**: http://localhost:3002

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
# AWS S3 (for image uploads)
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
AWS_REGION="ap-south-1"
AWS_S3_BUCKET="your-s3-bucket-name"

# Razorpay (payment gateway)
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="your-razorpay-webhook-secret"

# WhatsApp (notifications)
WHATSAPP_API_KEY="your-whatsapp-provider-api-key"
WHATSAPP_PHONE_NUMBER="919876543210"
```

## 💻 Development

### Available Scripts

```bash
# Install dependencies for all workspaces
pnpm install

# Run all apps in development mode
pnpm dev

# Build all apps for production
pnpm build

# Run linting across all packages
pnpm lint

# Run tests
pnpm test

# Database commands
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
```

### Working with Individual Apps

```bash
# Run commands for specific workspace
pnpm --filter admin dev
pnpm --filter api build
pnpm --filter @brand-order-system/database db:generate
```

## 🗄️ Database

### Schema Overview

The database includes the following main entities:

- **Users**: Brand owners with authentication
- **Products**: Product catalog with variants
- **Variants**: Product variations (size, color, etc.)
- **Inventory**: Stock management with reservation system
- **Orders**: Order tracking and fulfillment
- **Customers**: CRM and customer data
- **Addresses**: Shipping addresses
- **CartReservations**: Temporary inventory holds
- **ActivityLogs**: Audit trail

### Database Commands

```bash
# Create a new migration
cd packages/database
pnpm prisma migrate dev --name migration_name

# Apply migrations
pnpm prisma migrate deploy

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Open Prisma Studio (GUI)
pnpm prisma studio
```

### Backup & Restore

```bash
# Backup database
./scripts/backup-db.sh

# Restore from backup
docker exec -i brand_db psql -U branduser -d brandorder < backup.sql
```

## 📚 Documentation

Comprehensive guides for system features and operations:

### Payment & Webhooks
- **[Webhook Setup Guide](./docs/WEBHOOK_SETUP.md)** - Complete guide for Razorpay webhook configuration, testing, and troubleshooting
- **[Webhook Quick Reference](./docs/WEBHOOK_QUICK_REFERENCE.md)** - Quick commands and troubleshooting checklist
- **[Payment Security](./docs/PAYMENT_SECURITY.md)** - Idempotency, inventory locking, and security features

### System Documentation
- **[Idempotency Guide](./docs/IDEMPOTENCY.md)** - Preventing duplicate charges and race conditions
- **[Idempotency Implementation](./IDEMPOTENCY_IMPLEMENTATION.md)** - Technical implementation details

### Testing Scripts
- **[Test Webhooks](./docs/test-webhook.sh)** - Automated webhook testing script
- **[Test Idempotency](./docs/test-idempotency.sh)** - Idempotency testing script

## 🎯 Current Implementation Status

### ✅ Completed Features

#### Core System
- [x] Monorepo setup with pnpm workspaces
- [x] PostgreSQL database with Prisma ORM
- [x] Redis caching layer
- [x] Docker containerization
- [x] TypeScript configuration across all packages

#### Authentication & Security
- [x] JWT-based authentication
- [x] Password hashing with bcryptjs
- [x] Secure credential encryption
- [x] CORS configuration with idempotency header support
- [x] Helmet.js security headers

#### Product Management
- [x] Product CRUD operations
- [x] Product variants (size, color, etc.)
- [x] Inventory tracking
- [x] Product slugs for checkout URLs

#### Payment Integration
- [x] Razorpay order creation
- [x] Payment processing flow
- [x] Webhook signature verification
- [x] Webhook event logging and deduplication
- [x] Idempotency middleware for payment operations
- [x] Client-side idempotency key generation
- [x] Automatic retry handling with preserved idempotency keys

#### Order Management
- [x] Order creation and tracking
- [x] Order status updates via webhooks
- [x] Inventory reservation system
- [x] Order fulfillment workflow

#### Frontend Applications
- [x] Admin dashboard (Next.js)
- [x] Checkout application (Next.js)
- [x] Product listing pages
- [x] Cart functionality
- [x] Payment UI integration

### 🚧 In Progress / Planned

#### Admin Features
- [ ] Image upload to AWS S3
- [ ] Product drop scheduling
- [ ] Customer relationship management (CRM)
- [ ] Shipping tracking integration
- [ ] Activity logs dashboard
- [ ] Analytics and reporting

#### Checkout Features
- [ ] WhatsApp order notifications
- [ ] Email notifications
- [x] Order confirmation pages
- [ ] Order tracking for customers

#### System Enhancements
- [ ] Background job for expired reservation cleanup
- [ ] Rate limiting
- [ ] Advanced logging and monitoring
- [ ] Performance optimization
- [ ] Automated testing suite

## 📡 API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "brand@example.com",
  "password": "securepassword",
  "brandName": "My Brand"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "brand@example.com",
  "password": "securepassword"
}
```

### Products

#### Get All Products
```http
GET /api/products
Authorization: Bearer <token>
```

#### Create Product
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Premium T-Shirt",
  "description": "High quality cotton t-shirt",
  "basePrice": 999.00,
  "checkoutSlug": "premium-tshirt",
  "variants": [
    {
      "name": "Size M",
      "sku": "TSHIRT-M",
      "inventoryCount": 50,
      "priceAdjustment": 0
    }
  ]
}
```

### Checkout

#### Create Order
```http
POST /api/checkout/create-order
Content-Type: application/json

{
  "items": [
    {
      "variantId": "uuid",
      "quantity": 2
    }
  ],
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210"
  },
  "address": {
    "addressLine1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```

## 🚀 Deployment

### Production Build

```bash
# Build all applications
pnpm build

# Start production servers
cd apps/api && pnpm start
cd apps/admin && pnpm start
cd apps/checkout && pnpm start
```

### Docker Deployment

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Checklist

Before deploying to production:

- [ ] Set strong `JWT_SECRET` and `ENCRYPTION_KEY`
- [ ] Configure production database URL
- [ ] Set up AWS S3 bucket for images
- [ ] Configure Razorpay production keys
- [ ] Set up WhatsApp Business API
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CDN for static assets

## 🏗️ Architecture Highlights

### Inventory Reservation System
- Automatic cart reservation with configurable timeout
- Prevents overselling during checkout
- Background job to release expired reservations

### Payment Flow
1. Customer adds items to cart (inventory reserved)
2. Client generates unique idempotency key
3. Razorpay order created with reserved items (idempotent)
4. Payment processed through Razorpay
5. Webhook receives payment event with signature verification
6. Webhook event logged and deduplicated
7. Order status updated (paid/failed)
8. Inventory deducted on successful payment
9. WhatsApp notification sent (planned)

### Security Features
- JWT-based authentication
- Password hashing with bcryptjs
- Encrypted Razorpay credentials
- CORS protection with custom headers (idempotency-key)
- Helmet.js security headers
- Webhook signature verification (HMAC SHA256)
- Idempotency protection against duplicate charges
- Input validation with Zod (planned)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation for new features

## 📝 License

This project is proprietary and confidential.

### Payment Audit & Metadata (New)
To ensure strict financial tracking, the system enforces the following metadata on every Razorpay transaction:
- **`internal_order_id`**: A unique UUID generated by the backend *before* payment initiation. used as the Primary Key in the database.
- **`brand_id`**: The UUID of the brand owner.
- **`brand_slug`**: The public identifier of the brand.

This guarantees that every Rupee can be traced back to a specific order and brand, even if the database temporarily disconnects, as the "Notes" in Razorpay act as a decentralized record.

### Race Condition & High Concurrency Handling (New)
To prevent "overselling" when multiple customers attempt to buy the last item simultaneously, the system implements:
- **Atomic Inventory Locking**: Uses `Prisma $transaction` to lock inventory rows during checkout.
- **Strict Verification**: The final stock deduction happens *inside* the transaction where the order is created.
- **Load Tested**: Verified to successfully handle 20+ concurrent requests for a single item, correctly processing 1 and rejecting 19.

### Robust Idempotency
- **Double-Spend Protection**: The payment verification endpoint is fully idempotent.
- **Session Tracking**: The `sessionId` is embedded in Razorpay notes to ensure the exact reservation session is cleared upon payment.
- **Duplicate Request Handling**: If a client sends the same payment verification request twice (e.g., due to network lag), the system detects the duplicate `razorpay_order_id`, prevents a second stock deduction, and returns the original success response.

## 🆘 Support

For issues and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🙏 Acknowledgments

- Built with Next.js, Express, and Prisma
- UI components from Radix UI
- Icons from Lucide
- Styled with Tailwind CSS

---

**Made with ❤️ for Instagram D2C Brands**
