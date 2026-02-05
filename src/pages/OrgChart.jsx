import React, { useState, useEffect, useCallback } from 'react';
import Tree from 'react-d3-tree';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

const OrgChart = () => {
    const navigate = useNavigate();
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Estrategia: Jerarquía Estricta (Supervisor -> Subordinado)
    // Visualización: Tarjetas que muestran el Departamento arriba.
    const buildTree = (rawEmployees) => {
        if (!rawEmployees || rawEmployees.length === 0) return null;

        // 1. Limpieza y preparación de nodos
        const employeesMap = {};
        rawEmployees.forEach(e => {
            employeesMap[e.id] = {
                ...e,
                // Pre-formateo de depto y nombre para el renderizado
                deptName: e.department?.name || 'Sin Departamento',
                displayName: `${e.first_name} ${e.last_name}`,
                jobTitle: e.job?.name || 'Sin Cargo',
                children: []
            };
        });

        const roots = [];

        // 2. Construcción de enlaces (Solo Jerarquía Pura)
        rawEmployees.forEach(e => {
            if (e.supervisor_id && employeesMap[e.supervisor_id]) {
                employeesMap[e.supervisor_id].children.push(employeesMap[e.id]);
            } else {
                roots.push(employeesMap[e.id]);
            }
        });

        // 3. Nodo Raíz de la Empresa
        return {
            name: 'SOMYL S.A.',
            isRoot: true,
            children: roots
        };
    };

    const fetchOrgData = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('rrhh_employees')
                .select('id, first_name, last_name, photo_url, supervisor_id, department_id, job:job_id(name), department:department_id(name)')
                .order('first_name');

            if (error) throw error;
            if (data) setTreeData(buildTree(data));
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOrgData(); }, [fetchOrgData]);

    // Diseño de Nodos (Tarjetas HTML con foreignObject)
    const renderNode = ({ nodeDatum, toggleNode }) => {
        // A. Nodo Raíz (Empresa)
        if (nodeDatum.isRoot) {
            return (
                <g onClick={toggleNode} style={{ cursor: 'pointer' }}>
                    <circle r="45" fill="#1e293b" stroke="#0f172a" strokeWidth="4" />
                    <text fill="white" x="0" y="10" textAnchor="middle" style={{ fontSize: '30px' }}>🏢</text>

                    {/* Texto de la empresa separado para que no se solape con nodos cercanos */}
                    <g transform="translate(0, 65)">
                        <rect x="-80" y="-15" width="160" height="30" rx="15" fill="#ffffff" stroke="#cbd5e1" />
                        <text fill="#0f172a" x="0" y="5" textAnchor="middle" style={{ fontWeight: '900', fontSize: '14px', fontFamily: 'Inter' }}>SOMYL S.A.</text>
                    </g>
                </g>
            );
        }

        // B. Nodo Empleado (Tarjeta Ancha y Clara)
        // Ancho: 280px, Alto: 120px
        return (
            <foreignObject width="280" height="140" x="-140" y="-60" style={{ overflow: 'visible' }}>
                <div
                    onClick={toggleNode}
                    className="flex flex-col h-full bg-white rounded-xl shadow-md border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                >
                    {/* 1. Header: DEPARTAMENTO (Arriba) */}
                    <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate w-full text-center">
                            {nodeDatum.deptName}
                        </span>
                    </div>

                    {/* 2. Body: Foto y Datos (Abajo) */}
                    <div className="flex-1 flex items-center p-3 gap-3">
                        {/* Avatar */}
                        <div className="w-14 h-14 flex-none rounded-full bg-slate-50 overflow-hidden ring-2 ring-slate-100 shadow-inner group-hover:ring-blue-100 transition-all">
                            {nodeDatum.photo_url ? (
                                <img src={nodeDatum.photo_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xl font-bold">
                                    {nodeDatum.first_name?.[0]}{nodeDatum.last_name?.[0]}
                                </div>
                            )}
                        </div>

                        {/* Nombres y Cargo */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="text-[14px] font-extrabold text-slate-800 leading-tight truncate" title={nodeDatum.displayName}>
                                {nodeDatum.displayName}
                            </h3>
                            <p className="text-[11px] font-semibold text-blue-600 truncate mt-0.5" title={nodeDatum.jobTitle}>
                                {nodeDatum.jobTitle}
                            </p>
                        </div>
                    </div>
                </div>
            </foreignObject>
        );
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Cargando jerarquía...</div>;

    return (
        <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden font-sans">
            <div className="absolute top-6 left-6 z-10">
                <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="font-bold text-slate-900 text-lg">Organigrama</h2>
                    <button onClick={() => navigate('/')} className="text-xs font-semibold text-blue-600 hover:underline mt-1 flex items-center gap-1">
                        <span>←</span> Volver
                    </button>
                </div>
            </div>

            <div className="flex-grow w-full h-full border-t border-slate-200 bg-slate-50">
                {!treeData ? (
                    <div className="flex h-full items-center justify-center text-slate-400">Sin datos.</div>
                ) : (
                    <Tree
                        data={treeData}
                        orientation="vertical"
                        pathFunc="step"
                        translate={{ x: window.innerWidth / 2, y: 120 }}
                        renderCustomNodeElement={renderNode}
                        // Espaciado CRÍTICO para evitar solapamiento
                        nodeSize={{ x: 320, y: 200 }}
                        separation={{ siblings: 1.1, nonSiblings: 1.5 }}
                        enableLegacyTransitions={true}
                        transitionDuration={400}
                        pathClassFunc={() => 'stroke-slate-300 stroke-2'}
                    />
                )}
            </div>
        </div>
    );
};

export default OrgChart;
