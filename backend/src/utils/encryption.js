import crypto from 'crypto';

const DEFAULT_SECRET = process.env.JWT_SECRET || 'chidambaranar_ai_sentinel_super_secret_2026';
const KEY = crypto.createHash('sha256').update(process.env.MESSAGE_ENCRYPTION_KEY || DEFAULT_SECRET).digest();

export function encryptText(plainText) {
    if (!plainText || typeof plainText !== 'string') return 'enc:';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:${Buffer.concat([iv, tag, encrypted]).toString('base64')}`;
}

export function decryptText(encodedText) {
    if (!encodedText || typeof encodedText !== 'string' || !encodedText.startsWith('enc:')) {
        return encodedText || '';
    }

    try {
        const payload = Buffer.from(encodedText.slice(4), 'base64');
        if (payload.length < 28) return '';

        const iv = payload.subarray(0, 12);
        const tag = payload.subarray(12, 28);
        const encrypted = payload.subarray(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
        decipher.setAuthTag(tag);
        const value = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return value.toString('utf8');
    } catch (error) {
        console.error('Message decryption failed.', error);
        return '[encrypted message unavailable]';
    }
}
