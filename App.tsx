import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { SellerDashboard } from './pages/SellerDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { User, UserRole } from './types';
import { api } from './services/api';

const App = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Initial Session Load
    const initSession = async () => {
      const storedUserString = localStorage.getItem('jastip_session');
      if (storedUserString) {
        const storedUser = JSON.parse(storedUserString);
        
        // 1. Set data from local storage immediately for speed
        setUser(storedUser);
        
        // 2. Re-fetch user from API to get the absolute latest data (Saldo, Status, etc)
        try {
          // Add a small delay/check or just fetch
          const freshUser = await api.getUserById(storedUser.id);
          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem('jastip_session', JSON.stringify(freshUser));
          } else {
             // If user found in local storage but NOT in DB, they might have been deleted.
             // We can optionally logout, or keep the session valid until explicit action failure.
             // For now, let's just log it.
             console.warn("User session exists locally but not found in online DB.");
          }
        } catch (error) {
           console.error("Network error refreshing session:", error);
        }
      }
    };
    initSession();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('jastip_session', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('jastip_session');
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  let DashboardComponent;
  let title = "Dashboard";

  switch (user.role) {
    case UserRole.BUYER:
      DashboardComponent = <BuyerDashboard user={user} />;
      title = "Jajanan Majalengka";
      break;
    case UserRole.SELLER:
      DashboardComponent = <SellerDashboard user={user} />;
      title = "Kelola Toko";
      break;
    case UserRole.DRIVER:
      DashboardComponent = <DriverDashboard user={user} />;
      title = "Driver Area";
      break;
    case UserRole.ADMIN:
      DashboardComponent = <AdminDashboard user={user} />;
      title = "Admin Panel";
      break;
    default:
      DashboardComponent = <div>Role tidak dikenali</div>;
  }

  return (
    <Layout user={user} onLogout={handleLogout} title={title}>
      {DashboardComponent}
    </Layout>
  );
};

export default App;