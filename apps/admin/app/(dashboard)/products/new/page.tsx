'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Trash2, Plus, X, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

const CLOUD_NAME = "dfnvjyu59";
const UPLOAD_PRESET = "Hypechart";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SizeRow {
  label: string;   // e.g. "S", "XL", "Free Size"
  stock: number;
}

interface VariantRow {
  name: string;
  sizes: SizeRow[];
  imageUrl: string | null;
}

// ─── Reusable Size Editor ─────────────────────────────────────────────────────

function SizeEditor({
  sizes,
  onChange,
}: {
  sizes: SizeRow[];
  onChange: (sizes: SizeRow[]) => void;
}) {
  const addSize = () => {
    onChange([...sizes, { label: '', stock: 0 }]);
  };

  const updateLabel = (i: number, value: string) => {
    const next = [...sizes];
    next[i] = { ...next[i], label: value };
    onChange(next);
  };

  const updateStock = (i: number, value: string) => {
    const next = [...sizes];
    next[i] = { ...next[i], stock: Math.max(0, parseInt(value) || 0) };
    onChange(next);
  };

  const removeSize = (i: number) => {
    onChange(sizes.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-gray-600 text-sm">Sizes &amp; Stock</Label>
        <button
          type="button"
          onClick={addSize}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Size
        </button>
      </div>

      {sizes.length === 0 && (
        <p className="text-xs text-gray-400 italic py-1">
          No sizes added. Click "Add Size" to add one.
        </p>
      )}

      <div className="space-y-2">
        {sizes.map((sz, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Size (e.g. S, XL, Free)"
              value={sz.label}
              onChange={(e) => updateLabel(i, e.target.value)}
              className="w-36 text-sm h-9"
            />
            <Input
              type="number"
              placeholder="Stock"
              value={sz.stock}
              min={0}
              onChange={(e) => updateStock(i, e.target.value)}
              className="w-24 text-sm h-9"
            />
            <button
              type="button"
              onClick={() => removeSize(i)}
              className="text-red-400 hover:text-red-600 transition-colors p-1 rounded"
              title="Remove this size"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Basic fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isVariantMode, setIsVariantMode] = useState(false);

  // Simple-mode sizes (dynamic rows)
  const [simpleSizes, setSimpleSizes] = useState<SizeRow[]>([
    { label: 'S', stock: 0 },
    { label: 'M', stock: 0 },
    { label: 'L', stock: 0 },
  ]);

  // Variant-mode rows
  const [variants, setVariants] = useState<VariantRow[]>([]);

  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        if (res.data.success) setCurrentUserId(res.data.user.id);
      } catch {
        const storedId = localStorage.getItem('userId');
        if (storedId) setCurrentUserId(storedId);
      }
    };
    fetchUser();
  }, []);

  // ── Cloudinary ──────────────────────────────────────────────────────────────

  const uploadToCloudinary = async (file: File): Promise<string> => {
    if (!currentUserId) throw new Error('User ID not found');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', `hypechart_stores/${currentUserId}`);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.secure_url) return data.secure_url;
    throw new Error(data.error?.message || 'Upload failed');
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingMain(true);
    try {
      const url = await uploadToCloudinary(files[0]);
      setImages((prev) => [...prev, url]);
      toast.success('Main image uploaded');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploadingMain(false);
      if (mainFileInputRef.current) mainFileInputRef.current.value = '';
    }
  };

  const triggerVariantImageUpload = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setUploadingVariantIndex(index);
      try {
        const url = await uploadToCloudinary(files[0]);
        setVariants((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], imageUrl: url };
          return next;
        });
        toast.success('Variant image uploaded');
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setUploadingVariantIndex(null);
      }
    };
    input.click();
  };

  // ── Variant helpers ─────────────────────────────────────────────────────────

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        name: '',
        sizes: [
          { label: 'S', stock: 0 },
          { label: 'M', stock: 0 },
          { label: 'L', stock: 0 },
        ],
        imageUrl: null,
      },
    ]);
  };

  const removeVariant = (i: number) => {
    setVariants((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateVariantName = (i: number, value: string) => {
    setVariants((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], name: value };
      return next;
    });
  };

  const updateVariantSizes = (i: number, sizes: SizeRow[]) => {
    setVariants((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], sizes };
      return next;
    });
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error('Product name is required');
    if (!basePrice || parseFloat(basePrice) < 0) return toast.error('Valid base price is required');

    if (isVariantMode) {
      if (variants.length === 0) return toast.error('Please add at least one variant');
      for (const v of variants) {
        if (!v.name.trim()) return toast.error('All variant names are required');
        for (const sz of v.sizes) {
          if (!sz.label.trim()) return toast.error(`All size labels must be filled in for variant "${v.name}"`);
        }
      }
    } else {
      for (const sz of simpleSizes) {
        if (!sz.label.trim()) return toast.error('All size labels must be filled in');
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        basePrice: parseFloat(basePrice),
        images,
        isVariantMode,
        // Simple mode: send dynamic sizes array
        customSizes: isVariantMode ? undefined : simpleSizes,
        // Variant mode: each variant carries its own dynamic sizes
        variants: isVariantMode
          ? variants.map((v) => ({
              name: v.name,
              imageUrl: v.imageUrl,
              customSizes: v.sizes,
            }))
          : [],
      };

      await apiClient.post('/products', payload);
      toast.success('Product created successfully');
      router.push('/products');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create product';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Product Details ── */}
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
          </CardContent>
        </Card>

        {/* ── Pricing & Simple Inventory ── */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing &amp; Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Master Base Price (₹)</Label>
              <Input
                type="number"
                placeholder="1499"
                className="border-gray-400 font-semibold max-w-xs"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                min={0}
                required
              />
            </div>

            {!isVariantMode && (
              <div className="border-t pt-4">
                <SizeEditor sizes={simpleSizes} onChange={setSimpleSizes} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Images ── */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              ref={mainFileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleMainImageUpload}
            />

            <Button
              type="button"
              onClick={() => mainFileInputRef.current?.click()}
              variant="secondary"
              disabled={isUploadingMain || !currentUserId}
              className="w-full h-24 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col gap-2"
            >
              {isUploadingMain ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="text-xs text-gray-500">Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {currentUserId ? 'Click to Upload Image' : 'Loading User...'}
                  </span>
                </>
              )}
            </Button>

            <div className="grid grid-cols-4 gap-4 mt-4">
              {images.map((url, index) => (
                <div
                  key={index}
                  className="relative group border rounded-lg overflow-hidden aspect-square flex items-center justify-center p-2 bg-gray-50"
                >
                  <img src={url} alt={`Product ${index + 1}`} className="object-contain w-full h-full" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Variant Mode Toggle ── */}
        <div className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <label className="flex items-center gap-3 cursor-pointer w-full">
            <input
              type="checkbox"
              className="w-5 h-5 accent-black rounded border-gray-300 focus:ring-black"
              checked={isVariantMode}
              onChange={(e) => setIsVariantMode(e.target.checked)}
            />
            <div className="flex flex-col">
              <span className="font-medium text-gray-900">This product has multiple options</span>
              <span className="text-sm text-gray-500">
                Enable this if your product comes in different colors, materials, or styles — each with their own sizes.
              </span>
            </div>
          </label>
        </div>

        {/* ── Variant Cards ── */}
        {isVariantMode && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Variants</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="mr-2 h-4 w-4" /> Add Variant
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {variants.length === 0 && (
                <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg">
                  No variants added. Click "Add Variant" to create options.
                </div>
              )}

              {variants.map((variant, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4 bg-white relative">
                  {/* Remove variant */}
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                    title="Remove variant"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-10">
                    {/* Variant name */}
                    <div className="space-y-2">
                      <Label>Variant Name</Label>
                      <Input
                        placeholder="e.g. Neon Green, Navy Blue"
                        value={variant.name}
                        onChange={(e) => updateVariantName(index, e.target.value)}
                      />
                    </div>

                    {/* Variant image */}
                    <div className="space-y-2">
                      <Label>Variant Image</Label>
                      <div className="flex items-center gap-3">
                        {variant.imageUrl ? (
                          <div className="relative group w-20 h-20 border rounded-lg flex items-center justify-center p-1 bg-gray-50 overflow-hidden">
                            <img src={variant.imageUrl} alt="Variant" className="object-contain w-full h-full" />
                            <button
                              type="button"
                              onClick={() =>
                                setVariants((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], imageUrl: null };
                                  return next;
                                })
                              }
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-20 w-32 border-dashed flex flex-col justify-center gap-1 bg-gray-50 hover:bg-gray-100"
                            disabled={uploadingVariantIndex === index || !currentUserId}
                            onClick={() => triggerVariantImageUpload(index)}
                          >
                            {uploadingVariantIndex === index ? (
                              <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                            ) : (
                              <UploadCloud className="h-5 w-5 mx-auto text-gray-400" />
                            )}
                            <span className="text-xs text-gray-500">Upload Image</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic sizes for this variant */}
                  <div className="border-t pt-3">
                    <SizeEditor
                      sizes={variant.sizes}
                      onChange={(sizes) => updateVariantSizes(index, sizes)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Actions ── */}
        <div className="flex justify-end gap-4 pb-10">
          <Link href="/products">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Product
          </Button>
        </div>
      </form>
    </div>
  );
}