import { PrismaClient } from '@brand-order-system/database';
import { deleteImageFromCloudinary } from '../lib/cloudinary';

const prisma = new PrismaClient();

export class ProductService {

  // Helper: Create URL-friendly slug (e.g., "Cool T-Shirt" -> "cool-t-shirt")
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') +   // Trim hyphens
      '-' + Math.random().toString(36).substring(2, 7); // Add random suffix for uniqueness
  }

  // 1. Create Product
  async createProduct(userId: string, data: any) {
    const slug = this.generateSlug(data.name);

    return prisma.product.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        images: data.images || [], // Array of URLs
        checkoutSlug: slug,
        productDropDate: data.productDropDate ? new Date(data.productDropDate) : null,
        variants: {
          create: data.variants.map((v: any) => ({
            name: v.name,
            inventoryCount: v.inventoryCount,
            priceAdjustment: v.priceAdjustment || 0
          }))
        }
      },
      include: {
        variants: true
      }
    });
  }

  // 2. Get All Products (for Admin)
  async getProducts(userId: string) {
    return prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { variants: true }
    });
  }

  // 3. Get Single Product (for Checkout)
  async getProductBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { checkoutSlug: slug },
      include: { variants: true, user: { select: { brandName: true } } }
    });
  }

  // 4. Get Single Product by ID (for Admin Edit)
  async getProductById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { variants: true }
    });
  }

  // Add this inside ProductService class
  async updateProduct(userId: string, productId: string, data: any) {
    // 1. Check ownership
    const existing = await prisma.product.findFirst({
      where: { id: productId, userId }
    });

    if (!existing) throw new Error("Product not found or unauthorized");

    // 2. Update Basic Info
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        description: data.description,
        basePrice: parseFloat(data.basePrice),
        images: data.images, // Array of strings
      }
    });

    // 3. Update Variants (Inventory & Names)
    // We loop through the variants sent from frontend
    if (data.variants && data.variants.length > 0) {
      for (const variant of data.variants) {
        if (variant.id) {
          // Update existing variant
          await prisma.variant.update({
            where: { id: variant.id },
            data: {
              name: variant.name,
              inventoryCount: parseInt(variant.inventoryCount),
              reservedCount: 0 // Reset reserved if needed, or keep logic simple
            }
          });
        } else {
          // Create new variant if it was added during edit
          await prisma.variant.create({
            data: {
              productId: productId,
              name: variant.name,
              inventoryCount: parseInt(variant.inventoryCount),
              reservedCount: 0
            }
          });
        }
      }
    }

    return updatedProduct;
  }


  // Add this method to the class
  async deleteProduct(userId: string, productId: string) {
    // 1. Find the product first to get the image URLs
    const product = await prisma.product.findFirst({
      where: { id: productId, userId }
    });

    if (!product) throw new Error("Product not found or unauthorized");

    // 2. Delete Images from Cloudinary (Clean up resources)
    const images = product.images as unknown as string[];
    if (Array.isArray(images) && images.length > 0) {
      // We use Promise.all to delete them in parallel (faster)
      await Promise.all(
        images.map(url => deleteImageFromCloudinary(url))
      );
    }

    // 3. Delete from Database (The existing logic)
    await prisma.product.delete({
      where: { id: productId }
    });

    return true;
  }
}