
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { Button, Input, LoadingSpinner } from '../components/ui';
import { Edit, Save, Trash, User as UserIcon, Store, Truck, Search, X } from 'lucide-react';

export const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [tab, setTab] = useState<UserRole | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
      setLoading(true);
      const u = await api.getAllUsers();
      setUsers(u);
      setLoading(false);
  };

  const handleUpdate = async () => {
      if(!editUser) return;
      await api.updateUser(editUser);
      setEditUser(null);
      load();
  };

  // Logic Filtering: Role + Search Query
  const filtered = users.filter(u => {
      const matchRole = tab === 'ALL' || u.role === tab;
      
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        u.username.toLowerCase().includes(q) || 
        u.nama_lengkap.toLowerCase().includes(q) || 
        u.nomor_whatsapp.includes(q);

      return matchRole && matchSearch;
  });

  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 flex justify-between items-center sticky top-0 z-10">
          <h1 className="font-bold text-xl text-slate-800">Admin Panel</h1>
          <Button size="sm" className="w-auto" onClick={() => api.seedDatabase().then(load)}>Init DB</Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl shadow-sm mb-4">
        <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Cari Username, Nama, atau WhatsApp..." 
                className="w-full pl-10 p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
                <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-red-500"
                >
                    <X size={18} />
                </button>
            )}
        </div>
      </div>

      {/* Role Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {['ALL', UserRole.BUYER, UserRole.SELLER, UserRole.DRIVER].map((r: any) => (
              <button key={r} onClick={() => setTab(r)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${tab === r ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}>
                  {r}
              </button>
          ))}
      </div>

      {loading ? <LoadingSpinner /> : (
          <div className="space-y-3">
              {filtered.length === 0 && (
                  <div className="text-center py-10 text-slate-400">
                      <p>Tidak ada pengguna ditemukan.</p>
                  </div>
              )}

              {filtered.map(u => (
                  <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
                      {editUser?.id === u.id ? (
                          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-300">
                              <p className="font-bold text-xs text-slate-500 uppercase tracking-wider">Edit User: {u.username}</p>
                              <Input label="Nama Lengkap" value={editUser.nama_lengkap} onChange={e => setEditUser({...editUser, nama_lengkap: e.target.value})} />
                              <Input label="Nomor WhatsApp" value={editUser.nomor_whatsapp} onChange={e => setEditUser({...editUser, nomor_whatsapp: e.target.value})} />
                              <Input label="Password" value={editUser.password || ''} onChange={e => setEditUser({...editUser, password: e.target.value})} />
                              <Input label="Saldo (Rp)" type="number" value={editUser.saldo} onChange={e => setEditUser({...editUser, saldo: Number(e.target.value)})} />
                              
                              <div className="flex gap-2 pt-2">
                                  <Button size="sm" onClick={handleUpdate} className="bg-slate-800 hover:bg-slate-900 shadow-none"><Save size={14}/> Simpan</Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditUser(null)} className="border-slate-300 text-slate-600">Batal</Button>
                              </div>
                          </div>
                      ) : (
                          <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${u.role === 'DRIVER' ? 'bg-blue-100 text-blue-600' : u.role === 'SELLER' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                      {u.role === 'DRIVER' ? <Truck size={18}/> : u.role === 'SELLER' ? <Store size={18}/> : <UserIcon size={18}/>}
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-sm text-slate-800">{u.nama_lengkap}</h3>
                                      <div className="flex flex-col text-xs text-slate-500 mt-0.5">
                                        <span>@{u.username} • {u.nomor_whatsapp}</span>
                                        <span className={`font-bold mt-1 ${u.saldo > 0 ? 'text-green-600' : 'text-slate-400'}`}>Saldo: Rp {u.saldo.toLocaleString()}</span>
                                      </div>
                                  </div>
                              </div>
                              <button onClick={() => setEditUser(u)} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"><Edit size={16}/></button>
                          </div>
                      )}
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};
