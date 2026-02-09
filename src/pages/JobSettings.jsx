import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const JobSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newJobName, setNewJobName] = useState('');

  // --- Lógica de Carga de Datos ---



  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      // RLS (Row Level Security) nos protege, pero el eq() es más rápido
      const { data, error } = await supabase
        .from('rrhh_cargos')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user, fetchJobs]);

  // --- Lógica de Creación y Eliminación (CRUD) ---

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!newJobName.trim()) return;

    try {
      const { error } = await supabase
        .from('rrhh_cargos')
        .insert({
          name: newJobName.trim(),
        });

      if (error) throw error;

      setNewJobName('');
      fetchJobs();
    } catch (error) {
      // El error 23505 es por "UNIQUE constraint violation" (ya existe el cargo)
      if (error.code === '23505') {
        alert(`Error: Ya existe un cargo llamado "${newJobName.trim()}" en tu empresa.`)
      } else {
        alert(`Error al crear cargo: ${error.message}`);
      }
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("¿Estás seguro de eliminar este cargo?")) return;

    try {
      // RLS nos protege, el usuario solo puede borrar los de su empresa.
      const { error } = await supabase
        .from('rrhh_cargos')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      fetchJobs();
    } catch (error) {
      alert(`Error al eliminar cargo: ${error.message}`);
    }
  };


  if (loading) return <div className="p-10 text-center text-gray-500">Cargando Configuración...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">

        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Configuración de Cargos</h2>
            <p className="text-gray-500 mt-1">Define los cargos permitidos en tu organización. (Máxima Calidad de Datos)</p>
          </div>
          <button
            onClick={() => navigate('/')} // Volver a la ruta raíz (Employee List)
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors shadow-sm font-medium"
          >
            ⬅ Volver a Empleados
          </button>
        </div>

        {/* Sección de Creación */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-100">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Añadir Nuevo Cargo</h3>
          <form onSubmit={handleCreateJob} className="flex gap-4">
            <input
              type="text"
              placeholder="Ej: Jefe de Logística"
              required
              value={newJobName}
              onChange={(e) => setNewJobName(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Guardar Cargo
            </button>
          </form>
        </div>

        {/* Lista de Cargos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-700">Cargos Definidos ({jobs.length})</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {jobs.length === 0 ? (
              <li className="p-6 text-center text-gray-400">No se han definido cargos en tu empresa.</li>
            ) : (
              jobs.map((job) => (
                <li key={job.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-gray-900">{job.name}</span>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Eliminar
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

      </div>
    </div>
  );
};

export default JobSettings;