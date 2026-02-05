import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { fetchEconomicIndicators } from '../services/indicatorsService';
import {
    Calculator,
    Save,
    TrendingUp,
    Shield,
    Calendar,
    RefreshCw,
    CheckCircle2,
    DollarSign,
    Briefcase
} from 'lucide-react';

const PayrollSettings = () => {
    const { user } = useAuth();

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
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto font-sans">

            {/* Header Compacto */}
            <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                        <Calculator size={20} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-800 leading-tight">Parámetros</h1>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Configuración de Remuneraciones</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Period Selector Compact */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                        <Calendar size={14} className="text-slate-400" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer py-0 pl-0 pr-0 h-auto"
                        />
                    </div>
                </div>
            </div>

            {/* API Status Banner Compact */}
            {apiLoading && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex items-center gap-2 shadow-sm">
                    <RefreshCw className="text-blue-600 animate-spin" size={14} />
                    <p className="text-[10px] font-semibold text-blue-900">Sincronizando indicadores desde mindicador.cl...</p>
                </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

                {/* Main Panel: Indicadores */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-500" />
                            <h3 className="text-sm font-bold text-slate-800">Indicadores Económicos</h3>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                            AUTO-SYNC
                        </span>
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* UF */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 flex justify-between">
                                Valor UF
                                <span className="text-[9px] text-slate-400 font-normal">Unidad de Fomento</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="uf_value"
                                    value={params.uf_value}
                                    onChange={handleChange}
                                    className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm rounded-md focus:ring-1 focus:ring-blue-500 font-semibold"
                                />
                            </div>
                        </div>

                        {/* UTM */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 flex justify-between">
                                Valor UTM
                                <span className="text-[9px] text-slate-400 font-normal">Unidad Tributaria</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="utm_value"
                                    value={params.utm_value}
                                    onChange={handleChange}
                                    className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm rounded-md focus:ring-1 focus:ring-blue-500 font-semibold"
                                />
                            </div>
                        </div>

                        {/* Sueldo Mínimo */}
                        <div className="md:col-span-2 pt-3 border-t border-slate-50 space-y-1">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <Briefcase size={12} className="text-slate-400" />
                                Sueldo Mínimo Legal
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                                <input
                                    type="number"
                                    name="min_wage"
                                    value={params.min_wage}
                                    onChange={handleChange}
                                    className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 font-mono text-base rounded-md focus:ring-1 focus:ring-blue-500 font-bold"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Side Panel: Topes y Acciones */}
                <div className="space-y-4">
                    {/* Topes Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                            <Shield size={16} className="text-indigo-500" />
                            <h3 className="text-sm font-bold text-slate-800">Topes Imponibles</h3>
                        </div>

                        <div className="p-4 space-y-3">
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-700">Tope AFP</label>
                                    <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">UF</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.1"
                                    name="top_limit_afp"
                                    value={params.top_limit_afp}
                                    onChange={handleChange}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-right font-mono text-sm font-semibold focus:ring-1 focus:ring-indigo-500"
                                />
                                <p className="text-[9px] text-slate-400 text-right">~{(params.top_limit_afp * params.uf_value).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</p>
                            </div>

                            <div className="pt-2 border-t border-slate-50 space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-700">Tope Cesantía</label>
                                    <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">UF</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.1"
                                    name="top_limit_cesantia"
                                    value={params.top_limit_cesantia}
                                    onChange={handleChange}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-right font-mono text-sm font-semibold focus:ring-1 focus:ring-indigo-500"
                                />
                                <p className="text-[9px] text-slate-400 text-right">~{(params.top_limit_cesantia * params.uf_value).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${saveStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        {loading ? (
                            <RefreshCw className="animate-spin" size={16} />
                        ) : saveStatus === 'success' ? (
                            <>
                                <CheckCircle2 size={16} />
                                Guardado
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Guardar Parámetros
                            </>
                        )}
                    </button>

                    <p className="text-[10px] text-slate-400 text-center leading-tight px-2">
                        Valores utilizados para cálculo de nómina del periodo.
                    </p>
                </div>
            </form>
        </div>
    );
};

export default PayrollSettings;