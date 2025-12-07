# Webhook Quick Reference Guide

Quick reference for common webhook operations and troubleshooting.

## Quick Start

### 1. Setup (5 minutes)

```bash
# 1. Add webhook secret to .env
echo 'RAZORPAY_WEBHOOK_SECRET=whsec_your_secret_here' >> apps/api/.env

# 2. Start the server
cd brand-order-system
pnpm dev

# 3. Test locally
bash docs/test-webhook.sh
```

### 2. Local Testing with ngrok

```bash
# Terminal 1: Start API
cd brand-order-system
pnpm dev

# Terminal 2: Start ngrok
ngrok http 4000

# Copy ngrok URL and configure in Razorpay Dashboard:
# https://your-id.ngrok.io/api/webhooks/razorpay
```

### 3. Verify Setup

```bash
# Check webhook endpoint
curl -X POST http://localhost:4000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return 400 (missing signature) - this is correct!
```

---

## Common Commands

### Test Webhook Locally

```bash
# Set webhook secret
export RAZORPAY_WEBHOOK_SECRET='your_secret'

# Run test script
bash docs/test-webhook.sh
```

### Generate Webhook Signature

```bash
# Using openssl
PAYLOAD='{"event":"payment.captured"}'
SECRET='your_webhook_secret'

echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //'
```

### Send Test Webhook

```bash
# With valid signature
curl -X POST http://localhost:4000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $(echo -n '{"event":"payment.captured"}' | openssl dgst -sha256 -hmac 'your_secret' | sed 's/^.* //')" \
  -d '{"event":"payment.captured"}'
```

### Check Webhook Events

```sql
-- Recent webhooks
SELECT event_id, event_type, processed_at 
FROM webhook_events 
ORDER BY processed_at DESC 
LIMIT 10;

-- Count by type
SELECT event_type, COUNT(*) 
FROM webhook_events 
GROUP BY event_type;

-- Find specific event
SELECT * FROM webhook_events 
WHERE event_id = 'evt_xxx';
```

### Check Order Status

```sql
-- Orders paid via webhook
SELECT order_number, payment_status, razorpay_payment_id, paid_at
FROM orders
WHERE payment_status = 'paid'
ORDER BY paid_at DESC
LIMIT 10;

-- Pending orders
SELECT order_number, payment_status, created_at
FROM orders
WHERE payment_status = 'pending'
ORDER BY created_at DESC;
```

---

## Troubleshooting Checklist

### ❌ Webhook Not Received

```bash
# 1. Check server running
curl http://localhost:4000/health

# 2. Check webhook URL in Razorpay Dashboard
# Should be: https://your-domain.com/api/webhooks/razorpay

# 3. Check ngrok tunnel (local dev)
curl https://your-id.ngrok.io/api/webhooks/razorpay

# 4. Check server logs
tail -f apps/api/logs/app.log
```

### ❌ Signature Verification Failed

```bash
# 1. Verify webhook secret
echo $RAZORPAY_WEBHOOK_SECRET

# 2. Check secret in Razorpay Dashboard matches .env

# 3. Restart server after changing .env
cd apps/api
pnpm start

# 4. Test with known good signature
bash docs/test-webhook.sh
```

### ❌ Order Not Updated

```sql
-- 1. Check order exists
SELECT * FROM orders WHERE razorpay_order_id = 'order_xxx';

-- 2. Check webhook processed
SELECT * FROM webhook_events 
WHERE payload->>'payment'->>'entity'->>'order_id' = 'order_xxx';

-- 3. Check for errors in logs
-- Look for: "Order update failed" or "Order not found"
```

### ❌ Environment Variable Not Loaded

```bash
# 1. Check .env file exists
ls -la apps/api/.env

# 2. Check variable in file
cat apps/api/.env | grep RAZORPAY_WEBHOOK_SECRET

# 3. Test loading
node -e "require('dotenv').config({path:'apps/api/.env'}); console.log(process.env.RAZORPAY_WEBHOOK_SECRET)"

# 4. Restart server
cd apps/api
pnpm start
```

---

## Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success or non-retryable error | Webhook processed |
| 400 | Invalid signature or missing header | Check webhook secret |
| 500 | Retryable error (database failure) | Razorpay will retry |

---

## Webhook Event Structure

### payment.captured Event

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxxxxxxxxxxxx",
        "order_id": "order_xxxxxxxxxxxxx",
        "amount": 149900,
        "currency": "INR",
        "status": "captured",
        "method": "card",
        "captured": true,
        "email": "customer@example.com",
        "contact": "+919876543210"
      }
    }
  }
}
```

---

## Monitoring Queries

### Webhook Health

```sql
-- Webhooks in last hour
SELECT COUNT(*) as webhook_count
FROM webhook_events
WHERE processed_at > NOW() - INTERVAL '1 hour';

-- Success rate (check application logs for failures)
SELECT 
  DATE_TRUNC('hour', processed_at) as hour,
  COUNT(*) as total_webhooks
FROM webhook_events
GROUP BY hour
ORDER BY hour DESC
LIMIT 24;
```

### Order Payment Status

```sql
-- Payment conversion rate
SELECT 
  payment_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM orders
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY payment_status;

-- Average time to payment
SELECT 
  AVG(EXTRACT(EPOCH FROM (paid_at - created_at))) as avg_seconds
FROM orders
WHERE payment_status = 'paid'
  AND paid_at > NOW() - INTERVAL '24 hours';
```

---

## Configuration Files

### .env (apps/api/.env)

```bash
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Webhook URL

```
Production: https://api.yourdomain.com/api/webhooks/razorpay
Staging:    https://staging-api.yourdomain.com/api/webhooks/razorpay
Local:      https://your-id.ngrok.io/api/webhooks/razorpay
```

---

## Useful Links

- **Full Documentation**: [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)
- **Razorpay Dashboard**: https://dashboard.razorpay.com/
- **Razorpay Webhooks Docs**: https://razorpay.com/docs/webhooks/
- **Payment Security**: [PAYMENT_SECURITY.md](./PAYMENT_SECURITY.md)
- **Idempotency Guide**: [IDEMPOTENCY.md](./IDEMPOTENCY.md)

---

## Emergency Contacts

### Disable Webhooks (Emergency)

If webhooks are causing issues:

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click on webhook
3. Click "Disable"
4. Orders will still be created via frontend flow

### Rollback Steps

```bash
# 1. Disable webhook in Razorpay Dashboard

# 2. Check for stuck orders
SELECT order_number, payment_status, created_at
FROM orders
WHERE payment_status = 'pending'
  AND created_at > NOW() - INTERVAL '1 hour';

# 3. Investigate and fix issues

# 4. Re-enable webhook after testing
```

---

**Last Updated:** December 7, 2025  
**Version:** 1.0
