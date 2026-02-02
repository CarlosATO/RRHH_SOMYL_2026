import React, { useState, useEffect, useCallback } from 'react';
import Tree from 'react-d3-tree';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

const OrgChart = () => {
    const navigate = useNavigate();
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Transformar datos planos a jerarquía (Árbol)
    const buildTree = (employees) => {
        const idMapping = employees.reduce((acc, el, i) => {
            acc[el.id] = i;
            return acc;
        }, {});

        let roots = [];

        // Mapeo de hijos
        employees.forEach((el) => {
            el.name = `${el.first_name} ${el.last_name}`;
            el.attributes = {
                Cargo: el.job?.name || 'Sin Cargo',
                Depto: el.department?.name || ''
            };
            el.children = []; // Inicializar array de hijos

            if (!el.supervisor_id) {
                roots.push(el);
            } else {
                const parentIndex = idMapping[el.supervisor_id];
                if (employees[parentIndex]) {
                    employees[parentIndex].children.push(el);
                } else {
                    // Si tiene supervisor ID pero no existe en la lista (inactivo), lo hacemos raíz
                    roots.push(el);
                }
            }
        });

        // Si hay múltiples raíces (varios gerentes o nodos sueltos), crear un nodo "Empresa" ficticio
        if (roots.length === 1) return roots[0];
        return {
            name: 'SOMYL S.A.',
            attributes: { Tipo: 'Organización' },
            children: roots,
            nodeSvgShape: { shapeProps: { fill: '#cbd5e1', stroke: '#475569' } }
        };
    };

    const fetchOrgData = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('rrhh_employees')
                .select('id, first_name, last_name, photo_url, supervisor_id, job:job_id(name), department:department_id(name)')
                .order('first_name');

            if (error) throw error;
            if (data && data.length > 0) setTreeData(buildTree(data));
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOrgData(); }, [fetchOrgData]);

    // Diseño de la Tarjeta del Empleado (Nodo)
    const renderNode = ({ nodeDatum, toggleNode }) => (
        <g onClick={toggleNode} style={{ cursor: 'pointer' }}>
            <circle r="30" fill="white" stroke="#2563eb" strokeWidth="2" />
            <text fill="#2563eb" x="0" y="8" textAnchor="middle" style={{ fontSize: '18px' }}>👤</text>
            <text fill="#1e293b" x="40" y="-5" style={{ fontWeight: 'bold', fontSize: '14px' }}>{nodeDatum.name}</text>
            <text fill="#64748b" x="40" y="15" style={{ fontSize: '11px' }}>{nodeDatum.attributes?.Cargo}</text>
        </g>
    );

    if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Cargando jerarquía...</div>;

    return (
        <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden">
            <div className="absolute top-4 left-4 z-10 bg-white/90 p-4 rounded-xl shadow border border-slate-200 backdrop-blur-sm">
                <h2 className="font-bold text-slate-800">Organigrama SOMYL</h2>
                <button onClick={() => navigate('/')} className="text-xs text-blue-600 hover:underline mt-1">⬅ Volver al Dashboard</button>
            </div>
            <div className="flex-grow w-full h-full border-t border-slate-200">
                {!treeData ? (
                    <div className="flex h-full items-center justify-center text-slate-400">Sin datos de jerarquía.</div>
                ) : (
                    <Tree
                        data={treeData}
                        orientation="vertical"
                        pathFunc="step"
                        translate={{ x: window.innerWidth / 2, y: 100 }}
                        renderCustomNodeElement={renderNode}
                        nodeSize={{ x: 220, y: 140 }}
                    />
                )}
            </div>
        </div>
    );
};

export default OrgChart;
