import React, { useState, useEffect } from 'react';
import { User, Product, Order, OrderStatus } from '../types';
import { api } from '../services/api';
import { Button, Input, Badge, LoadingSpinner } from '../components/ui';
import { Plus, Trash, Edit, Package, ShoppingBag, RefreshCw, MessageCircle } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';
import { ChatWindow } from '../components/ChatWindow';
import { WalletCard } from '../components/WalletCard';

interface SellerDashboardProps {
  user: User;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<'products' | 'orders'>('products');
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nama: '', deskripsi: '', harga: '', stok: '', gambar_url: 'https://picsum.photos/300/300', lat_long: '', address_name: ''
  });

  const loadData = async (background = false) => {
    if(!background && products.length === 0) setLoading(true);
    
    try {
      // Parallel fetch
      const [allProds, allOrders] = await Promise.all([api.getProducts(), api.getOrders()]);
      setProducts(allProds.filter(p => p.seller_id === user.id));
      
      // Sort orders by newest
      const myOrders = allOrders
        .filter(o => o.seller_id === user.id)
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setOrders(myOrders);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh orders every 15 seconds to catch new checkouts
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lat_long) {
      alert("Mohon pilih lokasi desa/kecamatan produk.");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newProdPayload = {
      seller_id: user.id,
      seller_name: user.nama_lengkap,
      nama: formData.nama,
      deskripsi: formData.deskripsi,
      harga: Number(formData.harga),
      stok: Number(formData.stok),
      gambar_url: formData.gambar_url,
      lat_long: formData.lat_long,
    };

    const optimisticProd: Product = {
      ...newProdPayload,
      id: tempId,
      created_at: new Date().toISOString()
    };
    
    setProducts(prev => [...prev, optimisticProd]);
    setShowAddModal(false);
    setFormData({ nama: '', deskripsi: '', harga: '', stok: '', gambar_url: 'https://picsum.photos/300/300', lat_long: '', address_name: '' });

    try {
      const createdProduct = await api.addProduct(newProdPayload);
      setProducts(prev => prev.map(p => p.id === tempId ? createdProduct : p));
    } catch (error) {
      alert('Gagal menyimpan ke database sheet');
      setProducts(prev => prev.filter(p => p.id !== tempId));
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Hapus produk ini?')) return;
    const previousProducts = [...products];
    setProducts(prev => prev.filter(p => p.id !== id));
    try {
      await api.deleteProduct(id);
    } catch (e) {
      alert("Gagal menghapus");
      setProducts(previousProducts);
    }
  };

  const handleLocationSelect = (lat: string, long: string, name: string) => {
    setFormData(prev => ({ ...prev, lat_long: `${lat},${long}`, address_name: name }));
  };

  const finishOrder = async (orderId: string, amount: number) => {
    // Only Driver usually does this, but seller can mark done too if needed. 
    // Here we just simulate Income for Seller when order is done (by driver usually)
    // For this prototype, we'll assume the money is released when order is 'SELESAI'
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 sticky top-0 bg-gray-50 pt-2 z-10 pb-4 border-b">
        <button 
          onClick={() => setView('products')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors ${view === 'products' ? 'bg-white text-brand-green shadow-sm border border-green-200' : 'text-gray-500'}`}
        >
          <Package size={18} /> Produk
        </button>
        <button 
          onClick={() => setView('orders')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors ${view === 'orders' ? 'bg-white text-brand-green shadow-sm border border-green-200' : 'text-gray-500'}`}
        >
          <ShoppingBag size={18} /> Pesanan
          {orders.filter(o => o.status === 'PENDING').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full animate-pulse">
              {orders.filter(o => o.status === 'PENDING').length}
            </span>
          )}
        </button>
      </div>
      
      {/* Wallet for Income */}
      <WalletCard userId={user.id} />

      {loading ? <LoadingSpinner /> : (
        <>
          {view === 'products' && (
            <>
              <div className="grid gap-4">
                {products.length === 0 && <p className="text-gray-400 text-center py-10">Belum ada produk. Tambahkan sekarang!</p>}
                {products.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                    <img src={p.gambar_url} alt={p.nama} className="w-20 h-20 object-cover rounded-lg bg-gray-100" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-800">{p.nama}</h3>
                        <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600"><Trash size={16} /></button>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{p.deskripsi}</p>
                      <div className="mt-2 flex justify-between items-end">
                        <div>
                          <p className="font-bold text-brand-green">Rp {p.harga.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">Stok: {p.stok}</p>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded">
                           {p.lat_long ? p.lat_long.split(',').map(c => Number(c).toFixed(3)).join(',') : 'No Loc'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={() => setShowAddModal(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl z-40 p-0 flex items-center justify-center">
                <Plus size={24} />
              </Button>
            </>
          )}

          {view === 'orders' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-gray-700">Daftar Pesanan</h3>
                <button onClick={() => loadData()} className="text-brand-green flex items-center gap-1 text-xs font-bold"><RefreshCw size={12}/> Refresh</button>
              </div>

              {orders.length === 0 ? <p className="text-center text-gray-500 mt-10">Belum ada pesanan masuk.</p> :
              orders.map(o => (
                <div key={o.id} className={`bg-white p-4 rounded-xl shadow-sm border ${o.status === 'PENDING' ? 'border-brand-yellow ring-1 ring-yellow-100' : 'border-gray-100'}`}>
                  <div className="flex justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-500">#{o.id.toString().slice(-4)}</span>
                      <span className="text-[10px] text-gray-400">{new Date(o.created_at).toLocaleTimeString()}</span>
                    </div>
                    <Badge status={o.status} />
                  </div>
                  <div className="flex gap-3 mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{o.product_name}</h4>
                      <p className="text-sm text-gray-600">{o.jumlah} item • Rp {o.total_harga.toLocaleString()}</p>
                      <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                        <p><span className="font-semibold">Pembeli:</span> {o.buyer_name || o.buyer_id}</p>
                        <p><span className="font-semibold">Alamat:</span> {o.alamat_pengiriman}</p>
                        <p><span className="font-semibold">Status:</span> {o.driver_id ? 'Driver OTW' : 'Menunggu Driver'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2 border-t border-gray-50">
                     <Button 
                      size="sm" 
                      variant="secondary" 
                      className="py-1 px-3 text-xs w-auto"
                      onClick={() => setActiveChatOrder(o)}
                     >
                       <MessageCircle size={14} /> Hubungi Pembeli/Driver
                     </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Tambah Produk</h2>
            <form onSubmit={handleAddProduct} className="space-y-3">
              <Input required label="Nama Produk" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea required className="w-full p-3 rounded-lg border border-gray-300" rows={2} value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input required type="number" label="Harga" value={formData.harga} onChange={e => setFormData({...formData, harga: e.target.value})} />
                <Input required type="number" label="Stok" value={formData.stok} onChange={e => setFormData({...formData, stok: e.target.value})} />
              </div>
              
              <LocationPicker 
                label="Lokasi Produk (Cari Desa/Kecamatan)"
                placeholder="Misal: Jatiwangi, Majalengka"
                onLocationSelect={handleLocationSelect}
              />
              <input type="hidden" required value={formData.lat_long} />
              
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {activeChatOrder && (
          <ChatWindow 
            orderId={activeChatOrder.id} 
            currentUser={user} 
            onClose={() => setActiveChatOrder(null)}
            title={`Pesanan #${activeChatOrder.id.toString().slice(-4)} - ${activeChatOrder.buyer_name}`}
          />
      )}
    </div>
  );
};
