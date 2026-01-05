'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Loader2, ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';

function CartContent() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Load Cart from LocalStorage
  useEffect(() => {
    const loadCart = () => {
      try {
        const storedCart = localStorage.getItem('hype-cart');
        if (storedCart) {
          setCartItems(JSON.parse(storedCart));
        }
      } catch (error) {
        console.error("Failed to load cart", error);
      } finally {
        setLoading(false);
      }
    };
    loadCart();
  }, []);

  // 2. Update Cart in LocalStorage
  const updateCart = (newCart: any[]) => {
    setCartItems(newCart);
    localStorage.setItem('hype-cart', JSON.stringify(newCart));
  };

  const removeItem = (index: number) => {
    const newCart = [...cartItems];
    newCart.splice(index, 1);
    updateCart(newCart);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cartItems];
    const item = newCart[index];
    const newQty = (item.quantity || 1) + delta;
    if (newQty > 0) {
      item.quantity = newQty;
      updateCart(newCart);
    }
  };

  // 3. Calculate Totals
  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);
  const shipping = subtotal > 0 && subtotal < 1000 ? 99 : 0;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <p className="text-xl font-semibold text-neutral-900">Your cart is empty</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-neutral-600 hover:text-neutral-900">
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Group items by brand (Optional UI enhancement, but for now just use first item's brand for header)
  const brandName = cartItems[0]?.brandName || "HYPECHART";

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <div className="max-w-4xl mx-auto px-6 py-12 w-full">

        {/* --- BRAND HEADER --- */}
        <header className="mb-12">
          <h1 className="text-2xl font-black tracking-tighter uppercase">{brandName}</h1>
        </header>

        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => router.back()}
            className="text-sm text-neutral-600 hover:text-neutral-900 mb-6 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </button>
          <h1 className="text-4xl font-serif text-neutral-900">Your Selection</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cartItems.map((item, index) => (
              <div key={`${item.variantId}-${index}`} className="bg-white border border-neutral-200 p-6">
                <div className="flex gap-6">
                  <div className="w-28 h-28 bg-neutral-100 flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-200" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-medium text-neutral-900">{item.name}</h3>
                        <p className="text-sm text-neutral-600 mt-1">
                          Size: {item.variantId.split('-').pop() || 'Standard'}
                          {/* Note: We don't have variant name stored, might want to add it to cart item in product page later */}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-neutral-400 hover:text-neutral-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-end mt-6">
                      <div className="text-lg text-neutral-900">
                        ₹{item.price}
                      </div>

                      <div className="flex items-center gap-4 border border-neutral-300">
                        <button
                          onClick={() => updateQuantity(index, -1)}
                          className="px-3 py-2 hover:bg-neutral-50 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium">{item.quantity || 1}</span>
                        <button
                          onClick={() => updateQuantity(index, 1)}
                          className="px-3 py-2 hover:bg-neutral-50 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-neutral-200 p-6 sticky top-6">
              <h2 className="text-xl font-serif text-neutral-900 mb-6">Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="text-neutral-900">₹{subtotal}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Shipping</span>
                  {shipping === 0 ? (
                    <span className="text-neutral-900">Complimentary</span>
                  ) : (
                    <span className="text-neutral-900">₹{shipping}</span>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-lg font-medium text-neutral-900">Total</span>
                  <span className="text-lg font-medium text-neutral-900">₹{total}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-neutral-900 text-white py-4 text-sm font-medium tracking-wide hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                PROCEED TO CHECKOUT
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
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
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CartContent />
    </Suspense>
  );
}