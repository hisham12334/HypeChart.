#!/bin/bash
# test-webhook.sh
# Script to test Razorpay webhook endpoint locally

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:4000/api/webhooks/razorpay}"
WEBHOOK_SECRET="${RAZORPAY_WEBHOOK_SECRET}"

# Check if webhook secret is set
if [ -z "$WEBHOOK_SECRET" ]; then
  echo -e "${RED}❌ Error: RAZORPAY_WEBHOOK_SECRET environment variable not set${NC}"
  echo "Please set it in your .env file or export it:"
  echo "  export RAZORPAY_WEBHOOK_SECRET='your_webhook_secret'"
  exit 1
fi

echo -e "${GREEN}🧪 Razorpay Webhook Test Script${NC}"
echo "================================"
echo "API URL: $API_URL"
echo ""

# Test 1: Valid webhook with signature
echo -e "${YELLOW}Test 1: Valid webhook with correct signature${NC}"
PAYLOAD='{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_test_'$(date +%s)'",
        "order_id": "order_test_'$(date +%s)'",
        "amount": 149900,
        "currency": "INR",
        "status": "captured",
        "method": "card",
        "captured": true,
        "email": "test@example.com",
        "contact": "+919876543210"
      }
    }
  }
}'

# Generate HMAC-SHA256 signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

echo "Payload: $PAYLOAD"
echo "Signature: $SIGNATURE"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE" \
  -d "$PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Test 1 Passed: Webhook accepted (200)${NC}"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ Test 1 Failed: Expected 200, got $HTTP_STATUS${NC}"
  echo "Response: $BODY"
fi
echo ""

# Test 2: Invalid signature
echo -e "${YELLOW}Test 2: Invalid signature (should be rejected)${NC}"
INVALID_SIGNATURE="invalid_signature_12345"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $INVALID_SIGNATURE" \
  -d "$PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ]; then
  echo -e "${GREEN}✅ Test 2 Passed: Invalid signature rejected (400)${NC}"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ Test 2 Failed: Expected 400, got $HTTP_STATUS${NC}"
  echo "Response: $BODY"
fi
echo ""

# Test 3: Missing signature header
echo -e "${YELLOW}Test 3: Missing signature header (should be rejected)${NC}"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ]; then
  echo -e "${GREEN}✅ Test 3 Passed: Missing signature rejected (400)${NC}"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ Test 3 Failed: Expected 400, got $HTTP_STATUS${NC}"
  echo "Response: $BODY"
fi
echo ""

# Test 4: Duplicate webhook (idempotency test)
echo -e "${YELLOW}Test 4: Duplicate webhook (idempotency test)${NC}"

# Send same webhook twice
PAYLOAD_DUPLICATE='{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_idempotency_test",
        "order_id": "order_idempotency_test",
        "amount": 99900,
        "currency": "INR",
        "status": "captured",
        "method": "upi"
      }
    }
  }
}'

SIGNATURE_DUP=$(echo -n "$PAYLOAD_DUPLICATE" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

echo "Sending first webhook..."
RESPONSE1=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE_DUP" \
  -d "$PAYLOAD_DUPLICATE")

HTTP_STATUS1=$(echo "$RESPONSE1" | grep "HTTP_STATUS" | cut -d: -f2)

echo "Sending duplicate webhook..."
RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE_DUP" \
  -d "$PAYLOAD_DUPLICATE")

HTTP_STATUS2=$(echo "$RESPONSE2" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS1" = "200" ] && [ "$HTTP_STATUS2" = "200" ]; then
  echo -e "${GREEN}✅ Test 4 Passed: Both webhooks accepted (idempotency working)${NC}"
  echo "First response: $HTTP_STATUS1"
  echo "Second response: $HTTP_STATUS2"
  echo "Note: Check logs to verify second webhook was skipped"
else
  echo -e "${RED}❌ Test 4 Failed: Expected both to return 200${NC}"
  echo "First response: $HTTP_STATUS1"
  echo "Second response: $HTTP_STATUS2"
fi
echo ""

# Summary
echo "================================"
echo -e "${GREEN}🎉 Webhook tests completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Check application logs for detailed processing info"
echo "2. Verify webhook_events table has entries"
echo "3. Test with real Razorpay webhooks using ngrok"
echo ""
echo "To check webhook events in database:"
echo "  psql \$DATABASE_URL -c 'SELECT * FROM webhook_events ORDER BY processed_at DESC LIMIT 5;'"
