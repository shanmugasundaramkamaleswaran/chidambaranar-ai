/**
 * RBAC Role constants — must match backend exactly.
 */
export const ROLES = {
    USER: 'USER',
    PSYCHOLOGIST: 'PSYCHOLOGIST',
    ORGANIZATION_OFFICER: 'ORGANIZATION_OFFICER',
} as const;

export type RBACRole = typeof ROLES[keyof typeof ROLES];

/**
 * Authenticated session stored in localStorage.
 */
export interface AuthSession {
    token: string;
    user: AuthUser;
    organization: AuthOrganization;
    role: RBACRole;
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;        // legacy DB role
    rbacRole: RBACRole;  // enforced RBAC role
    orgId: string;
    title: string;
    avatar?: string | null;
    specialty?: string;
    licenseNumber?: string;
    availabilityStatus?: string;
    baseline?: unknown;
    deptId?: string | null;
}

export interface AuthOrganization {
    id: string;
    name: string;
    code: string;
    type: string;
    employeeCount: number;
}

const SESSION_KEY = 'chidambaranar_auth_session';

/**
 * Save auth session to localStorage.
 */
export function saveSession(session: AuthSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Load auth session from localStorage (returns null if not found/invalid).
 */
export function loadSession(): AuthSession | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AuthSession;
    } catch {
        return null;
    }
}

/**
 * Clear auth session (logout).
 */
export function clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
}

/**
 * Get the Authorization header value from the stored token.
 */
export function getAuthHeader(): Record<string, string> {
    const session = loadSession();
    if (!session?.token) return {};
    return { Authorization: `Bearer ${session.token}` };
}

/**
 * Verify current token with backend and return fresh user data.
 * Returns null if token is invalid/expired.
 */
export async function verifySession(): Promise<{ user: AuthUser; organization: AuthOrganization } | null> {
    const session = loadSession();
    if (!session?.token) return null;
    try {
        const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        });
        if (!res.ok) {
            clearSession();
            return null;
        }
        const data = await res.json();
        if (data.success && data.user) {
            return { user: data.user, organization: data.organization };
        }
        clearSession();
        return null;
    } catch {
        return null;
    }
}
