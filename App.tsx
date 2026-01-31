import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { SellerDashboard } from './pages/SellerDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { User, UserRole } from './types';

const App = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check local storage for session
    const storedUser = localStorage.getItem('jastip_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
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
