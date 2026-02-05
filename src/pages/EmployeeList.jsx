import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { procurementClient } from '../services/procurementClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePendingRequests } from '../hooks/usePendingRequests';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import EmployeeEPP from '../components/EmployeeEPP';

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- FUNCIÓN HELPER: Limpiar RUT ---
const cleanRut = (value) => {
    if (!value) return '';
    return value.replace(/\./g, '').trim().toLowerCase();
}

const NATIONALITIES = [
    'Chilena', 'Venezolana', 'Colombiana', 'Peruana', 'Haitiana',
    'Boliviana', 'Argentina', 'Ecuatoriana', 'Brasileña', 'Otra'
];

const formatCLP = (value) => {
    if (!value) return '';
    const number = parseInt(value.toString().replace(/\D/g, ''), 10);
    return isNaN(number) ? '' : new Intl.NumberFormat('es-CL').format(number);
};

// --- FUNCIÓN HELPER: CREAR USUARIO AUTH ---
const createWorkerAuth = async (rut, pin, name) => {
    const tempClient = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    const fakeEmail = `${cleanRut(rut)}@sistema.local`;

    const { data, error } = await tempClient.auth.signUp({
        email: fakeEmail,
        password: pin,
        options: { data: { full_name: name } }
    });

    if (error) {
        console.warn("Advertencia Auth:", error.message);
        return false;
    }
    return true;
};


import EmployeeDetailDrawer from '../components/EmployeeDetailDrawer';
import EmployeeDocuments from '../components/EmployeeDocuments';
import EmployeeCertifications from '../components/EmployeeCertifications';

