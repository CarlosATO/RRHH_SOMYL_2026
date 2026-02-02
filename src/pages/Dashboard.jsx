import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
    Users,
    Calendar,
    Clock,
    Calculator,
    TrendingUp,
    AlertCircle,
    ArrowRight,
    Loader2,
    CheckCircle2,
    Network
} from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeEmployees: 0,
        todayAttendance: 0,
        pendingAbsences: 0,
        payrollPeriod: new Date().toLocaleDateString('es-CL', { month: 'short' }).toUpperCase()
    });

    const [recentLogs, setRecentLogs] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const today = new Date().toISOString().split('T')[0];

                // 1. Empleados Activos
                const { count: empCount } = await supabase
                    .from('rrhh_employees')
                    .select('*', { count: 'exact', head: true });

                // 2. Marcas de Hoy (Únicas por empleado para contar asistencia)
                // Usamos una query aproximada contando logs de hoy tipo 'IN'
                const { count: attendanceCount } = await supabase
                    .from('rrhh_attendance_logs')
                    .select('*', { count: 'exact', head: true })
                    .gte('timestamp', `${today}T00:00:00`)
                    .lte('timestamp', `${today}T23:59:59`)
                    .eq('type', 'IN');

                // 3. Ausencias Pendientes
                const { count: absencesCount } = await supabase
                    .from('rrhh_employee_absences')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');

                setStats(prev => ({
                    ...prev,
                    activeEmployees: empCount || 0,
                    todayAttendance: attendanceCount || 0,
                    pendingAbsences: absencesCount || 0
                }));

                // 4. Actividad Reciente (Últimos 5 logs con info de empleado)
                const { data: logsData } = await supabase
                    .from('rrhh_attendance_logs')
                    .select('*, employee:employee_id(first_name, last_name)')
                    .order('timestamp', { ascending: false })
                    .limit(5);
                setRecentLogs(logsData || []);

                // 5. Solicitudes Pendientes (Primeras 3)
                const { data: reqData } = await supabase
                    .from('rrhh_employee_absences')
                    .select('*, employee:employee_id(first_name, last_name), type:type_id(name)')
                    .eq('status', 'pending')
                    .order('requested_at', { ascending: false })
                    .limit(3);
                setPendingRequests(reqData || []);

            } catch (error) {
                console.error("Error cargando dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchDashboardData();
    }, [user]);

    const modules = [
        {
            title: 'Empleados',
            desc: 'Gestión de personal y fichas',
            path: '/employees',
            icon: Users,
            color: 'bg-blue-500',
            stat: stats.activeEmployees,
            statLabel: 'Activos'
        },
        {
            title: 'Asistencia',
            desc: 'Control de marcas y turnos',
            path: '/attendance',
            icon: Clock,
            color: 'bg-emerald-500',
            stat: stats.todayAttendance,
            statLabel: 'Marcas Hoy'
        },
        {
            title: 'Ausencias',
            desc: 'Vacaciones y permisos',
            path: '/absences',
            icon: Calendar,
            color: 'bg-orange-500',
            stat: stats.pendingAbsences,
            statLabel: 'Pendientes'
        },
        {
            title: 'Evaluaciones',
            desc: 'Calificar desempeño y feedback',
            path: '/reviews',
            icon: CheckCircle2,
            color: 'bg-amber-500',
            stat: stats.payrollPeriod,
            statLabel: 'Periodo'
        },
        {
            title: 'Nómina',
            desc: 'Procesar liquidaciones',
            path: '/payroll/process',
            icon: Calculator,
            color: 'bg-purple-500',
            stat: stats.payrollPeriod,
            statLabel: 'Periodo'
        },
        {
            title: 'Organigrama',
            desc: 'Jerarquía visual de la empresa',
            path: '/org-chart',
            icon: Network,
            color: 'bg-indigo-500',
            stat: stats.activeEmployees,
            statLabel: 'Estructura'
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 size={40} className="text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Control</h1>
                    <p className="text-slate-500 mt-1">Bienvenido al sistema de recursos humanos SOMYL</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                    <Calendar size={16} />
                    {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {modules.map((m, i) => (
                    <div
                        key={i}
                        onClick={() => navigate(m.path)}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <m.icon size={64} className="text-slate-900" />
                        </div>

                        <div className="relative z-10">
                            <div className={`w-12 h-12 ${m.color} rounded-xl flex items-center justify-center text-white shadow-lg mb-4`}>
                                <m.icon size={24} />
                            </div>

                            <h3 className="text-lg font-bold text-slate-800">{m.title}</h3>
                            <p className="text-sm text-slate-500 mb-4">{m.desc}</p>

                            <div className="flex items-end justify-between border-t border-slate-50 pt-4">
                                <div>
                                    <span className="text-2xl font-bold text-slate-900">{m.stat}</span>
                                    <span className="text-xs text-slate-400 font-medium ml-2 uppercase">{m.statLabel}</span>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Recent Activity Section */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-500" />
                            Actividad Reciente
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {recentLogs.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-4">No hay actividad reciente hoy.</p>
                        ) : (
                            recentLogs.map((log) => (
                                <div key={log.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <Clock size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900">
                                            {log.employee?.first_name} {log.employee?.last_name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(log.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs • {log.type === 'IN' ? 'Entrada' : 'Salida'}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${log.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {log.type === 'IN' ? 'Entrada' : 'Salida'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pending Actions / Alerts */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <AlertCircle size={20} className="text-orange-400" />
                        Acciones Pendientes
                    </h3>

                    <div className="space-y-4 flex-1">
                        {pendingRequests.length === 0 ? (
                            <div className="text-slate-400 text-sm text-center py-10">
                                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Todo al día</p>
                            </div>
                        ) : (
                            pendingRequests.map((req) => (
                                <div key={req.id} onClick={() => navigate('/absences')} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-bold text-orange-200 truncate pr-2">
                                            {req.type?.name || 'Solicitud'}
                                        </span>
                                        <span className="text-xs text-slate-400 shrink-0">
                                            {new Date(req.requested_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 line-clamp-2">
                                        {req.employee?.first_name} {req.employee?.last_name} solicita permiso: {req.reason}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/absences')}
                        className="w-full mt-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                        Gestionar Ausencias
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
