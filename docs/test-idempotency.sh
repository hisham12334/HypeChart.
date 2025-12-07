#!/bin/bash

# Test script for payment idempotency
# This demonstrates how duplicate requests are handled

API_URL="http://localhost:4000"
IDEMPOTENCY_KEY="test-$(date +%s)"

echo "==================================="
echo "Payment Idempotency Test"
echo "==================================="
echo ""
echo "Idempotency Key: $IDEMPOTENCY_KEY"
echo ""

# Test data
TEST_DATA='{
  "variantId": "test-variant-123",
  "quantity": 1,
  "amount": 1499
}'

echo "1. First Request (should create new order):"
echo "-----------------------------------"
curl -X POST "$API_URL/api/checkout/create-order" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "$TEST_DATA" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo ""
echo "2. Duplicate Request (should return cached response):"
echo "-----------------------------------"
curl -X POST "$API_URL/api/checkout/create-order" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "$TEST_DATA" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo ""
echo "3. Third Request (should still return cached response):"
echo "-----------------------------------"
curl -X POST "$API_URL/api/checkout/create-order" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "$TEST_DATA" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo ""
echo "==================================="
echo "Test Complete!"
echo "==================================="
echo ""
echo "Expected behavior:"
echo "- All three requests should return HTTP 200"
echo "- All three responses should be identical"
echo "- Only ONE Razorpay order should be created"
echo "- Only ONE inventory reservation should exist"
