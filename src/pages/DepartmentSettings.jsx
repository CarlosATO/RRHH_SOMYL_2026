import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DepartmentSettings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newDeptName, setNewDeptName] = useState('');

    // --- Lógica de Carga de Datos ---
    const fetchDepartments = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rrhh_departamentos')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setDepartments(data || []);
        } catch (error) {
            console.error("Error fetching departments:", error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchDepartments();
        }
    }, [user, fetchDepartments]);

    // --- Lógica de Creación y Eliminación (CRUD) ---

    const handleCreateDept = async (e) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;

        try {
            const { error } = await supabase
                .from('rrhh_departamentos')
                .insert({
                    name: newDeptName.trim(),
                });

            if (error) throw error;

            setNewDeptName('');
            fetchDepartments();
        } catch (error) {
            // El error 23505 es por "UNIQUE constraint violation" (ya existe)
            if (error.code === '23505') {
                alert(`Error: Ya existe un departamento llamado "${newDeptName.trim()}" en tu empresa.`)
            } else {
                alert(`Error al crear departamento: ${error.message}`);
            }
        }
    };

    const handleDeleteDept = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este departamento?")) return;

        try {
            const { error } = await supabase
                .from('rrhh_departamentos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            fetchDepartments();
        } catch (error) {
            alert(`Error al eliminar departamento: ${error.message}`);
        }
    };


    if (loading) return <div className="p-10 text-center text-gray-500">Cargando Configuración...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">

                {/* Encabezado */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Configuración de Departamentos</h2>
                        <p className="text-gray-500 mt-1">Gestiona las áreas y departamentos de tu organización.</p>
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
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Añadir Nuevo Departamento</h3>
                    <form onSubmit={handleCreateDept} className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Ej: Recursos Humanos, Operaciones..."
                            required
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value.toUpperCase())}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                            Guardar Departamento
                        </button>
                    </form>
                </div>

                {/* Lista de Departamentos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-100 px-6 py-4 border-b">
                        <h3 className="font-semibold text-gray-700">Departamentos Definidos ({departments.length})</h3>
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {departments.length === 0 ? (
                            <li className="p-6 text-center text-gray-400">No se han definido departamentos.</li>
                        ) : (
                            departments.map((dept) => (
                                <li key={dept.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <span className="font-medium text-gray-900">{dept.name}</span>
                                    <button
                                        onClick={() => handleDeleteDept(dept.id)}
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

export default DepartmentSettings;
