import React, { useState, useEffect, useRef } from 'react';
import { User, Product, Order, OrderStatus } from '../types';
import { api } from '../services/api';
import { Button, Input, Badge, LoadingSpinner } from '../components/ui';
import { Plus, Trash, Edit, Package, ShoppingBag, RefreshCw, MessageCircle, Wallet, Bell, Image as ImageIcon } from 'lucide-react';
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
  
  // Notification Logic
  const prevOrderCountRef = useRef(0);

  // Form State
  const [formData, setFormData] = useState({
    nama: '', deskripsi: '', harga: '', stok: '', gambar_url: 'https://picsum.photos/300/300', lat_long: '', address_name: ''
  });

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
          console.log("Notifikasi diizinkan.");
      }
    }
  };

  const loadData = async (background = false) => {
    if(!background && products.length === 0) setLoading(true);
    
    try {
      const [allProds, allOrders] = await Promise.all([api.getProducts(), api.getOrders()]);
      setProducts(allProds.filter(p => p.seller_id === user.id));
      
      const myOrders = allOrders
        .filter(o => o.seller_id === user.id)
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Check for new orders
      if (background) {
          const newCount = myOrders.length;
          const prevCount = prevOrderCountRef.current;
          
          if (newCount > prevCount) {
            const diff = newCount - prevCount;
            if (Notification.permission === "granted") {
              new Notification("JastipMaja: Orderan Masuk!", {
                body: `Hore! Ada ${diff} pesanan baru menunggu konfirmasi Anda.`,
                icon: '/icon.png', // Ensure this exists or use default
                tag: 'new-order'
              });
            }
          }
      }
      prevOrderCountRef.current = myOrders.length;
      
      setOrders(myOrders);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestNotificationPermission();
    loadData();
    // Poll for new orders every 15 seconds
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // Limit 1MB to avoid localStorage quota issues
          alert("Ukuran gambar terlalu besar! Maks 1MB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
         setFormData({...formData, gambar_url: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

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
      created_at: new Date().toISOString(),
      average_rating: 0,
      total_reviews: 0
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

  return (
    <div>
      <div className="flex gap-2 mb-4 sticky top-0 bg-gray-50 pt-2 z-10 pb-4 border-b overflow-x-auto">
        <button 
          onClick={() => setView('products')} 
          className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors text-xs ${view === 'products' ? 'bg-white text-brand-green shadow-sm border border-green-200' : 'text-gray-500'}`}
        >
          <Package size={16} /> Produk
        </button>
        <button 
          onClick={() => setView('orders')} 
          className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors text-xs ${view === 'orders' ? 'bg-white text-brand-green shadow-sm border border-green-200' : 'text-gray-500'}`}
        >
          <ShoppingBag size={16} /> Order
          {orders.filter(o => o.status === 'PENDING').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full animate-pulse">
              {orders.filter(o => o.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setView('transactions')} 
          className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors text-xs ${view === 'transactions' ? 'bg-white text-brand-green shadow-sm border border-green-200' : 'text-gray-500'}`}
        >
          <Wallet size={16} /> Transaksi
        </button>
      </div>
      
      {/* Wallet for Income */}
      <WalletCard user={user} />

      {/* Enable Notification Hint */}
      {Notification.permission === 'default' && (
          <div className="mb-4 bg-blue-50 p-3 rounded-lg flex items-center justify-between">
              <span className="text-xs text-blue-700">Aktifkan notifikasi untuk order baru?</span>
              <button onClick={requestNotificationPermission} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Aktifkan</button>
          </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <>
          {view === 'products' && (
            <>
              <div className="grid gap-4">
                {products.length === 0 && <p className="text-gray-400 text-center py-10">Belum ada produk. Tambahkan sekarang!</p>}
                {products.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                    <img src={p.gambar_url} alt={p.nama} className="w-20 h-20 object-cover rounded-lg bg-gray-100 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-800 truncate">{p.nama}</h3>
                        <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600"><Trash size={16} /></button>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{p.deskripsi}</p>
                      <div className="mt-2 flex justify-between items-end">
                        <div>
                          <p className="font-bold text-brand-green">Rp {p.harga.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">Stok: {p.stok}</p>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded truncate max-w-[80px]">
                           {p.lat_long ? p.address_name || 'Lokasi Terpilih' : 'No Loc'}
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

          {view === 'transactions' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 px-1">Riwayat Transaksi</h3>
              <TransactionHistory userId={user.id} />
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
                 <label className="block text-sm font-medium text-gray-700 mb-1">Foto Produk</label>
                 <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img src={formData.gambar_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <label className="flex-1">
                        <span className="sr-only">Choose File</span>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-xs file:font-semibold
                            file:bg-green-50 file:text-brand-green
                            hover:file:bg-green-100"
                        />
                    </label>
                 </div>
              </div>

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
