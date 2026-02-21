'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
// import { toast } from 'sonner'; // Uncomment if you have sonner installed

interface Product {
    id: string;
    name: string;
    description: string;
    basePrice: string;
    images: string[];
    variants: any[];
    user: {
        brandName: string;
    };
    slug: string;
}

export default function ProductPage() {
    const params = useParams();
    const router = useRouter();

    // Accepts ID or Slug from the URL
    const productIdOrSlug = params?.productId as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // 1. Fetch Product Data
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                // Use the environment variable, falling back to localhost for local dev
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
                const res = await fetch(`${API_URL}/store/product/${productIdOrSlug}`);
                const data = await res.json();

                if (data.success) {
                    setProduct(data.product);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (productIdOrSlug) fetchProduct();
    }, [productIdOrSlug]);

    // Helper to get selected variant details
    const getSelectedVariantData = () => {
        if (!product || !selectedVariant) return null;
        return product.variants.find((v: any) => v.id === selectedVariant);
    };

    const selectedVariantData = getSelectedVariantData();

    // 2. THE BRIDGE: Save to Storage & Redirect to /cart
    const handleAddToCart = () => {
        if (!product) return;
        if (!selectedVariant) {
            alert('Please select a size first.');
            return;
        }

        const variantData = getSelectedVariantData();
        if (!variantData || variantData.availableCount <= 0) {
            alert('This size is out of stock.');
            return;
        }

        // A. Create the Cart Item object
        const cartItem = {
            productId: product.id,
            variantId: selectedVariant,
            name: product.name,
            price: product.basePrice,
            image: product.images[0],
            quantity: 1,
            brandName: product.user.brandName,
            slug: product.slug,
            variantName: product.variants.find((v: any) => v.id === selectedVariant)?.name || 'Standard'
        };

        // B. Save to Local Storage (This is how we pass data to your Cart page)
        const existingCart = JSON.parse(localStorage.getItem('hype-cart') || '[]');

        // Check if item already exists in cart, if so, just update quantity (Optional)
        const existingItemIndex = existingCart.findIndex((item: any) => item.variantId === selectedVariant);
        if (existingItemIndex > -1) {
            // Simple client-side check, real check happens at cart/checkout
            if (existingCart[existingItemIndex].quantity + 1 > variantData.availableCount) {
                alert(`Only ${variantData.availableCount} items available.`);
                return;
            }
            existingCart[existingItemIndex].quantity += 1;
        } else {
            existingCart.push(cartItem);
        }

        localStorage.setItem('hype-cart', JSON.stringify(existingCart));

        // C. Redirect to your existing Cart Page
        // This matches the folder 'apps/checkout/app/cart' in your screenshot
        router.push('/cart');
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!product) return <div className="h-screen flex items-center justify-center">Product Not Found</div>;

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col text-black pb-24 md:pb-0">
            <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">

                {/* Brand Header */}
                <header className="mb-12">
                    <h1 className="text-2xl font-black tracking-tighter uppercase">
                        {product.user?.brandName || "HYPECHART"}
                    </h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-20">

                    {/* Left: Images */}
                    <div className="space-y-4">
                        <div className="relative aspect-[3/4] bg-neutral-100 rounded-sm overflow-hidden">
                            <img src={product.images[activeImageIndex] || ""} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        {/* Thumbnails */}
                        {product.images.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                {product.images.map((img: string, idx: number) => (
                                    <button key={idx} onClick={() => setActiveImageIndex(idx)} className={`w-20 h-24 border ${activeImageIndex === idx ? 'border-black' : 'border-transparent'}`}>
                                        <img src={img} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Details */}
                    <div className="flex flex-col pt-4">
                        <h1 className="text-3xl md:text-4xl font-serif mb-2 md:mb-4">{product.name}</h1>
                        <p className="text-2xl font-light mb-8">₹{product.basePrice}</p>
                        <div className="text-neutral-600 mb-10" dangerouslySetInnerHTML={{ __html: product.description }} />

                        {/* Size Selector */}
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Select Size</h3>
                        <div className="flex gap-3 flex-wrap mb-12">
                            {product.variants.map((variant: any) => {
                                const isOutOfStock = variant.availableCount <= 0;
                                return (
                                    <button
                                        key={variant.id}
                                        onClick={() => !isOutOfStock && setSelectedVariant(variant.id)}
                                        disabled={isOutOfStock}
                                        className={`px-6 py-3 border relative ${selectedVariant === variant.id
                                            ? 'bg-black text-white border-black'
                                            : isOutOfStock
                                                ? 'bg-neutral-100 text-neutral-400 border-neutral-100 cursor-not-allowed'
                                                : 'bg-white text-black border-neutral-200 hover:border-black'
                                            }`}
                                    >
                                        {variant.name}
                                        {isOutOfStock && (
                                            <span className="block text-[0.6rem] absolute -bottom-2 left-0 right-0 text-center text-red-500 font-bold tracking-widest uppercase">
                                                Sold Out
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Stock Message */}
                        {selectedVariantData && selectedVariantData.availableCount > 0 && selectedVariantData.availableCount <= 5 && (
                            <div className="mb-6 text-orange-600 text-sm font-medium flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                Only {selectedVariantData.availableCount} left in stock!
                            </div>
                        )}

                        {/* ADD TO CART BUTTON */}
                        <button
                            onClick={handleAddToCart}
                            disabled={!selectedVariant || (selectedVariantData?.availableCount || 0) <= 0}
                            className={`hidden md:flex w-full py-5 font-bold tracking-widest uppercase transition-all items-center justify-center gap-2 ${!selectedVariant || (selectedVariantData?.availableCount || 0) <= 0
                                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                : 'bg-black text-white hover:bg-gray-800'
                                }`}
                        >
                            {selectedVariantData?.availableCount === 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
                            {(!selectedVariantData || selectedVariantData.availableCount > 0) && <ArrowRight className="w-5 h-5" />}
                        </button>

                        <p className="text-xs text-center text-neutral-400 mt-4 uppercase tracking-widest">
                            Secure Checkout • Free Shipping
                        </p>
                    </div>
                </div>
            </div>

            {/* STICKY MOBILE ACTION BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 md:hidden z-50 pb-safe">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-neutral-500 uppercase tracking-wide">Total</span>
                        <span className="text-lg font-serif">₹{product.basePrice}</span>
                    </div>
                    <button
                        onClick={handleAddToCart}
                        disabled={!selectedVariant || (selectedVariantData?.availableCount || 0) <= 0}
                        className={`flex-1 py-3 px-4 font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 text-sm ${!selectedVariant || (selectedVariantData?.availableCount || 0) <= 0
                            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                            : 'bg-black text-white hover:bg-gray-800'
                            }`}
                    >
                        {selectedVariantData?.availableCount === 0 ? 'SOLD OUT' : 'ADD TO CART'}
                    </button>
                </div>
            </div>
        </div>
    );
}