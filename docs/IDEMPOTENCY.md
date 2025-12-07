# Payment Idempotency Implementation

## Overview

Idempotency is a critical security feature that prevents duplicate payment charges when users accidentally submit the same payment request multiple times. This can happen due to:

- Double-clicking the payment button
- Network timeouts causing retries
- Browser back/forward navigation
- Accidental page refreshes during payment

## How It Works

### 1. Client-Side Implementation

The client must send a unique `Idempotency-Key` header with each payment request:

```typescript
// Generate a unique key (UUID recommended)
const idempotencyKey = crypto.randomUUID();

// Send with payment request
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

### 2. Server-Side Processing

When a request arrives:

1. **First Request**: 
   - Server processes the request normally
   - Reserves inventory
   - Creates Razorpay order
   - Caches the response with the idempotency key (24-hour TTL)
   - Returns the response

2. **Duplicate Request** (same idempotency key):
   - Server detects the duplicate
   - Returns the cached response immediately
   - No new charge is created
   - No inventory is reserved again

3. **Concurrent Requests** (same key, simultaneous):
   - First request acquires a processing lock
   - Subsequent requests receive a 409 Conflict error
   - Client should wait and retry

## Response Codes

- `200 OK`: Request processed successfully (or cached response returned)
- `400 Bad Request`: Invalid request data
- `409 Conflict`: Request is currently being processed, retry after a short delay

## Best Practices

### Client-Side

1. **Generate Keys Properly**:
   ```typescript
   // ✅ Good: Use UUID
   const key = crypto.randomUUID();
   
   // ❌ Bad: Use timestamp (not unique enough)
   const key = Date.now().toString();
   ```

2. **Store Keys Locally**:
   ```typescript
   // Store in session/local storage for retry scenarios
   sessionStorage.setItem('payment-idempotency-key', key);
   ```

3. **Handle 409 Conflicts**:
   ```typescript
   async function createOrder(data: any, retries = 3) {
     const key = sessionStorage.getItem('payment-idempotency-key') 
       || crypto.randomUUID();
     
     try {
       const response = await fetch('/api/checkout/create-order', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Idempotency-Key': key
         },
         body: JSON.stringify(data)
       });

       if (response.status === 409 && retries > 0) {
         // Wait 1 second and retry
         await new Promise(resolve => setTimeout(resolve, 1000));
         return createOrder(data, retries - 1);
       }

       return response.json();
     } catch (error) {
       console.error('Payment failed:', error);
       throw error;
     }
   }
   ```

4. **Clear Keys After Success**:
   ```typescript
   // After successful payment
   sessionStorage.removeItem('payment-idempotency-key');
   ```

### Server-Side

The server automatically:
- Validates idempotency keys
- Caches responses for 24 hours
- Handles concurrent requests with locks
- Generates fallback keys if client doesn't provide one (less secure)

## Security Considerations

1. **Key Uniqueness**: Each payment attempt should have a unique key
2. **Key Storage**: Keys are stored in Redis with 24-hour expiration
3. **Processing Locks**: Prevent race conditions with 60-second locks
4. **Validation**: All payment data is validated before processing

## Testing

### Test Duplicate Prevention

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

### Test Concurrent Requests

Send multiple requests simultaneously with the same key - only one should process, others should get 409.

## Monitoring

Monitor these metrics:
- Idempotency cache hit rate
- 409 Conflict responses (indicates duplicate attempts)
- Processing lock timeouts

## Troubleshooting

### Issue: Getting 409 errors frequently
**Solution**: Increase retry delay or check for client-side bugs causing rapid retries

### Issue: Cached responses not returning
**Solution**: Check Redis connection and TTL settings

### Issue: Different responses for same key
**Solution**: Ensure idempotency keys are truly unique per payment attempt
