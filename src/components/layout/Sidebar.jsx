import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar,
    Clock,
    Calculator,
    BookOpen,
    Settings,
    LogOut,
    Menu,
    X,
    LayoutDashboard,
    ChevronDown,
    Briefcase,
    Building2,
    GraduationCap,
    Clock3,
    Award,
    Network
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);

    const handleSignOut = () => {
        logout();
    };

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/employees', icon: Users, label: 'Empleados' },
        { path: '/attendance', icon: Clock, label: 'Control Asistencia' },
        { path: '/absences', icon: Calendar, label: 'Ausencias' },
        { path: '/org-chart', icon: Network, label: 'Organigrama' },
        { path: '/payroll/process', icon: Calculator, label: 'Nómina' },
        { path: '/reviews', icon: Award, label: 'Evaluaciones' },
        { path: '/payroll/lre', icon: BookOpen, label: 'Libro LRE' },
        { path: '/payroll/settings', icon: Settings, label: 'Parámetros' },
    ];

    const settingItems = [
        { path: '/settings/jobs', icon: Briefcase, label: 'Cargos' },
        { path: '/settings/shifts', icon: Clock3, label: 'Turnos' },
        { path: '/settings/subcontractors', icon: Building2, label: 'Contratistas' },
        { path: '/settings/courses', icon: GraduationCap, label: 'Cursos' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="h-16 flex items-center px-6 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
                                RH
                            </div>
                            <span className="text-lg font-bold tracking-tight">SOMYL RRHH</span>
                        </div>
                        <button onClick={toggleSidebar} className="ml-auto lg:hidden">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                        <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Principal
                        </div>

                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                    ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }
                                `}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </NavLink>
                        ))}

                        <div className="mt-8 px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Configuración
                        </div>

                        {/* Settings Group */}
                        <div className="space-y-1">
                            {settingItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                                    className={({ isActive }) => `
                                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                        ${isActive
                                            ? 'text-blue-400 bg-slate-800'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                        }
                                    `}
                                >
                                    <item.icon size={16} />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800">
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-3 py-2 w-full text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
                        >
                            <LogOut size={18} />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
