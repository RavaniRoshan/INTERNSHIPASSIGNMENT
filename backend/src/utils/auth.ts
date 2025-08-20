import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWTPayload } from '../types';

// JWT configuration
const JWT_SECRET: string = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d',
        issuer: 'creator-portfolio-hub',
        audience: 'creator-portfolio-hub-users'
    });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'creator-portfolio-hub',
            audience: 'creator-portfolio-hub-users'
        }) as JWTPayload;

        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token has expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        } else {
            throw new Error('Token verification failed');
        }
    }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}

/**
 * Generate a refresh token (longer expiry)
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '30d', // Refresh tokens last longer
        issuer: 'creator-portfolio-hub',
        audience: 'creator-portfolio-hub-refresh'
    });
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'creator-portfolio-hub',
            audience: 'creator-portfolio-hub-refresh'
        }) as JWTPayload;

        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Refresh token has expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid refresh token');
        } else {
            throw new Error('Refresh token verification failed');
        }
    }
}