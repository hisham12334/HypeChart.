import { Request, Response, NextFunction } from 'express';
import { IdempotencyService } from '../services/idempotency.service';

const idempotencyService = new IdempotencyService();

/**
 * Middleware to handle idempotency for payment endpoints
 * Expects 'Idempotency-Key' header from client
 */
export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only apply to POST requests (mutations)
  if (req.method !== 'POST') {
    return next();
  }

  // Get idempotency key from header
  let idempotencyKey = req.headers['idempotency-key'] as string;

  // If no key provided, generate one from request body (less secure fallback)
  if (!idempotencyKey) {
    idempotencyKey = idempotencyService.generateKey({
      body: req.body,
      path: req.path,
      timestamp: Math.floor(Date.now() / 60000) // 1-minute window
    });
  }

  // Check if this request was already processed
  const result = await idempotencyService.checkIdempotency(idempotencyKey);

  if (!result.isNew) {
    // Return cached response
    return res.json(result.cachedResponse);
  }

  // Try to acquire processing lock
  const lockAcquired = await idempotencyService.acquireProcessingLock(idempotencyKey);

  if (!lockAcquired) {
    // Another request with same key is being processed
    return res.status(409).json({
      success: false,
      error: 'Request is already being processed. Please wait.'
    });
  }

  // Store idempotency key in request for later use
  (req as any).idempotencyKey = idempotencyKey;

  // Intercept response to cache it
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyService.storeResponse(idempotencyKey, data)
        .catch(err => console.error('Failed to store idempotency response:', err));
    }
    
    // Release processing lock
    idempotencyService.releaseProcessingLock(idempotencyKey)
      .catch(err => console.error('Failed to release processing lock:', err));

    return originalJson(data);
  };

  next();
}
