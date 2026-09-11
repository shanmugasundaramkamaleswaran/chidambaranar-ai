import React, { useState, useEffect } from 'react';
import { ROLES, RBACRole, AuthUser, AuthOrganization, loadSession, clearSession, verifySession } from './auth';
import { Navbar } from './components/Navbar';
import { PortalSelector, PortalLoginForm } from './components/AuthPortal';
import { UserDashboard } from './components/UserDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { CompanyDashboard } from './components/CompanyDashboard';
import { WearableArchitectureModal } from './components/WearableArchitectureModal';
import { AuditLogModal } from './components/AuditLogModal';
import { User, Organization } from './types';
import { Shield, AlertTriangle } from 'lucide-react';

// Convert AuthUser to legacy User type for existing dashboard components
function authUserToLegacyUser(authUser: AuthUser): User {
    return {
        id: authUser.id,
        orgId: authUser.orgId,
        deptId: authUser.deptId || null,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role as any,
        title: authUser.title,
        avatar: authUser.avatar || undefined,
        specialty: authUser.specialty,
        licenseNumber: authUser.licenseNumber,
        baseline: authUser.baseline as any,
    };
}

// Convert AuthOrganization to legacy Organization type
function authOrgToLegacy(authOrg: AuthOrganization): Organization {
    return {
        id: authOrg.id,
        name: authOrg.name,
        code: authOrg.code,
        type: authOrg.type,
        employeeCount: authOrg.employeeCount,
    };
}

type AppView = 'portal-select' | 'portal-login' | 'user-dashboard' | 'psychologist-dashboard' | 'org-dashboard' | 'access-denied';

