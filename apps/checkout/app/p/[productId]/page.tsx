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
                const res = await fetch(`http://localhost:4000/api/store/product/${productIdOrSlug}`);
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

    // 2. THE BRIDGE: Save to Storage & Redirect to /cart
    const handleAddToCart = () => {
        if (!product) return;
        if (!selectedVariant) {
            alert('Please select a size first.');
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
            slug: product.slug
        };

        // B. Save to Local Storage (This is how we pass data to your Cart page)
        const existingCart = JSON.parse(localStorage.getItem('hype-cart') || '[]');

        // Check if item already exists in cart, if so, just update quantity (Optional)
        const existingItemIndex = existingCart.findIndex((item: any) => item.variantId === selectedVariant);
        if (existingItemIndex > -1) {
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
        <div className="min-h-screen bg-neutral-50 flex flex-col text-black">
            <div className="max-w-7xl mx-auto px-6 py-8">

                {/* Brand Header */}
                <header className="mb-12">
                    <h1 className="text-2xl font-black tracking-tighter uppercase">
                        {product.user?.brandName || "HYPECHART"}
                    </h1>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

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
                        <h1 className="text-4xl font-serif mb-4">{product.name}</h1>
                        <p className="text-2xl font-light mb-8">₹{product.basePrice}</p>
                        <div className="text-neutral-600 mb-10" dangerouslySetInnerHTML={{ __html: product.description }} />

                        {/* Size Selector */}
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Select Size</h3>
                        <div className="flex gap-3 flex-wrap mb-12">
                            {product.variants.map((variant: any) => (
                                <button
                                    key={variant.id}
                                    onClick={() => setSelectedVariant(variant.id)}
                                    className={`px-6 py-3 border ${selectedVariant === variant.id ? 'bg-black text-white border-black' : 'bg-white text-black border-neutral-200 hover:border-black'}`}
                                >
                                    {variant.name}
                                </button>
                            ))}
                        </div>

                        {/* ADD TO CART BUTTON */}
                        <button
                            onClick={handleAddToCart}
                            className="w-full py-5 bg-black text-white font-bold tracking-widest uppercase hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                        >
                            ADD TO CART <ArrowRight className="w-5 h-5" />
                        </button>

                        <p className="text-xs text-center text-neutral-400 mt-4 uppercase tracking-widest">
                            Secure Checkout • Free Shipping
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}