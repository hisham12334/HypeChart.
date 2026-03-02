# Changelog

All notable changes to the Brand Order System will be documented in this file.

## [Unreleased] - 2026-02-26

### Added
- **Payment Settings System**: Complete two-tier payment configuration
  - Starter Tier: Bank account linking with 3% platform fee
  - Pro Tier: Bring Your Own Gateway (BYOG) with 0% fee
  - Settings UI in admin panel with payment configuration cards
  - Payment settings API endpoints with authentication

- **Store API**: Public-facing API for checkout experience
  - `GET /api/store/product/:slug` - Fetch product by checkout slug
  - `POST /api/store/stock` - Validate cart stock availability
  - Real-time inventory calculation (availableCount = inventoryCount - reservedCount)
  - No authentication required for public endpoints

- **Dynamic Product Pages**: Enhanced checkout experience
  - Product detail pages with variant selection
  - Real-time stock availability display
  - Image gallery with thumbnails
  - Size selector with out-of-stock indicators
  - Low stock warnings (≤5 items)
  - Mobile-responsive design with sticky action bar

- **Rate Limiting**: API protection and abuse prevention
  - General API: 100 requests per 15 minutes per IP
  - Checkout API: 10 requests per hour per IP (stricter)
  - Configurable rate limit windows and thresholds

- **Database Schema Updates**:
  - Added `plan` field to User model (STARTER/PRO)
  - Added `razorpayKeyId` and `razorpayKeySecret` for Pro tier
  - Added `razorpayLinkedAccountId` for Starter tier
  - Migration: `20260224141129_add_payment_fields`

### Changed
- **API Route Organization**: Improved structure and ordering
  - Rate limiters now defined before use (prevents crashes)
  - Routes organized by access level (public vs protected)
  - Consistent route registration order
  - Fixed environment path resolution for monorepo

- **Store Controller**: Complete rewrite
  - Removed old methods (getStoreBySlug, getProductById)
  - Added new public methods (getProductBySlug, checkStock)
  - Added payment settings methods (connectLinkedAccount, saveProApiKeys)
  - Better error handling and logging

- **Product API Response**: Enhanced with availability data
  - Variants now include `availableCount` field
  - Calculated in real-time from inventory and reservations
  - Consistent response format across endpoints

- **Frontend API Clients**: Improved error handling
  - Better response parsing
  - Proper error messages
  - Consistent base URL usage
  - Added payment settings API helper

### Fixed
- **Critical**: Fixed nodemon crashes due to middleware ordering
  - Rate limiters were being applied after `app.listen()`
  - Moved rate limiter definitions to top of file
  - Applied middleware in correct order

- **API Endpoints**: Fixed 404 errors
  - Store routes now properly registered
  - Product fetching endpoint working
  - Stock check endpoint implemented

- **Product Pages**: Fixed data fetching
  - Removed incorrect `data.success` check
  - API returns product directly, not wrapped
  - Proper error handling for failed requests

- **Cart Functionality**: Fixed stock validation
  - Stock check endpoint now exists
  - Proper response format
  - Error handling for out-of-stock items

- **Environment Variables**: Fixed path resolution
  - Corrected .env path for monorepo structure
  - Works in both dev (ts-node) and prod (node)
  - Proper path resolution from apps/api/src

### Security
- **Payment Credentials**: Encrypted storage
  - Razorpay API keys encrypted before storage
  - Secure credential handling in Pro tier
  - Environment-based encryption keys

- **Authentication**: Enhanced middleware
  - Proper JWT verification
  - User context extraction
  - Protected payment settings endpoints

- **Rate Limiting**: Abuse prevention
  - IP-based rate limiting
  - Stricter limits on checkout endpoints
  - Configurable thresholds

### Known Issues
- **Razorpay Route**: Requires manual activation
  - Contact Razorpay support to enable Route feature
  - Currently using mock account IDs in development
  - Full integration pending Route activation

- **WhatsApp Notifications**: Not yet implemented
  - Planned for future release
  - Infrastructure ready, needs integration

### Migration Guide

#### From Previous Version

1. **Database Migration**:
   ```bash
   cd packages/database
   pnpm prisma migrate deploy
   ```

2. **Environment Variables**:
   Add to your `.env`:
   ```bash
   # Razorpay (if not already present)
   RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxx"
   RAZORPAY_KEY_SECRET="your-secret-key"
   
   # Frontend (in admin and checkout .env.local)
   NEXT_PUBLIC_API_URL="http://localhost:4000/api"
   ```

3. **Restart Services**:
   ```bash
   # Stop all services
   # Restart with:
   pnpm dev
   ```

4. **Verify Installation**:
   - Admin panel: http://localhost:3000/settings
   - API health: http://localhost:4000/health
   - Test product page: http://localhost:3002/p/[your-product-slug]

### Breaking Changes
- **Store Controller**: Old methods removed
  - `getStoreBySlug()` - removed
  - `getProductById()` - replaced with `getProductBySlug()`
  - Update any custom integrations accordingly

- **API Response Format**: Product endpoint changed
  - No longer wrapped in `{ success, product }`
  - Returns product object directly
  - Update frontend code if using old format

### Performance Improvements
- Rate limiting reduces server load
- Efficient stock calculation queries
- Optimized product fetching with includes

### Developer Experience
- Better error messages and logging
- Consistent API response formats
- Improved TypeScript types
- Updated documentation

---

## [0.1.0] - 2026-02-20

### Initial Release
- Basic product management
- Order processing
- Payment integration
- Webhook handling
- Admin dashboard
- Checkout application

---

**Note**: This project follows [Semantic Versioning](https://semver.org/).
