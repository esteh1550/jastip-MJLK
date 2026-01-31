import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { Button, Input, LoadingSpinner } from '../components/ui';
import { CheckCircle, XCircle, Edit, Save, Database, RotateCw } from 'lucide-react';

interface AdminDashboardProps {
  user: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await api.getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleSeed = async () => {
    if(!confirm("Isi database dengan data dummy? Ini akan menambahkan User sampel (Admin, Penjual, Pembeli, Driver) dan Produk.")) return;
    setLoading(true);
    await api.seedDatabase();
    await loadUsers();
    setLoading(false);
    alert("Database berhasil diinisialisasi! Sekarang Anda bisa login dengan akun 'admin', 'penjual1', 'pembeli1', atau 'driver1' (Pass: 123).");
  };

  const toggleVerification = async (user: User) => {
    const newStatus = user.verified === 'Y' ? 'N' : 'Y';
    const updatedUser = { ...user, verified: newStatus };
    
    // Update State
    setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    // Update API
    await api.updateUser(updatedUser);
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm(user);
  };

  const handleSave = async () => {
    if (!editingId || !editForm) return;
    
    // Find original to merge
    const original = users.find(u => u.id === editingId);
    if (!original) return;

    const updatedUser = { ...original, ...editForm } as User;
    
    setUsers(prev => prev.map(u => u.id === editingId ? updatedUser : u));
    await api.updateUser(updatedUser);
    setEditingId(null);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-brand-green">Panel Admin</h2>
        <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadUsers} className="w-auto px-2"><RotateCw size={14} /></Button>
            <Button size="sm" variant="secondary" onClick={handleSeed} className="w-auto px-3 text-xs flex gap-1">
                <Database size={14} /> Init DB
            </Button>
        </div>
      </div>
      
      {loading ? <LoadingSpinner /> : (
        <div className="space-y-4">
           {users.length === 0 && (
               <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                   <p className="text-gray-500 mb-4">Database Kosong</p>
                   <Button onClick={handleSeed} className="w-auto mx-auto">Isi Data Dummy</Button>
               </div>
           )}

           {users.map(u => (
             <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
               {editingId === u.id ? (
                 <div className="space-y-3">
                    <div className="font-bold text-gray-500 mb-2">Edit: {u.username}</div>
                    <Input label="Nama Lengkap" value={editForm.nama_lengkap} onChange={e => setEditForm({...editForm, nama_lengkap: e.target.value})} />
                    <Input label="WhatsApp" value={editForm.nomor_whatsapp} onChange={e => setEditForm({...editForm, nomor_whatsapp: e.target.value})} />
                    <Input type="number" label="Saldo (Rp)" value={editForm.saldo} onChange={e => setEditForm({...editForm, saldo: Number(e.target.value)})} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} className="bg-blue-600"><Save size={16}/> Simpan</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Batal</Button>
                    </div>
                 </div>
               ) : (
                 <div className="flex justify-between items-center">
                   <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">{u.nama_lengkap}</h3>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full border">{u.role}</span>
                      </div>
                      <p className="text-xs text-gray-500">@{u.username} • WA: {u.nomor_whatsapp || '-'}</p>
                      <p className="text-xs font-semibold text-brand-green mt-1">Saldo: Rp {(u.saldo || 0).toLocaleString()}</p>
                   </div>
                   
                   <div className="flex flex-col gap-2 items-end">
                      <button 
                        onClick={() => toggleVerification(u)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${u.verified === 'Y' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                      >
                        {u.verified === 'Y' ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                        {u.verified === 'Y' ? 'Verified' : 'Unverified'}
                      </button>
                      
                      <button onClick={() => handleEdit(u)} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                        <Edit size={16} />
                      </button>
                   </div>
                 </div>
               )}
             </div>
           ))}
        </div>
      )}
    </div>
  );
};