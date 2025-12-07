# Razorpay Webhook Setup and Testing Guide

## Overview

This guide covers the complete setup, configuration, and testing of Razorpay webhooks for the Brand Order System. Webhooks ensure that payment confirmations are received even if customers close their browser after payment, providing reliable order status updates through server-to-server communication.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Razorpay Dashboard Setup](#razorpay-dashboard-setup)
4. [Local Development Setup](#local-development-setup)
5. [Testing Webhooks](#testing-webhooks)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## Prerequisites

Before setting up webhooks, ensure you have:

- ✅ Razorpay account (test or live mode)
- ✅ Backend API running and accessible
- ✅ Database migrations applied (WebhookEvent table)
- ✅ Redis instance running (for idempotency)
- ✅ For local testing: ngrok or similar tunneling tool

### Required Database Migration

Ensure the webhook events table exists:

```bash
cd packages/database
npx prisma migrate deploy
```

Verify the `webhook_events` table was created:

```sql
-- Should have these columns:
-- id, event_id (unique), event_type, payload, processed_at
```

---

## Environment Configuration

### 1. Obtain Webhook Secret from Razorpay

**Test Mode:**
1. Log into [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to **Settings** → **Webhooks**
3. Click **Create Webhook** or edit existing webhook
4. Copy the **Webhook Secret** (starts with `whsec_`)

**Live Mode:**
1. Switch to Live mode in dashboard
2. Navigate to **Settings** → **Webhooks**
3. Use a different webhook secret for production

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# ============================================
# RAZORPAY WEBHOOK CONFIGURATION
# ============================================

# Webhook secret for signature verification
# Test mode: whsec_xxxxxxxxxxxxx
# Live mode: whsec_xxxxxxxxxxxxx (different secret)
RAZORPAY_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Existing Razorpay config
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxx"
```

### 3. Update .env.example

The `.env.example` file should already include:

```bash
# RAZORPAY (Payment Gateway)
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="your-razorpay-webhook-secret"
```

### 4. Validate Configuration

The API validates webhook configuration at startup. If `RAZORPAY_WEBHOOK_SECRET` is missing, the server will log an error and exit.

**Verify configuration:**

```bash
cd apps/api
pnpm start
```

Look for startup logs:
```
✅ Webhook configuration validated
🚀 Server running on port 4000
```

If you see an error:
```
❌ CRITICAL: RAZORPAY_WEBHOOK_SECRET not configured
```

Stop the server, add the secret to `.env`, and restart.

---

## Razorpay Dashboard Setup

### 1. Create Webhook Endpoint

1. Go to **Settings** → **Webhooks** in Razorpay Dashboard
2. Click **Create Webhook** or **Add New Webhook**
3. Configure webhook:

   **Webhook URL:**
   - Production: `https://api.yourdomain.com/api/webhooks/razorpay`
   - Staging: `https://staging-api.yourdomain.com/api/webhooks/razorpay`
   - Local (ngrok): `https://your-ngrok-id.ngrok.io/api/webhooks/razorpay`

   **Active Events:** Select the following:
   - ✅ `payment.captured` (Required)
   - ⚠️ Optional: `payment.failed`, `refund.created` (for future enhancements)

   **Alert Email:** Your email for webhook failure notifications

4. Click **Create Webhook**
5. **Copy the Webhook Secret** and add to your `.env` file

### 2. Webhook Secret Management

**Important Security Notes:**

- ✅ Use different secrets for test and live modes
- ✅ Never commit secrets to version control
- ✅ Rotate secrets periodically (every 90 days recommended)
- ✅ Store in secure environment variable management (AWS Secrets Manager, etc.)
- ❌ Never share webhook secrets in logs or error messages

### 3. Test Webhook Delivery

Razorpay provides a built-in testing tool:

1. In **Settings** → **Webhooks**, click on your webhook
2. Click **Send Test Webhook**
3. Select event type: `payment.captured`
4. Click **Send**
5. Check the **Webhook Logs** tab for delivery status

---

## Local Development Setup

### Option 1: Using ngrok (Recommended)

ngrok creates a secure tunnel to your local server, allowing Razorpay to send webhooks to your development machine.

#### 1. Install ngrok

**Windows:**
```bash
# Using Chocolatey
choco install ngrok

# Or download from https://ngrok.com/download
```

**Mac/Linux:**
```bash
# Using Homebrew
brew install ngrok

# Or download from https://ngrok.com/download
```

#### 2. Start Your API Server

```bash
cd brand-order-system
pnpm dev

# Or just the API
cd apps/api
pnpm dev
```

Verify API is running on `http://localhost:4000`

#### 3. Start ngrok Tunnel

```bash
ngrok http 4000
```

You'll see output like:
```
Session Status                online
Account                       your-account
Version                       3.x.x
Region                        United States (us)
Forwarding                    https://abc123.ngrok.io -> http://localhost:4000
```

#### 4. Configure Razorpay Webhook

1. Copy the ngrok URL: `https://abc123.ngrok.io`
2. Go to Razorpay Dashboard → Settings → Webhooks
3. Edit your webhook or create a new one
4. Set URL to: `https://abc123.ngrok.io/api/webhooks/razorpay`
5. Save changes

#### 5. Test Webhook Delivery

Send a test webhook from Razorpay Dashboard and check your local logs:

```bash
# You should see logs like:
[INFO] Webhook received: { eventId: 'evt_xxx', eventType: 'payment.captured' }
[INFO] Signature verified successfully
[INFO] Order updated: { orderNumber: 'ORD-001', status: 'paid' }
```

### Option 2: Using localtunnel

Alternative to ngrok:

```bash
# Install
npm install -g localtunnel

# Start tunnel
lt --port 4000 --subdomain mybrand-webhooks

# Use URL: https://mybrand-webhooks.loca.lt/api/webhooks/razorpay
```

### Option 3: Mock Webhooks (No Tunnel)

For testing without external connectivity:

```bash
# Use the test script
bash docs/test-webhook.sh
```

Or manually with curl:

```bash
# See "Testing Webhooks" section below
```

---

## Testing Webhooks

### 1. Test with Razorpay Dashboard

**Easiest method for end-to-end testing:**

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click on your webhook
3. Click **Send Test Webhook**
4. Select `payment.captured`
5. Optionally customize payload
6. Click **Send**
7. Check **Webhook Logs** for delivery status
8. Check your application logs for processing

### 2. Test with curl (Manual)

Create a test script to simulate webhook delivery:

```bash
#!/bin/bash
# test-webhook.sh

# Configuration
API_URL="http://localhost:4000/api/webhooks/razorpay"
WEBHOOK_SECRET="your_webhook_secret_here"

# Sample payload
PAYLOAD='{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_test123456789",
        "order_id": "order_test123456789",
        "amount": 149900,
        "currency": "INR",
        "status": "captured",
        "method": "card"
      }
    }
  }
}'

# Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

# Send request
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE" \
  -d "$PAYLOAD" \
  -v

echo "\n✅ Webhook sent"
```

**Usage:**

```bash
chmod +x test-webhook.sh
./test-webhook.sh
```

### 3. Test Signature Verification

**Valid Signature Test:**

```bash
# Should return 200 OK
curl -X POST http://localhost:4000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $(echo -n '{"event":"payment.captured"}' | openssl dgst -sha256 -hmac 'your_secret' | sed 's/^.* //')" \
  -d '{"event":"payment.captured"}'
```

**Invalid Signature Test:**

```bash
# Should return 400 Bad Request
curl -X POST http://localhost:4000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: invalid_signature_12345" \
  -d '{"event":"payment.captured"}' \
  -v
```

**Missing Signature Test:**

```bash
# Should return 400 Bad Request
curl -X POST http://localhost:4000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -d '{"event":"payment.captured"}' \
  -v
```

### 4. Test Idempotency

Send the same webhook twice to verify duplicate handling:

```bash
# First request - should process
curl -X POST http://localhost:4000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE" \
  -d "$PAYLOAD"

# Second request - should skip (already processed)
curl -X POST http://localhost:4000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

Check logs for:
```
[INFO] Event already processed: evt_xxx (skipping)
```

### 5. Test with Real Payment

**Complete end-to-end test:**

1. Start your local server with ngrok
2. Configure Razorpay webhook with ngrok URL
3. Make a test payment through your checkout app
4. Complete payment in Razorpay test mode
5. Verify webhook received in logs
6. Check order status updated in database

```bash
# Check order status
psql $DATABASE_URL -c "SELECT order_number, payment_status, razorpay_payment_id, paid_at FROM orders WHERE order_number = 'ORD-XXX';"
```

---

## Monitoring and Logging

### 1. Application Logs

The webhook system logs all events with structured data:

**Successful Processing:**
```json
{
  "level": "info",
  "message": "Webhook received",
  "eventId": "evt_xxx",
  "eventType": "payment.captured",
  "timestamp": "2025-12-07T10:30:00Z"
}

{
  "level": "info",
  "message": "Signature verified successfully",
  "eventId": "evt_xxx"
}

{
  "level": "info",
  "message": "Order updated successfully",
  "orderNumber": "ORD-001",
  "paymentId": "pay_xxx",
  "eventId": "evt_xxx"
}
```

**Signature Verification Failure:**
```json
{
  "level": "warn",
  "message": "Webhook signature verification failed",
  "eventId": "evt_xxx",
  "timestamp": "2025-12-07T10:30:00Z"
}
```

**Processing Error:**
```json
{
  "level": "error",
  "message": "Webhook processing failed",
  "eventId": "evt_xxx",
  "error": "Database connection timeout",
  "shouldRetry": true
}
```

### 2. Database Monitoring

**Check processed webhooks:**

```sql
-- Recent webhook events
SELECT 
  event_id,
  event_type,
  processed_at,
  payload->>'payment'->>'entity'->>'order_id' as order_id
FROM webhook_events
ORDER BY processed_at DESC
LIMIT 20;

-- Count by event type
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(processed_at) as last_processed
FROM webhook_events
GROUP BY event_type;

-- Find duplicate events (should be none)
SELECT 
  event_id,
  COUNT(*) as count
FROM webhook_events
GROUP BY event_id
HAVING COUNT(*) > 1;
```

**Check order payment status:**

```sql
-- Orders paid via webhook
SELECT 
  order_number,
  payment_status,
  razorpay_order_id,
  razorpay_payment_id,
  paid_at,
  created_at
FROM orders
WHERE payment_status = 'paid'
ORDER BY paid_at DESC
LIMIT 20;

-- Orders pending payment
SELECT 
  order_number,
  payment_status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_old
FROM orders
WHERE payment_status = 'pending'
ORDER BY created_at DESC;
```

### 3. Razorpay Dashboard Monitoring

**Webhook Logs:**
1. Go to Settings → Webhooks
2. Click on your webhook
3. View **Webhook Logs** tab
4. Check delivery status:
   - ✅ Green: Successfully delivered (200 response)
   - ⚠️ Yellow: Retrying (500 response)
   - ❌ Red: Failed (400 response or timeout)

**Webhook Metrics:**
- Total deliveries
- Success rate
- Average response time
- Failed deliveries

### 4. Set Up Alerts

**Recommended alerts:**

1. **High Signature Verification Failure Rate**
   - Threshold: >5% of webhooks
   - Action: Check webhook secret configuration

2. **Webhook Processing Errors**
   - Threshold: >10 errors in 1 hour
   - Action: Check database and API health

3. **No Webhooks Received**
   - Threshold: No webhooks for >1 hour during business hours
   - Action: Check Razorpay configuration and network connectivity

4. **Duplicate Event Processing**
   - Threshold: Any duplicate event IDs
   - Action: Check idempotency logic

---

## Troubleshooting

### Issue 1: Webhook Not Received

**Symptoms:**
- Payment completed but order status not updated
- No webhook logs in application
- Razorpay shows webhook as delivered

**Possible Causes & Solutions:**

1. **Incorrect Webhook URL**
   - ✅ Verify URL in Razorpay Dashboard
   - ✅ Check for typos: `/api/webhooks/razorpay` (not `/webhook` or `/webhooks`)
   - ✅ Ensure HTTPS in production

2. **Firewall/Network Blocking**
   - ✅ Check firewall rules allow Razorpay IPs
   - ✅ Verify no rate limiting blocking webhooks
   - ✅ Check load balancer configuration

3. **Server Not Running**
   - ✅ Verify API server is running: `curl http://localhost:4000/health`
   - ✅ Check server logs for startup errors

4. **ngrok Tunnel Expired (Local Dev)**
   - ✅ Restart ngrok
   - ✅ Update webhook URL in Razorpay Dashboard
   - ✅ Consider ngrok paid plan for persistent URLs

**Debug Steps:**

```bash
# 1. Test endpoint is accessible
curl -X POST http://localhost:4000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 2. Check server logs
tail -f apps/api/logs/app.log

# 3. Send test webhook from Razorpay Dashboard
# 4. Check Razorpay webhook logs for delivery status
```

---

### Issue 2: Signature Verification Failed

**Symptoms:**
- Webhooks received but rejected with 400 status
- Logs show: "Webhook signature verification failed"
- Razorpay shows failed delivery

**Possible Causes & Solutions:**

1. **Wrong Webhook Secret**
   - ✅ Verify `RAZORPAY_WEBHOOK_SECRET` in `.env`
   - ✅ Copy secret from correct webhook in Razorpay Dashboard
   - ✅ Ensure no extra spaces or quotes in secret
   - ✅ Check using test mode secret for test webhooks

2. **Body Parsing Issue**
   - ✅ Verify `express.raw()` middleware configured for webhook route
   - ✅ Check middleware order in `apps/api/src/index.ts`
   - ✅ Ensure raw body available for signature verification

3. **Secret Not Loaded**
   - ✅ Restart server after updating `.env`
   - ✅ Check environment variable loaded: `console.log(process.env.RAZORPAY_WEBHOOK_SECRET)`

**Debug Steps:**

```bash
# 1. Verify webhook secret
echo $RAZORPAY_WEBHOOK_SECRET

# 2. Test with known good signature
# Generate signature manually:
echo -n '{"event":"test"}' | openssl dgst -sha256 -hmac 'your_secret'

# 3. Check middleware configuration
grep -A 5 "express.raw" apps/api/src/index.ts

# 4. Enable debug logging
# Add to webhook.service.ts:
console.log('Expected signature:', expectedSignature);
console.log('Received signature:', receivedSignature);
```

---

### Issue 3: Order Not Updated

**Symptoms:**
- Webhook received and signature verified
- Logs show successful processing
- Order status still "pending" in database

**Possible Causes & Solutions:**

1. **Order ID Mismatch**
   - ✅ Verify `razorpayOrderId` in webhook matches order in database
   - ✅ Check order creation logs for correct Razorpay order ID
   - ✅ Query database: `SELECT * FROM orders WHERE razorpay_order_id = 'order_xxx'`

2. **Database Transaction Failed**
   - ✅ Check database logs for errors
   - ✅ Verify database connection healthy
   - ✅ Check for constraint violations

3. **Order Already Paid**
   - ✅ Check if order already marked as paid
   - ✅ Review logs for "Order already paid" message
   - ✅ This is normal for duplicate webhooks

**Debug Steps:**

```sql
-- 1. Find order by Razorpay order ID
SELECT * FROM orders 
WHERE razorpay_order_id = 'order_xxx';

-- 2. Check webhook events
SELECT * FROM webhook_events 
WHERE payload->>'payment'->>'entity'->>'order_id' = 'order_xxx';

-- 3. Check for processing errors
-- Review application logs around webhook timestamp
```

---

### Issue 4: Duplicate Webhooks

**Symptoms:**
- Same webhook event received multiple times
- Logs show "Event already processed"
- Razorpay shows multiple delivery attempts

**Possible Causes & Solutions:**

1. **Razorpay Retry Logic (Normal)**
   - ✅ This is expected behavior if server returned 500
   - ✅ Idempotency prevents duplicate processing
   - ✅ No action needed if order updated correctly

2. **Multiple Webhook Configurations**
   - ✅ Check Razorpay Dashboard for duplicate webhooks
   - ✅ Delete old/test webhooks
   - ✅ Keep only one active webhook per environment

3. **Idempotency Not Working**
   - ✅ Check `webhook_events` table for duplicate event IDs
   - ✅ Verify database transaction completing successfully
   - ✅ Check Redis connection (if using for additional caching)

**Debug Steps:**

```sql
-- Check for duplicate event IDs
SELECT event_id, COUNT(*) as count
FROM webhook_events
GROUP BY event_id
HAVING COUNT(*) > 1;

-- Check webhook processing timeline
SELECT event_id, processed_at
FROM webhook_events
WHERE event_id = 'evt_xxx'
ORDER BY processed_at;
```

---

### Issue 5: Webhook Timeout

**Symptoms:**
- Razorpay shows webhook timeout (no response within 30 seconds)
- Server logs show slow processing
- Webhooks being retried frequently

**Possible Causes & Solutions:**

1. **Slow Database Queries**
   - ✅ Add indexes on `razorpay_order_id` and `event_id`
   - ✅ Optimize order update query
   - ✅ Check database performance

2. **External API Calls in Webhook Handler**
   - ✅ Move non-critical operations to background jobs
   - ✅ Process webhook quickly, queue other tasks
   - ✅ Return 200 response immediately after storing event

3. **High Server Load**
   - ✅ Scale API servers
   - ✅ Add load balancing
   - ✅ Optimize application performance

**Debug Steps:**

```bash
# 1. Measure webhook processing time
# Add timing logs in webhook.controller.ts:
const start = Date.now();
// ... process webhook
console.log(`Webhook processed in ${Date.now() - start}ms`);

# 2. Check database query performance
EXPLAIN ANALYZE SELECT * FROM orders WHERE razorpay_order_id = 'order_xxx';

# 3. Monitor server resources
top
htop
```

---

### Issue 6: Environment Variable Not Loaded

**Symptoms:**
- Server exits with "RAZORPAY_WEBHOOK_SECRET not configured"
- Webhook secret appears correct in `.env`

**Possible Causes & Solutions:**

1. **Wrong .env File Location**
   - ✅ Ensure `.env` in `apps/api/` directory
   - ✅ Check if using monorepo: may need `.env` in root too
   - ✅ Verify file named exactly `.env` (not `.env.local` or `.env.txt`)

2. **Environment Not Loaded**
   - ✅ Check `dotenv` configured in `apps/api/src/index.ts`
   - ✅ Verify `require('dotenv').config()` at top of file
   - ✅ Restart server after changing `.env`

3. **Docker/Container Issues**
   - ✅ Pass environment variables to container
   - ✅ Check `docker-compose.yml` env_file configuration
   - ✅ Verify secrets mounted correctly

**Debug Steps:**

```bash
# 1. Check .env file exists
ls -la apps/api/.env

# 2. Verify variable in file
cat apps/api/.env | grep RAZORPAY_WEBHOOK_SECRET

# 3. Test loading in Node
node -e "require('dotenv').config({path:'apps/api/.env'}); console.log(process.env.RAZORPAY_WEBHOOK_SECRET)"

# 4. Check server startup logs
cd apps/api
pnpm start 2>&1 | grep -i webhook
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Webhook secret configured in production environment
- [ ] Database migrations applied
- [ ] Webhook endpoint accessible via HTTPS
- [ ] SSL certificate valid
- [ ] Firewall rules allow Razorpay IPs
- [ ] Monitoring and alerting configured
- [ ] Logs aggregation set up
- [ ] Backup webhook handler tested

### Deployment Steps

1. **Deploy Application**
   ```bash
   # Deploy API with webhook handler
   # Ensure zero-downtime deployment
   ```

2. **Verify Endpoint Accessible**
   ```bash
   curl -X POST https://api.yourdomain.com/api/webhooks/razorpay \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   
   # Should return 400 (missing signature) - this is correct
   ```

3. **Configure Production Webhook**
   - Switch to Live mode in Razorpay Dashboard
   - Create new webhook with production URL
   - Copy live mode webhook secret
   - Add to production environment variables
   - Enable webhook

4. **Test with Test Payment**
   - Make a small test payment (₹1)
   - Verify webhook received
   - Check order status updated
   - Verify logs show successful processing

5. **Monitor Initial Traffic**
   - Watch logs for first 24 hours
   - Check webhook delivery success rate
   - Verify no signature verification failures
   - Monitor order status update rate

### Rollback Plan

If issues occur:

1. **Disable Webhook in Razorpay**
   - Go to Settings → Webhooks
   - Disable webhook temporarily
   - Orders will still be created via frontend flow

2. **Investigate Issues**
   - Review application logs
   - Check database for errors
   - Verify configuration

3. **Fix and Re-enable**
   - Deploy fix
   - Test with test webhook
   - Re-enable webhook in Razorpay

### Production Monitoring

**Key Metrics:**

1. **Webhook Delivery Rate**
   - Target: >99% success rate
   - Alert if <95%

2. **Processing Time**
   - Target: <1 second average
   - Alert if >5 seconds

3. **Signature Verification Failures**
   - Target: 0%
   - Alert if >0.1%

4. **Order Update Success Rate**
   - Target: 100%
   - Alert if <99%

**Log Aggregation:**

Use tools like:
- CloudWatch Logs (AWS)
- Datadog
- Splunk
- ELK Stack

**Sample Query:**

```
# Find failed webhooks
level:error AND message:"Webhook processing failed"

# Find signature failures
level:warn AND message:"signature verification failed"

# Count webhooks by type
eventType:payment.captured | stats count by eventType
```

---

## Security Best Practices

### 1. Webhook Secret Management

- ✅ Store in secure environment variable system
- ✅ Use different secrets for test and live modes
- ✅ Rotate secrets every 90 days
- ✅ Never log webhook secrets
- ✅ Restrict access to production secrets

### 2. Signature Verification

- ✅ Always verify signature before processing
- ✅ Use timing-safe comparison (`crypto.timingSafeEqual`)
- ✅ Reject webhooks with invalid signatures
- ✅ Log signature verification failures for security monitoring

### 3. Rate Limiting

Consider adding rate limiting:

```typescript
// Example: Max 100 webhooks per minute
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many webhook requests'
});

app.use('/api/webhooks/razorpay', webhookLimiter);
```

### 4. IP Whitelisting (Optional)

Restrict webhook endpoint to Razorpay IPs:

```typescript
// Razorpay webhook IPs (check documentation for current list)
const RAZORPAY_IPS = [
  '3.6.127.0/25',
  '3.7.8.0/27',
  // ... add all Razorpay IP ranges
];

// Middleware to check IP
function checkRazorpayIP(req, res, next) {
  const clientIP = req.ip;
  if (isIPInRange(clientIP, RAZORPAY_IPS)) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
}
```

### 5. Audit Logging

Log all webhook events for compliance:

```typescript
// Log to separate audit log
auditLogger.info('Webhook received', {
  eventId: event.id,
  eventType: event.event,
  timestamp: new Date(),
  sourceIP: req.ip,
  signatureValid: true,
  orderNumber: order.orderNumber
});
```

---

## Additional Resources

### Documentation

- [Razorpay Webhooks Documentation](https://razorpay.com/docs/webhooks/)
- [Razorpay Webhook Signature Verification](https://razorpay.com/docs/webhooks/validate-test/)
- [Payment Security Guide](./PAYMENT_SECURITY.md)
- [Idempotency Documentation](./IDEMPOTENCY.md)

### Tools

- [ngrok](https://ngrok.com/) - Local tunnel for webhook testing
- [Webhook.site](https://webhook.site/) - Webhook testing and debugging
- [Postman](https://www.postman.com/) - API testing with signature generation

### Support

- Razorpay Support: support@razorpay.com
- Razorpay Dashboard: https://dashboard.razorpay.com/
- Internal Team: [Your team contact]

---

## Quick Reference

### Webhook Endpoint

```
POST /api/webhooks/razorpay
```

### Required Headers

```
Content-Type: application/json
x-razorpay-signature: <hmac-sha256-signature>
```

### Supported Events

- `payment.captured` - Payment successfully captured

### Response Codes

- `200` - Webhook processed successfully (or non-retryable error)
- `400` - Invalid signature or missing header
- `500` - Retryable error (database failure, etc.)

### Environment Variables

```bash
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Test Command

```bash
curl -X POST http://localhost:4000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $(echo -n '{"event":"payment.captured"}' | openssl dgst -sha256 -hmac 'your_secret' | sed 's/^.* //')" \
  -d '{"event":"payment.captured"}'
```

---

**Last Updated:** December 7, 2025  
**Version:** 1.0  
**Maintained By:** Development Team
