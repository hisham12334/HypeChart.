import { PrismaClient } from '@brand-order-system/database';

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
      include: { variants: true }
    });
  }
}