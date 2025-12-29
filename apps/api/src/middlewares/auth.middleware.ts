import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'; // Must match what you used in auth.controller

// Extend Express Request type to include 'user'
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    // 1. Get the auth header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'Authorization token required' });
    }

    // 2. Extract the token (Format is usually "Bearer <token>")
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Invalid token format' });
    }

    try {
        // 3. Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);

        // 4. Attach user info to request object so controllers can use it
        (req as any).user = decoded;

        // 5. Allow request to proceed
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
};