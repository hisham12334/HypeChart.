# Payment Security Implementation

## Overview

This document describes the security measures implemented for the payment system to prevent duplicate charges, race conditions, and other payment-related issues.

## Security Features

### 1. Idempotency Protection ✅

**Purpose**: Prevent duplicate payment charges when users accidentally submit the same request multiple times.

**Implementation**:
- Middleware: `apps/api/src/middleware/idempotency.middleware.ts`
- Service: `apps/api/src/services/idempotency.service.ts`
- Applied to: `/api/checkout/create-order` endpoint

**How it works**:
- Client sends unique `Idempotency-Key` header with each payment request
- Server caches successful responses for 24 hours
- Duplicate requests return the cached response without creating new charges
- Concurrent requests are blocked with 409 Conflict status

**Benefits**:
- ✅ Prevents double-charging customers
- ✅ Safe to retry failed requests
- ✅ Handles network timeouts gracefully
- ✅ Protects against accidental double-clicks

### 2. Inventory Reservation Locking ✅

**Purpose**: Prevent race conditions when multiple customers try to buy the same item simultaneously.

**Implementation**:
- Service: `apps/api/src/services/inventory.service.ts`
- Uses Redis locks with 5-second timeout
- Atomic operations with database transactions

**How it works**:
- Acquires Redis lock before checking inventory
- Checks available stock (total - reserved)
- Creates reservation and updates reserved count
- Releases lock after operation completes

**Benefits**:
- ✅ Prevents overselling
- ✅ Ensures accurate stock counts
- ✅ Handles concurrent purchases safely

### 3. Request Validation ✅

**Purpose**: Validate all payment data before processing.

**Implementation**:
- Controller: `apps/api/src/controllers/checkout.controller.ts`

**Validations**:
- Required fields: `variantId`, `amount`
- Quantity: Must be between 1 and 10
- Amount: Must be greater than 0
- Data types: Proper type checking

**Benefits**:
- ✅ Prevents invalid payment requests
- ✅ Protects against malicious input
- ✅ Clear error messages for debugging

### 4. Session Tracking ✅

**Purpose**: Link payment orders to inventory reservations.

**Implementation**:
- Unique session IDs generated for each order
- Session ID stored in both:
  - Inventory reservation record
  - Razorpay order notes

**Benefits**:
- ✅ Track payment lifecycle
- ✅ Link payments to reservations
- ✅ Enable payment verification
- ✅ Support refund processing

## Architecture

```
Client Request
     ↓
Idempotency Middleware (check cache)
     ↓
Validation (request data)
     ↓
Inventory Lock (Redis)
     ↓
Reserve Inventory (Database)
     ↓
Create Razorpay Order (Payment Gateway)
     ↓
Cache Response (Redis)
     ↓
Return to Client
```

## Client Integration

### Basic Usage

```typescript
import { paymentClient } from '@/lib/payment-client';

// Create order with automatic idempotency
const result = await paymentClient.createOrder({
  variantId: 'variant-123',
  quantity: 1,
  amount: 1499
});

if (result.success) {
  // Initialize Razorpay payment
  const razorpay = new Razorpay({
    key: result.keyId,
    order_id: result.orderId,
    // ... other options
  });
  
  razorpay.on('payment.success', () => {
    // Clear idempotency key after success
    paymentClient.confirmPaymentSuccess();
  });
  
  razorpay.on('payment.failed', () => {
    // Keep key for retry
    paymentClient.handlePaymentFailure();
  });
}
```

### Manual Idempotency Key

```typescript
const idempotencyKey = crypto.randomUUID();

fetch('/api/checkout/create-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey
  },
  body: JSON.stringify({
    variantId: 'variant-123',
    quantity: 1,
    amount: 1499
  })
});
```

## Testing

### Test Idempotency

```bash
# Run the test script
bash docs/test-idempotency.sh
```

### Manual Testing

```bash
# First request
curl -X POST http://localhost:4000/api/checkout/create-order \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-123" \
  -d '{"variantId":"variant-id","quantity":1,"amount":1499}'

# Duplicate request (should return same response)
curl -X POST http://localhost:4000/api/checkout/create-order \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-123" \
  -d '{"variantId":"variant-id","quantity":1,"amount":1499}'
```

## Monitoring

### Key Metrics to Monitor

1. **Idempotency Cache Hit Rate**
   - High rate indicates many duplicate requests
   - May indicate UX issues (double-click problems)

2. **409 Conflict Responses**
   - Indicates concurrent requests with same key
   - Should be rare in production

3. **Inventory Lock Timeouts**
   - Should be very rare
   - May indicate performance issues

4. **Failed Validations**
   - Track validation errors
   - May indicate client bugs or attacks

### Redis Keys

- `idempotency:{key}` - Cached responses (24h TTL)
- `idempotency:processing:{key}` - Processing locks (60s TTL)
- `lock:variant:{id}` - Inventory locks (5s TTL)

## Security Best Practices

### ✅ Implemented

- Idempotency for all payment mutations
- Request validation and sanitization
- Inventory locking to prevent race conditions
- Session tracking for audit trails
- Secure error messages (no sensitive data leaks)

### 🔄 Recommended Future Enhancements

1. **Rate Limiting**: Limit payment requests per IP/user
2. **Webhook Verification**: Verify Razorpay webhook signatures
3. **Payment Verification**: Verify payment status before fulfillment
4. **Fraud Detection**: Monitor suspicious payment patterns
5. **Audit Logging**: Log all payment attempts for compliance

## Troubleshooting

### Issue: Getting 409 errors
**Cause**: Multiple requests with same idempotency key being processed simultaneously
**Solution**: Client should wait 1-2 seconds and retry

### Issue: Cached response not returning
**Cause**: Redis connection issue or key expired
**Solution**: Check Redis connection and logs

### Issue: Inventory lock timeout
**Cause**: High concurrent load or slow database
**Solution**: Increase lock timeout or optimize database queries

### Issue: Different responses for same key
**Cause**: Idempotency key not unique enough
**Solution**: Use UUID or crypto.randomUUID() for key generation

## References

- [Idempotency Documentation](./IDEMPOTENCY.md)
- [Stripe Idempotency Guide](https://stripe.com/docs/api/idempotent_requests)
- [Razorpay API Documentation](https://razorpay.com/docs/api/)
