import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button, Input, LoadingSpinner } from './ui';
import { Wallet, PlusCircle, ArrowUpFromLine, MessageCircle, Info, ShieldAlert } from 'lucide-react';
import { User } from '../types';
import { ChatWindow } from './ChatWindow';

interface WalletCardProps {
  user: User;
  onBalanceChange?: (newBalance: number) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ user, onBalanceChange }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState<'topup' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [showChat, setShowChat] = useState(false);

  const fetchBalance = async () => {
    setLoading(true);
    const bal = await api.getWalletBalance(user.id);
    setBalance(bal);
    if(onBalanceChange) onBalanceChange(bal);
    setLoading(false);
  };

  useEffect(() => {
    fetchBalance();
  }, [user.id]);

  const handleTransaction = async () => {
    const val = Number(amount);
    
    // Logic Top Up otomatis dihapus, diganti manual via Admin (lihat render modal)
    
    if (showModal === 'withdraw') {
      // VERIFICATION CHECK
      if (user.verified !== 'Y') {
        alert("Akun Anda belum diverifikasi oleh Admin. Silakan hubungi admin untuk verifikasi agar dapat melakukan penarikan.");
        return;
      }

      if (val < 10000) return alert("Minimal Penarikan Rp 10.000");
      if ((balance || 0) < val) return alert("Saldo tidak mencukupi!");
      setLoading(true);
      await api.addTransaction(user.id, 'WITHDRAW', val, 'Penarikan Saldo JastipPay');
      alert("Permintaan penarikan berhasil. Dana akan dikirim ke rekening terdaftar.");
      setAmount('');
      setShowModal(null);
      await fetchBalance();
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-brand-green to-green-600 text-white p-4 rounded-xl shadow-lg mb-6 relative overflow-hidden">
        <div className="flex justify-between items-center mb-2 relative z-10">
          <div className="flex items-center gap-2">
            <Wallet size={20} className="text-brand-yellow" />
            <span className="font-semibold text-sm opacity-90">JastipPay</span>
            {user.verified === 'Y' && <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full text-white">Verified</span>}
          </div>
          <button onClick={fetchBalance} className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30">Refresh</button>
        </div>
        
        <div className="text-3xl font-bold tracking-tight mb-4 relative z-10">
          {balance === null ? <span className="text-sm">Memuat...</span> : `Rp ${balance.toLocaleString()}`}
        </div>

        <div className="flex gap-2 relative z-10">
          <button 
            onClick={() => setShowModal('topup')}
            className="flex-1 bg-white text-brand-green font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-green-50"
          >
            <PlusCircle size={16} /> Isi Saldo
          </button>
          <button 
            onClick={() => setShowModal('withdraw')}
            className="flex-1 bg-brand-dark/30 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-brand-dark/40"
          >
            <ArrowUpFromLine size={16} /> Tarik
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white text-gray-800 p-6 rounded-2xl w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4">
              {showModal === 'topup' ? 'Isi Saldo' : 'Tarik Saldo'}
            </h3>
            
            {showModal === 'topup' ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm border border-yellow-200 flex gap-3 items-start">
                  <Info size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">Top Up Manual</p>
                    <p>Saat ini pengisian saldo hanya dapat dilakukan oleh Admin.</p>
                    <p className="mt-2">Silakan hubungi Admin melalui chat untuk melakukan transfer dan konfirmasi.</p>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setShowModal(null)}>Tutup</Button>
                  <Button onClick={() => { setShowModal(null); setShowChat(true); }}>
                    <MessageCircle size={18} /> Chat Admin
                  </Button>
                </div>
              </div>
            ) : (
              // WITHDRAW UI
              <>
                 {user.verified !== 'Y' && (
                    <div className="bg-red-50 text-red-800 p-3 rounded mb-4 text-xs flex gap-2 border border-red-200">
                        <ShieldAlert size={16} className="shrink-0" />
                        <div>
                            <p className="font-bold">Akun Belum Terverifikasi</p>
                            <p>Anda tidak dapat melakukan penarikan. Silakan hubungi admin untuk verifikasi data.</p>
                        </div>
                    </div>
                 )}

                <div className="bg-gray-50 p-3 rounded mb-4 text-xs text-gray-500">
                   Saldo tersedia: Rp {(balance || 0).toLocaleString()}. Dana akan ditransfer ke rekening bank terdaftar Anda.
                </div>

                <Input 
                  type="number" 
                  label="Nominal (Min. 10.000)" 
                  placeholder="10000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  disabled={user.verified !== 'Y'}
                />
                
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setShowModal(null)}>Batal</Button>
                  {user.verified !== 'Y' ? (
                      <Button onClick={() => { setShowModal(null); setShowChat(true); }}>
                        <MessageCircle size={18} /> Hubungi Admin
                      </Button>
                  ) : (
                    <Button onClick={handleTransaction} disabled={loading}>
                        {loading ? 'Proses...' : 'Konfirmasi'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Admin Chat Modal */}
      {showChat && (
        <ChatWindow 
          orderId={`support-${user.id}`} // Special ID for Support Chat
          currentUser={user}
          title="Layanan Pelanggan (Admin)"
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
};
