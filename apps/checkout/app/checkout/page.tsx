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

  // URL Params (Buy Now Flow)
  const paramVariantId = searchParams.get('variantId');
  const paramSlug = searchParams.get('slug'); // We generally expect this or localStorage
  const paramQuantity = parseInt(searchParams.get('qty') || '0');
  const paramTotal = parseFloat(searchParams.get('total') || '0');

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false); // Payment processing
  const [dataLoading, setDataLoading] = useState(true); // Initial load

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

  // --- 2. Load Cart/Items ---
  useEffect(() => {
    const loadItems = () => {
      // Priority 1: URL Params (Buy Now)
      if (paramVariantId && paramQuantity > 0) {
        // We need to fetch product details if we only have IDs, but for now let's hope we have enough or fetch it.
        // Actually, the previous flow fetched product by slug.
        // To keep it robust, let's try to get details from Cart if possible, OR fetch if singular.
        // Simplified: If URL params, we construct a "Cart Item" from it (might miss image/name if not fetched).
        // BUT, the text said "fails to connect ... So i want you to connect the flow".
        // The Cart Page passes NO params, just goes to /checkout.
        // So we prioritized LocalStorage.
      }

      // Priority 1: Check LocalStorage (Standard Cart Flow)
      try {
        const storedCart = localStorage.getItem('hype-cart');
        if (storedCart) {
          const parsed = JSON.parse(storedCart);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);

            // Recalculate Total
            const calcSubtotal = parsed.reduce((sum: number, item: any) => sum + (Number(item.price) * (item.quantity || 1)), 0);
            const calcTotal = calcSubtotal + (calcSubtotal < 1000 ? 99 : 0);
            setTotal(calcTotal);
            setDataLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }

      // Priority 2: Fallback to URL Params (Old Flow support)
      if (paramVariantId && paramQuantity > 0) {
        // If we are here, we might be in a "Buy Now" flow directly from Product Page?
        // User's new product page code ADDS TO CART and redirects to /cart.
        // So likely we don't need this fallback as much, but let's keep it safe.
        // We would need to fetch product to show details, which is complex here.
        // For now, let's assume Cart Flow is the main way.
      }

      setDataLoading(false);
    };

    loadItems();
  }, [paramVariantId, paramQuantity]);


  // --- 3. Handle Real Payment (Razorpay) with Verification ---
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert("Cart is empty");

    setLoading(true);

    try {
      // Prepare Items for Backend
      const orderItems = items.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity
      }));

      // A. Create Order on Backend with Idempotency Protection
      const result = await paymentClient.createOrder({
        items: orderItems,
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
        description: `Order for ${items.length} Item(s)`,
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
              orderItems: orderItems
            });

            // D. If Verified, Redirect to Success
            if (verifyRes.data.success) {
              paymentClient.confirmPaymentSuccess();
              // Clear Cart
              localStorage.removeItem('hype-cart');
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

  // Get Brand Name from first item or default
  const brandName = items[0]?.brandName || "HYPECHART";

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col pb-24 md:pb-0">
      <div className="max-w-4xl mx-auto px-6 py-12 w-full">
        {/* --- BRAND HEADER --- */}
        <header className="mb-12">
          <h1 className="text-2xl font-black tracking-tighter uppercase">{brandName}</h1>
        </header>
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/cart"
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

              <div className="mb-6 space-y-4 max-h-60 overflow-y-auto">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-4 pb-4 border-b border-neutral-100 last:border-0">
                    <div className="w-16 h-16 bg-neutral-100 flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-neutral-200" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-900 line-clamp-1">{item.name}</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        Size: {item.variantName || item.variantId.split('-').pop() || 'STD'} × {item.quantity}
                      </div>
                      <div className="text-xs font-medium text-neutral-900 mt-1">
                        ₹{item.price * item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="text-neutral-900">₹{items.reduce((sum, i) => sum + (i.price * i.quantity), 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Shipping</span>
                  <span className="text-neutral-900">{total < 1000 ? '₹99' : 'Complimentary'}</span>
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
                disabled={loading || items.length === 0}
                className="w-full bg-neutral-900 text-white py-4 text-sm font-medium tracking-wide hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hidden md:flex"
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


      <footer className="py-12 mt-auto border-t border-neutral-200 bg-neutral-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-3">
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <a
            href="https://hypechart.co"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-300 hover:text-neutral-900 transition-colors"
          >
            Powered by <span className="font-bold">Hypechart</span>
          </a>
        </div>
      </footer>

      {/* STICKY MOBILE PAYMENT BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 md:hidden z-50 pb-safe">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-neutral-500 uppercase tracking-wide">Pay Total</span>
            <span className="text-lg font-serif">₹{total}</span>
          </div>
          <button
            form="checkout-form"
            disabled={loading || items.length === 0}
            className="flex-1 bg-neutral-900 text-white py-3 px-4 text-sm font-bold tracking-wide hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {loading ? 'PROCESSING...' : 'PAY NOW'}
          </button>
        </div>
      </div>
    </div >
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}