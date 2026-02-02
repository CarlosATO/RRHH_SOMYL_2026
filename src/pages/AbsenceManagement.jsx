import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { usePendingRequests } from '../hooks/usePendingRequests';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  MoreHorizontal,
  Plane,
  FileText,
  AlertCircle
} from 'lucide-react';

const AbsenceManagement = () => {
  const { user } = useAuth();
  const pendingCount = usePendingRequests(user);

  // Estados de Datos
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    employee_id: '',
    type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Cargar metadatos (Tipos y Empleados)
      const [typesRes, empsRes] = await Promise.all([
        supabase.from('rrhh_absence_types').select('*'),
        supabase.from('rrhh_employees').select('id, first_name, last_name').order('last_name')
      ]);

      setTypes(typesRes.data || []);
      setEmployees(empsRes.data || []);

      // 2. Cargar Solicitudes
      const { data, error } = await supabase
        .from('rrhh_employee_absences')
        .select(`
                    *,
                    employee:employee_id(first_name, last_name),
                    type:type_id(name, color)
                `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);

    } catch (error) {
      console.error("Error cargando ausencias:", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // --- ACCIONES ---

  const handleStatusChange = async (requestId, newStatus) => {
    if (!window.confirm(`¿Confirmas ${newStatus === 'approved' ? 'APROBAR' : 'RECHAZAR'} esta solicitud?`)) return;

    try {
      const { error } = await supabase
        .from('rrhh_employee_absences')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      alert("La fecha de inicio no puede ser posterior a la fecha de término.");
      return;
    }

    try {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      // Cálculo simple de días (incluye fines de semana por ahora, MVP)
      const diffTime = Math.abs(endDate - startDate);
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const { error } = await supabase
        .from('rrhh_employee_absences')
        .insert({
          employee_id: formData.employee_id,
          type_id: formData.type_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          total_days: totalDays,
          reason: formData.reason,
          status: 'pending' // Por defecto pendiente
        });

      if (error) throw error;

      alert('Solicitud creada correctamente.');
      setShowRequestForm(false);
      setFormData({ employee_id: '', type_id: '', start_date: '', end_date: '', reason: '' });
      fetchData();

    } catch (error) {
      alert(`Error al crear solicitud: ${error.message}`);
    }
  };

  // --- FILTROS ---
  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.employee?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.employee?.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 size={12} /> Aprobado</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800"><XCircle size={12} /> Rechazado</span>;
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><Clock size={12} /> Pendiente</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ausencias y Permisos</h1>
          <p className="text-slate-500 mt-1">Gestiona vacaciones, licencias y días administrativos.</p>
        </div>
        <button
          onClick={() => setShowRequestForm(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          Nueva Solicitud
        </button>
      </div>

      {/* Main Content: Stats & Filters could go here later */}

      {/* Modal Formulario */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Registrar Ausencia</h3>
              <button onClick={() => setShowRequestForm(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Empleado</label>
                  <div className="relative">
                    <select
                      value={formData.employee_id}
                      onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                      required
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    >
                      <option value="">Seleccionar...</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Ausencia</label>
                  <div className="relative">
                    <select
                      value={formData.type_id}
                      onChange={e => setFormData({ ...formData, type_id: e.target.value })}
                      required
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    >
                      <option value="">Seleccionar...</option>
                      {types.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Desde</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Motivo / Detalle</label>
                <textarea
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Explique brevemente el motivo de la ausencia..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                >
                  Guardar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Listado de Solicitudes */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar empleado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
            {['all', 'pending', 'approved', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors whitespace-nowrap ${filterStatus === status
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {status === 'all' ? 'Todos' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Fechas</th>
                <th className="px-6 py-4">Motivo</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 text-sm">
                    No se encontraron solicitudes.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{req.employee?.first_name} {req.employee?.last_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${req.type?.name === 'Vacaciones' ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
                        <span className="text-sm font-medium text-slate-700">{req.type?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 flex flex-col">
                        <span className="font-medium">
                          {new Date(req.start_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                          {' - '}
                          {new Date(req.end_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-xs text-slate-400">{req.total_days} días</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-500 max-w-xs truncate" title={req.reason}>{req.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStatusChange(req.id, 'approved')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg tooltip"
                            title="Aprobar"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(req.id, 'rejected')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Rechazar"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AbsenceManagement;