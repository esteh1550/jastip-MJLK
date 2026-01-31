
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { SellerDashboard } from './pages/SellerDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { User, UserRole } from './types';
import { api } from './services/api';
import { Button } from './components/ui';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      const stored = localStorage.getItem('jastip_session');
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        const fresh = await api.login(u.username);
        if(fresh) {
            setUser(fresh);
            localStorage.setItem('jastip_session', JSON.stringify(fresh));
        }
      }
    };
    initSession();
  }, []);

  const handleLogin = async (u: User) => {
    setUser(u);
    localStorage.setItem('jastip_session', JSON.stringify(u));
    if(u.is_new) {
        setShowTutorial(true);
        // Mark as old
        await api.updateUser({ id: u.id, is_new: false });
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('jastip_session');
  };

  if (!user) return <Auth onLogin={handleLogin} />;

  let Component;
  switch (user.role) {
    case UserRole.BUYER: Component = <BuyerDashboard user={user} />; break;
    case UserRole.SELLER: Component = <SellerDashboard user={user} />; break;
    case UserRole.DRIVER: Component = <DriverDashboard user={user} />; break;
    case UserRole.ADMIN: Component = <AdminDashboard user={user} />; break;
    default: Component = <div>Role Error</div>;
  }

  return (
    <Layout user={user} onLogout={handleLogout} title="Jastip MJLK">
      {Component}
      {showTutorial && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 text-center">
              <div className="bg-white p-6 rounded-2xl max-w-sm animate-bounce-in">
                  <h2 className="text-2xl font-bold text-brand-green mb-2">Selamat Datang!</h2>
                  <p className="text-gray-600 mb-6">
                      Ini adalah <b>JASTIP MJLK</b>. Gunakan fitur "Isi Saldo" di kartu ATM virtual Anda untuk mulai bertransaksi. 
                      {user.role === 'SELLER' && ' Mulai dengan upload produk jualan Anda.'}
                      {user.role === 'DRIVER' && ' Tunggu orderan masuk di dashboard Anda.'}
                  </p>
                  <Button onClick={() => setShowTutorial(false)}>Mulai Jelajah</Button>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default App;
