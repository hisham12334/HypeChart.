import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { z } from 'zod';

const productService = new ProductService();

// Validation Schema
const createProductSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  description: z.string().optional(),
  basePrice: z.number().positive("Base price must be positive"),
  images: z.array(z.string().url("Invalid image URL")).optional().default([]),
  productDropDate: z.string().optional(), // ISO Date string
  variants: z.array(z.object({
    name: z.string().min(1, "Variant name is required"),
    inventoryCount: z.number().int().min(0, "Inventory count must be 0 or greater"),
    priceAdjustment: z.number().optional().default(0)
  })).min(1, "At least one variant is required")
});

export class ProductController {
  
  // POST /api/products
  async create(req: Request, res: Response) {
    try {
      console.log('Received product creation request:', JSON.stringify(req.body, null, 2));
      
      // 1. Validate Input
      const validatedData = createProductSchema.parse(req.body);
      
      // 2. Get User ID from Auth Middleware (we will fix the type later)
      const userId = (req as any).user?.userId;
      console.log('User ID from token:', userId);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized - No user ID in token" });
      }

      // 3. Call Service
      const product = await productService.createProduct(userId, validatedData);
      
      res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      console.error('Product creation error:', error);
      
      // Better error handling for Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          error: 'Validation failed',
          details: error.errors 
        });
      }
      
      // Handle Prisma foreign key constraint errors
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          success: false, 
          error: 'User not found. Please log in again.',
          details: 'The user associated with this token does not exist in the database.'
        });
      }
      
      res.status(400).json({ success: false, error: error.message || 'Failed to create product' });
    }
  }

  // GET /api/products
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const products = await productService.getProducts(userId);
      res.json({ success: true, data: products });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}