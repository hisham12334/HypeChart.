'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Package, Image as ImageIcon, Link as LinkIcon, Check, Trash2, Edit } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const CHECKOUT_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data.data);
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product? This cannot be undone.")) return;

    try {
      await apiClient.delete(`/products/${id}`);
      toast.success("Product deleted");
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product");
    }
  };

  const copyLink = (slug: string, id: string) => {
    const url = `${CHECKOUT_URL}/p/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <Link href="/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No products found. Create your first one!</p>
            </div>
          ) : (
            <>
              {/* --- DESKTOP TABLE VIEW --- */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.images && product.images.length > 0 ? (
                            <img src={product.images[0]} alt={product.name} className="h-10 w-10 rounded-md object-cover border bg-gray-50" />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center border text-gray-400">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>₹{product.basePrice}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => copyLink(product.checkoutSlug, product.id)}>
                            {copiedId === product.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <LinkIcon className="h-3.5 w-3.5 text-gray-500" />}
                            {copiedId === product.id ? "Copied" : "Copy"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{product.variants.length} Sizes</span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">Active</span>
                        </TableCell>

                        {/* --- ACTIONS COLUMN --- */}
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-2">

                            {/* 1. EDIT: Using Direct Link (No Button Component) */}
                            <Link
                              href={`/products/${product.id}`}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-blue-50 text-blue-500 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>

                            {/* 2. DELETE: Using Button Component */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => deleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* --- MOBILE CARD VIEW --- */}
              <div className="md:hidden space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="shrink-0">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="h-20 w-20 rounded-lg object-cover border bg-gray-50" />
                        ) : (
                          <div className="h-20 w-20 rounded-lg bg-gray-100 flex items-center justify-center border text-gray-400">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-gray-900 truncate pr-2">{product.name}</h3>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-800">Active</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">₹{product.basePrice}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{product.variants.length} Variants</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="grid grid-cols-4 gap-2 border-t pt-3">
                      <Button variant="outline" size="sm" className="col-span-2 h-9 text-xs" onClick={() => copyLink(product.checkoutSlug, product.id)}>
                        {copiedId === product.id ? <Check className="h-3.5 w-3.5 mr-2 text-green-600" /> : <LinkIcon className="h-3.5 w-3.5 mr-2 text-gray-500" />}
                        {copiedId === product.id ? "Copied" : "Copy Link"}
                      </Button>
                      <Link href={`/products/${product.id}`} className="col-span-1">
                        <Button variant="outline" size="sm" className="w-full h-9 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" className="col-span-1 h-9 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => deleteProduct(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}