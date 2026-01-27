import React, { useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    MapPin,
    Users,
    Settings,
    Image,
    Car,
    LogOut,
    Menu,
    X,
    Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const AdminLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { signOut, user } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/admin/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Visão Geral', path: '/admin' }, // Changed path for route consistency if configured in App.tsx, but will adjust below
        { icon: Car, label: 'Corridas', path: '/admin/rides' },
        { icon: Users, label: 'Motoristas', path: '/admin/drivers' },
        { icon: MapPin, label: 'Pontos Fixos', path: '/admin/points' },
        { icon: Image, label: 'Banners', path: '/admin/banners' },
        { icon: Settings, label: 'Configurações', path: '/admin/settings' },
    ];

    // Note: Since we are currently using a single page AdminDashboard with tabs, 
    // we will pass the "active tab" state down or manage it via search params in a real modular routing app.
    // For this refactor, we are going to keep the single page structure but styling it like a dashboard layout 
    // where the "Outlet" would be the content. 
    // HOWEVER, the current App.tsx maps everything to AdminDashboard. 
    // To make this robust without rewriting all ROUTES immediately, we will use this layout INSIDE AdminDashboard 
    // or refactor AdminDashboard to use this as a wrapper.

    // Let's create the visual shell first.
    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0 lg:static",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-16 flex items-center px-6 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center mr-3">
                        <span className="font-bold text-slate-900">M</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">MotoPoint Admin</span>
                    <button
                        className="ml-auto lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-1">
                    <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-2">Menu</p>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.path}
                            end={item.path === '/admin'}
                            className={({ isActive }) => cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </NavLink>
                    ))}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <Avatar className="h-9 w-9 border border-slate-200">
                            <AvatarFallback className="bg-yellow-100 text-yellow-700 font-bold">A</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-slate-900">Administrador</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100" onClick={handleSignOut}>
                        <LogOut size={16} className="mr-2" />
                        Sair
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
                    <div className="flex items-center gap-4">
                        <button
                            className="p-2 -ml-2 text-slate-500 lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="text-xl font-semibold text-slate-800 hidden md:block">Dashboard</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="relative text-slate-500">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </Button>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto p-4 lg:p-8">
                    <Outlet />
                    {/* If not using Outlook, children will go here */}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
