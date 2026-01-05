/**
 * Payment Client with Idempotency Support
 * Handles payment requests with automatic retry and duplicate prevention
 */

interface OrderItem {
  variantId: string;
  quantity: number;
}

interface CreateOrderRequest {
  items: OrderItem[];
  amount: number;
}

interface CreateOrderResponse {
  success: boolean;
  orderId?: string;
  sessionId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
}

class PaymentClient {
  private baseUrl: string;
  private currentIdempotencyKey: string | null = null;

  constructor(baseUrl: string = 'http://localhost:4000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate a unique idempotency key for this payment session
   */
  private generateIdempotencyKey(): string {
    // Use crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback for older browsers
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get or create idempotency key for current payment session
   */
  private getIdempotencyKey(): string {
    if (!this.currentIdempotencyKey) {
      // Try to get from session storage first
      const stored = sessionStorage.getItem('payment-idempotency-key');
      if (stored) {
        this.currentIdempotencyKey = stored;
      } else {
        this.currentIdempotencyKey = this.generateIdempotencyKey();
        sessionStorage.setItem('payment-idempotency-key', this.currentIdempotencyKey);
      }
    }
    return this.currentIdempotencyKey;
  }

  /**
   * Clear the current idempotency key (call after successful payment)
   */
  clearIdempotencyKey(): void {
    this.currentIdempotencyKey = null;
    sessionStorage.removeItem('payment-idempotency-key');
  }

  /**
   * Create a payment order with idempotency protection
   */
  async createOrder(
    data: CreateOrderRequest,
    retries: number = 3
  ): Promise<CreateOrderResponse> {
    const idempotencyKey = this.getIdempotencyKey();

    try {
      const response = await fetch(`${this.baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(data),
      });

      // Handle 409 Conflict (request being processed)
      if (response.status === 409 && retries > 0) {
        console.log('Payment request in progress, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.createOrder(data, retries - 1);
      }

      const result = await response.json();

      // If successful, keep the key until payment is confirmed
      // Don't clear it yet - we might need to retry

      return result;
    } catch (error) {
      console.error('Payment request failed:', error);
      throw error;
    }
  }

  /**
   * Confirm payment success and clear idempotency key
   */
  confirmPaymentSuccess(): void {
    this.clearIdempotencyKey();
  }

  /**
   * Handle payment failure - keep idempotency key for potential retry
   */
  handlePaymentFailure(): void {
    // Keep the key - user might retry
    console.log('Payment failed, idempotency key preserved for retry');
  }
}

// Export singleton instance
export const paymentClient = new PaymentClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
);

// Export class for testing
export { PaymentClient };
