import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ShiftSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado del formulario
  const initialForm = {
    name: '',
    start_time: '08:30',
    end_time: '18:30',
    break_minutes: 60,
    tolerance_minutes: 15,
    work_days: [1, 2, 3, 4, 5] // Lun-Vie por defecto
  };
  const [formData, setFormData] = useState(initialForm);

  const daysOfWeek = [
    { id: 1, label: 'L', name: 'Lunes' },
    { id: 2, label: 'M', name: 'Martes' },
    { id: 3, label: 'M', name: 'Miércoles' },
    { id: 4, label: 'J', name: 'Jueves' },
    { id: 5, label: 'V', name: 'Viernes' },
    { id: 6, label: 'S', name: 'Sábado' },
    { id: 7, label: 'D', name: 'Domingo' }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('rrhh_turnos').select('*').order('name');
      if (error) throw error;
      setShifts(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const toggleDay = (dayId) => {
    setFormData(prev => {
      const currentDays = prev.work_days || [];
      if (currentDays.includes(dayId)) {
        return { ...prev, work_days: currentDays.filter(d => d !== dayId).sort() };
      } else {
        return { ...prev, work_days: [...currentDays, dayId].sort() };
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      // Formatear tiempos para asegurar HH:MM
      const payload = {
        name: formData.name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        break_minutes: parseInt(formData.break_minutes),
        tolerance_minutes: parseInt(formData.tolerance_minutes),
        work_days: formData.work_days
      };

      const { error } = await supabase.from('rrhh_turnos').insert(payload);
      if (error) throw error;

      setFormData(initialForm);
      fetchData();
    } catch (error) { alert('Error: ' + error.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Borrar turno permanentemente?")) return;
    try {
      await supabase.from('rrhh_turnos').delete().eq('id', id);
      fetchData();
    } catch (error) { alert("Error al eliminar."); }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Cargando definición de turnos...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">

        {/* Header Corporativo */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Turnos</h2>
            <p className="text-slate-500 mt-1">Configura los horarios laborales, días hábiles y tolerancias de asistencia.</p>
          </div>
          <button
            onClick={() => navigate('/employees')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm font-semibold text-sm"
          >
            ⬅ Volver a Personal
          </button>
        </div>

        {/* Card de Configuración */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="bg-slate-50/50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 p-1.5 rounded-md"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
              Definir Nuevo Turno
            </h3>
          </div>

          <div className="p-8">
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Nombre - Full Width on Mobile, 4 cols on Desktop */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Turno</label>
                <input
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-slate-900"
                  placeholder="Ej: Administrativo Central"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Horarios */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entrada</label>
                <input type="time" className="w-full border border-slate-300 rounded-lg p-2.5 text-center font-mono text-slate-900"
                  value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} required />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Salida</label>
                <input type="time" className="w-full border border-slate-300 rounded-lg p-2.5 text-center font-mono text-slate-900"
                  value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} required />
              </div>

              {/* Parametros Extra */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Colación (min)</label>
                <div className="relative">
                  <input type="number" className="w-full border border-slate-300 rounded-lg p-2.5 text-center font-mono text-slate-900"
                    value={formData.break_minutes} onChange={e => setFormData({ ...formData, break_minutes: e.target.value })} required />
                </div>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tolerancia (min)</label>
                <div className="relative">
                  <input type="number" className="w-full border border-slate-300 rounded-lg p-2.5 text-center font-mono text-slate-900"
                    value={formData.tolerance_minutes} onChange={e => setFormData({ ...formData, tolerance_minutes: e.target.value })} required />
                </div>
              </div>

              {/* Selector de Días - Full Row */}
              <div className="md:col-span-12 space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Días Laborales (Semana Corrida)</label>
                <div className="flex flex-wrap gap-3">
                  {daysOfWeek.map(day => {
                    const isSelected = formData.work_days.includes(day.id);
                    return (
                      <button
                        type="button"
                        key={day.id}
                        onClick={() => toggleDay(day.id)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-sm
                          ${isSelected
                            ? 'bg-blue-600 text-white shadow-blue-200 ring-2 ring-blue-100 ring-offset-1'
                            : 'bg-white border text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                          }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                  <span className="text-sm text-slate-400 self-center ml-2 italic">
                    {formData.work_days.length === 5 ? 'Semana Administrativa' :
                      formData.work_days.length === 6 ? 'Lunes a Sábado' :
                        `${formData.work_days.length} días seleccionados`}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="md:col-span-12 pt-4 border-t border-slate-100 flex justify-end">
                <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2">
                  <span>💾</span> Guardar Turno
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Tabla de Resultados */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-5">Nombre Turno</th>
                <th className="p-5 text-center">Horario</th>
                <th className="p-5 text-center">Días</th>
                <th className="p-5 text-center">Detalles</th>
                <th className="p-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay turnos definidos aún.</td></tr>
              ) : (
                shifts.map(s => (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-5 font-bold text-slate-800">{s.name}</td>
                    <td className="p-5 text-center font-mono text-slate-600 bg-slate-50/50">
                      {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-1">
                        {daysOfWeek.map(d => (
                          <span key={d.id} className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold 
                            ${(s.work_days || []).includes(d.id) ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-300'}`}>
                            {d.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-5 text-center text-sm text-slate-500">
                      <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-100 mr-2 text-xs">☕ {s.break_minutes}'</span>
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 text-xs">⏱ {s.tolerance_minutes}' tol</span>
                    </td>
                    <td className="p-5 text-right">
                      <button onClick={() => handleDelete(s.id)} className="text-slate-400 hover:text-red-600 transition-colors p-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
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

export default ShiftSettings;