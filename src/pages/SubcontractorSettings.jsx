import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient'; // Mantener por si se usa para auth u otra cosa
import { procurementClient } from '../services/procurementClient'; // Nuevo cliente
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SubcontractorSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Carga de Datos ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // 2. Obtener Subcontratistas desde Proveedores (DB Externa)
      const { data, error } = await procurementClient
        .from('proveedores')
        .select('*')
        .eq('subcontrato', 1)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setSubs(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // --- Eliminar (Soft Delete o Hard Delete según prefieras) ---
  const handleDelete = async (id) => {
    if (!window.confirm("¿Quitar marca de subcontrato? El proveedor seguirá existiendo pero no aparecerá aquí.")) return;

    try {
      // DB Externa
      const { error } = await procurementClient.from('proveedores').update({ subcontrato: 0 }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando empresas...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Empresas Contratistas</h2>
            <p className="text-slate-500 mt-1">
              Visualización de proveedores activos como subcontratistas.
              <span className="block text-xs text-orange-600 font-medium mt-1">⚠ La creación y edición se realiza en el módulo de Adquisiciones.</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/')} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium">
              ⬅ Volver
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b">
              <tr>
                <th className="p-4">Razón Social</th>
                <th className="p-4">RUT</th>
                <th className="p-4">Contacto</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subs.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No hay subcontratistas registrados.</td></tr>
              ) : (
                subs.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{sub.nombre}</td>
                    <td className="p-4 text-slate-600">{sub.rut}</td>
                    <td className="p-4 text-slate-600 text-sm">
                      {sub.contacto}<br />
                      <span className="text-slate-400">{sub.correo}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(sub.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                        Quitar
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

export default SubcontractorSettings;