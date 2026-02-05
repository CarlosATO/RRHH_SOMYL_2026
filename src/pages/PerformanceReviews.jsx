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
    CheckCircle2,
    Filter
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
        { id: 'responsibility', label: 'Responsabilidad' },
        { id: 'quality', label: 'Calidad' },
        { id: 'teamwork', label: 'Equipo' },
        { id: 'proactivity', label: 'Proactividad' },
        { id: 'compliance', label: 'Normas' }
    ];

    useEffect(() => {
        if (user) fetchData();
    }, [user, period]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Cargar empleados activos con relaciones
            const { data: emps, error: empError } = await supabase
                .from('rrhh_employees')
                .select('*, job:job_id(name), department:department_id(name)')
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
        const existingReview = reviews.find(r => r.employee_id === employee.id);
        if (existingReview) {
            alert("Empleado ya evaluado en este periodo.");
            return;
        }

        setSelectedEmployee(employee);
        setRatings({ responsibility: 0, quality: 0, teamwork: 0, proactivity: 0, compliance: 0 });
        setFeedback('');
        setReviewModalOpen(true);
    };

    const handleSaveReview = async () => {
        const values = Object.values(ratings);
        if (values.some(v => v === 0)) {
            alert("Califica todos los criterios.");
            return;
        }

        setSaving(true);
        try {
            const sum = values.reduce((a, b) => a + b, 0);
            const average = (sum / values.length).toFixed(1);

            const { data: reviewData, error: reviewError } = await supabase
                .from('rrhh_evaluations')
                .insert({
                    employee_id: selectedEmployee.id,
                    reviewer_id: user.id,
                    period: period,
                    status: 'completed',
                    final_score: average,
                    feedback: feedback
                })
                .select()
                .single();

            if (reviewError) throw reviewError;

            const skillsToInsert = skillsList.map(skill => ({
                evaluation_id: reviewData.id,
                skill_name: skill.label,
                score: ratings[skill.id]
            }));

            const { error: skillsError } = await supabase
                .from('rrhh_evaluation_skills')
                .insert(skillsToInsert);

            if (skillsError) throw skillsError;

            setReviewModalOpen(false);
            fetchData();

        } catch (error) {
            alert('Error: ' + error.message);
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
        <div className="space-y-4 animate-in fade-in duration-500 max-w-7xl mx-auto font-sans">
            {/* Header Compacto */}
            <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                        <Award size={20} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-800 leading-tight">Evaluaciones</h1>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Gestión de Desempeño</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Period Selector Compact */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                        <Calendar size={14} className="text-slate-400" />
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer py-0 pl-0 pr-6 h-auto"
                        >
                            <option value="2026-Q1">2026 - Q1</option>
                            <option value="2026-Q2">2026 - Q2</option>
                            <option value="2026-Q3">2026 - Q3</option>
                            <option value="2026-Q4">2026 - Q4</option>
                        </select>
                    </div>

                    {/* Search Compact */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-48 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 text-xs shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Grid de Empleados Compacto (Estilo Dashboard) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredEmployees.map(emp => {
                    const review = reviews.find(r => r.employee_id === emp.id);
                    return (
                        <div key={emp.id} className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between gap-3 group">

                            {/* Avatar & Info */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex-none flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {emp.first_name[0]}{emp.last_name[0]}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-800 text-xs truncate leading-tight">
                                        {emp.first_name} {emp.last_name}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 truncate font-medium">
                                        {emp.job?.name || 'Sin cargo'}
                                    </p>
                                </div>
                            </div>

                            {/* Action / Status */}
                            <div className="flex-none">
                                {review ? (
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100">
                                            <CheckCircle2 size={10} />
                                            <span>{review.final_score}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleOpenReview(emp)}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                        title="Evaluar"
                                    >
                                        <Award size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal - Mantenido funcional pero ajustado visualmente */}
            {reviewModalOpen && selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm">
                                    {selectedEmployee.first_name[0]}
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-800">Evaluar Desempeño</h2>
                                    <p className="text-xs text-slate-500">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                                </div>
                            </div>
                            <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full border border-slate-200 hover:border-slate-300 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-5">
                            <div className="space-y-3">
                                {skillsList.map(skill => (
                                    <div key={skill.id} className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-600 w-32 truncate" title={skill.label}>{skill.label}</span>
                                        <div className="flex gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-100">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    onClick={() => setRatings(prev => ({ ...prev, [skill.id]: star }))}
                                                    className={`transition-transform hover:scale-110 ${ratings[skill.id] >= star ? 'text-amber-400 drop-shadow-sm' : 'text-slate-200'}`}
                                                >
                                                    <Star size={18} fill={ratings[skill.id] >= star ? "currentColor" : "none"} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Escribe un comentario breve..."
                                className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-xs resize-none placeholder:text-slate-400"
                            />
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/80 rounded-b-xl">
                            <button onClick={() => setReviewModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveReview}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={14} /> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceReviews;
