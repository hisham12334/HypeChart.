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
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const CLOUD_NAME = "dfnvjyu59";
const UPLOAD_PRESET = "Hypechart";

const sizeStockSchema = z.object({
  S: z.coerce.number().int().min(0, "Inventory must be 0 or greater").default(0),
  M: z.coerce.number().int().min(0, "Inventory must be 0 or greater").default(0),
  L: z.coerce.number().int().min(0, "Inventory must be 0 or greater").default(0)
});

const formSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  description: z.string().optional(),
  basePrice: z.coerce.number().min(0, "Base price must be 0 or greater"),
  sizes: sizeStockSchema.optional(),
  images: z.array(z.string()),
  isVariantMode: z.boolean(),
  variants: z.array(
    z.object({
      name: z.string().min(1, "Variant name is required"),
      sizes: sizeStockSchema,
      imageUrl: z.string().optional().nullable()
    })
  )
});

type FormValues = z.infer<typeof formSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);

  const mainFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        if (res.data.success) {
          setCurrentUserId(res.data.user.id);
        }
      } catch (error) {
        const storedId = localStorage.getItem('userId');
        if (storedId) setCurrentUserId(storedId);
      }
    };
    fetchUser();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: '',
      description: '',
      basePrice: 0,
      sizes: { S: 0, M: 0, L: 0 },
      images: [],
      isVariantMode: false,
      variants: []
    }
  });

  const { control, handleSubmit, watch, setValue, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants"
  });

  const isVariantMode = watch("isVariantMode");
  const currentImages = watch("images");

  // Reusable Cloudinary Upload Handler
  const uploadToCloudinary = async (file: File): Promise<string> => {
    if (!currentUserId) throw new Error("User ID not found");
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
      setValue("images", [...currentImages, url]);
      toast.success('Main image uploaded');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploadingMain(false);
      if (mainFileInputRef.current) mainFileInputRef.current.value = '';
    }
  };

  const removeMainImage = (index: number) => {
    setValue("images", currentImages.filter((_, i) => i !== index));
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
        setValue(`variants.${index}.imageUrl`, url);
        toast.success(`Variant image uploaded`);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setUploadingVariantIndex(null);
      }
    };
    input.click();
  };

  const onSubmit = async (data: FormValues | any) => {
    // Ensure images are explicitly grabbed in case RHF drops unregistered fields
    data.images = form.getValues("images") || [];
    data.variants = form.getValues("variants") || [];

    if (data.isVariantMode && data.variants.length === 0) {
      toast.error("Please add at least one variant");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/products', data);
      toast.success('Product created successfully');
      router.push('/products');
    } catch (error: any) {
      console.error('Product creation error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create product';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                placeholder="e.g. Vintage Heavyweight Tee"
                {...form.register("name")}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Product description..."
                {...form.register("description")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="font-bold">Master Base Price (₹)</Label>
                <Input
                  type="number"
                  placeholder="1499"
                  className="border-gray-400 font-semibold"
                  {...form.register("basePrice")}
                />
                {errors.basePrice && <p className="text-sm text-red-500">{errors.basePrice.message}</p>}
              </div>

              {!isVariantMode && (
                <div className="md:col-span-3 grid grid-cols-3 gap-4 border-l pl-6 border-gray-200">
                  <div className="space-y-2">
                    <Label className="text-gray-600">Size S Stock</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      {...form.register("sizes.S")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">Size M Stock</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      {...form.register("sizes.M")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">Size L Stock</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      {...form.register("sizes.L")}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                    {currentUserId ? "Click to Upload Image" : "Loading User..."}
                  </span>
                </>
              )}
            </Button>

            <div className="grid grid-cols-4 gap-4 mt-4">
              {currentImages.map((url, index) => (
                <div key={index} className="relative group border rounded-lg overflow-hidden aspect-square flex items-center justify-center p-2 bg-gray-50">
                  <img src={url} alt={`Product ${index + 1}`} className="object-contain w-full h-full" />
                  <button
                    type="button"
                    onClick={() => removeMainImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <label className="flex items-center gap-3 cursor-pointer w-full">
            <input
              type="checkbox"
              className="w-5 h-5 accent-black rounded border-gray-300 focus:ring-black"
              {...form.register("isVariantMode")}
            />
            <div className="flex flex-col">
              <span className="font-medium text-gray-900">This product has multiple options</span>
              <span className="text-sm text-gray-500">Enable this if your product comes in different sizes, colors, or materials.</span>
            </div>
          </label>
        </div>

        {isVariantMode && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Variants</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', sizes: { S: 0, M: 0, L: 0 }, imageUrl: null })}>
                <Plus className="mr-2 h-4 w-4" /> Add Variant
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => {
                const variantImageUrl = watch(`variants.${index}.imageUrl`);
                return (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-white relative">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                      title="Remove variant"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-10">
                      <div className="space-y-2">
                        <Label>Variant Name</Label>
                        <Input
                          placeholder="e.g. Neon Green - Size L"
                          {...form.register(`variants.${index}.name` as const)}
                        />
                        {errors.variants?.[index]?.name && (
                          <p className="text-sm text-red-500">{errors.variants[index]?.name?.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-600">Size S Stock</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            {...form.register(`variants.${index}.sizes.S` as const)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-600">Size M Stock</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            {...form.register(`variants.${index}.sizes.M` as const)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-600">Size L Stock</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            {...form.register(`variants.${index}.sizes.L` as const)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Variant Image Upload</Label>
                      <div className="flex items-center gap-4">
                        {variantImageUrl ? (
                          <div className="relative group w-20 h-20 border rounded-lg flex items-center justify-center p-1 bg-gray-50 overflow-hidden">
                            <img src={variantImageUrl} alt="Variant" className="object-contain w-full h-full" />
                            <button
                              type="button"
                              onClick={() => setValue(`variants.${index}.imageUrl`, null)}
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
                );
              })}
              {fields.length === 0 && (
                <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg">
                  No variants added. Click "Add Variant" to create options.
                </div>
              )}
            </CardContent>
          </Card>
        )}

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