'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Trash2, Plus, X, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.productId as string;

    const [loading, setLoading] = useState(false); // For saving
    const [fetching, setFetching] = useState(true); // For initial load

    // --- CLOUDINARY CONFIG ---
    const CLOUD_NAME = "dsqetae27";
    const UPLOAD_PRESET = "hypechart-products";

    // --- STATE ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [basePrice, setBasePrice] = useState('');
    const [images, setImages] = useState<string[]>([]);

    // Variant State (now includes optional id)
    const [variants, setVariants] = useState<{ id?: string; name: string; inventoryCount: string | number }[]>([]);

    // --- FETCH DATA ---
    useEffect(() => {
        if (productId) {
            loadProduct();
        }
    }, [productId]);

    const loadProduct = async () => {
        try {
            const res = await apiClient.get(`/products/${productId}`);
            if (res.data.success) {
                const p = res.data.data;
                setName(p.name);
                setDescription(p.description || '');
                setBasePrice(p.basePrice.toString());
                setImages(p.images || []);

                // Map variants
                if (p.variants && p.variants.length > 0) {
                    setVariants(p.variants.map((v: any) => ({
                        id: v.id,
                        name: v.name,
                        inventoryCount: v.inventoryCount
                    })));
                } else {
                    setVariants([
                        { name: 'Size S', inventoryCount: 0 },
                        { name: 'Size M', inventoryCount: 0 },
                        { name: 'Size L', inventoryCount: 0 },
                    ]);
                }
            }
        } catch (error) {
            console.error("Failed to load product", error);
            toast.error("Failed to load product details");
        } finally {
            setFetching(false);
        }
    };

    // --- HANDLERS ---

    // 1. Image Upload Handler (Cloudinary)
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const file = files[0];

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (data.secure_url) {
                setImages([...images, data.secure_url]);
                toast.success('Image uploaded successfully');
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error("Cloudinary Error:", error);
            toast.error('Failed to upload image');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    // 2. Variant Handlers
    const updateVariant = (index: number, field: string, value: any) => {
        const newVariants = [...variants];
        // @ts-ignore
        newVariants[index][field] = value;
        setVariants(newVariants);
    };

    const addVariant = () => {
        setVariants([...variants, { name: '', inventoryCount: 0 }]);
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    // 3. Submit Handler (Update)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                name,
                description,
                basePrice: parseFloat(basePrice),
                images,
                variants: variants.map(v => ({
                    id: v.id, // Include ID if it exists (for updates)
                    name: v.name,
                    inventoryCount: parseInt(v.inventoryCount.toString())
                }))
            };

            console.log('Updating product:', payload);

            await apiClient.put(`/products/${productId}`, payload);

            toast.success('Product updated successfully');
            router.push('/products');
        } catch (error: any) {
            console.error('Product update error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to update product';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/products">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Product Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Product Name</Label>
                            <Input
                                placeholder="e.g. Vintage Heavyweight Tee"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Product description..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Base Price (₹)</Label>
                            <Input
                                type="number"
                                placeholder="1499"
                                value={basePrice}
                                onChange={(e) => setBasePrice(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Images Section (Cloudinary) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Product Images</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Hidden File Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />

                        {/* Upload Button */}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                variant="secondary"
                                disabled={isUploading}
                                className="w-full h-24 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                        <span className="text-xs text-gray-500">Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="h-6 w-6 text-gray-400" />
                                        <span className="text-xs text-gray-500">Click to Upload Image</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Image Previews */}
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            {images.map((url, index) => (
                                <div key={index} className="relative group border rounded-lg overflow-hidden aspect-square">
                                    <img
                                        src={url}
                                        alt={`Product ${index + 1}`}
                                        className="object-cover w-full h-full"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Variants */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Variants & Inventory</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                            <Plus className="mr-2 h-4 w-4" /> Add Variant
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {variants.map((variant, index) => (
                            <div key={index} className="flex gap-4 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label>Variant Name</Label>
                                    <Input
                                        value={variant.name}
                                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                        placeholder="e.g. Size XL"
                                    />
                                </div>
                                <div className="w-32 space-y-2">
                                    <Label>Stock</Label>
                                    <Input
                                        type="number"
                                        value={variant.inventoryCount}
                                        onChange={(e) => updateVariant(index, 'inventoryCount', e.target.value)}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500"
                                    onClick={() => removeVariant(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4 pb-10">
                    <Link href="/products">
                        <Button variant="outline" type="button">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    );
}