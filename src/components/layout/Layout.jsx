import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth(); // Assuming user object has email/name

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            {/* Main Content Wrapper */}
            <div className="lg:ml-20 min-h-screen flex flex-col transition-all duration-300">

                {/* Topbar */}
                <header className="h-16 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
                        >
                            <Menu size={24} className="text-slate-700" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 hidden md:block">
                            Recursos Humanos
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>

                        <div className="h-8 w-px bg-slate-200 mx-2"></div>

                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-900">
                                    {user?.user_metadata?.full_name || 'Usuario'}
                                </p>
                                <p className="text-xs text-slate-500">Administrador</p>
                            </div>
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                                {user?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
