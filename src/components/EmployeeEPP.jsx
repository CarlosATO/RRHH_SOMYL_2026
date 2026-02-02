import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Trash2, Plus, Search, Package, ShoppingCart } from 'lucide-react';

const EmployeeEPP = ({ employeeId }) => {
    const [requests, setRequests] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Cart State
    const [cart, setCart] = useState([]); // Array of { product, quantity }
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (employeeId) {
            fetchRequests();
            fetchCatalog();
        }
    }, [employeeId]);

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('material_requests')
                .select(`
          *,
          product:products!inner(name, code, unit, current_stock)
        `)
                .eq('employee_id', employeeId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error("Error fetching requests:", err);
        }
    };

    const fetchCatalog = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('is_rrhh_visible', true)
                .order('name');

            if (error) throw error;
            setCatalog(data || []);
        } catch (err) {
            console.error("Error fetching catalog:", err);
        }
    };

    const addToCart = () => {
        if (!selectedProduct) return;

        // Check if already in cart
        const existingIndex = cart.findIndex(item => item.product.code === selectedProduct.code);
        if (existingIndex >= 0) {
            const newCart = [...cart];
            newCart[existingIndex].quantity += quantity;
            setCart(newCart);
        } else {
            setCart([...cart, { product: selectedProduct, quantity }]);
        }

        // Reset inputs
        setSelectedProduct(null);
        setQuantity(1);
        setSearchTerm('');
    };

    const removeFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const handleBatchSubmit = async () => {
        if (cart.length === 0) return;
        setLoading(true);

        try {
            const payloads = cart.map(item => ({
                employee_id: employeeId,
                product_code: item.product.code,
                quantity: item.quantity,
                status: 'PENDING',
                // To group them implicitly, they will share the same created_at (approx)
            }));

            const { error } = await supabase.from('material_requests').insert(payloads);
            if (error) throw error;

            setShowForm(false);
            setCart([]);
            fetchRequests();
            alert('Solicitud enviada correctamente');
        } catch (err) {
            alert('Error al enviar solicitud: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            'PENDING': 'bg-yellow-100 text-yellow-800',
            'APPROVED': 'bg-blue-100 text-blue-800',
            'REJECTED': 'bg-red-100 text-red-800',
            'DELIVERED': 'bg-green-100 text-green-800'
        };
        const labels = {
            'PENDING': 'Pendiente',
            'APPROVED': 'Aprobado',
            'REJECTED': 'Rechazado',
            'DELIVERED': 'Entregado'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-100'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const filteredCatalog = catalog.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h3 className="font-bold text-slate-800">Dotación y EPP</h3>
                    <p className="text-sm text-slate-500">Historial de entregas y solicitudes</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> Nueva Entrega
                </button>
            </div>

            {/* Form Modal (Cart Interface) */}
            {showForm && (
                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 animate-fadeIn">
                    <div className="flex justify-between mb-4">
                        <h4 className="font-bold text-indigo-900">Nueva Asignación de Material</h4>
                        <button onClick={() => setShowForm(false)} className="text-indigo-400 hover:text-indigo-700">✕</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* LEFT: Product Selection */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Buscar Item</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-indigo-400" size={18} />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-300 outline-none"
                                        placeholder="Buscar por nombre o código..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Listado de items filtrados */}
                            {searchTerm && !selectedProduct && (
                                <div className="max-h-60 overflow-y-auto bg-white rounded-lg border border-indigo-100 shadow-sm">
                                    {filteredCatalog.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => { setSelectedProduct(item); setSearchTerm(''); }}
                                            className="p-2 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-sm border-b last:border-0"
                                        >
                                            <span>{item.name}</span>
                                            <span className="text-xs bg-gray-100 px-2 rounded">{item.code}</span>
                                        </div>
                                    ))}
                                    {filteredCatalog.length === 0 && <div className="p-3 text-center text-gray-400 text-sm">No encontrado</div>}
                                </div>
                            )}

                            {selectedProduct && (
                                <div className="bg-white p-4 rounded-lg border border-indigo-200 shadow-sm animate-fadeIn">
                                    <div className="mb-3">
                                        <div className="font-bold text-indigo-900">{selectedProduct.name}</div>
                                        <div className="text-xs text-indigo-500">{selectedProduct.code} - Stock: {selectedProduct.current_stock}</div>
                                    </div>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full border rounded p-2 text-center font-bold"
                                                value={quantity}
                                                onChange={e => setQuantity(parseInt(e.target.value))}
                                            />
                                        </div>
                                        <button
                                            onClick={addToCart}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex-1"
                                        >
                                            Agregar a Canasta
                                        </button>
                                        <button
                                            onClick={() => setSelectedProduct(null)}
                                            className="text-red-500 p-2 hover:bg-red-50 rounded"
                                            title="Cancelar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Cart Summary */}
                        <div className="bg-white rounded-lg border border-indigo-100 shadow-sm flex flex-col">
                            <div className="p-3 bg-indigo-100 border-b border-indigo-200 font-bold text-indigo-800 flex items-center gap-2">
                                <ShoppingCart size={18} /> Canasta de Entrega
                            </div>
                            <div className="flex-1 p-0 overflow-y-auto max-h-60 min-h-[200px]">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6">
                                        <Package size={32} className="mb-2 opacity-30" />
                                        <p className="text-sm">Agregue items para solicitar</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {cart.map((item, idx) => (
                                            <li key={idx} className="p-3 flex justify-between items-center text-sm hover:bg-gray-50">
                                                <div>
                                                    <div className="font-bold text-gray-800">{item.product.name}</div>
                                                    <div className="text-xs text-gray-500">Cod: {item.product.code}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-bold bg-indigo-50 px-2 rounded text-indigo-700">x{item.quantity}</span>
                                                    <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                                <button
                                    onClick={handleBatchSubmit}
                                    disabled={cart.length === 0 || loading}
                                    className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow hover:bg-indigo-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                                >
                                    {loading ? 'Procesando...' : `Confirmar Solicitud (${cart.length} items)`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Listado de Solicitudes */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Item</th>
                            <th className="p-4 text-center">Cant.</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Docs</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {requests.length > 0 ? requests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50">
                                <td className="p-4">{new Date(req.created_at).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-700">{req.product?.name || req.product_code}</div>
                                    <div className="text-xs text-slate-400">{req.product?.code}</div>
                                </td>
                                <td className="p-4 text-center font-mono">{req.quantity}</td>
                                <td className="p-4">{getStatusBadge(req.status)}</td>
                                <td className="p-4">
                                    {req.signed_receipt_url ? (
                                        <a href={supabase.storage.from('rrhh-files').getPublicUrl(req.signed_receipt_url).data.publicUrl} target="_blank" className="text-blue-600 hover:underline">Ver Firma</a>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-400">
                                    <Package size={48} className="mx-auto mb-2 opacity-20" />
                                    No hay entregas registradas
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmployeeEPP;
