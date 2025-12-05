'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Package, Image as ImageIcon, Link as LinkIcon, Copy, Check } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

  const copyLink = (slug: string, id: string) => {
    const url = `${CHECKOUT_URL}/p/${slug}`;
    navigator.clipboard.writeText(url);
    
    // Show success feedback
    setCopiedId(id);
    toast.success("Checkout link copied to clipboard!");
    
    // Reset icon after 2 seconds
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Status</TableHead>
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
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {product.description || "No description"}
                      </div>
                    </TableCell>
                    <TableCell>₹{product.basePrice}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => copyLink(product.checkoutSlug, product.id)}>
                        {copiedId === product.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <LinkIcon className="h-3.5 w-3.5 text-gray-500" />}
                        {copiedId === product.id ? "Copied" : "Copy Link"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{product.variants.length} Sizes</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">Active</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}