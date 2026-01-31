
import React, { useEffect, useState } from 'react';
import { User, Order, OrderStatus } from '../types';
import { api } from '../services/api';
import { Badge, Button, LoadingSpinner } from '../components/ui';
import { MapPin, Navigation, CheckCircle, Package, MessageCircle } from 'lucide-react';
import { ChatWindow } from '../components/ChatWindow';
import { WalletCard } from '../components/WalletCard';

export const DriverDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const all = await api.getOrders();
    setOrders(all);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleTake = async (o: Order) => {
      const fee = 1000;
      if(user.saldo < fee) return alert('Saldo kurang untuk biaya admin (Rp 1.000)');
      if(!confirm(`Ambil order ini? Biaya admin Rp ${fee} akan dipotong.`)) return;
      
      await api.takeOrder(o.id, user);
      fetchOrders();
      alert('Order diambil! Segera menuju penjual.');
  };

  const handlePickup = async (o: Order) => {
      if(!confirm('Sudah ambil barang dari penjual?')) return;
      await api.updateOrderStatus(o.id, OrderStatus.DIKIRIM);
      fetchOrders();
  };

  const available = orders.filter(o => o.status === OrderStatus.CONFIRMED && !o.driver_id);
  const active = orders.filter(o => (o.status === OrderStatus.DRIVER_OTW_PICKUP || o.status === OrderStatus.DIKIRIM) && o.driver_id === user.id);

  return (
    <div>
       <WalletCard user={user} />
       <h2 className="font-bold text-lg mb-2 px-1">Order Aktif</h2>
       {active.length === 0 && <p className="text-gray-400 text-sm px-1 mb-4">Tidak ada order aktif.</p>}
       
       {active.map(o => (
           <div key={o.id} className="bg-white p-4 rounded-xl shadow-lg border-2 border-blue-500 mb-4">
               <div className="flex justify-between mb-2">
                   <Badge status={o.status} />
                   <span className="font-bold text-blue-600">Pendapatan: Rp {o.biaya_ongkir.toLocaleString()}</span>
               </div>
               <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg text-sm">
                   <div className="flex gap-2"><Package size={16}/> <b>Ambil:</b> {o.product_name} ({o.jumlah}x)</div>
                   <div className="flex gap-2"><MapPin size={16}/> <b>Ke:</b> {o.alamat_pengiriman}</div>
               </div>
               <div className="flex gap-2">
                   {o.status === OrderStatus.DRIVER_OTW_PICKUP ? (
                       <Button onClick={() => handlePickup(o)}>Sudah Ambil Barang</Button>
                   ) : (
                       <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-center text-xs font-bold w-full">Antar ke Pembeli & Minta Konfirmasi</div>
                   )}
                   <Button variant="secondary" className="w-auto" onClick={() => setActiveChat(`${o.id}-driver`)}><MessageCircle/></Button>
               </div>
           </div>
       ))}

       <h2 className="font-bold text-lg mb-2 mt-6 px-1">Order Tersedia</h2>
       {loading ? <LoadingSpinner/> : available.map(o => (
           <div key={o.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
               <div className="flex justify-between">
                   <h3 className="font-bold">{o.product_name}</h3>
                   <span className="text-brand-green font-bold">Ongkir Rp {o.biaya_ongkir.toLocaleString()}</span>
               </div>
               <p className="text-xs text-gray-500 mb-3">Jarak: {o.jarak_km} km • Dari: {o.seller_id}</p>
               <Button onClick={() => handleTake(o)}>Ambil (Fee Rp 1.000)</Button>
           </div>
       ))}
       
       {activeChat && <ChatWindow orderId={activeChat} currentUser={user} onClose={() => setActiveChat(null)} title="Chat Pembeli" />}
    </div>
  );
};
