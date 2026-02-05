import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

const EmployeeCertifications = ({ employeeId, coursesMaster }) => {
    const [certs, setCerts] = useState([]);
    const [newCert, setNewCert] = useState({ course_id: '', issue_date: '', expiry_date: '' });
    const [certFile, setCertFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const fetchCerts = useCallback(async () => {
        if (!employeeId) return;
        const { data } = await supabase
            .from('rrhh_employee_certifications')
            .select(`*, course:course_id(name)`)
            .eq('employee_id', employeeId)
            .order('expiry_date', { ascending: true });
        setCerts(data || []);
    }, [employeeId]);

    useEffect(() => { fetchCerts(); }, [fetchCerts]);

    const getStatusColor = (expiryDate) => {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'bg-red-100 text-red-800 border-red-200';
        if (diffDays <= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    };

    const handleSaveCert = async (e) => {
        e.preventDefault();
        if (!newCert.course_id || !certFile) return;
        setUploading(true);
        try {
            const fileExt = certFile.name.split('.').pop();
            const fileName = `somyl_rrhh/${employeeId}/cert_${newCert.course_id}_${Date.now()}.${fileExt}`;
            await supabase.storage.from('rrhh-files').upload(fileName, certFile);
            await supabase.from('rrhh_employee_certifications').insert({
                employee_id: employeeId,
                course_id: newCert.course_id, issue_date: newCert.issue_date,
                expiry_date: newCert.expiry_date, certificate_url: fileName
            });
            alert('Acreditación guardada'); setNewCert({ course_id: '', issue_date: '', expiry_date: '' }); setCertFile(null); fetchCerts();
        } catch (error) { alert(error.message); } finally { setUploading(false); }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                {certs.map(c => (
                    <div key={c.id} className={`p-3 rounded border text-sm flex justify-between ${getStatusColor(c.expiry_date)}`}>
                        <span>{c.course.name} (Vence: {c.expiry_date})</span>
                        {c.certificate_url && <a href={supabase.storage.from('rrhh-files').getPublicUrl(c.certificate_url).data.publicUrl} target="_blank" rel="noreferrer" className="underline">Ver</a>}
                    </div>
                ))}
            </div>
            <form onSubmit={handleSaveCert} className="bg-gray-50 p-4 rounded border space-y-3">
                <h4 className="text-sm font-bold">Nueva Acreditación</h4>
                <select className="w-full border p-2 rounded" value={newCert.course_id} onChange={e => setNewCert({ ...newCert, course_id: e.target.value })} required>
                    <option value="">Curso...</option>
                    {coursesMaster.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="border p-2 rounded" value={newCert.issue_date} onChange={e => setNewCert({ ...newCert, issue_date: e.target.value })} required />
                    <input type="date" className="border p-2 rounded" value={newCert.expiry_date} onChange={e => setNewCert({ ...newCert, expiry_date: e.target.value })} required />
                </div>
                <input type="file" className="text-sm" onChange={e => setCertFile(e.target.files[0])} required />
                <button disabled={uploading} className="w-full bg-slate-800 text-white py-2 rounded text-sm">{uploading ? '...' : 'Guardar'}</button>
            </form>
        </div>
    );
};

export default EmployeeCertifications;
