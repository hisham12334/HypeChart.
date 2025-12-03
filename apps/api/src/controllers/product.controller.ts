import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { z } from 'zod';

const productService = new ProductService();

// Validation Schema
const createProductSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  images: z.array(z.string()).optional(),
  productDropDate: z.string().optional(), // ISO Date string
  variants: z.array(z.object({
    name: z.string(),
    inventoryCount: z.number().int().min(0),
    priceAdjustment: z.number().optional()
  })).min(1, "At least one variant is required")
});

export class ProductController {
  
  // POST /api/products
  async create(req: Request, res: Response) {
    try {
      // 1. Validate Input
      const validatedData = createProductSchema.parse(req.body);
      
      // 2. Get User ID from Auth Middleware (we will fix the type later)
      const userId = (req as any).user?.userId;

      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // 3. Call Service
      const product = await productService.createProduct(userId, validatedData);
      
      res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || error });
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