'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { paymentClient } from '@/lib/payment-client';
import { Loader2, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';

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

  // UPI Direct state
  const [upiUrl, setUpiUrl] = useState<string | null>(null);
  const [upiOrderId, setUpiOrderId] = useState<string | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [upiStep, setUpiStep] = useState<'pay' | 'utr' | 'pending'>('pay');
  const [isUpiMode, setIsUpiMode] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);
  const [upiQrCode, setUpiQrCode] = useState<string | null>(null);

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

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsMobileDevice(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  const upiId = upiUrl ? new URLSearchParams(upiUrl.split('?')[1] || '').get('pa') : '';

  useEffect(() => {
    let isCancelled = false;

    const generateQrCode = async () => {
      if (!upiUrl) {
        setUpiQrCode(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(upiUrl, {
          width: 256,
          margin: 1,
        });

        if (!isCancelled) {
          setUpiQrCode(dataUrl);
        }
      } catch (error) {
        console.error('Failed to generate UPI QR code', error);
        if (!isCancelled) {
          setUpiQrCode(null);
        }
      }
    };

    generateQrCode();

    return () => {
      isCancelled = true;
    };
  }, [upiUrl]);

  const handleCopyUpiId = async () => {
    if (!upiId || typeof navigator === 'undefined' || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(upiId);
      setUpiCopied(true);
      window.setTimeout(() => setUpiCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy UPI ID', error);
    }
  };


  // --- 3. Handle Payment — detects UPI_DIRECT brand or falls through to Razorpay ---
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert("Cart is empty");

    // Detect brand payment mode using slug stored on cart items
    const slug = items[0]?.slug;
    const brandId = items[0]?.brandId;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    console.log('🛒 Cart item[0]:', JSON.stringify(items[0], null, 2));
    console.log('🔑 slug:', slug, '| brandId:', brandId);

    if (slug || brandId) {
      try {
        let paymentMode = 'RAZORPAY_PLATFORM';
        let resolvedBrandId = brandId;

        if (slug) {
          const brandRes = await fetch(`${API_URL}/store/product/${slug}`);
          const brandData = await brandRes.json();
          paymentMode = brandData?.user?.paymentMode || 'RAZORPAY_PLATFORM';
          resolvedBrandId = brandData?.userId || brandData?.user?.id || brandId;
          console.log('Payment mode detected:', paymentMode, 'for brand:', resolvedBrandId);
        }

        if (paymentMode === 'UPI_DIRECT') {
          setIsUpiMode(true);
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const customerDetails = {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
          };
          const res = await fetch(`${API_URL}/upi/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brandId: resolvedBrandId,
              sessionId,
              items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
              customerDetails
            })
          });
          const data = await res.json();
          if (data.success) {
            setUpiUrl(data.data.upiUrl);
            setUpiOrderId(data.data.orderId);
            setUpiStep('pay');
          }
          return;
        }
      } catch (err) {
        console.error('Brand detection failed, falling back to Razorpay', err);
      }
    }

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
            // brandId is stored in each cart item so the backend knows which
            // brand's Razorpay secret key to use for signature verification (BYOG fix).
            const brandId = items[0]?.brandId;

            const verifyRes = await apiClient.post('/checkout/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              brandId, // tells the backend whose Razorpay secret to use
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

              {isUpiMode && (
                <div className="mb-4">
                  {upiStep === 'pay' && (
                    <div className="border border-neutral-200 rounded-xl overflow-hidden">
                      <div className="bg-neutral-900 px-5 py-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white/50 text-xs uppercase tracking-widest">Amount due</p>
                            <p className="text-white text-3xl font-serif mt-1">₹{total}</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-white text-xs">Secure</span>
                          </div>
                        </div>
                        {/* Step pills */}
                        <div className="flex items-center gap-2 mt-4">
                          <span className="bg-white text-neutral-900 text-xs font-semibold px-2.5 py-1 rounded-full">1 Pay</span>
                          <div className="flex-1 h-px bg-white/20" />
                          <span className="bg-white/10 text-white/50 text-xs px-2.5 py-1 rounded-full">2 Enter UTR</span>
                        </div>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Warning — must be seen */}
                        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-3">
                          <p className="text-xs font-semibold text-amber-900">Your order won't be confirmed until Step 2</p>
                          <p className="text-xs text-amber-700 mt-0.5">After paying, come back here and enter your UTR number.</p>
                        </div>

                        <a
                          href={upiUrl || '#'}
                          className="flex items-center justify-center w-full bg-neutral-900 text-white py-4 rounded-lg text-sm font-medium tracking-wide hover:bg-neutral-800 active:scale-[0.98] transition-all md:hidden"
                        >
                          Pay ₹{total} via UPI
                        </a>

                        <p className="text-center text-xs text-neutral-400">GPay · PhonePe · Paytm · BHIM · any UPI app</p>

                        {!isMobileDevice && (
                          <div className="hidden md:block border border-neutral-200 rounded-lg p-4 space-y-4 bg-neutral-50">
                            <div className="text-center">
                              <p className="text-xs uppercase tracking-widest text-neutral-500">Scan To Pay</p>
                              <p className="text-sm text-neutral-600 mt-1">This QR includes the exact amount for this order.</p>
                            </div>
                            <div className="bg-white border border-neutral-200 rounded-lg p-4 flex justify-center">
                              {upiQrCode ? (
                                <img
                                  src={upiQrCode}
                                  alt={`UPI QR for ₹${total}`}
                                  className="w-56 h-56"
                                />
                              ) : (
                                <div className="w-56 h-56 flex items-center justify-center bg-neutral-100 text-neutral-400 text-sm">
                                  Generating QR...
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="text-xs uppercase tracking-widest text-neutral-500">Amount</p>
                              <p className="text-2xl font-serif text-neutral-900 mt-1">₹{total}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-widest text-neutral-500">UPI ID</p>
                              <p className="font-mono text-base text-neutral-900 break-all mt-1">{upiId || 'Not available'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyUpiId}
                              className="w-full bg-neutral-900 text-white py-3 rounded-lg text-sm font-medium tracking-wide hover:bg-neutral-800 active:scale-[0.98] transition-all"
                            >
                              {upiCopied ? 'Copied' : 'Copy UPI ID'}
                            </button>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                              Scan this QR in GPay, PhonePe, Paytm, or any UPI app to pay the correct invoice amount automatically.
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setUpiStep('utr')}
                          className="w-full border-2 border-neutral-900 text-neutral-900 py-3.5 rounded-lg text-sm font-semibold hover:bg-neutral-50 active:scale-[0.98] transition-all"
                        >
                          I've paid — Enter UTR →
                        </button>
                      </div>
                    </div>
                  )}

                  {upiStep === 'utr' && (
                    <div className="border border-neutral-200 rounded-xl overflow-hidden">
                      <div className="bg-neutral-900 px-5 py-5">
                        <button
                          type="button"
                          onClick={() => setUpiStep('pay')}
                          className="text-white/50 text-xs hover:text-white transition-colors mb-3 flex items-center gap-1"
                        >
                          ← Back
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="bg-white/10 text-white/50 text-xs px-2.5 py-1 rounded-full">1 Paid ✓</span>
                          <div className="flex-1 h-px bg-white/20" />
                          <span className="bg-white text-neutral-900 text-xs font-semibold px-2.5 py-1 rounded-full">2 Enter UTR</span>
                        </div>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Where to find UTR */}
                        <div>
                          <p className="text-sm font-semibold text-neutral-900 mb-3">Where is the UTR number?</p>
                          <div className="space-y-2.5">
                            {[
                              { app: 'GPay', path: 'Tap transaction → "UPI transaction ID"' },
                              { app: 'PhonePe', path: 'History → Tap transaction → "UPI Ref No."' },
                              { app: 'Paytm', path: 'Passbook → Tap transaction → "UTR No."' },
                            ].map(({ app, path }) => (
                              <div key={app} className="flex items-start gap-3 bg-neutral-50 rounded-lg px-3 py-2.5">
                                <span className="text-xs font-semibold text-neutral-900 w-14 shrink-0 pt-0.5">{app}</span>
                                <span className="text-xs text-neutral-500 leading-relaxed">{path}</span>
                              </div>
                            ))}
                          </div>
                          {/* Visual example */}
                          <div className="mt-3 flex items-center gap-2 bg-neutral-100 rounded-lg px-3 py-2.5">
                            <span className="text-xs text-neutral-500">Looks like:</span>
                            <span className="font-mono text-sm font-semibold text-neutral-800 tracking-widest">424212345678</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">Your UTR number</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="12-digit number"
                            maxLength={12}
                            value={utrInput}
                            onChange={e => setUtrInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full border border-neutral-300 focus:border-neutral-900 outline-none rounded-lg px-4 py-3.5 text-base font-mono tracking-widest transition-colors"
                          />
                          <div className="flex justify-between mt-1.5">
                            <span className="text-xs text-neutral-400">Numbers only</span>
                            <span className={`text-xs font-medium ${utrInput.length === 12 ? 'text-emerald-600' : 'text-neutral-400'}`}>
                              {utrInput.length}/12
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={utrInput.length < 12}
                          onClick={async () => {
                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/upi/confirm`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                orderId: upiOrderId,
                                utrNumber: utrInput,
                                customerPhone: formData.phone
                              })
                            });
                            const data = await res.json();
                            if (data.success) setUpiStep('pending');
                          }}
                          className="w-full bg-neutral-900 text-white py-4 rounded-lg text-sm font-semibold tracking-wide hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                          Confirm & Place Order
                        </button>
                      </div>
                    </div>
                  )}

                  {upiStep === 'pending' && (
                    <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-6 text-center space-y-3">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 text-lg">Order placed</p>
                        <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                          Payment is being verified. You'll get a WhatsApp confirmation once the brand approves it.
                        </p>
                      </div>
                      <div className="pt-3 border-t border-emerald-200">
                        <p className="text-xs text-neutral-400">UTR: <span className="font-mono text-neutral-700 tracking-widest">{utrInput}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isUpiMode && (
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
              )}

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

      {/* MOBILE UPI FULL-SCREEN SHEET */}
      {isUpiMode && (
        <div className="fixed inset-0 bg-white z-50 md:hidden flex flex-col">
          {/* Sheet header */}
          <div className="bg-neutral-900 px-4 pt-7 pb-4 shrink-0">
            {upiStep !== 'pending' && (
              <button
                type="button"
                onClick={() => upiStep === 'utr' ? setUpiStep('pay') : setIsUpiMode(false)}
                className="text-white/50 text-xs hover:text-white transition-colors mb-3 flex items-center gap-1.5"
              >
                ← {upiStep === 'utr' ? 'Back' : 'Cancel'}
              </button>
            )}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-widest">Amount due</p>
                <p className="text-white text-4xl font-serif mt-1">₹{total}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white text-xs">Secure</span>
              </div>
            </div>
            {/* Step pills */}
            <div className="flex items-center gap-2 mt-4">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${upiStep === 'pay' ? 'bg-white text-neutral-900' : 'bg-white/10 text-white/50'}`}>
                {upiStep !== 'pay' ? '1 Paid ✓' : '1 Pay'}
              </span>
              <div className="flex-1 h-px bg-white/20" />
              <span className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${upiStep === 'utr' ? 'bg-white text-neutral-900' : upiStep === 'pending' ? 'bg-white/10 text-white/50' : 'bg-white/10 text-white/40'}`}>
                {upiStep === 'pending' ? '2 Done ✓' : '2 Enter UTR'}
              </span>
            </div>
          </div>

          {/* Sheet body — scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
            {upiStep === 'pay' && (
              <>
                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-3">
                  <p className="text-xs font-semibold text-amber-900">2 steps to confirm your order</p>
                  <p className="text-xs text-amber-700 mt-0.5">Pay below, then come back and enter your UTR number. Order is only confirmed after Step 2.</p>
                </div>
                {isMobileDevice ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    <a
                      href={upiUrl || '#'}
                      className="flex items-center justify-center w-full bg-neutral-900 text-white py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide active:scale-[0.98] transition-all"
                    >
                      Open UPI App
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyUpiId}
                      className="flex items-center justify-center w-full border border-neutral-300 text-neutral-900 py-3.5 rounded-xl text-sm font-semibold tracking-wide active:scale-[0.98] transition-all"
                    >
                      {upiCopied ? 'UPI ID Copied' : 'Copy UPI ID'}
                    </button>
                    <div className="border border-neutral-200 rounded-2xl bg-neutral-50 p-4">
                      <div className="text-center">
                        <p className="text-xs uppercase tracking-widest text-neutral-500">Scan To Pay</p>
                        <p className="text-xs text-neutral-500 mt-1">Scan this in any UPI app to auto-fill the exact order amount.</p>
                      </div>
                      <div className="mt-4 bg-white border border-neutral-200 rounded-xl p-3 flex justify-center">
                        {upiQrCode ? (
                          <img
                            src={upiQrCode}
                            alt={`Mobile UPI QR for ₹${total}`}
                            className="w-44 h-44"
                          />
                        ) : (
                          <div className="w-44 h-44 flex items-center justify-center bg-neutral-100 text-neutral-400 text-sm">
                            Generating QR...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <a
                      href={upiUrl || '#'}
                      className="flex items-center justify-center w-full bg-neutral-900 text-white py-5 rounded-xl text-base font-semibold tracking-wide active:scale-[0.98] transition-all"
                    >
                      Pay ₹{total} via UPI
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyUpiId}
                      className="flex items-center justify-center w-full border border-neutral-300 text-neutral-900 py-4 rounded-xl text-base font-semibold tracking-wide active:scale-[0.98] transition-all"
                    >
                      {upiCopied ? 'UPI ID Copied' : 'Copy UPI ID'}
                    </button>
                  </>
                )}
                <p className="text-center text-sm text-neutral-400">GPay · PhonePe · Paytm · BHIM · any UPI app</p>
                <p className="text-center text-xs text-neutral-500 leading-relaxed">
                  If one app doesn&apos;t open, try another button or copy the UPI ID and pay manually in your preferred UPI app.
                </p>
              </>
            )}

            {upiStep === 'utr' && (
              <>
                <div>
                  <p className="text-base font-semibold text-neutral-900 mb-4">Where is the UTR number?</p>
                  <div className="space-y-3">
                    {[
                      { app: 'GPay', path: 'Tap transaction → "UPI transaction ID"' },
                      { app: 'PhonePe', path: 'History → Tap transaction → "UPI Ref No."' },
                      { app: 'Paytm', path: 'Passbook → Tap transaction → "UTR No."' },
                    ].map(({ app, path }) => (
                      <div key={app} className="flex items-start gap-3 bg-neutral-50 rounded-xl px-4 py-3">
                        <span className="text-sm font-semibold text-neutral-900 w-16 shrink-0 pt-0.5">{app}</span>
                        <span className="text-sm text-neutral-500 leading-relaxed">{path}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-3 bg-neutral-100 rounded-xl px-4 py-3">
                    <span className="text-sm text-neutral-500">Looks like:</span>
                    <span className="font-mono text-base font-bold text-neutral-800 tracking-widest">424212345678</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">Your UTR number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="12-digit number"
                    maxLength={12}
                    value={utrInput}
                    onChange={e => setUtrInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full border-2 border-neutral-200 focus:border-neutral-900 outline-none rounded-xl px-4 py-4 text-xl font-mono tracking-widest transition-colors"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-neutral-400">Numbers only</span>
                    <span className={`text-sm font-semibold ${utrInput.length === 12 ? 'text-emerald-600' : 'text-neutral-400'}`}>
                      {utrInput.length}/12
                    </span>
                  </div>
                </div>
              </>
            )}

            {upiStep === 'pending' && (
              <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="w-10 h-10 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-neutral-900">Order placed</p>
                  <p className="text-base text-neutral-500 mt-2 leading-relaxed max-w-xs mx-auto">
                    Payment is being verified. You'll get a WhatsApp confirmation once the brand approves it.
                  </p>
                </div>
                <div className="bg-neutral-50 rounded-xl px-5 py-3 w-full">
                  <p className="text-xs text-neutral-400 mb-1">UTR submitted</p>
                  <p className="font-mono text-lg font-bold text-neutral-800 tracking-widest">{utrInput}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sticky bottom CTA */}
          {upiStep !== 'pending' && (
            <div className="shrink-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] border-t border-neutral-100 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
              {upiStep === 'pay' ? (
                <button
                  type="button"
                  onClick={() => setUpiStep('utr')}
                  className="w-full border-2 border-neutral-900 text-neutral-900 py-3.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all"
                >
                  I've paid — Enter UTR →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={utrInput.length < 12}
                  onClick={async () => {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/upi/confirm`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        orderId: upiOrderId,
                        utrNumber: utrInput,
                        customerPhone: formData.phone
                      })
                    });
                    const data = await res.json();
                    if (data.success) setUpiStep('pending');
                  }}
                  className="w-full bg-neutral-900 text-white py-4 rounded-xl text-base font-semibold active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  Confirm & Place Order
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* STICKY MOBILE PAYMENT BAR */}
      {!isUpiMode && (
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
      )}
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
