import { PrismaClient } from '@brand-order-system/database';
import {
  getOrderTemplate,
  sendWhatsAppInteractiveConfirmation,
  sendWhatsAppMessage,
} from './whatsapp.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function sendCustomerOrderConfirmedWhatsApp(order: {
  orderNumber: string;
  total: unknown;
  user: {
    brandName: string | null;
    whatsappEnabled: boolean;
    whatsappPhoneNumberId: string | null;
    whatsappToken: string | null;
  };
  customer: {
    name: string;
    phone: string;
  };
}) {
  const template = getOrderTemplate(
    'confirmed',
    order.customer.name,
    order.orderNumber,
    order.user.brandName || 'Store'
  );

  if (!template) {
    return;
  }

  if (
    !order.user.whatsappEnabled ||
    !order.user.whatsappPhoneNumberId ||
    !order.user.whatsappToken ||
    !order.customer.phone
  ) {
    return;
  }

  const waResult = await sendWhatsAppMessage(
    order.user.whatsappPhoneNumberId,
    order.user.whatsappToken,
    order.customer.phone,
    template.templateName,
    template.parameters
  );

  if (!waResult.success) {
    logger.error('Failed to send confirmed WhatsApp message to customer', {
      orderNumber: order.orderNumber,
      error: waResult.error,
    });
  }
}

// Generates the UPI intent URL and QR data for a given order
export function generateUpiIntentUrl(upiId: string, amount: number, orderId: string, brandName: string): string {
  const encoded = encodeURIComponent(`Hypechart Order ${orderId}`);
  return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(brandName)}&am=${amount.toFixed(2)}&tr=${orderId}&tn=${encoded}&cu=INR`;
}

// Creates a pending UPI order in DB and reserves inventory
export async function initiateUpiOrder(data: {
  brandId: string;
  items: { variantId: string; quantity: number }[];
  customerDetails: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  sessionId: string;
}) {
  const { brandId, items, customerDetails, sessionId } = data;

  // Fetch brand
  const brand = await prisma.user.findUnique({ where: { id: brandId } });
  if (!brand || !brand.upiId) {
    throw new Error('Brand not found or UPI not configured');
  }

  // Fetch variants and calculate total
  const variantIds = items.map(i => i.variantId);
  const variants = await prisma.variant.findMany({
    where: { id: { in: variantIds } },
    include: { product: true }
  });

  if (variants.length !== variantIds.length) {
    throw new Error('One or more items invalid');
  }

  let subtotal = 0;
  for (const item of items) {
    const v = variants.find(v => v.id === item.variantId);
    if (!v) throw new Error('Variant not found');
    const price = Number(v.price) > 0 ? Number(v.price) : Number(v.product.basePrice);
    subtotal += price * item.quantity;
  }

  const shippingFee = subtotal < 1000 ? 99 : 0;
  const total = subtotal + shippingFee;

  // Find or create customer
  let customer = await prisma.customer.findFirst({
    where: { userId: brandId, phone: customerDetails.phone }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        userId: brandId,
        name: customerDetails.name,
        phone: customerDetails.phone,
        email: customerDetails.email || null,
        totalSpent: 0,
        totalOrders: 0
      }
    });
  }

  // Create address
  const address = await prisma.address.create({
    data: {
      customerId: customer.id,
      addressLine1: customerDetails.address,
      city: customerDetails.city,
      state: customerDetails.state,
      pincode: customerDetails.pincode,
      isDefault: true
    }
  });

  // Create pending order
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: brandId,
      customerId: customer.id,
      addressId: address.id,
      razorpayOrderId: `upi_pending_${sessionId}`, // placeholder — no Razorpay involved
      subtotal,
      shippingFee,
      total,
      paymentStatus: 'upi_pending',
      status: 'processing',
      upiVerificationStatus: 'AWAITING',
      items: {
        create: items.map(item => {
          const v = variants.find(v => v.id === item.variantId)!;
          const price = Number(v.price) > 0 ? Number(v.price) : Number(v.product.basePrice);
          return {
            productId: v.productId,
            variantId: item.variantId,
            productName: v.product.name,
            variantName: v.name,
            price,
            quantity: item.quantity
          };
        })
      }
    }
  });

  // Generate UPI intent URL
  const upiUrl = generateUpiIntentUrl(brand.upiId, total, order.orderNumber, brand.brandName || 'Store');

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    total,
    upiUrl,
    upiId: brand.upiId,
    brandName: brand.brandName
  };
}

// Called when customer submits UTR after paying
export async function confirmUpiPayment(data: {
  orderId: string;
  utrNumber: string;
  customerPhone: string;
}) {
  const { orderId, utrNumber } = data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, customer: true, items: true }
  });

  if (!order) throw new Error('Order not found');
  if (order.paymentStatus !== 'upi_pending') throw new Error('Order not in pending state');

  // Save UTR against order
  await prisma.order.update({
    where: { id: orderId },
    data: {
      utrNumber,
      upiVerificationStatus: 'AWAITING'
    }
  });

  // Send WhatsApp interactive message to brand
  const brand = order.user;
  if (brand.whatsappEnabled && brand.whatsappPhoneNumberId && brand.whatsappToken && brand.ownerPhone) {
    try {
      await sendWhatsAppInteractiveConfirmation(
        brand.whatsappPhoneNumberId,
        brand.whatsappToken,
        brand.ownerPhone,
        order.orderNumber,
        order.customer.name,
        Number(order.total),
        utrNumber
      );
    } catch (err: any) {
      logger.error('Failed to send WA confirmation to brand', { orderId, error: err.message });
      // Never block order flow
    }
  } else if (brand.whatsappEnabled && !brand.ownerPhone) {
    logger.warn('Skipping UPI brand confirmation WhatsApp because ownerPhone is missing', {
      orderId,
      brandId: brand.id,
    });
  }

  return { success: true, orderNumber: order.orderNumber };
}

// Called by WhatsApp inbound webhook when brand replies
export async function handleBrandReply(orderNumber: string, confirmed: boolean) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { user: true, customer: true }
  });

  if (!order) throw new Error(`Order ${orderNumber} not found`);

  if (confirmed) {
    await prisma.order.update({
      where: { orderNumber },
      data: {
        paymentStatus: 'paid',
        status: 'confirmed',
        upiVerificationStatus: 'CONFIRMED',
        paidAt: new Date()
      }
    });

    // Update customer stats
    await prisma.customer.update({
      where: { id: order.customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: Number(order.total) },
        lastOrderAt: new Date()
      }
    });

    await sendCustomerOrderConfirmedWhatsApp(order);
    logger.info('UPI order confirmed by brand', { orderNumber });
  } else {
    await prisma.order.update({
      where: { orderNumber },
      data: {
        upiVerificationStatus: 'DISPUTED'
      }
    });
    logger.info('UPI order disputed by brand', { orderNumber });
  }

  return { success: true, confirmed };
}

// Admin manual confirm (fallback)
export async function manualConfirmUpiOrder(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      user: true,
      customer: true,
    }
  });

  if (!order) throw new Error('Order not found');

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'paid',
      status: 'confirmed',
      upiVerificationStatus: 'CONFIRMED',
      paidAt: new Date()
    }
  });

  await prisma.customer.update({
    where: { id: order.customerId },
    data: {
      totalOrders: { increment: 1 },
      totalSpent: { increment: Number(order.total) },
      lastOrderAt: new Date()
    }
  });

  await sendCustomerOrderConfirmedWhatsApp(order);
  return { success: true };
}
