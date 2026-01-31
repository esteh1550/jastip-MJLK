import React, { useEffect, useState } from 'react';
import { User, Order, OrderStatus } from '../types';
import { api } from '../services/api';
import { Badge, Button, LoadingSpinner } from '../components/ui';
import { MapPin, Navigation, CheckCircle, Package, MessageCircle } from 'lucide-react';
import { ChatWindow } from '../components/ChatWindow';
import { WalletCard } from '../components/WalletCard';

interface DriverDashboardProps {
  user: User;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'history'>('available');
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const allOrders = await api.getOrders();
    setOrders(allOrders);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    // Refresh for available orders
    const interval = setInterval(() => {
        api.getOrders().then(setOrders);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleTakeOrder = async (orderId: string) => {
    if(!confirm('Ambil pesanan ini?')) return;
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: OrderStatus.DIKIRIM, driver_id: user.id } : o));
    await api.updateOrderStatus(orderId, OrderStatus.DIKIRIM, user.id);
  };

  const handleFinishOrder = async (order: Order) => {
    if(!confirm('Selesaikan pesanan dan terima ongkir?')) return;
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: OrderStatus.SELESAI } : o));
    
    await api.updateOrderStatus(order.id, OrderStatus.SELESAI);
    
    // Release money: Driver gets Ongkir, Seller gets Price
    await api.addTransaction(user.id, 'INCOME', order.total_ongkir, `Ongkir Order #${order.id}`);
    await api.addTransaction(order.seller_id, 'INCOME', order.total_harga - order.total_ongkir, `Penjualan Order #${order.id}`);
    
    alert('Order selesai! Saldo ongkir masuk ke dompet.');
  };

  const availableOrders = orders.filter(o => o.status === OrderStatus.PENDING);
  const myActiveOrders = orders.filter(o => o.status === OrderStatus.DIKIRIM && o.driver_id === user.id);
  const myHistoryOrders = orders.filter(o => o.status === OrderStatus.SELESAI && o.driver_id === user.id);

  const OrderCard = ({ order, actionBtn }: { order: Order, actionBtn?: React.ReactNode }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
      <div className="flex justify-between items-start mb-2">
        <Badge status={order.status} />
        <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</span>
      </div>
      
      <div className="flex gap-3 mb-3">
        <img src={order.product_img} alt={order.product_name} className="w-16 h-16 object-cover rounded-lg bg-gray-100" />
        <div>
          <h3 className="font-bold text-gray-800">{order.product_name}</h3>
          <p className="text-sm text-gray-600">{order.jumlah}x</p>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <Package size={16} className="text-blue-500 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Ambil dari:</p>
            <p className="text-sm font-medium">{order.seller_id}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-red-500 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Antar ke:</p>
            <p className="text-sm font-medium">{order.alamat_pengiriman}</p>
            <p className="text-xs text-gray-400">Jarak: {order.jarak_km} km</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
         <div className="flex flex-col">
            <span className="text-xs text-gray-500">Ongkir Driver</span>
            <span className="font-bold text-brand-green">Rp {order.total_ongkir.toLocaleString()}</span>
         </div>
         <div className="flex gap-2">
            {(order.status === OrderStatus.DIKIRIM || order.status === OrderStatus.PENDING) && (
                 <Button size="sm" variant="outline" className="w-auto py-1 px-2" onClick={() => setActiveChatOrder(order)}>
                    <MessageCircle size={16} />
                 </Button>
            )}
            {actionBtn}
         </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-4">
        <WalletCard user={user} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl border border-gray-200 sticky top-0 z-10">
        <button 
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'available' ? 'bg-brand-green text-white' : 'text-gray-600'}`}
        >
          Pending ({availableOrders.length})
        </button>
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'active' ? 'bg-brand-green text-white' : 'text-gray-600'}`}
        >
          Aktif ({myActiveOrders.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'history' ? 'bg-brand-green text-white' : 'text-gray-600'}`}
        >
          Selesai
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-4">
          {activeTab === 'available' && (
            availableOrders.length === 0 ? <p className="text-center text-gray-500 mt-10">Tidak ada orderan baru.</p> :
            availableOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                actionBtn={
                  <Button size="sm" className="w-auto py-1 px-4 text-sm" onClick={() => handleTakeOrder(order.id)}>
                    <Navigation size={14} /> Ambil
                  </Button>
                } 
              />
            ))
          )}

          {activeTab === 'active' && (
             myActiveOrders.length === 0 ? <p className="text-center text-gray-500 mt-10">Belum ada orderan yang diambil.</p> :
             myActiveOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                actionBtn={
                  <Button size="sm" variant="secondary" className="w-auto py-1 px-4 text-sm" onClick={() => handleFinishOrder(order)}>
                    <CheckCircle size={14} /> Selesaikan
                  </Button>
                } 
              />
            ))
          )}

          {activeTab === 'history' && (
            myHistoryOrders.length === 0 ? <p className="text-center text-gray-500 mt-10">Belum ada riwayat.</p> :
            myHistoryOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      )}

      {/* Chat Modal */}
      {activeChatOrder && (
          <ChatWindow 
            orderId={activeChatOrder.id} 
            currentUser={user} 
            onClose={() => setActiveChatOrder(null)}
            title={`Order #${activeChatOrder.id.toString().slice(-4)}`}
          />
      )}
    </div>
  );
};