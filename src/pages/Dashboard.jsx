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
    const [pendingItems, setPendingItems] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];

                // 1. Contadores Generales
                const { count: empCount } = await supabase.from('rrhh_employees').select('*', { count: 'exact', head: true });
                const { count: attendanceCount } = await supabase.from('rrhh_attendance_logs').select('*', { count: 'exact', head: true }).gte('timestamp', `${todayStr}T00:00:00`).lte('timestamp', `${todayStr}T23:59:59`).eq('type', 'IN');
                const { count: absencesCount } = await supabase.from('rrhh_employee_absences').select('*', { count: 'exact', head: true }).eq('status', 'pending');

                setStats(prev => ({ ...prev, activeEmployees: empCount || 0, todayAttendance: attendanceCount || 0, pendingAbsences: absencesCount || 0 }));

                // 2. Logs Recientes
                const { data: logsData } = await supabase.from('rrhh_attendance_logs').select('*, employee:employee_id(first_name, last_name)').order('timestamp', { ascending: false }).limit(5);
                setRecentLogs(logsData || []);

                // 3. PENDIENTES (Lógica Unificada)
                let items = [];

                // A. Solicitudes de Ausencia
                const { data: absences } = await supabase.from('rrhh_employee_absences').select('*, employee:employee_id(first_name, last_name), type:type_id(name)').eq('status', 'pending');
                if (absences) {
                    absences.forEach(a => items.push({
                        id: `abs_${a.id}`,
                        type: 'Solicitud Pendiente',
                        detail: `${a.type?.name} - ${a.employee?.first_name} ${a.employee?.last_name}`,
                        path: '/absences',
                        severity: 'medium', // Orange
                        date: new Date(a.requested_at)
                    }));
                }

                // B. Empleados (Faltantes y Contratos)
                const { data: employees } = await supabase.from('rrhh_employees').select('*, job:job_id(name)');
                if (employees) {
                    employees.forEach(e => {
                        // B1. Datos Faltantes
                        const missing = [];
                        if (!e.rut) missing.push('RUT');
                        if (!e.address) missing.push('Dirección');
                        if (!e.job_id) missing.push('Cargo');

                        if (missing.length > 0) {
                            items.push({
                                id: `miss_${e.id}`,
                                type: 'Falta Información',
                                detail: `${e.first_name} ${e.last_name}: ${missing.join(', ')}`,
                                path: '/employees',
                                severity: 'low', // Yellow/Blue
                                date: new Date()
                            });
                        }

                        // B2. Contrato Vencido
                        if (e.termination_date) {
                            const termDate = new Date(e.termination_date);
                            if (termDate < today) {
                                items.push({
                                    id: `term_${e.id}`,
                                    type: 'Contrato Vencido',
                                    detail: `${e.first_name} ${e.last_name} (${e.termination_date})`,
                                    path: '/employees',
                                    severity: 'high', // Red
                                    date: termDate
                                });
                            }
                        }
                    });
                }

                // C. Certificaciones Vencidas (Solo si existen y están vencidas)
                const { data: certs } = await supabase.from('rrhh_employee_certifications').select('*, employee:employee_id(first_name, last_name)');
                // Necesitamos nombres de cursos. Map simple o fetch.
                const { data: courses } = await supabase.from('rrhh_course_catalog').select('id, name');
                const courseMap = {};
                if (courses) courses.forEach(c => courseMap[c.id] = c.name);

                if (certs) {
                    certs.forEach(c => {
                        if (c.expiry_date) {
                            const expDate = new Date(c.expiry_date);
                            if (expDate < today) {
                                items.push({
                                    id: `cert_${c.id}`,
                                    type: 'Curso Vencido',
                                    detail: `${c.employee?.first_name} ${c.employee?.last_name}: ${courseMap[c.course_id] || 'Curso'}`,
                                    path: '/employees',
                                    severity: 'high', // Red
                                    date: expDate
                                });
                            }
                        }
                    });
                }

                // Ordenar: Severidad Alta primero, luego por fecha
                items.sort((a, b) => {
                    const sevScore = { high: 3, medium: 2, low: 1 };
                    if (sevScore[b.severity] !== sevScore[a.severity]) return sevScore[b.severity] - sevScore[a.severity];
                    return b.date - a.date;
                });

                setPendingItems(items);

            } catch (error) {
                console.error("Error cargando dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchDashboardData();
    }, [user]);

    const modules = [
        { title: 'Empleados', desc: 'Personal', path: '/employees', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', stat: stats.activeEmployees, statLabel: 'Activos' },
        { title: 'Asistencia', desc: 'Marcas', path: '/attendance', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50', stat: stats.todayAttendance, statLabel: 'Hoy' },
        { title: 'Ausencias', desc: 'Permisos', path: '/absences', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', stat: stats.pendingAbsences, statLabel: 'Pend' },
        { title: 'Evaluaciones', desc: 'Feedback', path: '/reviews', icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50', stat: 'FEB', statLabel: 'Ciclo' },
        { title: 'Nómina', desc: 'Pagos', path: '/payroll/process', icon: Calculator, color: 'text-purple-600', bg: 'bg-purple-50', stat: stats.payrollPeriod, statLabel: 'Mes' },
        { title: 'Organigrama', desc: 'Jerarquía', path: '/org-chart', icon: Network, color: 'text-indigo-600', bg: 'bg-indigo-50', stat: stats.activeEmployees, statLabel: 'Nodos' }
    ];

    if (loading) return <div className="flex items-center justify-center h-[50vh]"><Loader2 size={24} className="text-blue-600 animate-spin" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans max-w-7xl mx-auto pt-2">

            {/* Grid Modules: Ultra Compacto */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {modules.map((m, i) => (
                    <div
                        key={i}
                        onClick={() => navigate(m.path)}
                        className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between h-[100px]"
                    >
                        <div className="flex justify-between items-center">
                            <div className={`w-8 h-8 ${m.bg} ${m.color} rounded-md flex items-center justify-center`}>
                                <m.icon size={16} />
                            </div>
                            <div className="text-right">
                                <span className="block text-lg font-bold text-slate-800 leading-none">{m.stat}</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors truncate">{m.title}</h3>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{m.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Actividad Reciente */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                            <TrendingUp size={14} className="text-blue-500" />
                            Actividad Reciente
                        </h3>
                    </div>

                    <div className="space-y-2">
                        {recentLogs.length === 0 ? (
                            <p className="text-slate-400 text-[11px] text-center py-2 italic">Sin marcas recientes.</p>
                        ) : (
                            recentLogs.map((log) => (
                                <div key={log.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${log.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-200'
                                        }`}>
                                        {log.type === 'IN' ? 'IN' : 'OUT'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-700 truncate">
                                            {log.employee?.first_name} {log.employee?.last_name}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {new Date(log.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Acciones Pendientes - NUEVO REPORTE */}
                <div className="bg-slate-900 rounded-lg p-4 text-white shadow flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600 rounded-full blur-2xl opacity-20 -mr-8 -mt-8 pointer-events-none"></div>

                    <h3 className="font-bold text-xs mb-3 flex items-center gap-2 relative z-10 uppercase tracking-wide text-blue-100">
                        <AlertCircle size={14} className="text-orange-400" />
                        Reporte de Pendientes
                    </h3>

                    <div className="space-y-2 flex-1 relative z-10 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700">
                        {pendingItems.length === 0 ? (
                            <div className="text-slate-500 text-[10px] text-center py-4">
                                <CheckCircle2 size={16} className="mx-auto mb-1 opacity-30 text-emerald-400" />
                                <p>Todo actualizado</p>
                            </div>
                        ) : (
                            pendingItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => navigate(item.path)}
                                    className={`p-2 rounded border transition-colors cursor-pointer group ${item.severity === 'high' ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' :
                                            item.severity === 'medium' ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20' :
                                                'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className={`text-[10px] font-bold truncate ${item.severity === 'high' ? 'text-red-300' :
                                                item.severity === 'medium' ? 'text-orange-300' :
                                                    'text-blue-300'
                                            }`}>
                                            {item.type}
                                        </span>
                                        <ArrowRight size={10} className="text-white/20 group-hover:text-white transition-colors" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate leading-tight">
                                        {item.detail}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
