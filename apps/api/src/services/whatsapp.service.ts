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
 *   order_placed   -> "Hi {{1}}! Your order #{{2}} from {{3}} has been placed."
 *   order_confirmed -> "Hi {{1}}! Your order #{{2}} from {{3}} has been confirmed."
 *   order_shipped   -> "Hi {{1}}! Your order #{{2}} from {{3}} has been shipped."
 *   order_delivered -> "Hi {{1}}! Your order #{{2}} from {{3}} has been delivered."
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
 * Low-level helper - calls the Meta Cloud API with a single template.
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

        if (primary.errorCode !== undefined && TEMPLATE_NOT_USABLE_CODES.has(primary.errorCode)) {
            logger.warn('Primary template not usable - falling back to hello_world', {
                templateName,
                errorCode: primary.errorCode,
                toPhone: formattedPhone,
            });

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

    // Use a standard template message - interactive outbound is blocked by Meta
    // for business-initiated conversations outside 24hr window.
    // Brand reads the message and replies "1" to confirm or "2" to dispute.
    const body = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
            name: 'upi_payment_confirmation',
            language: { code: 'en' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: orderNumber },
                        { type: 'text', text: customerName },
                        { type: 'text', text: `₹${amount}` },
                        { type: 'text', text: utr }
                    ]
                }
            ]
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
            const errCode = data?.error?.code;
            if (errCode === 132001 || errCode === 132000 || errCode === 132007) {
                logger.warn('upi_payment_confirmation template not approved, falling back to hello_world', { orderNumber });

                const fallbackBody = {
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'template',
                    template: {
                        name: 'hello_world',
                        language: { code: 'en_US' },
                        components: []
                    }
                };

                const fallbackRes = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`
                    },
                    body: JSON.stringify(fallbackBody)
                });

                const fallbackData = await fallbackRes.json() as any;
                if (!fallbackRes.ok) {
                    return { success: false, error: fallbackData?.error?.message };
                }
                return { success: true, messageId: fallbackData?.messages?.[0]?.id };
            }

            return { success: false, error: data?.error?.message || 'Unknown error' };
        }

        return { success: true, messageId: data?.messages?.[0]?.id };
    } catch (err: any) {
        logger.error('WA confirmation send failed', { orderNumber, error: err.message });
        return { success: false, error: err.message };
    }
}
