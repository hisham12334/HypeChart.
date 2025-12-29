'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Loader2, ShoppingBag, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // NEW: State for the currently visible image
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await apiClient.get(`/checkout/products/${params.slug}`);
        if (res.data.success) {
          setProduct(res.data.data);
          // Default to first variant if available (optional)
          // if (res.data.data.variants.length > 0) setSelectedVariant(res.data.data.variants[0].id);
        }
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
    router.push(`/cart?variantId=${selectedVariant}&slug=${params.slug}`);
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
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* --- BRAND HEADER --- */}
        <header className="mb-12">
          <h1 className="text-2xl font-black tracking-tighter uppercase">{product.user?.brandName || "HYPECHART"}</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

          {/* --- LEFT: IMAGE GALLERY --- */}
          <div className="space-y-4">
            {/* Main Active Image - Changed from square to 3/4 aspect ratio for better product view */}
            <div className="relative aspect-[3/4] bg-neutral-100 rounded-sm overflow-hidden">
              {product.images?.[activeImageIndex] ? (
                <img
                  src={product.images[activeImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-neutral-100">
                  <ShoppingBag className="w-20 h-20 text-neutral-300" />
                </div>
              )}
            </div>

            {/* Thumbnail Strip (Only show if more than 1 image) */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {product.images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`
                      relative w-20 h-24 flex-shrink-0 overflow-hidden border 
                      ${activeImageIndex === idx ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-transparent opacity-70 hover:opacity-100'}
                    `}
                  >
                    <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* --- RIGHT: DETAILS --- */}
          <div className="flex flex-col pt-4">
            <div className="mb-8 border-b border-neutral-100 pb-8">
              <h1 className="text-4xl md:text-5xl font-serif text-neutral-900 mb-4">
                {product.name}
              </h1>
              <p className="text-2xl text-neutral-900 font-light">
                ₹{product.basePrice}
              </p>
            </div>

            <div className="mb-10">
              <p className="text-neutral-600 leading-relaxed text-lg font-light">
                {product.description || "Premium quality streetwear. Limited edition drop."}
              </p>
            </div>

            <div className="mb-12">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-900">
                  Select Size
                </h3>
                <span className="text-xs text-neutral-500">{selectedVariant ? product.variants.find((v: any) => v.id === selectedVariant)?.name : 'Required'}</span>
              </div>

              <div className="flex gap-3 flex-wrap">
                {product.variants.map((variant: any) => {
                  const isSoldOut = variant.inventoryCount - variant.reservedCount <= 0;
                  const isSelected = selectedVariant === variant.id;

                  return (
                    <button
                      key={variant.id}
                      disabled={isSoldOut}
                      onClick={() => setSelectedVariant(variant.id)}
                      className={`
                        min-w-[4rem] px-6 py-3 text-sm font-medium transition-all duration-200 border
                        ${isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : isSoldOut
                            ? 'bg-neutral-50 text-neutral-300 border-neutral-100 cursor-not-allowed decoration-slice line-through'
                            : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-900'
                        }
                      `}
                    >
                      {variant.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleBuyNow}
              disabled={!selectedVariant}
              className={`
                w-full py-5 text-sm font-bold tracking-widest uppercase transition-all duration-200
                flex items-center justify-center gap-3
                ${selectedVariant
                  ? 'bg-neutral-900 text-white hover:bg-black shadow-xl hover:shadow-2xl hover:-translate-y-1'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }
              `}
            >
              {selectedVariant ? (
                <>ADD TO CART <ArrowRight className="w-4 h-4" /></>
              ) : (
                'SELECT A SIZE - ADD TO CART'
              )}
            </button>

            <p className="text-xs text-center text-neutral-400 mt-4 uppercase tracking-widest">
              Free Shipping on orders over ₹2000
            </p>
          </div>
        </div>
      </div>

      <footer className="py-12 mt-auto border-t border-neutral-200 bg-neutral-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-3">
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} {product.user?.brandName || "Hypechart Brand"}. All rights reserved.
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