export function App() {
    const [view, setView] = useState<AppView>('portal-select');
    const [selectedPortal, setSelectedPortal] = useState<RBACRole | null>(null);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [currentOrganization, setCurrentOrganization] = useState<AuthOrganization | null>(null);
    const [userRole, setUserRole] = useState<RBACRole | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [isWearablesModalOpen, setIsWearablesModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

    // On mount: restore session from localStorage and verify with backend
    useEffect(() => {
        const restoreSession = async () => {
            setIsLoading(true);
            const localSession = loadSession();
            if (!localSession) {
                setIsLoading(false);
                setView('portal-select');
                return;
            }

            // Quick-set from local session for immediate UI
            setCurrentUser(localSession.user);
            setCurrentOrganization(localSession.organization);
            setUserRole(localSession.role);

            // Verify token with backend
            const verified = await verifySession();
            if (verified) {
                setCurrentUser(verified.user);
                setCurrentOrganization(verified.organization);
                setIsAuthenticated(true);
                setView(roleToView(localSession.role));
            } else {
                // Token expired/invalid — force re-login
                clearSession();
                setCurrentUser(null);
                setCurrentOrganization(null);
                setUserRole(null);
                setIsAuthenticated(false);
                setView('portal-select');
            }
            setIsLoading(false);
        };
        restoreSession();
    }, []);

    const roleToView = (role: RBACRole): AppView => {
        switch (role) {
            case ROLES.USER: return 'user-dashboard';
            case ROLES.PSYCHOLOGIST: return 'psychologist-dashboard';
            case ROLES.ORGANIZATION_OFFICER: return 'org-dashboard';
            default: return 'portal-select';
        }
    };

    // Handle portal selection from landing
    const handleSelectPortal = (portal: RBACRole) => {
        setSelectedPortal(portal);
        setView('portal-login');
    };

    // Handle successful login
    const handleLoginSuccess = (
        user: AuthUser,
        role: RBACRole,
        organization: AuthOrganization,
        token: string
    ) => {
        setCurrentUser(user);
        setCurrentOrganization(organization);
        setUserRole(role);
        setIsAuthenticated(true);
        setView(roleToView(role));
    };

    // Handle logout
    const handleLogout = () => {
        clearSession();
        setIsAuthenticated(false);
        setCurrentUser(null);
        setCurrentOrganization(null);
        setUserRole(null);
        setSelectedPortal(null);
        setView('portal-select');
    };

    // Access denied guard: if someone navigates to a dashboard they don't own
    const guardView = (requiredRole: RBACRole, content: React.ReactNode): React.ReactNode => {
        if (!isAuthenticated || userRole !== requiredRole) {
            return <AccessDenied requiredRole={requiredRole} actualRole={userRole} onLogout={handleLogout} />;
        }
        return content;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#060a12]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm font-mono">Verifying session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#060a12] text-slate-100 selection:bg-cyan-500 selection:text-white">

            <Navbar
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
                userRole={userRole}
                onLogout={handleLogout}
            />

            <main className="flex-1">
                {/* Portal selector — unauthenticated landing */}
                {view === 'portal-select' && (
                    <PortalSelector onSelectPortal={handleSelectPortal} />
                )}

                {/* Portal-specific login form */}
                {view === 'portal-login' && selectedPortal && (
                    <PortalLoginForm
                        portal={selectedPortal}
                        onLoginSuccess={handleLoginSuccess}
                        onBack={() => setView('portal-select')}
                    />
                )}

                {/* USER DASHBOARD — protected: role USER only */}
                {view === 'user-dashboard' && guardView(
                    ROLES.USER,
                    currentUser && currentOrganization && (
                        <UserDashboard
                            user={authUserToLegacyUser(currentUser)}
                            organization={authOrgToLegacy(currentOrganization)}
                            onRefreshData={() => { }}
                        />
                    )
                )}

                {/* PSYCHOLOGIST DASHBOARD — protected: role PSYCHOLOGIST only */}
                {view === 'psychologist-dashboard' && guardView(
                    ROLES.PSYCHOLOGIST,
                    currentUser && currentOrganization && (
                        <DoctorDashboard
                            doctor={authUserToLegacyUser(currentUser)}
                            organization={authOrgToLegacy(currentOrganization)}
                        />
                    )
                )}

                {/* ORGANIZATION OFFICER DASHBOARD — protected: role ORGANIZATION_OFFICER only */}
                {view === 'org-dashboard' && guardView(
                    ROLES.ORGANIZATION_OFFICER,
                    currentUser && currentOrganization && (
                        <CompanyDashboard
                            admin={authUserToLegacyUser(currentUser)}
                            organization={authOrgToLegacy(currentOrganization)}
                        />
                    )
                )}

                {/* ACCESS DENIED */}
                {view === 'access-denied' && (
                    <AccessDenied requiredRole={null} actualRole={userRole} onLogout={handleLogout} />
                )}
            </main>

            <footer className="border-t border-slate-800/80 bg-[#04070f] py-6 px-4 text-center text-xs text-slate-400 font-mono">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white">CHIDAMBARANAR AI v1.0</span>
                        <span>• AI Well-Being & Early-Warning Platform</span>
                    </div>
                    <div>
                        <span>JWT Authentication • RBAC Data Isolation • bcrypt Password Hashing</span>
                    </div>
                </div>
            </footer>

            <WearableArchitectureModal
                isOpen={isWearablesModalOpen}
                onClose={() => setIsWearablesModalOpen(false)}
            />
            <AuditLogModal
                isOpen={isAuditModalOpen}
                onClose={() => setIsAuditModalOpen(false)}
            />
        </div>
    );
}

// ============================================================
// ACCESS DENIED SCREEN
// ============================================================
function AccessDenied({
    requiredRole,
    actualRole,
    onLogout,
}: {
    requiredRole: RBACRole | null;
    actualRole: RBACRole | null;
    onLogout: () => void;
}) {
    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-950/30 border border-rose-800/50 mb-6">
                    <AlertTriangle className="w-10 h-10 text-rose-400" />
                </div>
                <div className="mb-2 inline-block px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800 text-rose-400 text-xs font-mono font-bold">
                    403 FORBIDDEN
                </div>
                <h2 className="text-3xl font-black text-white mt-4 mb-3">Access Denied</h2>
                <p className="text-slate-400 text-sm mb-2">
                    You do not have permission to access this resource.
                </p>
                {requiredRole && (
                    <p className="text-slate-500 text-xs font-mono mb-6">
                        Required role: <span className="text-rose-400">{requiredRole}</span>
                        {actualRole && <> · Your role: <span className="text-slate-400">{actualRole}</span></>}
                    </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                    <button
                        onClick={onLogout}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-bold text-sm hover:from-rose-500 hover:to-rose-400 transition-all"
                    >
                        Sign Out & Return to Portal
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
