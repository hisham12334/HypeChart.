import { logger } from '../utils/logger';

export interface WhatsAppSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Format a customer phone number to E.164 format for WhatsApp API
 * Handles Indian numbers (adds 91 prefix if needed)
 */
export function formatPhoneForWhatsApp(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Remove leading 0 (Indian landlines/mobile)
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    // If it looks like a 10-digit Indian number, add country code
    if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }

    return cleaned;
}

/**
 * Maps an order status to its WhatsApp template name and ordered body parameters.
 * Parameters must match the {{1}}, {{2}}, {{3}} placeholders in Meta Business Manager.
 *
 * Template bodies (create these in Meta Business Manager as UTILITY templates):
 *   order_placed   → "Hi {{1}}! 🎉 Your order #{{2}} from {{3}} has been placed. Payment received — we'll keep you updated!"
 *   order_confirmed → "Hi {{1}}! ✅ Your order #{{2}} from {{3}} has been confirmed. We'll notify you once it's shipped!"
 *   order_shipped   → "Hi {{1}}! 🚚 Your order #{{2}} from {{3}} has been shipped. We'll notify you when it arrives!"
 *   order_delivered → "Hi {{1}}! 🎉 Your order #{{2}} from {{3}} has been delivered. We hope you love it. Thank you!"
 */
export function getOrderTemplate(
    status: string,
    customerName: string,
    orderNumber: string,
    brandName: string
): { templateName: string; parameters: string[] } | null {
    const params = [customerName, orderNumber, brandName];

    switch (status) {
        case 'order_placed':
            return { templateName: 'order_placed', parameters: params };
        case 'confirmed':
            return { templateName: 'order_confirmed', parameters: params };
        case 'shipped':
            return { templateName: 'order_shipped', parameters: params };
        case 'delivered':
            return { templateName: 'order_delivered', parameters: params };
        default:
            logger.warn('No WhatsApp template mapped for status', { status });
            return null;
    }
}

// Error codes from Meta that mean the template isn't usable (missing or not yet approved)
const TEMPLATE_NOT_USABLE_CODES = new Set([
    132001, // Template name does not exist in the translation
    132000, // Template does not exist / not approved
    132007, // Template paused
]);

/**
 * Low-level helper — calls the Meta Cloud API with a single template.
 * Returns the raw result including the Meta error code.
 */
async function callWhatsAppAPI(
    phoneNumberId: string,
    accessToken: string,
    formattedPhone: string,
    templateName: string,
    parameters: string[]
): Promise<WhatsAppSendResult & { errorCode?: number }> {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const body = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
            name: templateName,
            language: { code: 'en' },
            components: parameters.length > 0
                ? [{ type: 'body', parameters: parameters.map((text) => ({ type: 'text', text })) }]
                : [],
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
    });

    const data = await response.json() as any;

    if (!response.ok) {
        const errMsg = data?.error?.message || 'Unknown WhatsApp API error';
        const errCode = data?.error?.code as number | undefined;
        return { success: false, error: `[${errCode}] ${errMsg}`, errorCode: errCode };
    }

    const messageId = data?.messages?.[0]?.id;
    return { success: true, messageId };
}

/**
 * Send a WhatsApp template message via the Meta Cloud API.
 *
 * Primary path: uses the custom UTILITY template (order_placed, order_confirmed, etc.)
 * Fallback path: if the template doesn't exist or isn't approved yet (errors 132001/132000),
 *   automatically falls back to the pre-approved "hello_world" template so the customer
 *   still receives a notification during the Meta review period.
 */
export async function sendWhatsAppMessage(
    phoneNumberId: string,
    accessToken: string,
    toPhone: string,
    templateName: string,
    parameters: string[]
): Promise<WhatsAppSendResult> {
    const formattedPhone = formatPhoneForWhatsApp(toPhone);

    try {
        logger.info('Sending WhatsApp template message', {
            phoneNumberId,
            toPhone: formattedPhone,
            templateName,
        });

        // --- Primary attempt ---
        const primary = await callWhatsAppAPI(
            phoneNumberId, accessToken, formattedPhone, templateName, parameters
        );

        if (primary.success) {
            logger.info('WhatsApp template message sent successfully', {
                messageId: primary.messageId,
                toPhone: formattedPhone,
                templateName,
            });
            return { success: true, messageId: primary.messageId };
        }

        // --- Fallback: template missing / not yet approved ---
        if (primary.errorCode !== undefined && TEMPLATE_NOT_USABLE_CODES.has(primary.errorCode)) {
            logger.warn('Primary template not usable — falling back to hello_world', {
                templateName,
                errorCode: primary.errorCode,
                toPhone: formattedPhone,
            });

            // hello_world is pre-approved on every WA Business account, no parameters needed
            const fallback = await callWhatsAppAPI(
                phoneNumberId, accessToken, formattedPhone, 'hello_world', []
            );

            if (fallback.success) {
                logger.info('Fallback hello_world message sent', {
                    messageId: fallback.messageId,
                    toPhone: formattedPhone,
                });
                return { success: true, messageId: fallback.messageId };
            }

            logger.error('Fallback hello_world also failed', {
                error: fallback.error,
                toPhone: formattedPhone,
            });
            return { success: false, error: `Primary: ${primary.error} | Fallback: ${fallback.error}` };
        }

        // Any other API error (bad token, rate limit, etc.) — return as-is
        logger.error('WhatsApp API error (non-template issue)', {
            error: primary.error,
            errorCode: primary.errorCode,
            toPhone: formattedPhone,
        });
        return { success: false, error: primary.error };

    } catch (error: any) {
        logger.error('Failed to send WhatsApp message', { error: error.message });
        return { success: false, error: error.message };
    }
}

// Send interactive confirmation request to brand when customer submits UTR
export async function sendWhatsAppInteractiveConfirmation(
  phoneNumberId: string,
  accessToken: string,
  toBrandPhone: string,
  orderNumber: string,
  customerName: string,
  amount: number,
  utr: string
): Promise<WhatsAppSendResult> {
  const formattedPhone = formatPhoneForWhatsApp(toBrandPhone);
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: `🛍️ New Order ${orderNumber}\n👤 ${customerName}\n💰 ₹${amount}\n🔖 UTR: ${utr}\n\nCheck your bank app and confirm payment:`
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: '1', title: '✅ Received' } },
          { type: 'reply', reply: { id: '2', title: '❌ Not Received' } }
        ]
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errMsg = data?.error?.message || 'Unknown error';
      logger.error('Failed to send WA interactive confirmation', { orderNumber, error: errMsg });
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err: any) {
    logger.error('WA interactive confirmation exception', { orderNumber, error: err.message });
    return { success: false, error: err.message };
  }
}
