import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchEconomicIndicators } from '../services/indicatorsService';
import {
    Calculator,
    Save,
    ArrowLeft,
    TrendingUp,
    DollarSign,
    Briefcase,
    Shield,
    AlertCircle,
    CheckCircle2,
    Calendar,
    RefreshCw
} from 'lucide-react';

const PayrollSettings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Estados de Carga
    const [loading, setLoading] = useState(false);
    const [apiLoading, setApiLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    // Valores Económicos
    const [params, setParams] = useState({
        uf_value: 0,
        utm_value: 0,
        min_wage: 500000,
        top_limit_afp: 84.3,
        top_limit_cesantia: 126.6,
    });

    const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null

    useEffect(() => {
        if (!user) return;

        const loadDataSequence = async () => {
            setLoading(true);
            try {
                const periodDate = `${selectedMonth}-01`;
                const { data } = await supabase
                    .from('rrhh_payroll_parameters')
                    .select('*')
                    .eq('period_date', periodDate)
                    .single();

                if (data) {
                    setParams({
                        uf_value: data.uf_value,
                        utm_value: data.utm_value,
                        min_wage: data.min_wage,
                        top_limit_afp: data.top_limit_afp,
                        top_limit_cesantia: data.top_limit_cesantia
                    });
                }
            } catch (error) {
                // Silent catch
            } finally {
                setLoading(false);
            }

            setApiLoading(true);
            try {
                const apiData = await fetchEconomicIndicators();
                setParams(prev => ({
                    ...prev,
                    uf_value: apiData.uf.valor,
                    utm_value: apiData.utm.valor,
                }));
            } catch (error) {
                console.error("No se pudo auto-actualizar desde la API");
            } finally {
                setApiLoading(false);
            }
        };

        loadDataSequence();
    }, [user, selectedMonth]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSaveStatus(null);
        try {
            const periodDate = `${selectedMonth}-01`;
            const { error } = await supabase
                .from('rrhh_payroll_parameters')
                .upsert({
                    period_date: periodDate,
                    uf_value: params.uf_value,
                    utm_value: params.utm_value,
                    min_wage: params.min_wage,
                    top_limit_afp: params.top_limit_afp,
                    top_limit_cesantia: params.top_limit_cesantia
                }, { onConflict: 'period_date' });

            if (error) throw error;
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (error) {
            setSaveStatus('error');
            alert("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setParams({ ...params, [e.target.name]: parseFloat(e.target.value) });
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 font-sans text-slate-900">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <span className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                                <Calculator size={24} />
                            </span>
                            Parámetros de Remuneración
                        </h1>
                        <p className="text-slate-500 font-medium ml-1">Configuración mensual para cálculo de liquidaciones</p>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all font-medium shadow-sm hover:shadow-md"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Dashboard
                    </button>
                </div>

                {/* API Status Banner */}
                {apiLoading && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <RefreshCw className="text-blue-600 animate-spin" size={20} />
                        <div>
                            <p className="text-sm font-semibold text-blue-900">Sincronizando indicadores...</p>
                            <p className="text-xs text-blue-700">Obteniendo valores actualizados de UF y UTM desde mindicador.cl</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* Main Panel */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Period Selector Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-slate-700">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <Calendar size={20} />
                                </div>
                                <span className="font-semibold">Periodo de Configuración</span>
                            </div>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium outline-none transition-all hover:bg-white"
                            />
                        </div>

                        {/* Economic Indicators Card */}
                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-50 to-white px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                        <TrendingUp size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">Indicadores Económicos</h3>
                                </div>
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    AUTO-SYNC
                                </span>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4 group">
                                    <label className="block text-sm font-bold text-slate-700 flex justify-between">
                                        Valor UF
                                        <span className="text-xs font-normal text-slate-400 group-focus-within:text-blue-500 transition-colors">Unidad de Fomento</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-400 text-lg font-light">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="uf_value"
                                            value={params.uf_value}
                                            onChange={handleChange}
                                            className="block w-full pl-10 pr-4 py-3.5 bg-slate-50 border-transparent text-slate-900 font-mono text-lg rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white hover:bg-slate-100 transition-all font-semibold shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 group">
                                    <label className="block text-sm font-bold text-slate-700 flex justify-between">
                                        Valor UTM
                                        <span className="text-xs font-normal text-slate-400 group-focus-within:text-blue-500 transition-colors">Unidad Tributaria Mensual</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-400 text-lg font-light">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="utm_value"
                                            value={params.utm_value}
                                            onChange={handleChange}
                                            className="block w-full pl-10 pr-4 py-3.5 bg-slate-50 border-transparent text-slate-900 font-mono text-lg rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white hover:bg-slate-100 transition-all font-semibold shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 pt-4 border-t border-slate-100 space-y-4 group">
                                    <label className="block text-sm font-bold text-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={16} className="text-slate-400" />
                                            Sueldo Mínimo Legal
                                        </div>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-400 text-lg font-light">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            name="min_wage"
                                            value={params.min_wage}
                                            onChange={handleChange}
                                            className="block w-full pl-10 pr-4 py-4 bg-slate-50 border-transparent text-slate-900 font-mono text-2xl rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white hover:bg-slate-100 transition-all font-bold shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Side Panel: Legal Limits & Actions */}
                    <div className="space-y-6">
                        {/* Limits Card */}
                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <Shield size={20} />
                                </div>
                                <h3 className="font-bold text-slate-800">Topes Imponibles</h3>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        Tope AFP
                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">UF</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        name="top_limit_afp"
                                        value={params.top_limit_afp}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-right font-mono text-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:bg-slate-50"
                                    />
                                    <p className="text-xs text-slate-400 text-right">Valor referencial: ~{(params.top_limit_afp * params.uf_value).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</p>
                                </div>

                                <div className="pt-4 border-t border-slate-100 space-y-2">
                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        Tope Seguro Cesantía
                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">UF</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        name="top_limit_cesantia"
                                        value={params.top_limit_cesantia}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-right font-mono text-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:bg-slate-50"
                                    />
                                    <p className="text-xs text-slate-400 text-right">Valor referencial: ~{(params.top_limit_cesantia * params.uf_value).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Card */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/20">
                            <h4 className="font-bold text-lg mb-2">Confirmar Cambios</h4>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                Los valores guardados se utilizarán para todos los cálculos de nómina del periodo seleccionado.
                            </p>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${saveStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                            >
                                {loading ? (
                                    <RefreshCw className="animate-spin" />
                                ) : saveStatus === 'success' ? (
                                    <>
                                        <CheckCircle2 size={24} />
                                        Guardado Correctamente
                                    </>
                                ) : (
                                    <>
                                        <Save size={24} />
                                        Guardar Parámetros
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PayrollSettings;