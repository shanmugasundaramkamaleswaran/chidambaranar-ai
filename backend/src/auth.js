import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'chidambaranar_ai_sentinel_super_secret_2026';
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
        req.user = decoded; // { id, role, orgId, email }
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
