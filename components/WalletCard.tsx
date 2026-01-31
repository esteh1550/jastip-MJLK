import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button, Input, LoadingSpinner } from './ui';
import { Wallet, PlusCircle } from 'lucide-react';

interface WalletCardProps {
  userId: string;
  onBalanceChange?: (newBalance: number) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ userId, onBalanceChange }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState('');

  const fetchBalance = async () => {
    setLoading(true);
    const bal = await api.getWalletBalance(userId);
    setBalance(bal);
    if(onBalanceChange) onBalanceChange(bal);
    setLoading(false);
  };

  useEffect(() => {
    fetchBalance();
  }, [userId]);

  const handleTopUp = async () => {
    const val = Number(amount);
    if (val < 10000) return alert("Minimal Top Up Rp 10.000");
    
    setLoading(true);
    await api.addTransaction(userId, 'TOPUP', val, 'Top Up Saldo JastipPay');
    setAmount('');
    setShowTopUp(false);
    await fetchBalance();
    alert("Top Up Berhasil!");
  };

  return (
    <div className="bg-gradient-to-r from-brand-green to-green-600 text-white p-4 rounded-xl shadow-lg mb-6">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-brand-yellow" />
          <span className="font-semibold text-sm opacity-90">JastipPay</span>
        </div>
        <button onClick={fetchBalance} className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30">Refresh</button>
      </div>
      
      <div className="text-3xl font-bold tracking-tight mb-4">
        {balance === null ? <span className="text-sm">Memuat...</span> : `Rp ${balance.toLocaleString()}`}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => setShowTopUp(true)}
          className="flex-1 bg-white text-brand-green font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-green-50"
        >
          <PlusCircle size={16} /> Isi Saldo
        </button>
      </div>

      {showTopUp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-gray-800 p-6 rounded-2xl w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4">Isi Saldo</h3>
            <Input 
              type="number" 
              label="Nominal (Min. 10.000)" 
              placeholder="10000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowTopUp(false)}>Batal</Button>
              <Button onClick={handleTopUp} disabled={loading}>
                {loading ? 'Proses...' : 'Konfirmasi'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
