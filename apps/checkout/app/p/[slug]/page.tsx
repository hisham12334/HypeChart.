'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Loader2, ShoppingBag, ArrowRight, Star } from 'lucide-react';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await apiClient.get(`/checkout/products/${params.slug}`);
        if (res.data.success) setProduct(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (params.slug) fetchProduct();
  }, [params.slug]);

  const handleBuyNow = () => {
    if (!selectedVariant) return alert('Please select a size to continue.');
    // Navigate to checkout with the variant ID in the URL
    router.push(`/cart?variantId=${selectedVariant}&productId=${product.id}`);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-900">Product Not Found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="relative aspect-square bg-white rounded-sm overflow-hidden">
            {product.images?.[0] ? (
              <img 
                src={product.images[0]} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-neutral-100">
                <ShoppingBag className="w-20 h-20 text-neutral-300" />
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            <div className="mb-8">
              <h1 className="text-4xl font-serif text-neutral-900 mb-4">
                {product.name}
              </h1>
              <p className="text-2xl text-neutral-900">
                ₹{product.basePrice}
              </p>
            </div>

            {/* Description */}
            <div className="mb-10">
              <p className="text-neutral-600 leading-relaxed text-base">
                {product.description || "Premium quality streetwear. Limited edition drop with exclusive design details. Crafted for comfort and style."}
              </p>
            </div>

            {/* Size Selector */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm text-neutral-900 tracking-wide">
                  Size: {selectedVariant ? product.variants.find((v: any) => v.id === selectedVariant)?.name : 'Select'}
                </h3>
                <button className="text-sm text-neutral-600 hover:text-neutral-900 underline">
                  Size Guide
                </button>
              </div>
              
              <div className="flex gap-3">
                {product.variants.map((variant: any) => {
                  const isSoldOut = variant.availableCount <= 0;
                  const isSelected = selectedVariant === variant.id;
                  
                  return (
                    <button
                      key={variant.id}
                      disabled={isSoldOut}
                      onClick={() => setSelectedVariant(variant.id)}
                      className={`
                        px-6 py-3 text-sm font-medium transition-all duration-200
                        ${isSelected 
                          ? 'bg-neutral-900 text-white' 
                          : isSoldOut 
                            ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed' 
                            : 'bg-white text-neutral-900 border border-neutral-300 hover:border-neutral-900'
                        }
                      `}
                    >
                      {variant.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleBuyNow}
              disabled={!selectedVariant}
              className={`
                w-full py-4 text-sm font-medium tracking-wide transition-all duration-200
                flex items-center justify-center gap-2
                ${selectedVariant
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }
              `}
            >
              {selectedVariant ? (
                <>
                  ADD TO CART
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                'SELECT A SIZE'
              )}
            </button>

            {/* Additional Info */}
            <div className="mt-10 pt-10 border-t border-neutral-200">
              <div className="space-y-4 text-sm text-neutral-600">
                <p>• Free shipping on orders over ₹2000</p>
                <p>• Easy returns within 30 days</p>
                <p>• Authentic products guaranteed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}