'use client';

import { useEffect, useState, useMemo } from 'react';
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
        id: string;
        brandName: string;
    };
    slug: string;
    userId: string;
}

export default function ProductPage() {
    const params = useParams();
    const router = useRouter();

    // Accepts ID or Slug from the URL
    const productIdOrSlug = params?.productId as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
    const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // 1. Fetch Product Data
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                // Use the environment variable, falling back to localhost for local dev
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
                const res = await fetch(`${API_URL}/store/product/${productIdOrSlug}`);

                if (!res.ok) {
                    console.error('Failed to fetch product:', res.status);
                    setLoading(false);
                    return;
                }

                const data = await res.json();

                // API returns product directly, not wrapped in { success, product }
                setProduct(data);
            } catch (err) {
                console.error('Error fetching product:', err);
            } finally {
                setLoading(false);
            }
        };

        if (productIdOrSlug) fetchProduct();
    }, [productIdOrSlug]);

    // Group variants by style
    const groups = useMemo(() => {
        if (!product) return [];
        const groupMap = new Map<string, any>();

        product.variants.forEach(v => {
            let groupName = "Default";
            let sizeName = v.name;

            if (v.name.includes(' - Size ')) {
                const parts = v.name.split(' - Size ');
                groupName = parts[0];
                sizeName = parts[1];
            } else if (v.name.startsWith('Size ')) {
                sizeName = v.name.replace('Size ', '');
            }

            if (!groupMap.has(groupName)) {
                groupMap.set(groupName, {
                    name: groupName,
                    imageUrl: v.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null),
                    variants: []
                });
            }
            groupMap.get(groupName).variants.push({ ...v, displaySize: sizeName });
        });

        return Array.from(groupMap.values());
    }, [product]);

    useEffect(() => {
        if (groups.length > 0 && !selectedGroupName) {
            setSelectedGroupName(groups[0].name);
        }
    }, [groups, selectedGroupName]);

    const currentGroup = groups.find(g => g.name === selectedGroupName) || groups[0];

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
            image: variantData.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : ''),
            quantity: 1,
            brandName: product.user.brandName,
            brandId: product.userId || product.user?.id, // Pass brandId so verify endpoint can use the brand's Razorpay keys
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
                        <div className="relative aspect-[3/4] bg-neutral-100 rounded-sm overflow-hidden flex items-center justify-center">
                            {(product.images && product.images[activeImageIndex]) || currentGroup?.imageUrl ? (
                                <img src={(product.images && product.images[activeImageIndex]) || currentGroup?.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-neutral-400 font-medium">No Image Available</div>
                            )}
                        </div>
                        {/* Thumbnails */}
                        {product.images && product.images.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                {product.images.map((img: string, idx: number) => (
                                    <button key={idx} onClick={() => setActiveImageIndex(idx)} className={`w-20 h-24 border shrink-0 ${activeImageIndex === idx ? 'border-black' : 'border-transparent'}`}>
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

                        {/* Style Selector */}
                        {groups.length > 1 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Select Style</h3>
                                <div className="flex gap-4 flex-wrap">
                                    {groups.map((group: any) => (
                                        <button
                                            key={group.name}
                                            onClick={() => {
                                                setSelectedGroupName(group.name);
                                                setSelectedVariant(null);
                                            }}
                                            className={`flex flex-col items-center justify-between gap-2 p-1 border rounded-md transition-all ${selectedGroupName === group.name ? 'border-black ring-1 ring-black shadow-md' : 'border-transparent hover:border-gray-300'}`}
                                            title={group.name}
                                        >
                                            {group.imageUrl ? (
                                                <img src={group.imageUrl} alt={group.name} className="w-16 h-16 object-cover rounded-sm border border-gray-100" />
                                            ) : (
                                                <div className="w-16 h-16 bg-gray-200 rounded-sm border border-gray-100 flex items-center justify-center text-xs text-gray-500">Img</div>
                                            )}
                                            <span className="text-xs font-semibold px-2">{group.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Size Selector */}
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Select Size</h3>
                        <div className="flex gap-3 flex-wrap mb-12">
                            {currentGroup?.variants.map((variant: any) => {
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
                                        {variant.displaySize}
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