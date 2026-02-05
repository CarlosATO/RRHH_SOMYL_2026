import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

const EmployeeDocuments = ({ employeeId }) => {
    const [documents, setDocuments] = useState([]);
    const [newDocType, setNewDocType] = useState('');
    const [newDocFile, setNewDocFile] = useState(null);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    const fetchDocuments = useCallback(async () => {
        if (!employeeId) return;
        const { data } = await supabase.from('rrhh_employee_documents').select('*').eq('employee_id', employeeId);
        setDocuments(data || []);
    }, [employeeId]);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments, employeeId]);

    const handleUploadDocument = async (e) => {
        e.preventDefault();
        setUploadingDoc(true);
        try {
            const fileExt = newDocFile.name.split('.').pop();
            const fileName = `somyl_rrhh/${employeeId}/${newDocType}_${Date.now()}.${fileExt}`;
            await supabase.storage.from('rrhh-files').upload(fileName, newDocFile);
            await supabase.from('rrhh_employee_documents').insert({
                employee_id: employeeId, document_type: newDocType, file_path: fileName
            });
            alert('Subido!'); setNewDocType(''); setNewDocFile(null); fetchDocuments();
        } catch (error) { alert(error.message); } finally { setUploadingDoc(false); }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold border-b pb-2">Carpeta Digital</h3>
            <ul className="space-y-2">
                {documents.map(doc => (
                    <li key={doc.id} className="flex justify-between text-sm bg-white p-2 border rounded">
                        <span>{doc.document_type}</span>
                        <a href={supabase.storage.from('rrhh-files').getPublicUrl(doc.file_path).data.publicUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Ver</a>
                    </li>
                ))}
            </ul>
            <form onSubmit={handleUploadDocument} className="flex gap-2 pt-2">
                <input className="border p-1 rounded text-sm flex-1" placeholder="Ej: Contrato" value={newDocType} onChange={e => setNewDocType(e.target.value)} required />
                <input type="file" className="text-xs w-20" onChange={e => setNewDocFile(e.target.files[0])} required />
                <button disabled={uploadingDoc} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Subir</button>
            </form>
        </div>
    );
};

export default EmployeeDocuments;
