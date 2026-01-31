import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  title: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, title }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-brand-green text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg">{title}</h1>
            {user && <p className="text-xs text-green-100 opacity-90">Halo, {user.nama_lengkap}</p>}
          </div>
          {user && (
            <button
              onClick={onLogout}
              className="p-2 bg-green-600 rounded-full hover:bg-green-700 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24 scroll-smooth">
        {children}
      </main>

      {/* Bottom decorative bar if needed, or keeping it clean */}
    </div>
  );
};
