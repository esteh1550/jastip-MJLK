
import React, { useState } from 'react';
import { api } from '../services/api';
import { User, UserRole } from '../types';
import { Button, Input, LoadingSpinner } from '../components/ui';
import { MapPin, Truck, Store, User as UserIcon } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register
  const [regData, setRegData] = useState({
      username: '', password: '', nama_lengkap: '', nomor_whatsapp: '', 
      role: UserRole.BUYER, desa_kecamatan: '', alamat_lengkap: '', plat_nomor: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        const user = await api.login(identifier);
        if (user && user.password === password) {
          onLogin(user);
        } else {
          setError('Username/WhatsApp atau password salah.');
        }
      } else {
        // Register Logic
        const newUser = await api.register({
            username: regData.username,
            password: regData.password,
            nama_lengkap: regData.nama_lengkap,
            nomor_whatsapp: regData.nomor_whatsapp,
            role: regData.role,
            desa_kecamatan: regData.role === UserRole.SELLER ? regData.desa_kecamatan : undefined,
            alamat_lengkap: regData.role === UserRole.SELLER ? regData.alamat_lengkap : undefined,
            plat_nomor: regData.role === UserRole.DRIVER ? regData.plat_nomor : undefined
        });
        onLogin(newUser);
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl border-4 border-brand-green">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tighter">
            JASTIP <span className="text-brand-green">MJLK</span>
          </h1>
          <p className="text-slate-600 font-medium">Platform UMKM Majalengka</p>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-4 rounded-xl font-bold text-sm mb-6 text-center border-2 border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isLogin ? (
            <>
                <Input 
                    label="Username atau Nomor WhatsApp"
                    placeholder="Contoh: 0812xxx atau udin123" 
                    value={identifier} 
                    onChange={(e) => setIdentifier(e.target.value)} 
                    required 
                    className="font-semibold text-lg"
                />
                <Input 
                    label="Password"
                    type="password" 
                    placeholder="******" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="font-semibold text-lg"
                />
            </>
          ) : (
            <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[UserRole.BUYER, UserRole.SELLER, UserRole.DRIVER].map(r => (
                    <button
                      key={r} type="button" onClick={() => setRegData({...regData, role: r})}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${regData.role === r ? 'bg-brand-green border-brand-green text-white shadow-lg scale-105' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      {r === UserRole.BUYER && <UserIcon size={20} />}
                      {r === UserRole.SELLER && <Store size={20} />}
                      {r === UserRole.DRIVER && <Truck size={20} />}
                      <span className="text-xs font-bold mt-1">{r}</span>
                    </button>
                  ))}
                </div>

                <Input placeholder="Username" value={regData.username} onChange={(e) => setRegData({...regData, username: e.target.value})} required />
                <Input type="password" placeholder="Password" value={regData.password} onChange={(e) => setRegData({...regData, password: e.target.value})} required />
                <Input placeholder="Nama Lengkap" value={regData.nama_lengkap} onChange={(e) => setRegData({...regData, nama_lengkap: e.target.value})} required />
                <Input type="tel" placeholder="Nomor WhatsApp" value={regData.nomor_whatsapp} onChange={(e) => setRegData({...regData, nomor_whatsapp: e.target.value})} required />

                {regData.role === UserRole.SELLER && (
                    <div className="space-y-4 bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                        <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Detail Toko</p>
                        <LocationPicker 
                            label="Lokasi Desa/Kecamatan"
                            onLocationSelect={(_,__,name) => setRegData({...regData, desa_kecamatan: name})}
                            placeholder="Cari Desa..."
                        />
                        <Input 
                            placeholder="Alamat Lengkap & Patokan" 
                            value={regData.alamat_lengkap} 
                            onChange={(e) => setRegData({...regData, alamat_lengkap: e.target.value})} 
                            required 
                        />
                    </div>
                )}

                {regData.role === UserRole.DRIVER && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <Input 
                            label="Plat Nomor Kendaraan"
                            placeholder="E 1234 XX" 
                            value={regData.plat_nomor} 
                            onChange={(e) => setRegData({...regData, plat_nomor: e.target.value})} 
                            required 
                        />
                    </div>
                )}
            </>
          )}

          <Button type="submit" disabled={loading} className="py-4 text-lg shadow-xl shadow-green-200">
            {loading ? <LoadingSpinner /> : (isLogin ? 'MASUK SEKARANG' : 'DAFTAR AKUN')}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-bold text-slate-500 hover:text-brand-green underline decoration-2 underline-offset-4">
            {isLogin ? 'Belum punya akun? Daftar disini' : 'Sudah punya akun? Masuk disini'}
          </button>
        </div>
      </div>
    </div>
  );
};
