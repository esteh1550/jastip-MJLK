import React, { useState, useEffect, useRef } from 'react';
import { User, Product, Order, OrderStatus } from '../types';
import { api } from '../services/api';
import { Button, Input, Badge, LoadingSpinner } from '../components/ui';
import { Plus, Trash, Package, ShoppingBag, RefreshCw, MessageCircle, Wallet, CheckCircle, Truck } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';
import { ChatWindow } from '../components/ChatWindow';
import { WalletCard } from '../components/WalletCard';
import { TransactionHistory } from '../components/TransactionHistory';

interface SellerDashboardProps {
  user: User;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<'products' | 'orders' | 'transactions'>('products');
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    nama: '', deskripsi: '', harga: '', stok: '', gambar_url: 'https://picsum.photos/300/300', lat_long: '', address_name: ''
  });

  const loadData = async () => {
    if(products.length === 0) setLoading(true);
    const [allProds, allOrders] = await Promise.all([api.getProducts(), api.getOrders()]);
    setProducts(allProds.filter(p => p.seller_id === user.id));
    setOrders(allOrders.filter(o => o.seller_id === user.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user.id]);

  // Product Logic (Add/Delete/Upload) same as before...
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({...formData, gambar_url: reader.result as string});
      reader.readAsDataURL(file);
    }
  };
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addProduct({
      seller_id: user.id, seller_name: user.nama_lengkap,
      nama: formData.nama, deskripsi: formData.deskripsi,
      harga: Number(formData.harga), stok: Number(formData.stok),
      gambar_url: formData.gambar_url, lat_long: formData.lat_long, address_name: formData.address_name
    });
    setShowAddModal(false);
    loadData();
  };
  const handleDelete = async (id: string) => {
    if(confirm('Hapus produk?')) { await api.deleteProduct(id); loadData(); }
  };
  const handleLocationSelect = (lat: string, long: string, name: string) => {
    setFormData(prev => ({ ...prev, lat_long: `${lat},${long}`, address_name: name }));
  };

  // --- ORDER LOGIC ---
  const handleAcceptOrder = async (orderId: string) => {
    if(!confirm("Terima pesanan ini? Stok akan dikunci dan Driver bisa mengambil order.")) return;
    await api.updateOrderStatus(orderId, OrderStatus.CONFIRMED);
    loadData();
  };

  const handleHandoverToDriver = async (orderId: string) => {
      if(!confirm("Serahkan barang ke driver? Status akan berubah menjadi DIKIRIM.")) return;
      await api.updateOrderStatus(orderId, OrderStatus.DIKIRIM);
      loadData();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 sticky top-0 bg-gray-50 pt-2 z-10 pb-4 border-b overflow-x-auto">
        <button onClick={() => setView('products')} className={`flex-1 py-2 text-xs rounded-lg ${view === 'products' ? 'bg-white border text-brand-green' : 'text-gray-500'}`}><Package size={16} className="inline mr-1"/>Produk</button>
        <button onClick={() => setView('orders')} className={`flex-1 py-2 text-xs rounded-lg ${view === 'orders' ? 'bg-white border text-brand-green' : 'text-gray-500'}`}><ShoppingBag size={16} className="inline mr-1"/>Order {orders.filter(o => o.status === 'PENDING').length > 0 && <span className="bg-red-500 text-white px-1 rounded-full text-[10px] ml-1">{orders.filter(o => o.status === 'PENDING').length}</span>}</button>
        <button onClick={() => setView('transactions')} className={`flex-1 py-2 text-xs rounded-lg ${view === 'transactions' ? 'bg-white border text-brand-green' : 'text-gray-500'}`}><Wallet size={16} className="inline mr-1"/>Keuangan</button>
      </div>
      
      <WalletCard user={user} />

      {loading ? <LoadingSpinner /> : (
        <>
          {view === 'products' && (
            <div className="grid gap-4">
               {/* Product List UI (Simplified for brevity as it's mostly same) */}
               {products.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-xl flex gap-4 border border-gray-100">
                    <img src={p.gambar_url} className="w-16 h-16 rounded object-cover bg-gray-100" />
                    <div className="flex-1">
                        <div className="flex justify-between"><h3 className="font-bold">{p.nama}</h3><button onClick={() => handleDelete(p.id)} className="text-red-400"><Trash size={16}/></button></div>
                        <p className="text-sm">Rp {p.harga.toLocaleString()} • Stok: {p.stok}</p>
                    </div>
                  </div>
               ))}
               <Button onClick={() => setShowAddModal(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl z-40 p-0"><Plus size={24} /></Button>
            </div>
          )}

          {view === 'orders' && (
            <div className="space-y-4">
              <div className="flex justify-between px-1"><h3 className="font-bold">Pesanan Masuk</h3><button onClick={() => loadData()} className="text-xs text-brand-green"><RefreshCw size={12}/> Refresh</button></div>
              {orders.length === 0 ? <p className="text-center text-gray-400 mt-10">Belum ada pesanan.</p> : orders.map(o => (
                <div key={o.id} className={`bg-white p-4 rounded-xl shadow-sm border ${o.status === 'PENDING' ? 'border-brand-yellow ring-1 ring-yellow-100' : 'border-gray-100'}`}>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold">#{o.id.toString().slice(-4)}</span>
                    <Badge status={o.status} />
                  </div>
                  <h4 className="font-bold">{o.product_name}</h4>
                  <p className="text-sm">{o.jumlah} item • Rp {(o.product_price * o.jumlah).toLocaleString()}</p>
                  {o.catatan && <p className="text-xs italic bg-gray-50 p-1 mt-1 rounded">"{o.catatan}"</p>}
                  
                  {o.driver_name && <p className="text-xs mt-2 text-blue-600 font-semibold">Driver: {o.driver_name}</p>}

                  <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-50">
                     <Button size="sm" variant="secondary" className="w-auto py-1 px-3 text-[10px]" onClick={() => setActiveChatOrder(o)}><MessageCircle size={12}/> Chat Pembeli</Button>
                     
                     {o.status === OrderStatus.PENDING && (
                         <Button size="sm" className="w-auto py-1 px-3 text-xs" onClick={() => handleAcceptOrder(o.id)}>
                             <CheckCircle size={12} /> Terima
                         </Button>
                     )}

                     {o.status === OrderStatus.DRIVER_OTW_PICKUP && (
                         <Button size="sm" className="w-auto py-1 px-3 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => handleHandoverToDriver(o.id)}>
                             <Truck size={12} /> Serahkan ke Driver
                         </Button>
                     )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'transactions' && <div className="space-y-4"><TransactionHistory userId={user.id} /></div>}
        </>
      )}

      {/* Add Product Modal (Same as before but with address_name in form) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6">
            <h2 className="font-bold mb-4">Tambah Produk</h2>
            <form onSubmit={handleAddProduct} className="space-y-3">
               <Input required placeholder="Nama" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
               <div className="flex gap-2"><div className="w-16 h-16 bg-gray-100"><img src={formData.gambar_url} className="w-full h-full object-cover"/></div><input type="file" onChange={handleImageUpload} className="text-sm"/></div>
               <textarea required className="w-full border p-2 rounded" placeholder="Deskripsi" value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} />
               <div className="flex gap-2"><Input required type="number" placeholder="Harga" value={formData.harga} onChange={e => setFormData({...formData, harga: e.target.value})} /><Input required type="number" placeholder="Stok" value={formData.stok} onChange={e => setFormData({...formData, stok: e.target.value})} /></div>
               <LocationPicker label="Lokasi" onLocationSelect={handleLocationSelect} />
               <div className="flex gap-2 mt-4"><Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button><Button type="submit">Simpan</Button></div>
            </form>
          </div>
        </div>
      )}

      {activeChatOrder && <ChatWindow orderId={activeChatOrder.id} currentUser={user} onClose={() => setActiveChatOrder(null)} title={activeChatOrder.buyer_name} />}
    </div>
  );
};