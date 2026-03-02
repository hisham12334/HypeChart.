/**
 * AES-256-GCM encryption utility for storing sensitive values (e.g. razorpayKeySecret).
 *
 * Format:  ivHex:authTagHex:ciphertextHex
 * Key:     ENCRYPTION_KEY env var — must be a 64-char hex string (32 bytes).
 *          Generate with: openssl rand -hex 32
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
    const hex = process.env.ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error(
            'ENCRYPTION_KEY env var is missing or invalid. Must be a 64-char hex string (32 bytes). ' +
            'Generate with: openssl rand -hex 32'
        );
    }
    return Buffer.from(hex, 'hex');
}

/**
 * Encrypts a plaintext string.
 * Returns a colon-delimited string: ivHex:authTagHex:ciphertextHex
 */
export function encrypt(plaintext: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a string previously encrypted by `encrypt()`.
 * Input must be in the format: ivHex:authTagHex:ciphertextHex
 */
export function decrypt(encryptedText: string): string {
    const key = getKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
        throw new Error(
            'Invalid encrypted text format. Expected ivHex:authTagHex:ciphertextHex'
        );
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
}

/**
 * Returns true if the value looks like an encrypted string (ivHex:authTagHex:ciphertextHex).
 * Used to determine if a field has already been encrypted.
 */
export function isEncrypted(value: string): boolean {
    const parts = value.split(':');
    return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p));
}
