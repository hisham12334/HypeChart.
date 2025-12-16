'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { paymentClient } from '@/lib/payment-client';
import { Loader2, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import Link from 'next/link';

// Allow TypeScript to recognize Razorpay on the window object
declare global {
  interface Window {
    Razorpay: any;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get params from URL
  const variantId = searchParams.get('variantId');
  const slug = searchParams.get('slug'); // Ensure Cart passes this!
  const quantity = parseInt(searchParams.get('qty') || '1');
  const total = parseFloat(searchParams.get('total') || '0');

  const [product, setProduct] = useState<any>(null);
  const [variant, setVariant] = useState<any>(null);
  const [loading, setLoading] = useState(false); // Payment processing state
  const [dataLoading, setDataLoading] = useState(true); // Page load state

  // --- 1. NEW: Form State to capture user inputs ---
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  // --- 2. Fetch Product Details for UI ---
  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) {
        setDataLoading(false);
        return;
      }
      try {
        const res = await apiClient.get(`/checkout/products/${slug}`);
        if (res.data.success) {
          const productData = res.data.data;
          setProduct(productData);

          if (variantId) {
            const selectedVariant = productData.variants.find((v: any) => v.id === variantId);
            setVariant(selectedVariant);
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchProduct();
  }, [slug, variantId]);

  // --- 3. Handle Real Payment (Razorpay) with Verification ---
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // A. Create Order on Backend with Idempotency Protection
      const result = await paymentClient.createOrder({
        variantId: variantId!,
        quantity,
        amount: total
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create order');
      }

      const { orderId, amount, currency, keyId } = result;

      // B. Open Razorpay Modal
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "Hypechart Drop",
        description: `Order for ${product?.name || 'Item'}`,
        order_id: orderId,

        // --- NEW: Verify Payment on Backend after Success ---
        handler: async function (response: any) {
          try {
            console.log("Razorpay Success:", response);

            // C. Call Backend to Verify & Save Order
            const verifyRes = await apiClient.post('/checkout/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              customerDetails: {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
                amount: total
              },
              orderItems: [{ variantId, quantity }]
            });

            // D. If Verified, Redirect to Success
            if (verifyRes.data.success) {
              paymentClient.confirmPaymentSuccess();
              router.push(`/success?orderId=${verifyRes.data.orderId}`);
            } else {
              alert("Payment verification failed! Please contact support.");
              setLoading(false);
            }
          } catch (err) {
            console.error(err);
            alert("Failed to save order. Please contact support.");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            console.log('Payment modal closed');
            setLoading(false);
          }
        },
        prefill: {
          name: formData.name,
          contact: formData.phone,
          email: formData.email
        },
        theme: {
          color: "#000000"
        }
      };

      const rzp1 = new window.Razorpay(options);

      rzp1.on('payment.failed', function (response: any) {
        paymentClient.handlePaymentFailure();
        console.error('Payment failed:', response.error);
        alert(`Payment Failed: ${response.error.description}`);
        setLoading(false);
      });

      rzp1.open();

    } catch (error: any) {
      console.error(error);
      paymentClient.handlePaymentFailure();
      alert("Payment Initialization Failed: " + (error.message || "Unknown Error"));
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href=".."
            className="text-sm text-neutral-600 hover:text-neutral-900 mb-6 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-serif text-neutral-900">Checkout</h1>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Lock className="w-4 h-4" />
              <span>Secure Payment</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <form id="checkout-form" onSubmit={handlePayment} className="space-y-8">

              {/* Contact Information */}
              <div className="bg-white border border-neutral-200 p-6">
                <h2 className="text-lg font-medium text-neutral-900 mb-6">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-600 mb-2">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-2">Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-2">Email Address</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white border border-neutral-200 p-6">
                <h2 className="text-lg font-medium text-neutral-900 mb-6">Shipping Address</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-600 mb-2">Street Address</label>
                    <input
                      required
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-neutral-600 mb-2">City</label>
                      <input
                        required
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-600 mb-2">State</label>
                      <input
                        required
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-2">Postal Code</label>
                    <input
                      required
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-neutral-200 p-6 sticky top-6">
              <h2 className="text-lg font-medium text-neutral-900 mb-6">Order Summary</h2>

              <div className="mb-6">
                <div className="flex gap-4 pb-6 border-b border-neutral-200">
                  <div className="w-20 h-20 bg-neutral-100 flex-shrink-0 overflow-hidden">
                    {product?.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-neutral-200" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-900">{product?.name || 'Product'}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Size: {variant?.name || 'N/A'} × {quantity}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="text-neutral-900">₹{total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Shipping</span>
                  <span className="text-neutral-900">Complimentary</span>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-lg font-medium text-neutral-900">Total</span>
                  <span className="text-lg font-medium text-neutral-900">₹{total}</span>
                </div>
              </div>

              <button
                form="checkout-form"
                disabled={loading}
                className="w-full bg-neutral-900 text-white py-4 text-sm font-medium tracking-wide hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    PROCESSING...
                  </>
                ) : (
                  'COMPLETE ORDER'
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-500">
                <ShieldCheck className="w-3 h-3" />
                <span>Secure payment processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}