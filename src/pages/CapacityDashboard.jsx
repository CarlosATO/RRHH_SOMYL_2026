import React, { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';

const CapacityDashboard = ({ onRowClick }) => {
    const [employees, setEmployees] = useState([]);
    const [courses, setCourses] = useState([]);
    const [certs, setCerts] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch employees with relations
            const { data: emps, error: empError } = await supabase
                .from('rrhh_employees')
                .select(`
                    id, first_name, last_name, rut, photo_url, nationality, birth_date,
                    hire_date, termination_date, salary, address,
                    job:job_id(name), 
                    department:department_id(name),
                    contract_type:contract_type_id(name),
                    marital_status:marital_status_id(name),
                    pension:pension_provider_id(name),
                    health:health_provider_id(name),
                    shift:shift_id(name),
                    is_subcontracted, clock_pin
                `)
                .order('last_name');

            if (empError) throw empError;

            // Fetch courses
            const { data: courseData, error: courseError } = await supabase
                .from('rrhh_course_catalog')
                .select('*')
                .order('name');

            if (courseError) throw courseError;

            // Fetch certifications
            const { data: certData, error: certError } = await supabase
                .from('rrhh_employee_certifications')
                .select('*');

            if (certError) throw certError;

            // Try to fetch documents (may not exist)
            let docsData = [];
            try {
                const { data } = await supabase.from('rrhh_employee_documents').select('*');
                docsData = data || [];
            } catch (docError) {
                console.log('Tabla de documentos no disponible:', docError);
            }

            setEmployees(emps || []);
            setCourses(courseData || []);
            setCerts(certData || []);
            setDocuments(docsData);
        } catch (error) {
            console.error('Error cargando datos de capacidad:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        const sub1 = supabase
            .channel('public:rrhh_course_catalog')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rrhh_course_catalog' }, () => fetchData())
            .subscribe();

        const sub2 = supabase
            .channel('public:rrhh_employee_certifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rrhh_employee_certifications' }, () => fetchData())
            .subscribe();

        return () => {
            try { supabase.removeChannel(sub1); supabase.removeChannel(sub2); } catch (e) { }
        };
    }, [fetchData]);

    const certMap = {};
    certs.forEach(c => { certMap[`${c.employee_id}_${c.course_id}`] = c; });

    const docMap = {};
    documents.forEach(d => { docMap[`${d.employee_id}_${d.document_type}`] = d; });

    const getCourseStatus = (employeeId, courseId) => {
        const c = certMap[`${employeeId}_${courseId}`];
        if (!c) return { color: 'red', label: 'Faltante', icon: '✕' };
        if (!c.expiry_date) return { color: 'yellow', label: 'Sin vencimiento', icon: '⚠' };
        const today = new Date();
        const expiry = new Date(c.expiry_date);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { color: 'red', label: `Vencido`, icon: '✕' };
        if (diffDays <= 30) return { color: 'yellow', label: `${diffDays}d`, icon: '⚠' };
        return { color: 'green', label: 'Ok', icon: '✓' };
    };

    const getContractStatus = (emp) => {
        if (!emp.termination_date) return { color: 'green', label: 'Indefinido', icon: '✓' };
        const today = new Date();
        const termDate = new Date(emp.termination_date);
        const diffDays = Math.ceil((termDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { color: 'red', label: 'Vencido', icon: '✕' };
        if (diffDays <= 30) return { color: 'yellow', label: `${diffDays}d`, icon: '⚠' };
        if (diffDays <= 90) return { color: 'yellow', label: `${diffDays}d`, icon: '⚠' };
        return { color: 'green', label: 'Ok', icon: '✓' };
    };

    const getFieldStatus = (value, label = 'campo') => {
        if (!value || value === '' || value === null) return { color: 'red', label: 'Faltante', icon: '✕' };
        return { color: 'green', label: 'Ok', icon: '✓' };
    };

    const renderStatusCell = (status) => (
        <div className="inline-flex items-center gap-1 justify-center px-2 py-1 rounded text-xs">
            <span className={`inline-block w-2 h-2 rounded-full ${status.color === 'green' ? 'bg-emerald-500' :
                status.color === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                }`}></span>
            <span className={`font-medium ${status.color === 'green' ? 'text-emerald-700' :
                status.color === 'yellow' ? 'text-yellow-700' : 'text-red-700'
                }`}>{status.label}</span>
        </div>
    );

    const handleExport = () => {
        const data = employees.map(emp => {
            const row = {
                "Trabajador": `${emp.first_name} ${emp.last_name}`,
                "RUT": emp.rut || '',
                "Cargo": emp.job?.name || '',
                "Tipo Contrato": emp.contract_type?.name || '',
                "Vigencia Contrato": emp.termination_date || 'Indefinido',
                "Nacionalidad": emp.nationality || '',
                "AFP": emp.pension?.name || '',
                "Salud": emp.health?.name || '',
                "Estado Civil": emp.marital_status?.name || ''
            };

            courses.forEach(c => {
                const st = getCourseStatus(emp.id, c.id);
                row[c.name] = st.label;
            });

            return row;
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Capacidad Operativa");
        XLSX.writeFile(wb, "Capacidad_Operativa_Somyl.xlsx");
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-sm transition-colors"
                >
                    <span className="text-lg">📊</span>
                    Exportar Excel
                </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-auto">
                <table className="w-full min-w-[1800px]">
                    <thead>
                        {/* Grupo de encabezados */}
                        <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-300">
                            <th colSpan="4" className="px-4 py-2 text-left text-xs font-bold text-slate-700 uppercase border-r-2 border-slate-300">
                                Información Personal
                            </th>
                            <th colSpan="3" className="px-4 py-2 text-center text-xs font-bold text-slate-700 uppercase border-r-2 border-slate-300">
                                Datos Contractuales
                            </th>
                            <th colSpan="4" className="px-4 py-2 text-center text-xs font-bold text-slate-700 uppercase border-r-2 border-slate-300">
                                Datos Complementarios
                            </th>
                            <th colSpan={courses.length} className="px-4 py-2 text-center text-xs font-bold text-slate-700 uppercase">
                                Cursos y Certificaciones
                            </th>
                        </tr>

                        {/* Encabezados de columnas */}
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            {/* Info Personal */}
                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Trabajador</th>
                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">RUT</th>
                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cargo</th>
                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-r-2 border-slate-300">Foto</th>

                            {/* Datos Contractuales */}
                            <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contrato</th>
                            <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider border-r-2 border-slate-300">Vigencia</th>

                            {/* Datos Complementarios */}
                            <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nacionalidad</th>
                            <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">AFP</th>
                            <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Isapre/Fonasa</th>
                            <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider border-r-2 border-slate-300">Est. Civil</th>

                            {/* Cursos dinámicos */}
                            {courses.map(c => (
                                <th key={c.id} className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider border-l border-slate-200">
                                    {c.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={11 + courses.length} className="px-6 py-12 text-center text-slate-400">Cargando datos...</td></tr>
                        ) : employees.length === 0 ? (
                            <tr><td colSpan={11 + courses.length} className="px-6 py-12 text-center text-slate-400">No se encontraron trabajadores</td></tr>
                        ) : (
                            employees.map((emp, idx) => (
                                <tr key={emp.id} className={`hover:bg-blue-50/20 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                    {/* Info Personal */}
                                    <td className="px-3 py-3 sticky left-0 bg-inherit z-10 border-r border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                                                {emp.first_name?.[0]}{emp.last_name?.[0]}
                                            </div>
                                            <div className="min-w-[120px]">
                                                <div className="font-semibold text-xs text-slate-900 leading-tight">{emp.first_name} {emp.last_name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-xs text-slate-600">{emp.rut || '-'}</td>
                                    <td className="px-3 py-3 text-xs text-slate-600">{emp.job?.name || '-'}</td>
                                    <td className="px-3 py-3 text-center border-r-2 border-slate-300 cursor-pointer hover:bg-slate-100" onClick={() => onRowClick && onRowClick(emp, 'personal')}>
                                        {renderStatusCell(getFieldStatus(emp.photo_url, 'foto'))}
                                    </td>

                                    {/* Datos Contractuales */}
                                    <td className="px-3 py-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => onRowClick && onRowClick(emp, 'contract')}>
                                        {renderStatusCell(getContractStatus(emp))}
                                    </td>
                                    <td className="px-3 py-3 text-xs text-slate-600 text-center cursor-pointer hover:bg-slate-100" onClick={() => onRowClick && onRowClick(emp, 'contract')}>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-700">
                                            {emp.contract_type?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-xs text-slate-600 text-center border-r-2 border-slate-300 cursor-pointer hover:bg-slate-100" onClick={() => onRowClick && onRowClick(emp, 'contract')}>
                                        {emp.termination_date || 'Indefinido'}
                                    </td>

                                    {/* Datos Complementarios */}
                                    <td className="px-3 py-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => onRowClick && onRowClick(emp, 'personal')}>
                                        {renderStatusCell(getFieldStatus(emp.nationality, 'nacionalidad'))}
                                    </td>
                                    <td className="px-3 py-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => onRowClick && onRowClick(emp, 'social')}>
                                        {renderStatusCell(getFieldStatus(emp.pension?.name, 'AFP'))}
                                    </td>
                                    <td className="px-3 py-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => onRowClick && onRowClick(emp, 'social')}>
                                        {renderStatusCell(getFieldStatus(emp.health?.name, 'salud'))}
                                    </td>
                                    <td className="px-3 py-3 text-center border-r-2 border-slate-300 cursor-pointer hover:bg-slate-100" onClick={() => onRowClick && onRowClick(emp, 'personal')}>
                                        {renderStatusCell(getFieldStatus(emp.marital_status?.name, 'est. civil'))}
                                    </td>

                                    {/* Cursos dinámicos */}
                                    {courses.map(course => {
                                        const st = getCourseStatus(emp.id, course.id);
                                        return (
                                            <td key={course.id} className="px-3 py-3 text-center border-l border-slate-200 cursor-pointer hover:bg-slate-100" onClick={() => onRowClick && onRowClick(emp, 'acred')}>
                                                {renderStatusCell(st)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Leyenda */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-6 text-xs">
                    <span className="font-bold text-slate-700">LEYENDA:</span>
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-600">Completo / Vigente</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-400"></span>
                        <span className="text-slate-600">Por vencer (≤30 días) / Incompleto</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="text-slate-600">Vencido / Faltante</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CapacityDashboard;
