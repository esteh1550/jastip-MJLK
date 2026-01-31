
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button, Input, LoadingSpinner } from './ui';
import { Wallet, Plus, Send, ArrowUpFromLine, RefreshCw, Smartphone } from 'lucide-react';
import { User } from '../types';

interface WalletCardProps {
  user: User;
  onBalanceChange?: (newBalance: number) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ user, onBalanceChange }) => {
  const [balance, setBalance] = useState<number>(user.saldo || 0);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<'SEND' | 'WITHDRAW' | null>(null);
  
  // Transfer State
  const [targetWa, setTargetWa] = useState('');
  const [amount, setAmount] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);

  const fetchBalance = async () => {
    setLoading(true);
    const bal = await api.login(user.username); // Refresh user data
    if (bal) {
        setBalance(bal.saldo);
        if(onBalanceChange) onBalanceChange(bal.saldo);
    }
    setLoading(false);
  };

  const checkUser = async () => {
      const u = await api.getUserByWhatsapp(targetWa);
      setFoundUser(u);
      if(!u) alert('Pengguna tidak ditemukan!');
  };

  const handleTransfer = async () => {
      if(!foundUser || !amount) return;
      if(Number(amount) > balance) return alert('Saldo tidak cukup!');
      
      if(!confirm(`Kirim Rp ${amount} ke ${foundUser.nama_lengkap}?`)) return;

      setLoading(true);
      await api.addTransaction(user.id, 'TRANSFER', Number(amount), `Kirim ke ${foundUser.nama_lengkap}`);
      await api.addTransaction(foundUser.id, 'INCOME', Number(amount), `Terima dari ${user.nama_lengkap}`);
      alert('Berhasil!');
      setModal(null);
      setTargetWa(''); setAmount(''); setFoundUser(null);
      fetchBalance();
  };

  const handleWithdraw = async () => {
      if(Number(amount) > balance) return alert('Saldo kurang');
      if(Number(amount) < 10000) return alert('Min Rp 10.000');
      
      await api.addTransaction(user.id, 'WITHDRAW', Number(amount), 'Penarikan Tunai');
      alert('Permintaan penarikan dikirim ke Admin.');
      setModal(null);
      fetchBalance();
  };

  return (
    <div className="mb-6">
      {/* ATM Card Design */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-600 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden border-t border-white/20">
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
         <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-5 -mb-5 blur-xl"></div>
         
         <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
                <p className="text-emerald-200 text-xs font-bold tracking-widest uppercase mb-1">JastipPay</p>
                <h3 className="text-3xl font-mono font-bold tracking-tight">
                    Rp {balance.toLocaleString('id-ID')}
                </h3>
            </div>
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
                <Wallet className="text-white" size={24} />
            </div>
         </div>

         <div className="flex justify-between items-end relative z-10">
            <div>
                <p className="text-xs text-emerald-200 mb-1">Pemilik Kartu</p>
                <p className="font-bold tracking-wide">{user.nama_lengkap.toUpperCase()}</p>
            </div>
            <button onClick={fetchBalance} disabled={loading} className={`p-2 rounded-full hover:bg-white/10 ${loading ? 'animate-spin' : ''}`}>
                <RefreshCw size={18} />
            </button>
         </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-4">
        <button onClick={() => setModal('SEND')} className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-full"><Send size={20}/></div>
            <span className="text-xs font-bold text-gray-600">Kirim</span>
        </button>
        <button onClick={() => setModal('WITHDRAW')} className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <div className="bg-orange-100 text-orange-600 p-2 rounded-full"><ArrowUpFromLine size={20}/></div>
            <span className="text-xs font-bold text-gray-600">Tarik</span>
        </button>
        <button className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-1 active:scale-95 transition-transform opacity-50 cursor-not-allowed">
            <div className="bg-green-100 text-green-600 p-2 rounded-full"><Plus size={20}/></div>
            <span className="text-xs font-bold text-gray-600">Top Up</span>
        </button>
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">{modal === 'SEND' ? 'Kirim Saldo' : 'Tarik Tunai'}</h3>
                
                {modal === 'SEND' && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Input placeholder="Nomor WhatsApp Teman" value={targetWa} onChange={e => setTargetWa(e.target.value)} />
                            <Button className="w-auto" onClick={checkUser}><Smartphone size={18}/></Button>
                        </div>
                        {foundUser && (
                            <div className="bg-green-50 p-2 rounded border border-green-200 text-sm text-green-800">
                                Penerima: <b>{foundUser.nama_lengkap}</b>
                            </div>
                        )}
                        <Input type="number" placeholder="Nominal" value={amount} onChange={e => setAmount(e.target.value)} />
                        <Button onClick={handleTransfer} disabled={!foundUser}>Kirim Sekarang</Button>
                    </div>
                )}

                {modal === 'WITHDRAW' && (
                    <div className="space-y-3">
                        <Input type="number" placeholder="Nominal (Min 10.000)" value={amount} onChange={e => setAmount(e.target.value)} />
                        <Button onClick={handleWithdraw}>Ajukan Penarikan</Button>
                    </div>
                )}

                <button onClick={() => setModal(null)} className="mt-4 w-full text-center text-gray-500 text-sm font-bold">Batal</button>
            </div>
        </div>
      )}
    </div>
  );
};
