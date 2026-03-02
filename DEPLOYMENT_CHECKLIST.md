# Pre-Deployment Checklist

## ✅ Code Quality Checks

### TypeScript Compilation
- [x] All files compile without errors
- [x] No diagnostic errors in key files:
  - apps/api/src/index.ts
  - apps/api/src/controllers/store.controller.ts
  - apps/api/src/controllers/payment-settings.controller.ts
  - apps/admin/app/(dashboard)/settings/page.tsx
  - apps/checkout/app/p/[productId]/page.tsx

### Testing Status
- [ ] Manual testing completed
  - [x] Product creation works
  - [x] Product page displays correctly
  - [x] Cart functionality works
  - [x] Stock validation works
  - [x] Settings page accessible
  - [ ] Payment settings save (requires Razorpay Route activation)
  - [ ] Full checkout flow (end-to-end)

## 🔍 Changes Summary

### New Files
1. `apps/admin/app/(dashboard)/settings/page.tsx` - Settings hub page
2. `apps/admin/app/(dashboard)/settings/payments/page.tsx` - Payment settings form
3. `apps/api/src/controllers/payment-settings.controller.ts` - Payment settings API
4. `CHANGELOG.md` - Detailed change log
5. `DEPLOYMENT_CHECKLIST.md` - This file

### Modified Files
1. `apps/api/src/index.ts` - Fixed rate limiter ordering, route organization
2. `apps/api/src/controllers/store.controller.ts` - Complete rewrite with new methods
3. `apps/api/src/routes/store.routes.ts` - Added new public routes
4. `apps/admin/lib/api-client.ts` - Added payment settings API helper
5. `apps/checkout/app/p/[productId]/page.tsx` - Fixed product fetching
6. `packages/database/prisma/schema.prisma` - Added payment fields to User model
7. `README.md` - Updated with new features and architecture

### Database Changes
- Migration: `20260224141129_add_payment_fields`
- Added fields: `plan`, `razorpayKeyId`, `razorpayKeySecret`, `razorpayLinkedAccountId`

## ⚠️ Known Issues & Limitations

### Critical
- **Razorpay Route Not Enabled**: Bank account linking uses mock IDs
  - Impact: Starter tier payment routing won't work in production
  - Action Required: Contact Razorpay to enable Route feature
  - Workaround: Use Pro tier (BYOG) for now

### Non-Critical
- WhatsApp notifications not implemented (planned feature)
- Some admin features incomplete (CRM, analytics)

## 🔒 Security Review

### Completed
- [x] JWT authentication on protected endpoints
- [x] Password hashing with bcryptjs
- [x] Razorpay credentials encrypted
- [x] Rate limiting implemented
- [x] CORS configured properly
- [x] Webhook signature verification
- [x] Idempotency protection

### Pending
- [ ] Input validation with Zod
- [ ] SQL injection prevention audit
- [ ] XSS protection review
- [ ] CSRF token implementation

## 🌐 Environment Variables

### Required for Production
```bash
# Core
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="min-32-chars-secret"
ENCRYPTION_KEY="32-byte-encryption-key"

# Razorpay
RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="your-secret"
RAZORPAY_WEBHOOK_SECRET="webhook-secret"

# URLs
ADMIN_URL="https://admin.yourdomain.com"
CHECKOUT_URL="https://checkout.yourdomain.com"
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud"
CLOUDINARY_API_KEY="your-key"
CLOUDINARY_API_SECRET="your-secret"
```

## 📊 Performance Considerations

### Rate Limits
- General API: 100 req/15min per IP
- Checkout: 10 req/hour per IP
- Consider adjusting for production load

### Database
- Indexes on frequently queried fields
- Connection pooling configured
- Query optimization needed for analytics

### Caching
- Redis configured for session storage
- Consider caching product data
- Implement cache invalidation strategy

## 🚀 Deployment Steps

### Pre-Deployment
1. [ ] Review all changes in git diff
2. [ ] Run full test suite (when available)
3. [ ] Update version in package.json
4. [ ] Tag release in git
5. [ ] Backup production database

### Deployment
1. [ ] Deploy database migrations first
2. [ ] Deploy API server
3. [ ] Deploy admin panel
4. [ ] Deploy checkout app
5. [ ] Verify health endpoints
6. [ ] Test critical user flows

### Post-Deployment
1. [ ] Monitor error logs
2. [ ] Check webhook delivery
3. [ ] Verify payment processing
4. [ ] Test from production URLs
5. [ ] Monitor performance metrics

## 🐛 Rollback Plan

If issues occur:
1. Revert to previous git tag
2. Rollback database migration if needed:
   ```bash
   pnpm prisma migrate resolve --rolled-back 20260224141129_add_payment_fields
   ```
3. Clear Redis cache
4. Restart all services

## 📝 Documentation Updates

- [x] README.md updated with new features
- [x] CHANGELOG.md created
- [x] API documentation updated
- [x] Architecture section enhanced
- [ ] User guide for payment settings (TODO)
- [ ] Admin manual updates (TODO)

## ✅ Final Checks Before Push

- [x] All TypeScript errors resolved
- [x] No console.errors in production code
- [x] Environment variables documented
- [x] README reflects current state
- [x] CHANGELOG is complete
- [ ] All team members notified
- [ ] Staging environment tested (if available)

## 🎯 Recommendation

**Status**: READY FOR STAGING ⚠️

**Blockers for Production**:
1. Razorpay Route feature needs activation
2. End-to-end payment flow testing required
3. Load testing recommended

**Safe to Deploy**:
- All new features are additive (no breaking changes)
- Existing functionality preserved
- Database migration is reversible
- Rate limiting protects against abuse

**Next Steps**:
1. Deploy to staging environment
2. Test payment settings UI
3. Contact Razorpay for Route activation
4. Complete end-to-end testing
5. Deploy to production after validation

---

**Prepared by**: Kiro AI Assistant
**Date**: 2026-02-26
**Version**: 0.2.0-rc1
