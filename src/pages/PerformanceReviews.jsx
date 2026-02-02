import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    Users,
    Star,
    Search,
    Calendar,
    Award,
    Save,
    X,
    MessageSquare,
    CheckCircle2
} from 'lucide-react';

const PerformanceReviews = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [reviews, setReviews] = useState([]); // Evaluaciones existentes del periodo
    const [reviewModalOpen, setReviewModalOpen] = useState(false);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [period, setPeriod] = useState('2026-Q1');

    // Estado del Formulario
    const [ratings, setRatings] = useState({
        responsibility: 0,
        quality: 0,
        teamwork: 0,
        proactivity: 0,
        compliance: 0
    });
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);

    const skillsList = [
        { id: 'responsibility', label: 'Responsabilidad y Puntualidad' },
        { id: 'quality', label: 'Calidad del Trabajo' },
        { id: 'teamwork', label: 'Trabajo en Equipo' },
        { id: 'proactivity', label: 'Iniciativa' },
        { id: 'compliance', label: 'Cumplimiento de Normas' }
    ];

    useEffect(() => {
        if (user) fetchData();
    }, [user, period]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Cargar empleados activos
            const { data: emps, error: empError } = await supabase
                .from('rrhh_employees')
                .select('*')
                .order('last_name');

            if (empError) throw empError;

            // 2. Cargar evaluaciones del periodo seleccionado
            const { data: revs, error: revError } = await supabase
                .from('rrhh_evaluations')
                .select('*')
                .eq('period', period);

            if (revError) throw revError;

            setEmployees(emps || []);
            setReviews(revs || []);

        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReview = (employee) => {
        // Verificar si ya existe evaluación
        const existingReview = reviews.find(r => r.employee_id === employee.id);

        if (existingReview) {
            alert("Este empleado ya tiene una evaluación en este periodo. Edición no implementada en MVP.");
            return;
        }

        setSelectedEmployee(employee);
        setRatings({ responsibility: 0, quality: 0, teamwork: 0, proactivity: 0, compliance: 0 });
        setFeedback('');
        setReviewModalOpen(true);
    };

    const handleSaveReview = async () => {
        // Validar que todos los campos tengan calificación
        const values = Object.values(ratings);
        if (values.some(v => v === 0)) {
            alert("Por favor califica todos los criterios antes de guardar.");
            return;
        }

        setSaving(true);
        try {
            // Calcular promedio
            const sum = values.reduce((a, b) => a + b, 0);
            const average = (sum / values.length).toFixed(1);

            // 1. Insertar Cabecera
            const { data: reviewData, error: reviewError } = await supabase
                .from('rrhh_evaluations')
                .insert({
                    employee_id: selectedEmployee.id,
                    reviewer_id: user.id, // OJO: Verificar si user.id mapea a usuarios_sso.id o auth.users.id
                    period: period,
                    status: 'completed',
                    final_score: average,
                    feedback: feedback
                })
                .select()
                .single();

            if (reviewError) throw reviewError;

            // 2. Insertar Detalle de Skills
            const skillsToInsert = skillsList.map(skill => ({
                evaluation_id: reviewData.id,
                skill_name: skill.label,
                score: ratings[skill.id]
            }));

            const { error: skillsError } = await supabase
                .from('rrhh_evaluation_skills')
                .insert(skillsToInsert);

            if (skillsError) throw skillsError;

            alert('Evaluación guardada exitosamente!');
            setReviewModalOpen(false);
            fetchData(); // Recargar para actualizar estados de botones

        } catch (error) {
            console.error('Error guardando evaluación:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Filtrar empleados
    const filteredEmployees = employees.filter(e =>
        e.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.rut.includes(searchTerm)
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Evaluaciones de Desempeño</h1>
                    <p className="text-slate-500 mt-1">Gestiona el rendimiento y feedback del personal</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <Calendar size={20} className="text-slate-400 ml-2" />
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
                    >
                        <option value="2026-Q1">2026 - Trimestre 1</option>
                        <option value="2026-Q2">2026 - Trimestre 2</option>
                        <option value="2026-Q3">2026 - Trimestre 3</option>
                        <option value="2026-Q4">2026 - Trimestre 4</option>
                    </select>
                </div>
            </div>

            {/* Buscador */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar empleado por nombre o RUT..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Grid de Empleados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map(emp => {
                    const review = reviews.find(r => r.employee_id === emp.id);
                    return (
                        <div key={emp.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-2xl font-bold text-blue-700 mb-4 border-4 border-white shadow-sm">
                                {emp.first_name[0]}{emp.last_name[0]}
                            </div>

                            <h3 className="font-bold text-slate-900 text-lg">{emp.first_name} {emp.last_name}</h3>
                            <p className="text-sm text-slate-500 mb-6">{emp.job?.name || 'Cargo sin definir'}</p>

                            {review ? (
                                <div className="mt-auto w-full">
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <div className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Evaluado
                                        </div>
                                        <div className="flex items-center text-amber-500 font-bold">
                                            <span className="text-lg mr-1">{review.final_score}</span>
                                            <Star size={16} fill="currentColor" />
                                        </div>
                                    </div>
                                    <button
                                        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
                                        disabled
                                    >
                                        Ver Detalles
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleOpenReview(emp)}
                                    className="mt-auto w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                                >
                                    <Award size={18} />
                                    Evaluar Desempeño
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal de Evaluación */}
            {reviewModalOpen && selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Nueva Evaluación</h2>
                                    <p className="text-sm text-slate-500">
                                        {selectedEmployee.first_name} {selectedEmployee.last_name} • {period}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Average Score Indicator */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Promedio Actual</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${Object.values(ratings).reduce((a, b) => a + b, 0) / 5 >= 4 ? 'text-emerald-600' :
                                        (Object.values(ratings).reduce((a, b) => a + b, 0) / 5 >= 3 ? 'text-amber-500' : 'text-red-500')
                                    }`}>
                                    {(Object.values(ratings).reduce((a, b) => a + b, 0) / 5).toFixed(1)}
                                </span>
                                <Star size={20} className="text-amber-400" fill="currentColor" />
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">

                            {/* Skills Section */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <Star size={18} className="text-amber-500" />
                                    Criterios de Evaluación
                                </h3>

                                <div className="space-y-3">
                                    {skillsList.map(skill => (
                                        <div key={skill.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl gap-3">
                                            <span className="font-medium text-slate-700">{skill.label}</span>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setRatings(prev => ({ ...prev, [skill.id]: star }))}
                                                        className={`p-1 transition-all hover:scale-110 ${ratings[skill.id] >= star ? 'text-amber-400' : 'text-slate-300'}`}
                                                    >
                                                        <Star size={24} fill={ratings[skill.id] >= star ? "currentColor" : "none"} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback Section */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <MessageSquare size={18} className="text-blue-500" />
                                    Feedback General
                                </h3>
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Ingrese comentarios sobre el desempeño general..."
                                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                />
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setReviewModalOpen(false)}
                                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveReview}
                                disabled={saving}
                                className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Guardando...' : (
                                    <>
                                        <Save size={18} />
                                        Guardar Evaluación
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceReviews;
