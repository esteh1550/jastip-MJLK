import React, { useState, useEffect } from 'react';
import { User, Product, Order } from '../types';
import { api } from '../services/api';
import { Button, Input, Badge, LoadingSpinner } from '../components/ui';
import { Plus, Trash, Edit, Package, ShoppingBag } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';

interface SellerDashboardProps {
  user: User;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<'products' | 'orders'>('products');

  // Form State
  const [formData, setFormData] = useState({
    nama: '', deskripsi: '', harga: '', stok: '', gambar_url: 'https://picsum.photos/300/300', lat_long: '', address_name: ''
  });

  const loadData = async () => {
    // Only set loading on initial fetch
    if(products.length === 0) setLoading(true);
    
    try {
      const [allProds, allOrders] = await Promise.all([api.getProducts(), api.getOrders()]);
      setProducts(allProds.filter(p => p.seller_id === user.id));
      setOrders(allOrders.filter(o => o.seller_id === user.id));
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

    // 1. Optimistic Update (Immediate UI Change)
    const optimisticProd: Product = {
      ...newProdPayload,
      id: tempId,
      created_at: new Date().toISOString()
    };
    
    setProducts(prev => [...prev, optimisticProd]);
    setShowAddModal(false);
    setFormData({ nama: '', deskripsi: '', harga: '', stok: '', gambar_url: 'https://picsum.photos/300/300', lat_long: '', address_name: '' });

    // 2. Actual API Call
    try {
      const createdProduct = await api.addProduct(newProdPayload);
      // Replace temp ID with real ID from server
      setProducts(prev => prev.map(p => p.id === tempId ? createdProduct : p));
    } catch (error) {
      alert('Gagal menyimpan ke database sheet');
      setProducts(prev => prev.filter(p => p.id !== tempId)); // Revert if failed
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Hapus produk ini?')) return;
    
    // Optimistic Delete
    const previousProducts = [...products];
    setProducts(prev => prev.filter(p => p.id !== id));
    
    try {
      await api.deleteProduct(id);
    } catch (e) {
      alert("Gagal menghapus");
      setProducts(previousProducts); // Revert
    }
  };

  const handleLocationSelect = (lat: string, long: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      lat_long: `${lat},${long}`,
      address_name: name
    }));
  };

  return (
    <div>
      <div className="flex gap-2 mb-6 sticky top-0 bg-gray-50 pt-2 z-10 pb-4 border-b">
        <button 
          onClick={() => setView('products')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors ${view === 'products' ? 'bg-white text-brand-green shadow-sm border border-green-200' : 'text-gray-500'}`}
        >
          <Package size={18} /> Produk Saya
        </button>
        <button 
          onClick={() => setView('orders')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors ${view === 'orders' ? 'bg-white text-brand-green shadow-sm border border-green-200' : 'text-gray-500'}`}
        >
          <ShoppingBag size={18} /> Pesanan Masuk
          {orders.filter(o => o.status === 'PENDING').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">
              {orders.filter(o => o.status === 'PENDING').length}
            </span>
          )}
        </button>
      </div>

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
              {orders.length === 0 ? <p className="text-center text-gray-500 mt-10">Belum ada pesanan masuk.</p> :
              orders.map(o => (
                <div key={o.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500">Order #{o.id.toString().slice(-4)}</span>
                    <Badge status={o.status} />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{o.product_name}</h4>
                      <p className="text-sm text-gray-600">{o.jumlah} item • Rp {o.total_harga.toLocaleString()}</p>
                      <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                        <p><span className="font-semibold">Pembeli:</span> {o.buyer_name || o.buyer_id}</p>
                        <p><span className="font-semibold">Driver:</span> {o.driver_id ? 'Sedang diantar' : 'Menunggu Driver'}</p>
                      </div>
                    </div>
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
              <div className="text-[10px] text-gray-400 mb-2">Koordinat terisi otomatis berdasarkan pencarian desa.</div>
              
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};