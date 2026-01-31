import React, { useState } from 'react';
import { api } from '../services/api';
import { User, UserRole } from '../types';
import { Button, Input, LoadingSpinner } from '../components/ui';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.BUYER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        const user = await api.login(username);
        if (user && user.password === password) {
          onLogin(user);
        } else {
          setError('Username atau password salah');
        }
      } else {
        const newUser = await api.register({
          username,
          password,
          nama_lengkap: fullName,
          nomor_whatsapp: whatsapp,
          role
        });
        onLogin(newUser);
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-yellow-50">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-brand-green mb-2">JASTIP <span className="text-brand-yellow">MJLK</span></h1>
          <p className="text-gray-500">Platform Jastip UMKM Majalengka</p>
        </div>

        {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4 text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
          <Input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          
          {!isLogin && (
            <>
              <Input 
                placeholder="Nama Lengkap" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
              />
              <Input 
                type="tel"
                placeholder="Nomor WhatsApp (Contoh: 08123xxx)" 
                value={whatsapp} 
                onChange={(e) => setWhatsapp(e.target.value)} 
                required 
              />
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Saya ingin mendaftar sebagai:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[UserRole.BUYER, UserRole.SELLER, UserRole.DRIVER].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`text-xs font-bold py-2 rounded-lg border ${role === r ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-500 border-gray-200'}`}
                    >
                      {r === UserRole.BUYER ? 'Pembeli' : r === UserRole.SELLER ? 'Penjual' : 'Driver'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? <LoadingSpinner /> : (isLogin ? 'Masuk' : 'Daftar')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-gray-500 hover:text-brand-green transition-colors">
            {isLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </div>
        
        {isLogin && (
          <div className="mt-8 pt-4 border-t text-xs text-gray-400 text-center">
             <p>Demo Accounts:</p>
             <div className="grid grid-cols-3 gap-1 mt-1">
               <span className="bg-gray-100 p-1 rounded cursor-pointer" onClick={() => setUsername('pembeli1')}>pembeli1</span>
               <span className="bg-gray-100 p-1 rounded cursor-pointer" onClick={() => setUsername('penjual1')}>penjual1</span>
               <span className="bg-gray-100 p-1 rounded cursor-pointer" onClick={() => setUsername('driver1')}>driver1</span>
             </div>
             <p className="mt-1">Pass: 123</p>
          </div>
        )}
      </div>
    </div>
  );
};
