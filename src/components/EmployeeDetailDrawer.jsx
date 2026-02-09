import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import EmployeeDocuments from './EmployeeDocuments';
import EmployeeCertifications from './EmployeeCertifications';
import EmployeeEPP from './EmployeeEPP';

const NATIONALITIES = [
    'Chilena', 'Venezolana', 'Colombiana', 'Peruana', 'Haitiana',
    'Boliviana', 'Argentina', 'Ecuatoriana', 'Brasileña', 'Otra'
];

const formatCLP = (value) => {
    if (!value) return '';
    const number = parseInt(value.toString().replace(/\D/g, ''), 10);
    return isNaN(number) ? '' : new Intl.NumberFormat('es-CL').format(number);
};

const EmployeeDetailDrawer = ({
    currentEmployee,
    editData,
    setEditData,
    handleSave,
    handleDelete,
    handleClose,
    uploading,
    masters,
    handleFileUpload,
    allEmployees,
    initialTab
}) => {
    // If no employee is selected, render nothing
    const isOpen = !!currentEmployee;
    const isNew = currentEmployee?.isNew;
    const [activeTab, setActiveTab] = useState('personal');

    React.useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;

        // Forzar mayúsculas en nombres y dirección
        if (['first_name', 'last_name', 'address'].includes(name)) {
            finalValue = finalValue.toUpperCase();
        }

        setEditData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSalaryChange = (e) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        setEditData(prev => ({ ...prev, salary: rawValue }));
    };

    const previewUrl = editData.photo_file ? URL.createObjectURL(editData.photo_file) : editData.photo_url;

    return (
        <div className="absolute z-50">
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={handleClose}
            />

            {/* Slide-over Drawer */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* 1. Header Sticky */}
                <div className="flex-none bg-white p-4 border-b border-slate-200 flex justify-between items-center z-10 relative shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden ring-2 ring-slate-200">
                            {previewUrl ? (
                                <img src={previewUrl} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{isNew ? 'Nuevo Empleado' : `${editData.first_name} ${editData.last_name}`}</h2>
                            <p className="text-xs text-slate-500">{isNew ? 'Complete la ficha de ingreso' : editData.job_id ? masters.jobs.find(j => j.id === editData.job_id)?.name : 'Sin Cargo Asignado'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <span className="sr-only">Cerrar</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* 2. Navigation Tabs Sticky */}
                <div className="flex-none bg-slate-50 border-b overflow-x-auto relative z-10">
                    <div className="flex px-4 gap-4">
                        {['personal', 'contract', 'social', 'acred', 'files', 'epp'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap px-1 uppercase tracking-wide ${activeTab === tab
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                {tab === 'personal' && 'Información Personal'}
                                {tab === 'contract' && 'Contrato y Cargo'}
                                {tab === 'social' && 'Previsión y Salud'}
                                {tab === 'acred' && 'Acreditaciones'}
                                {tab === 'files' && 'Carpeta Digital'}
                                {tab === 'epp' && 'Dotación / EPP'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Content Scrollable area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="max-w-3xl mx-auto">
                        {activeTab === 'personal' && (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
                                <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">Datos Personales</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    {/* Photo Upload inside Content */}
                                    <div className="col-span-full flex items-center gap-4 pb-4 border-b border-slate-100">
                                        <div className="relative group">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden ring-2 ring-white shadow-sm">
                                                {previewUrl ? (
                                                    <img src={previewUrl} className="w-full h-full object-cover" alt="Profile" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full cursor-pointer hover:bg-blue-700 shadow-sm transition-transform hover:scale-110">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0])} className="hidden" />
                                            </label>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">Fotografía</h4>
                                            <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs leading-tight">Suba una foto tipo carnet. Max 5MB.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre</label>
                                        <input name="first_name" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Ej: JUAN" value={editData.first_name || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Apellido</label>
                                        <input name="last_name" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Ej: PÉREZ" value={editData.last_name || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">RUT</label>
                                        <input name="rut" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="12.345.678-9" value={editData.rut || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado Civil</label>
                                        <select name="marital_status_id" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none" value={editData.marital_status_id || ''} onChange={handleInputChange}>
                                            <option value="">-- Seleccione --</option>
                                            {masters.maritalStatus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nacionalidad</label>
                                        <select
                                            name="nationality"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            value={editData.nationality || 'Chilena'}
                                            onChange={handleInputChange}
                                        >
                                            {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha Nacimiento</label>
                                        <input name="birth_date" type="date" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all" value={editData.birth_date || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="col-span-full space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dirección Particular</label>
                                        <input name="address" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Calle, Número, Comuna" value={editData.address || ''} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'contract' && (
                            <div className="space-y-4 animate-fadeIn">
                                {/* Seccion PIN */}
                                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-4 shadow-sm">
                                    <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-indigo-900">Acceso Reloj Control</h4>
                                        <p className="text-[10px] text-indigo-600 mt-0.5 mb-2">Defina un PIN numérico para el marcaje de asistencia.</p>
                                        <input
                                            name="clock_pin"
                                            type="text"
                                            maxLength={6}
                                            placeholder="PIN"
                                            className="w-32 bg-white border border-indigo-200 rounded-md p-1.5 text-center font-mono text-sm tracking-widest focus:ring-1 focus:ring-indigo-200 focus:border-indigo-500 transition-all font-bold text-indigo-900 placeholder:text-indigo-200"
                                            value={editData.clock_pin || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-full border-b pb-2 mb-0">
                                        <h3 className="text-sm font-bold text-slate-800">Datos Contractuales</h3>
                                    </div>

                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cargo</label>
                                        <select name="job_id" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none" value={editData.job_id || ''} onChange={handleInputChange}>
                                            <option value="">Seleccione...</option>
                                            {masters.jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Department with Create New Logic */}
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Departamento</label>
                                        <div className="flex gap-2">
                                            {!editData.showNewDeptInput ? (
                                                <select
                                                    name="department_id"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                                                    value={editData.department_id || ''}
                                                    onChange={(e) => {
                                                        if (e.target.value === '__new__') {
                                                            setEditData(prev => ({ ...prev, showNewDeptInput: true }));
                                                        } else {
                                                            handleInputChange(e);
                                                        }
                                                    }}
                                                >
                                                    <option value="">Seleccione...</option>
                                                    {masters.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                    <option value="__new__" className="font-bold text-blue-600">+ Crear Nuevo...</option>
                                                </select>
                                            ) : (
                                                <div className="flex gap-2 w-full animate-fadeIn">
                                                    <input
                                                        autoFocus
                                                        placeholder="Nombre depto..."
                                                        className="w-full border border-blue-300 rounded-md px-2 py-1.5 text-xs"
                                                        value={editData.newDeptName || ''}
                                                        onChange={(e) => setEditData(prev => ({ ...prev, newDeptName: e.target.value.toUpperCase() }))}
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (!editData.newDeptName?.trim()) return;
                                                                try {
                                                                    const { data, error } = await supabase.from('rrhh_departamentos').insert({ name: editData.newDeptName.trim() }).select().single();
                                                                    if (error) throw error;
                                                                    masters.departments.push(data);
                                                                    setEditData(prev => ({ ...prev, department_id: data.id, showNewDeptInput: false, newDeptName: '' }));
                                                                } catch (err) { alert(err.message); }
                                                            }
                                                            if (e.key === 'Escape') setEditData(prev => ({ ...prev, showNewDeptInput: false, newDeptName: '' }));
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (!editData.newDeptName?.trim()) return;
                                                            try {
                                                                const { data, error } = await supabase.from('rrhh_departamentos').insert({ name: editData.newDeptName.trim() }).select().single();
                                                                if (error) throw error;
                                                                masters.departments.push(data);
                                                                setEditData(prev => ({ ...prev, department_id: data.id, showNewDeptInput: false, newDeptName: '' }));
                                                            } catch (err) { alert(err.message); }
                                                        }}
                                                        className="bg-blue-600 text-white px-2 rounded-md hover:bg-blue-700 text-xs"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditData(prev => ({ ...prev, showNewDeptInput: false, newDeptName: '' }))}
                                                        className="text-slate-400 hover:text-slate-600 px-1 text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sueldo Base (CLP)</label>
                                        <input
                                            name="salary"
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                                            placeholder="$ 0"
                                            value={formatCLP(editData.salary)}
                                            onChange={handleSalaryChange}
                                        />
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha Ingreso</label>
                                        <input name="hire_date" type="date" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none" value={editData.hire_date || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha Término (Opcional)</label>
                                        <input name="termination_date" type="date" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none" value={editData.termination_date || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo Contrato</label>
                                        <select name="contract_type_id" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none" value={editData.contract_type_id || ''} onChange={handleInputChange}>
                                            <option value="">Seleccione...</option>
                                            {masters.contractTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Shift with Create New Logic */}
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Turno Asignado</label>
                                        <div className="flex gap-2">
                                            {!editData.showNewShiftInput ? (
                                                <select
                                                    name="shift_id"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                                                    value={editData.shift_id || ''}
                                                    onChange={(e) => {
                                                        if (e.target.value === '__new__') {
                                                            setEditData(prev => ({ ...prev, showNewShiftInput: true }));
                                                        } else {
                                                            handleInputChange(e);
                                                        }
                                                    }}
                                                >
                                                    <option value="">-- Sin Turno --</option>
                                                    {masters.shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)})</option>)}
                                                    <option value="__new__" className="font-bold text-blue-600">+ Crear Nuevo...</option>
                                                </select>
                                            ) : (
                                                <div className="flex gap-2 w-full animate-fadeIn">
                                                    <input
                                                        autoFocus
                                                        placeholder="Nombre Turno..."
                                                        className="w-full border border-blue-300 rounded-md px-2 py-1.5 text-xs"
                                                        value={editData.newShiftName || ''}
                                                        onChange={(e) => setEditData(prev => ({ ...prev, newShiftName: e.target.value.toUpperCase() }))}
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (!editData.newShiftName?.trim()) return;
                                                                try {
                                                                    const payload = {
                                                                        name: editData.newShiftName.trim(),
                                                                        start_time: '08:30',
                                                                        end_time: '18:30',
                                                                        break_minutes: 60,
                                                                        work_days: [1, 2, 3, 4, 5]
                                                                    };
                                                                    const { data, error } = await supabase.from('rrhh_turnos').insert(payload).select().single();
                                                                    if (error) throw error;
                                                                    masters.shifts.push(data);
                                                                    setEditData(prev => ({ ...prev, shift_id: data.id, showNewShiftInput: false, newShiftName: '' }));
                                                                } catch (err) { alert(err.message); }
                                                            }
                                                            if (e.key === 'Escape') setEditData(prev => ({ ...prev, showNewShiftInput: false, newShiftName: '' }));
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (!editData.newShiftName?.trim()) return;
                                                            try {
                                                                const payload = {
                                                                    name: editData.newShiftName.trim(),
                                                                    start_time: '08:30',
                                                                    end_time: '18:30',
                                                                    break_minutes: 60,
                                                                    work_days: [1, 2, 3, 4, 5]
                                                                };
                                                                const { data, error } = await supabase.from('rrhh_turnos').insert(payload).select().single();
                                                                if (error) throw error;
                                                                masters.shifts.push(data);
                                                                setEditData(prev => ({ ...prev, shift_id: data.id, showNewShiftInput: false, newShiftName: '' }));
                                                            } catch (err) { alert(err.message); }
                                                        }}
                                                        className="bg-blue-600 text-white px-2 rounded-md text-xs hover:bg-blue-700"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditData(prev => ({ ...prev, showNewShiftInput: false, newShiftName: '' }))}
                                                        className="text-slate-400 hover:text-slate-600 px-1 text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Supervisor */}
                                    <div className="col-span-full pt-2 border-t border-dashed border-slate-200">
                                        <label className="text-[10px] font-bold text-blue-800 uppercase mb-1 block tracking-wider">Supervisor / Jefe Directo</label>
                                        <select
                                            name="supervisor_id"
                                            className="w-full border-blue-200 bg-blue-50/50 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-200 focus:border-blue-500 transition-all appearance-none"
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
                                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 mt-4 shadow-sm">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className="relative inline-block w-8 h-5 align-middle select-none transition duration-200 ease-in">
                                            <input type="checkbox" name="is_subcontracted" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" checked={editData.is_subcontracted || false} onChange={handleInputChange} />
                                            <label className="toggle-label block overflow-hidden h-5 rounded-full bg-orange-300 cursor-pointer"></label>
                                        </div>
                                        <span className="font-bold text-sm text-orange-900">¿Es personal Externo / Subcontratado?</span>
                                    </label>
                                    {editData.is_subcontracted && (
                                        <div className="mt-3 animate-fadeIn">
                                            <label className="text-[10px] font-bold text-orange-800 uppercase block mb-1 tracking-wider">Empresa Contratista</label>
                                            <select name="subcontractor_id" className="w-full bg-white border border-orange-300 rounded-md px-2 py-1.5 text-xs text-slate-900 focus:ring-1 focus:ring-orange-200 focus:border-orange-500 transition-all appearance-none" value={editData.subcontractor_id || ''} onChange={handleInputChange}>
                                                <option value="">-- Seleccionar --</option>
                                                {masters.subcontractors.map(sub => <option key={sub.id} value={sub.id}>{sub.nombre}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'social' && (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                <div className="col-span-full border-b pb-2 mb-0">
                                    <h3 className="text-sm font-bold text-slate-800">Previsión y Salud</h3>
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AFP (Previsión)</label>
                                    <select name="pension_provider_id" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none" value={editData.pension_provider_id || ''} onChange={handleInputChange}>
                                        <option value="">Seleccione...</option>
                                        {masters.pensionProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sistema de Salud</label>
                                    <select name="health_provider_id" className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none" value={editData.health_provider_id || ''} onChange={handleInputChange}>
                                        <option value="">Seleccione...</option>
                                        {masters.healthProviders.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeTab === 'acred' && (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fadeIn">
                                {!isNew ? <EmployeeCertifications employeeId={currentEmployee.id} coursesMaster={masters.courses} /> : <div className="text-center p-12 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-500">Guarde el empleado para gestionar acreditaciones.</div>}
                            </div>
                        )}
                        {activeTab === 'files' && (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fadeIn">
                                {!isNew ? <EmployeeDocuments employeeId={currentEmployee.id} /> : <div className="text-center p-12 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-500">Guarde el empleado para subir documentos.</div>}
                            </div>
                        )}
                        {activeTab === 'epp' && (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fadeIn">
                                {!isNew ? <EmployeeEPP employeeId={currentEmployee.id} /> : <div className="text-center p-12 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-500">Guarde el empleado para gestionar dotación.</div>}
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Footer Fixed */}
                <div className="flex-none p-4 border-t bg-white z-20 shadow-lg">
                    <div className="max-w-3xl mx-auto flex gap-3">
                        <button type="button" onClick={handleSave} disabled={uploading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm shadow-md shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                            {uploading ? <span className="animate-spin">⏳</span> : '💾'}
                            {uploading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        {!isNew && (
                            <button type="button" onClick={handleDelete} className="px-4 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-bold text-sm transition-colors">
                                Eliminar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetailDrawer;
