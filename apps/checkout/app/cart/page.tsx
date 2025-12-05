'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Loader2, ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';

function CartContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const variantId = searchParams.get('variantId');
  const productId = searchParams.get('productId');

  const [product, setProduct] = useState<any>(null);
  const [variant, setVariant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  // Fetch Product Data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get(`/checkout/products/${productId}`);
        if (res.data.success) {
          const productData = res.data.data;
          setProduct(productData);
          
          // Find the selected variant
          if (variantId) {
            const selectedVariant = productData.variants.find((v: any) => v.id === variantId);
            setVariant(selectedVariant);
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [productId, variantId]);

  // Calculations
  const mockPrice = product?.basePrice || 1499; 
  const subtotal = mockPrice * quantity;
  const shipping = subtotal < 1000 ? 99 : 0;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    router.push(`/checkout?variantId=${variantId}&productId=${productId}&qty=${quantity}&total=${total}`);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <p className="text-xl font-semibold text-neutral-900">Product not found</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-neutral-600 hover:text-neutral-900">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
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
            <div className="bg-white border border-neutral-200 p-6">
              <div className="flex gap-6">
                <div className="w-28 h-28 bg-neutral-100 flex-shrink-0 overflow-hidden">
                  {product.images?.[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-200" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-medium text-neutral-900">{product.name}</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        Size: {variant?.name || 'N/A'} | {variant?.type || 'Standard'}
                      </p>
                    </div>
                    <button className="text-neutral-400 hover:text-neutral-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-end mt-6">
                    <div className="text-lg text-neutral-900">₹{product.basePrice}</div>
                    
                    <div className="flex items-center gap-4 border border-neutral-300">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-2 hover:bg-neutral-50 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-3 py-2 hover:bg-neutral-50 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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