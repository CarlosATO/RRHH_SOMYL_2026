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
        { path: '/', icon: LayoutDashboard, label: 'Dashboard', desc: 'Vista General' },
        { path: '/employees', icon: Users, label: 'Empleados', desc: 'Gestión de Personal' },
        { path: '/attendance', icon: Clock, label: 'Control Asistencia', desc: 'Marcajes y Turnos' },
        { path: '/absences', icon: Calendar, label: 'Ausencias', desc: 'Vacaciones y Licencias' },
        { path: '/org-chart', icon: Network, label: 'Organigrama', desc: 'Estructura Jerárquica' },
        { path: '/payroll/process', icon: Calculator, label: 'Nómina', desc: 'Calculo de Sueldos' },
        { path: '/reviews', icon: Award, label: 'Evaluaciones', desc: 'Desempeño' },
        { path: '/payroll/lre', icon: BookOpen, label: 'Libro LRE', desc: 'Libro de Remuneraciones' },
        { path: '/payroll/settings', icon: Settings, label: 'Parámetros', desc: 'Configuración Global' },
    ];

    const settingItems = [
        { path: '/settings/jobs', icon: Briefcase, label: 'Cargos', desc: 'Catálogo de Cargos' },
        { path: '/settings/shifts', icon: Clock3, label: 'Turnos', desc: 'Configuración Turnos' },
        { path: '/settings/subcontractors', icon: Building2, label: 'Contratistas', desc: 'Empresas Externas' },
        { path: '/settings/courses', icon: GraduationCap, label: 'Cursos', desc: 'Capacitaciones' },
    ];

    const [activeTooltip, setActiveTooltip] = useState(null);

    const handleMouseEnter = (e, item) => {
        if (window.innerWidth < 1024) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setActiveTooltip({
            top: rect.top + rect.height / 2,
            label: item.label,
            desc: item.desc
        });
    };

    const handleMouseLeave = () => {
        setActiveTooltip(null);
    };

    const renderNavItem = (item) => (
        <NavLink
            key={item.path}
            to={item.path}
            onClick={() => window.innerWidth < 1024 && toggleSidebar()}
            onMouseEnter={(e) => handleMouseEnter(e, item)}
            onMouseLeave={handleMouseLeave}
            className={({ isActive }) => `
                relative group flex items-center justify-center lg:justify-center lg:h-12 lg:w-12 mx-auto rounded-xl transition-all duration-200
                ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }
            `}
        >
            <item.icon size={22} strokeWidth={1.5} />
            <span className="lg:hidden ml-3 font-medium flex-1">{item.label}</span>
        </NavLink>
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen bg-[#0F172A] text-white transition-all duration-300 ease-in-out border-r border-slate-800 shadow-2xl
                    ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 w-64 lg:w-20'}
                `}
            >
                <div className="flex flex-col h-full w-full">
                    {/* Header */}
                    <div className="h-20 flex items-center justify-between lg:justify-center px-6 lg:px-0 border-b border-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-900/20 ring-1 ring-white/10">
                                RH
                            </div>
                            <span className="text-lg font-bold tracking-tight lg:hidden">SOMYL RRHH</span>
                        </div>
                        <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-2 thin-scrollbar">
                        {navItems.map(renderNavItem)}

                        <div className="my-4 border-t border-slate-800/50 mx-2"></div>

                        {settingItems.map(renderNavItem)}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800/50 bg-[#0F172A]">
                        <button
                            onClick={handleSignOut}
                            onMouseEnter={(e) => handleMouseEnter(e, { label: 'Cerrar Sesión', desc: 'Finalizar sesión actual' })}
                            onMouseLeave={handleMouseLeave}
                            className="relative group flex items-center justify-center w-full h-12 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                        >
                            <LogOut size={22} strokeWidth={1.5} />
                            <span className="lg:hidden ml-3 font-medium">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Portal-like Tooltip (Fixed Position) */}
            {activeTooltip && (
                <div
                    className="hidden lg:block fixed left-24 z-[60] w-48 bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 pointer-events-none transition-all duration-200"
                    style={{ top: activeTooltip.top, transform: 'translateY(-50%)' }}
                >
                    <div className="text-sm font-bold mb-0.5">{activeTooltip.label}</div>
                    <div className="text-xs text-slate-400 leading-tight">{activeTooltip.desc}</div>
                    {/* Arrow */}
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-slate-900 rotate-45 border-l border-b border-slate-700 transform"></div>
                </div>
            )}
        </>
    );
};

export default Sidebar;

