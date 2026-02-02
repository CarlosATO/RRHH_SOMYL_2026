import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePendingRequests } from '../hooks/usePendingRequests';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- FUNCIÓN HELPER: Limpiar RUT ---
const cleanRut = (value) => {
    if (!value) return '';
    return value.replace(/\./g, '').trim().toLowerCase();
}

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


// --- COMPONENTE AUXILIAR 1: Acreditaciones ---
const EmployeeCertifications = ({ employeeId, coursesMaster }) => {
    const [certs, setCerts] = useState([]);
    const [newCert, setNewCert] = useState({ course_id: '', issue_date: '', expiry_date: '' });
    const [certFile, setCertFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const fetchCerts = useCallback(async () => {
        if (!employeeId) return;
        const { data } = await supabase
            .from('rrhh_employee_certifications')
            .select(`*, course:course_id(name)`)
            .eq('employee_id', employeeId)
            .order('expiry_date', { ascending: true });
        setCerts(data || []);
    }, [employeeId]);

    useEffect(() => { fetchCerts(); }, [fetchCerts]);

    const getStatusColor = (expiryDate) => {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'bg-red-100 text-red-800 border-red-200';
        if (diffDays <= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    };

    const handleSaveCert = async (e) => {
        e.preventDefault();
        if (!newCert.course_id || !certFile) return;
        setUploading(true);
        try {
            const fileExt = certFile.name.split('.').pop();
            const fileName = `somyl_rrhh/${employeeId}/cert_${newCert.course_id}_${Date.now()}.${fileExt}`;
            await supabase.storage.from('rrhh-files').upload(fileName, certFile);
            await supabase.from('rrhh_employee_certifications').insert({
                employee_id: employeeId,
                course_id: newCert.course_id, issue_date: newCert.issue_date,
                expiry_date: newCert.expiry_date, certificate_url: fileName
            });
            alert('Acreditación guardada'); setNewCert({ course_id: '', issue_date: '', expiry_date: '' }); setCertFile(null); fetchCerts();
        } catch (error) { alert(error.message); } finally { setUploading(false); }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                {certs.map(c => (
                    <div key={c.id} className={`p-3 rounded border text-sm flex justify-between ${getStatusColor(c.expiry_date)}`}>
                        <span>{c.course.name} (Vence: {c.expiry_date})</span>
                        {c.certificate_url && <a href={supabase.storage.from('rrhh-files').getPublicUrl(c.certificate_url).data.publicUrl} target="_blank" rel="noreferrer" className="underline">Ver</a>}
                    </div>
                ))}
            </div>
            <form onSubmit={handleSaveCert} className="bg-gray-50 p-4 rounded border space-y-3">
                <h4 className="text-sm font-bold">Nueva Acreditación</h4>
                <select className="w-full border p-2 rounded" value={newCert.course_id} onChange={e => setNewCert({ ...newCert, course_id: e.target.value })} required>
                    <option value="">Curso...</option>
                    {coursesMaster.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="border p-2 rounded" value={newCert.issue_date} onChange={e => setNewCert({ ...newCert, issue_date: e.target.value })} required />
                    <input type="date" className="border p-2 rounded" value={newCert.expiry_date} onChange={e => setNewCert({ ...newCert, expiry_date: e.target.value })} required />
                </div>
                <input type="file" className="text-sm" onChange={e => setCertFile(e.target.files[0])} required />
                <button disabled={uploading} className="w-full bg-slate-800 text-white py-2 rounded text-sm">{uploading ? '...' : 'Guardar'}</button>
            </form>
        </div>
    );
};

// --- COMPONENTE AUXILIAR 2: Documentos ---
const EmployeeDocuments = ({ employeeId }) => {
    const [documents, setDocuments] = useState([]);
    const [newDocType, setNewDocType] = useState('');
    const [newDocFile, setNewDocFile] = useState(null);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    const fetchDocuments = useCallback(async () => {
        if (!employeeId) return;
        const { data } = await supabase.from('rrhh_employee_documents').select('*').eq('employee_id', employeeId);
        setDocuments(data || []);
    }, [employeeId]);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments, employeeId]);

    const handleUploadDocument = async (e) => {
        e.preventDefault();
        setUploadingDoc(true);
        try {
            const fileExt = newDocFile.name.split('.').pop();
            const fileName = `somyl_rrhh/${employeeId}/${newDocType}_${Date.now()}.${fileExt}`;
            await supabase.storage.from('rrhh-files').upload(fileName, newDocFile);
            await supabase.from('rrhh_employee_documents').insert({
                employee_id: employeeId, document_type: newDocType, file_path: fileName
            });
            alert('Subido!'); setNewDocType(''); setNewDocFile(null); fetchDocuments();
        } catch (error) { alert(error.message); } finally { setUploadingDoc(false); }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold border-b pb-2">Carpeta Digital</h3>
            <ul className="space-y-2">
                {documents.map(doc => (
                    <li key={doc.id} className="flex justify-between text-sm bg-white p-2 border rounded">
                        <span>{doc.document_type}</span>
                        <a href={supabase.storage.from('rrhh-files').getPublicUrl(doc.file_path).data.publicUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Ver</a>
                    </li>
                ))}
            </ul>
            <form onSubmit={handleUploadDocument} className="flex gap-2 pt-2">
                <input className="border p-1 rounded text-sm flex-1" placeholder="Ej: Contrato" value={newDocType} onChange={e => setNewDocType(e.target.value)} required />
                <input type="file" className="text-xs w-20" onChange={e => setNewDocFile(e.target.files[0])} required />
                <button disabled={uploadingDoc} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Subir</button>
            </form>
        </div>
    );
};

// --- COMPONENTE AUXILIAR 3: PANEL LATERAL ---
const EmployeeSidePanel = ({
    currentEmployee, editData, setEditData, handleSave, handleDelete, handleClose,
    uploading, masters, handleFileUpload, allEmployees
}) => {
    if (!currentEmployee) return null;
    const isNew = currentEmployee.isNew;
    const [activeTab, setActiveTab] = useState('personal');

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;
        setEditData(prev => ({ ...prev, [name]: finalValue }));
    };

    const previewUrl = editData.photo_file ? URL.createObjectURL(editData.photo_file) : editData.photo_url;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={handleClose}>
            <div
                className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"
                onClick={e => e.stopPropagation()}
            >
                {/* HEADER FIJO */}
                <div className="flex-none bg-white p-6 border-b flex justify-between items-center z-20">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{isNew ? 'Nuevo Empleado' : `${editData.first_name} ${editData.last_name}`}</h2>
                        <p className="text-sm text-slate-500">{isNew ? 'Complete la ficha de ingreso' : 'Edite la información del personal'}</p>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* TABS FIJAS */}
                <div className="flex-none bg-slate-50 border-b overflow-x-auto">
                    <div className="flex px-6 space-x-6">
                        {['personal', 'contract', 'social', 'acred', 'files'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === tab
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                {tab === 'personal' && 'Información Personal'}
                                {tab === 'contract' && 'Contrato y Cargo'}
                                {tab === 'social' && 'Previsión y Salud'}
                                {tab === 'acred' && 'Acreditaciones'}
                                {tab === 'files' && 'Carpeta Digital'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENIDO SCROLLEABLE */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    {activeTab === 'personal' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                            <div className="col-span-full flex items-center gap-6 pb-6 border-b border-slate-100">
                                <div className="relative group">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden ring-4 ring-white shadow-lg">
                                        {previewUrl ? (
                                            <img src={previewUrl} className="w-full h-full object-cover" alt="Profile" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-700 shadow-sm">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0])} className="hidden" />
                                    </label>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Foto de Perfil</h3>
                                    <p className="text-xs text-slate-500 mt-1">PNG, JPG hasta 5MB</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nombre</label>
                                <input name="first_name" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" placeholder="Ej: Juan" value={editData.first_name || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Apellido</label>
                                <input name="last_name" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" placeholder="Ej: Pérez" value={editData.last_name || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">RUT</label>
                                <input name="rut" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono" placeholder="12.345.678-9" value={editData.rut || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Estado Civil</label>
                                <select name="marital_status_id" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium appearance-none" value={editData.marital_status_id || ''} onChange={handleInputChange}>
                                    <option value="">-- Seleccione --</option>
                                    {masters.maritalStatus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-full space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Dirección Particular</label>
                                <input name="address" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" placeholder="Calle, Número, Comuna" value={editData.address || ''} onChange={handleInputChange} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'contract' && (
                        <div className="space-y-8 animate-fadeIn">
                            {/* PIN */}
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200 flex items-start gap-4 shadow-sm">
                                <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-base font-bold text-indigo-900">Acceso Reloj Control</h4>
                                    <p className="text-xs text-indigo-600 mt-1 mb-3">Defina un PIN numérico para el marcaje en kiosco.</p>
                                    <input
                                        name="clock_pin"
                                        type="text"
                                        maxLength={6}
                                        placeholder="PIN (4-6 dígitos)"
                                        className="w-48 bg-white border border-indigo-300 rounded-lg p-2 text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all font-bold text-indigo-900"
                                        value={editData.clock_pin || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Cargo</label>
                                    <select name="job_id" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" value={editData.job_id || ''} onChange={handleInputChange}>
                                        <option value="">Seleccione...</option>
                                        {masters.jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Departamento</label>
                                    <select name="department_id" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" value={editData.department_id || ''} onChange={handleInputChange}>
                                        <option value="">Seleccione...</option>
                                        {masters.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Sueldo Base (CLP)</label>
                                    <input name="salary" type="number" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" value={editData.salary || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Fecha Ingreso</label>
                                    <input name="hire_date" type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" value={editData.hire_date || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tipo Contrato</label>
                                    <select name="contract_type_id" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" value={editData.contract_type_id || ''} onChange={handleInputChange}>
                                        <option value="">Seleccione...</option>
                                        {masters.contractTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Turno Asignado</label>
                                    <select name="shift_id" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" value={editData.shift_id || ''} onChange={handleInputChange}>
                                        <option value="">-- Sin Turno --</option>
                                        {masters.shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)})</option>)}
                                    </select>
                                </div>
                                {/* Supervisor - Full Width */}
                                <div className="col-span-full pt-4 border-t border-dashed border-slate-200">
                                    <label className="text-xs font-bold text-blue-800 uppercase mb-2 block tracking-wide">Supervisor / Jefe Directo (Organigrama)</label>
                                    <select
                                        name="supervisor_id"
                                        className="w-full border-blue-200 bg-blue-50/50 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all font-medium"
                                        value={editData.supervisor_id || ''}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">-- Sin Jefe (Raíz / CEO) --</option>
                                        {allEmployees && allEmployees
                                            .filter(e => !currentEmployee || e.id !== currentEmployee.id)
                                            .map(boss => (
                                                <option key={boss.id} value={boss.id}>
                                                    {boss.first_name} {boss.last_name} ({boss.job?.name || 'Sin Cargo'})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {/* Subcontratado Toggle */}
                            <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 mt-6 shadow-sm">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                                        <input type="checkbox" name="is_subcontracted" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" checked={editData.is_subcontracted || false} onChange={handleInputChange} />
                                        <label className="toggle-label block overflow-hidden h-6 rounded-full bg-orange-300 cursor-pointer"></label>
                                    </div>
                                    <span className="font-bold text-orange-900">¿Es personal Externo / Subcontratado?</span>
                                </label>
                                {editData.is_subcontracted && (
                                    <div className="mt-4 animate-fadeIn">
                                        <label className="text-xs font-bold text-orange-800 uppercase block mb-1 tracking-wide">Empresa Contratista</label>
                                        <select name="subcontractor_id" className="w-full bg-white border border-orange-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all" value={editData.subcontractor_id || ''} onChange={handleInputChange}>
                                            <option value="">-- Seleccionar --</option>
                                            {masters.subcontractors.map(sub => <option key={sub.id} value={sub.id}>{sub.business_name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'social' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">AFP (Previsión)</label>
                                <select name="pension_provider_id" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" value={editData.pension_provider_id || ''} onChange={handleInputChange}>
                                    <option value="">Seleccione...</option>
                                    {masters.pensionProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Sistema de Salud</label>
                                <select name="health_provider_id" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium" value={editData.health_provider_id || ''} onChange={handleInputChange}>
                                    <option value="">Seleccione...</option>
                                    {masters.healthProviders.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'acred' && (
                        <div className="animate-fadeIn">
                            {!isNew ? <EmployeeCertifications employeeId={currentEmployee.id} coursesMaster={masters.courses} /> : <div className="text-center p-12 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-500">Guarde el empleado para gestionar acreditaciones.</div>}
                        </div>
                    )}
                    {activeTab === 'files' && (
                        <div className="animate-fadeIn">
                            {!isNew ? <EmployeeDocuments employeeId={currentEmployee.id} /> : <div className="text-center p-12 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-500">Guarde el empleado para subir documentos.</div>}
                        </div>
                    )}
                </div>

                {/* FOOTER FIJO */}
                {['personal', 'contract', 'social'].includes(activeTab) && (
                    <div className="flex-none p-6 border-t bg-white z-20">
                        <button type="button" onClick={handleSave} disabled={uploading} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                            {uploading ? <span className="animate-spin">⏳</span> : '💾'}
                            {uploading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        {!isNew && (
                            <button type="button" onClick={handleDelete} className="w-full mt-3 text-red-500 text-xs font-medium hover:text-red-700 hover:underline transition-colors">
                                Eliminar permanentemente
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

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
                supabase.from('rrhh_subcontractors').select('*'),
                supabase.from('rrhh_course_catalog').select('*'),
                supabase.from('rrhh_shifts').select('*')
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
                job_id: editData.job_id, department_id: editData.department_id,
                salary: editData.salary, hire_date: editData.hire_date,
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
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Empleados</h1>
                    <p className="text-slate-500 mt-1">Gestión completa de personal y ficha electrónica</p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                >
                    <span className="text-xl">+</span>
                    Nuevo Empleado
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Empleado</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Cargando base de datos...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">No se encontraron empleados</td></tr>
                            ) : (
                                employees.map(e => (
                                    <tr key={e.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                    {e.first_name?.[0]}{e.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{e.first_name} {e.last_name}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{e.rut || 'Sin RUT'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700">{e.job?.name || '-'}</span>
                                                <span className="text-xs text-slate-400">Departamento TBD</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {e.is_subcontracted ?
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                    Externo
                                                </span> :
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                    Planta
                                                </span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                Activo
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleOpenEdit(e)}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
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

            <EmployeeSidePanel
                currentEmployee={currentEmployee} editData={editData} setEditData={setEditData}
                handleSave={handleSave} handleDelete={handleDelete} handleClose={handleClose} uploading={uploading}
                masters={masters} handleFileUpload={handleFileUpload} allEmployees={employees}
            />
        </div>
    );
};

export default EmployeeList;