import React, { useState, useEffect } from 'react';
import { User } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { UserDashboard } from './components/UserDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { CompanyDashboard } from './components/CompanyDashboard';
import { WearableArchitectureModal } from './components/WearableArchitectureModal';
import { AuditLogModal } from './components/AuditLogModal';

export function App() {
    const [activeTab, setActiveTab] = useState<'landing' | 'login' | 'user' | 'doctor' | 'company'>('login');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Modals state
    const [isWearablesModalOpen, setIsWearablesModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

    // Fetch initial users from server
    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.users && data.users.length > 0) {
                setAllUsers(data.users);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Handle successful login from 3-panel LoginPage
    const handleLoginSuccess = (user: User, role: 'user' | 'doctor' | 'company') => {
        setCurrentUser(user);
        setIsAuthenticated(true);
        if (role === 'user') setActiveTab('user');
        else if (role === 'doctor') setActiveTab('doctor');
        else if (role === 'company') setActiveTab('company');
    };

    // Handle Logout
    const handleLogout = () => {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setActiveTab('login');
    };

    // Select portal from landing page
    const handleSelectPortalFromLanding = (portal: 'user' | 'doctor' | 'company') => {
        const targetUser = allUsers.find(u =>
            portal === 'user' ? u.role === 'user_employee' :
                portal === 'doctor' ? u.role === 'doctor' :
                    u.role === 'company_admin'
        ) || allUsers[0];

        if (targetUser) {
            setCurrentUser(targetUser);
            setIsAuthenticated(true);
            setActiveTab(portal);
        } else {
            setActiveTab('login');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#060a12] text-slate-100 selection:bg-cyan-500 selection:text-white">

            {/* Top Navbar */}
            <Navbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
                onLogout={handleLogout}
            />

            {/* Main Content View */}
            <main className="flex-1">
                {activeTab === 'landing' && (
                    <LandingPage
                        onSelectPortal={handleSelectPortalFromLanding}
                        onOpenWearables={() => setIsWearablesModalOpen(true)}
                    />
                )}

                {activeTab === 'login' && (
                    <LoginPage
                        onLoginSuccess={handleLoginSuccess}
                        allUsers={allUsers}
                    />
                )}

                {activeTab === 'user' && currentUser && (
                    <UserDashboard
                        user={currentUser}
                        onRefreshData={fetchUsers}
                    />
                )}

                {activeTab === 'doctor' && currentUser && (
                    <DoctorDashboard
                        doctor={currentUser}
                    />
                )}

                {activeTab === 'company' && currentUser && (
                    <CompanyDashboard
                        admin={currentUser}
                    />
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800/80 bg-[#04070f] py-6 px-4 text-center text-xs text-slate-400 font-mono">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white">SENTINEL v1.0 DEFENSE</span>
                        <span>• AI Well-Being & Early-Warning Platform</span>
                    </div>
                    <div>
                        <span>Google & Password Authentication • Role-Based Data Access Enforcement</span>
                    </div>
                </div>
            </footer>

            {/* Wearable Architecture Gateway Modal */}
            <WearableArchitectureModal
                isOpen={isWearablesModalOpen}
                onClose={() => setIsWearablesModalOpen(false)}
            />

            {/* RBAC Privacy Audit Log Modal */}
            <AuditLogModal
                isOpen={isAuditModalOpen}
                onClose={() => setIsAuditModalOpen(false)}
            />

        </div>
    );
}

export default App;