// --- COMPONENTE PRINCIPAL UNIFICADO ---
const EmployeeList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const pendingCount = usePendingRequests(user);

    // Estados principales
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [editData, setEditData] = useState({});
    const [uploading, setUploading] = useState(false);

    const [masters, setMasters] = useState({
        jobs: [], departments: [], maritalStatus: [], pensionProviders: [], healthProviders: [],
        contractTypes: [], subcontractors: [], courses: [], shifts: []
    });

    // Carga de datos maestros y empleados
    const initData = useCallback(async () => {
        try {
            const results = await Promise.allSettled([
                supabase.from('rrhh_cargos').select('*'), // was rrhh_jobs
                supabase.from('rrhh_departamentos').select('*'), // was rrhh_departments
                supabase.from('rrhh_marital_status').select('*'),
                supabase.from('rrhh_pension_providers').select('*'),
                supabase.from('rrhh_health_providers').select('*'),
                supabase.from('rrhh_contract_types').select('*'),
                procurementClient.from('proveedores').select('*').eq('subcontrato', 1),
                supabase.from('rrhh_course_catalog').select('*'),
                supabase.from('rrhh_turnos').select('*')
            ]);

            const getData = (res) => (res.status === 'fulfilled' && res.value.data) ? res.value.data : [];

            const newMasters = {
                jobs: getData(results[0]),
                departments: getData(results[1]),
                maritalStatus: getData(results[2]),
                pensionProviders: getData(results[3]),
                healthProviders: getData(results[4]),
                contractTypes: getData(results[5]),
                subcontractors: getData(results[6]),
                courses: getData(results[7]),
                shifts: getData(results[8])
            };

            console.log("Datos Maestros Cargados:", newMasters);
            setMasters(newMasters);

            const { data: emps, error } = await supabase
                .from('rrhh_employees')
                .select(`*, job:job_id(name)`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEmployees(emps || []);
            setLoading(false);

        } catch (error) { console.error(error); }
    }, [user]);

    useEffect(() => { if (user) initData(); }, [user, initData]);

    // Acciones CRUD y helpers
    const handleOpenCreate = () => {
        setEditData({ is_subcontracted: false, hire_date: new Date().toISOString().split('T')[0] });
        setCurrentEmployee({ isNew: true });
    };

    const handleOpenEdit = (emp) => { setEditData({ ...emp }); setCurrentEmployee(emp); };
    const handleClose = () => { setCurrentEmployee(null); setEditData({}); };
    const handleFileUpload = (file) => { setEditData(prev => ({ ...prev, photo_file: file })); };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setUploading(true);
        try {
            if (!editData.rut) throw new Error("El RUT es obligatorio para crear el acceso.");

            let photoUrl = editData.photo_url;
            if (editData.photo_file) {
                const ext = editData.photo_file.name.split('.').pop();
                const path = `somyl_rrhh/${currentEmployee.isNew ? 'new' : currentEmployee.id}/${Date.now()}.${ext}`;
                await supabase.storage.from('rrhh-files').upload(path, editData.photo_file);
                photoUrl = supabase.storage.from('rrhh-files').getPublicUrl(path).data.publicUrl;
            }

            const payload = {
                first_name: editData.first_name, last_name: editData.last_name, rut: cleanRut(editData.rut),
                nationality: editData.nationality || 'Chilena',
                birth_date: editData.birth_date || null,
                job_id: editData.job_id, department_id: editData.department_id,
                salary: editData.salary, hire_date: editData.hire_date,
                termination_date: editData.termination_date || null,
                contract_type_id: editData.contract_type_id,
                marital_status_id: editData.marital_status_id, address: editData.address,
                pension_provider_id: editData.pension_provider_id, health_provider_id: editData.health_provider_id,
                photo_url: photoUrl,
                is_subcontracted: editData.is_subcontracted,
                subcontractor_id: editData.is_subcontracted ? editData.subcontractor_id : null,
                shift_id: editData.shift_id,
                clock_pin: editData.clock_pin,
                supervisor_id: editData.supervisor_id || null
            };

            if (editData.clock_pin && editData.rut) {
                await createWorkerAuth(editData.rut, editData.clock_pin, `${editData.first_name} ${editData.last_name}`);
            }

            if (currentEmployee.isNew) await supabase.from('rrhh_employees').insert(payload);
            else await supabase.from('rrhh_employees').update(payload).eq('id', currentEmployee.id);

            alert('Guardado!'); handleClose(); initData();
        } catch (error) { alert(error.message); } finally { setUploading(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm("¿Eliminar?")) return;
        try {
            await supabase.from('rrhh_employees').delete().eq('id', currentEmployee.id);
            handleClose(); initData();
        } catch (error) { alert(error.message); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Empleados</h1>
                    <p className="text-sm text-slate-500">Gestión completa de personal y ficha electrónica</p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm flex items-center gap-2 text-sm"
                >
                    <span className="text-lg">+</span>
                    Nuevo Empleado
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Empleado</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cargo</th>
                                <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Cargando base de datos...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">No se encontraron empleados</td></tr>
                            ) : (
                                employees.map(e => (
                                    <tr key={e.id} className="hover:bg-blue-50/30 transition-colors group border-b border-slate-50 last:border-0">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                    {e.first_name?.[0]}{e.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">{e.first_name} {e.last_name}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono">{e.rut || 'Sin RUT'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-slate-700">{e.job?.name || '-'}</span>
                                                <span className="text-[10px] text-slate-400">Departamento TBD</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {e.is_subcontracted ?
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">
                                                    Externo
                                                </span> :
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                    Planta
                                                </span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                Activo
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleOpenEdit(e)}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                Ver Ficha
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {employees.length > 0 && (
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                        <p>Mostrando <span className="font-bold text-slate-700">{employees.length}</span> registros</p>
                    </div>
                )}
            </div>

            <EmployeeDetailDrawer
                currentEmployee={currentEmployee} editData={editData} setEditData={setEditData}
                handleSave={handleSave} handleDelete={handleDelete} handleClose={handleClose} uploading={uploading}
                masters={masters} handleFileUpload={handleFileUpload} allEmployees={employees}
            />
        </div>
    );
};

export default EmployeeList;