import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { getDb } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}
const JWT_EXPIRES_IN = '12h';

/**
 * Sign a JWT for a given user.
 */
export function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Middleware: verifies Bearer JWT and injects req.user.
 * Returns 401 on missing/invalid token.
 */
export function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
    }
    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const currentUser = getDb().users.find(user => user.id === decoded.id);
        if (!currentUser) return res.status(401).json({ success: false, error: 'Account is no longer active.' });
        const currentRole = currentUser.rbacRole || (
            currentUser.role === 'doctor' ? 'PSYCHOLOGIST' :
                currentUser.role === 'company_admin' ? 'ORGANIZATION_OFFICER' : 'USER'
        );
        if (currentRole !== decoded.role || currentUser.orgId !== decoded.orgId) {
            return res.status(401).json({ success: false, error: 'Session is no longer valid. Please log in again.' });
        }
        req.user = { ...decoded, role: currentRole, orgId: currentUser.orgId };
        next();
    } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired session. Please log in again.' });
    }
}

/**
 * Higher-order middleware: restricts route to specified roles.
 * Usage: requireRole('ORGANIZATION_OFFICER') or requireRole(['USER', 'PSYCHOLOGIST'])
 */
export function requireRole(...allowedRoles) {
    const flat = allowedRoles.flat();
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated.' });
        }
        if (!flat.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access Denied. This resource requires one of: [${flat.join(', ')}]. Your role: ${req.user.role}.`
            });
        }
        next();
    };
}
