import React, { useState, useEffect } from 'react';
import { User, Product, Order, CartItem, OrderStatus } from '../types';
import { api, calculateDistance } from '../services/api';
import { Button, Input, Badge, LoadingSpinner } from '../components/ui';
import { ShoppingCart, MapPin, Search, Plus, Minus, X, Package, MessageCircle, CheckCircle } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';
import { WalletCard } from '../components/WalletCard';
import { ChatWindow } from '../components/ChatWindow';

interface BuyerDashboardProps {
  user: User;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'browse' | 'cart' | 'orders'>('browse');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Checkout & Wallet State
  const [userLocation, setUserLocation] = useState<{lat: number, long: number, address?: string} | null>(null);
  const [locating, setLocating] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'location' | 'confirm' | 'success'>('review');
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Chat State
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const data = await api.getProducts();
    setProducts(data);
    setLoading(false);
  };

  const loadOrders = async () => {
    const data = await api.getOrders();
    setOrders(data.filter(o => o.buyer_id === user.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.id === id) return { ...p, qty: Math.max(1, p.qty + delta) };
      return p;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p.id !== id));
  };

  // --- Geolocation & Checkout Logic ---

  const requestGPSLocation = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            long: position.coords.longitude,
            address: 'Lokasi GPS Saat Ini'
          });
          setLocating(false);
          setCheckoutStep('confirm');
        },
        (error) => {
          alert('Gagal mengambil GPS. Silakan gunakan pencarian desa.');
          setLocating(false);
        }
      );
    } else {
      alert('Browser tidak support geolocation.');
      setLocating(false);
    }
  };

  const handleManualLocationSelect = (lat: string, long: string, displayName: string) => {
     setUserLocation({
       lat: parseFloat(lat),
       long: parseFloat(long),
       address: displayName
     });
     setCheckoutStep('confirm');
  };

  const calculateCartTotals = () => {
    // Group by Seller
    const groups: { [sellerId: string]: { items: CartItem[], sellerName: string, originLatLong: string } } = {};
    
    cart.forEach(item => {
      if (!groups[item.seller_id]) {
        groups[item.seller_id] = { items: [], sellerName: item.seller_name, originLatLong: item.lat_long };
      }
      groups[item.seller_id].items.push(item);
    });

    let grandTotal = 0;
    const finalGroups = Object.keys(groups).map(sellerId => {
      const group = groups[sellerId];
      // Parse Origin (Seller)
      let distance = 0;
      let shippingCost = 0;

      if (userLocation && group.originLatLong) {
        const [sLat, sLong] = group.originLatLong.split(',').map(Number);
        if(!isNaN(sLat) && !isNaN(sLong)) {
            distance = calculateDistance(sLat, sLong, userLocation.lat, userLocation.long);
            shippingCost = Math.ceil(distance * api.getRate());
            if (shippingCost < 5000) shippingCost = 5000;
        }
      }

      const itemsTotal = group.items.reduce((sum, item) => sum + (item.harga * item.qty), 0);
      const total = itemsTotal + shippingCost;
      grandTotal += total;

      return {
        sellerId,
        sellerName: group.sellerName,
        items: group.items,
        distance,
        shippingCost,
        itemsTotal,
        total
      };
    });

    return { groups: finalGroups, grandTotal };
  };

  const handleCheckout = async () => {
    if (!userLocation) return;
    const { grandTotal, groups } = calculateCartTotals();
    
    // Check Wallet Balance
    if (walletBalance < grandTotal) {
      alert(`Saldo tidak cukup! Total: Rp ${grandTotal.toLocaleString()}, Saldo: Rp ${walletBalance.toLocaleString()}`);
      return;
    }
    
    setLoading(true);
    const orderPayloads = [];

    // 1. Create Orders
    for (const group of groups) {
      for (const item of group.items) {
        const shippingPerItem = Math.floor(group.shippingCost / group.items.length);
        
        orderPayloads.push({
          buyer_id: user.id,
          buyer_name: user.nama_lengkap,
          seller_id: group.sellerId,
          product_id: item.id,
          product_name: item.nama,
          product_img: item.gambar_url,
          jumlah: item.qty,
          jarak_km: group.distance,
          total_ongkir: shippingPerItem,
          total_harga: (item.harga * item.qty) + shippingPerItem,
          alamat_pengiriman: userLocation.address || `${userLocation.lat.toFixed(5)}, ${userLocation.long.toFixed(5)}`,
          lat_long_pengiriman: `${userLocation.lat},${userLocation.long}`
        });
      }
    }

    await api.createOrder(orderPayloads);

    // 2. Deduct Balance
    await api.addTransaction(user.id, 'PAYMENT', grandTotal, `Pembayaran Order Jastip (${orderPayloads.length} item)`);

    setCart([]);
    setCheckoutStep('success'); // New Success Step
    setUserLocation(null);
    setLoading(false);
    loadOrders();
    setWalletBalance(prev => prev - grandTotal); // Optimistic update
  };

  // --- Renders ---

  const filteredProducts = products.filter(p => p.nama.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="pb-20">
      {/* View Switcher */}
      {view === 'browse' && (
        <>
          <div className="bg-gray-50 p-4 pb-2">
             <WalletCard userId={user.id} onBalanceChange={setWalletBalance} />
          </div>
          <div className="sticky top-0 bg-gray-50 pt-0 px-4 z-20 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input 
                placeholder="Cari jajanan..." 
                className="pl-10" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="p-4 pt-0">
        {loading && <LoadingSpinner />}

        {/* BROWSE */}
        {view === 'browse' && !loading && (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="h-32 bg-gray-200 relative">
                  <img src={p.gambar_url} alt={p.nama} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs font-semibold truncate">{p.seller_name}</p>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-800 text-sm mb-1">{p.nama}</h3>
                  <p className="text-brand-green font-bold text-sm mb-2">Rp {p.harga.toLocaleString()}</p>
                  <div className="mt-auto">
                    <Button size="sm" onClick={() => addToCart(p)} className="py-2 text-xs w-full">
                      + Beli
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CART */}
        {view === 'cart' && (
          <div>
            {cart.length === 0 && checkoutStep !== 'success' ? (
              <div className="text-center mt-20 text-gray-400">Keranjang kosong.</div>
            ) : (
              <>
                {checkoutStep === 'review' && (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-3">
                        <img src={item.gambar_url} className="w-16 h-16 rounded bg-gray-100 object-cover" />
                        <div className="flex-1">
                          <h4 className="font-bold text-sm">{item.nama}</h4>
                          <p className="text-xs text-gray-500 mb-2">{item.seller_name}</p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-brand-green">Rp {(item.harga * item.qty).toLocaleString()}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQty(item.id, -1)} className="p-1 bg-gray-100 rounded"><Minus size={14}/></button>
                              <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, 1)} className="p-1 bg-gray-100 rounded"><Plus size={14}/></button>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 self-start"><X size={16}/></button>
                      </div>
                    ))}
                    <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto">
                      <Button onClick={() => setCheckoutStep('location')}>Lanjut Checkout</Button>
                    </div>
                  </div>
                )}

                {checkoutStep === 'location' && (
                  <div className="text-center mt-4 px-2">
                    <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6">
                      <MapPin size={48} className="mx-auto text-brand-green" />
                      <div>
                        <h3 className="text-xl font-bold mb-2">Mau diantar kemana?</h3>
                        <p className="text-gray-500 text-sm">Pilih lokasi agar kami bisa menghitung ongkir jastip.</p>
                      </div>
                      
                      {/* Option 1: Search */}
                      <div className="text-left">
                        <LocationPicker 
                          label="Cari Nama Desa / Kelurahan / Kecamatan" 
                          onLocationSelect={handleManualLocationSelect}
                          placeholder="Contoh: Majalengka Kulon"
                        />
                      </div>

                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">ATAU</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                      </div>

                      {/* Option 2: GPS */}
                      <Button variant="outline" onClick={requestGPSLocation} disabled={locating} className="py-4">
                         {locating ? 'Mencari...' : 'Gunakan GPS Lokasi Saya'}
                      </Button>
                      
                      <button onClick={() => setCheckoutStep('review')} className="text-sm text-gray-400 mt-4 underline">Kembali</button>
                    </div>
                  </div>
                )}

                {checkoutStep === 'confirm' && userLocation && (
                  <div className="space-y-6 pb-24">
                    <h2 className="font-bold text-lg">Konfirmasi Pesanan</h2>
                    
                    <div className="bg-green-50 p-3 rounded-lg flex items-start gap-3 border border-green-200">
                       <MapPin className="text-green-600 mt-1" size={18} />
                       <div>
                         <p className="text-xs text-green-800 font-bold">Alamat Pengantaran:</p>
                         <p className="text-sm text-green-900">{userLocation.address}</p>
                       </div>
                       <button onClick={() => setCheckoutStep('location')} className="text-xs text-green-600 underline ml-auto">Ubah</button>
                    </div>

                    <WalletCard userId={user.id} onBalanceChange={setWalletBalance} />

                    {calculateCartTotals().groups.map(group => (
                      <div key={group.sellerId} className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                        <div className="flex justify-between items-center border-b pb-2 mb-2">
                          <span className="font-bold text-sm text-gray-700">{group.sellerName}</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{group.distance.toFixed(1)} km</span>
                        </div>
                        {group.items.map(item => (
                          <div key={item.id} className="flex justify-between text-sm mb-1 text-gray-600">
                            <span>{item.qty}x {item.nama}</span>
                            <span>Rp {(item.harga * item.qty).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm text-gray-500 mt-2 pt-2 border-t border-dashed">
                          <span>Ongkir Jastip</span>
                          <span>Rp {group.shippingCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-brand-green mt-1">
                          <span>Subtotal</span>
                          <span>Rp {group.total.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}

                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 max-w-md mx-auto">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600">Total Bayar</span>
                        <div className="text-right">
                          <div className="text-xl font-bold text-brand-green">Rp {calculateCartTotals().grandTotal.toLocaleString()}</div>
                          {walletBalance < calculateCartTotals().grandTotal && (
                            <div className="text-xs text-red-500 font-bold">Saldo Kurang</div>
                          )}
                        </div>
                      </div>
                      <Button onClick={handleCheckout} disabled={loading || walletBalance < calculateCartTotals().grandTotal}>
                        {loading ? 'Memproses...' : 'Bayar & Pesan'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* SUCCESS PAGE */}
                {checkoutStep === 'success' && (
                   <div className="flex flex-col items-center justify-center pt-10 px-6 text-center">
                     <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                       <CheckCircle size={40} className="text-brand-green" />
                     </div>
                     <h2 className="text-2xl font-bold text-gray-800 mb-2">Pesanan Berhasil!</h2>
                     <p className="text-gray-500 mb-8">
                       Pembayaran berhasil. Penjual telah dinotifikasi. 
                       Tunggu makananmu diantar ya!
                     </p>
                     <Button onClick={() => { setView('orders'); setCheckoutStep('review'); }}>
                       Lihat Pesanan Saya
                     </Button>
                   </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ORDERS */}
        {view === 'orders' && (
          <div className="space-y-4">
             {orders.length === 0 ? <p className="text-center text-gray-500 mt-10">Belum ada riwayat pesanan.</p> :
             orders.map(o => (
               <div key={o.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                 <div className="flex justify-between mb-2">
                   <span className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</span>
                   <Badge status={o.status} />
                 </div>
                 <div className="flex gap-3">
                   <img src={o.product_img} className="w-16 h-16 rounded bg-gray-100 object-cover" />
                   <div className="flex-1">
                     <h4 className="font-bold text-gray-800">{o.product_name}</h4>
                     <p className="text-sm text-gray-600">{o.jumlah} item • Rp {o.total_harga.toLocaleString()}</p>
                     <p className="text-xs text-gray-400 mt-1">Seller: {o.seller_id} (Jarak {o.jarak_km}km)</p>
                     
                     <div className="mt-3 flex justify-end">
                       <Button 
                        size="sm" 
                        variant="secondary" 
                        className="py-1 px-3 text-xs w-auto"
                        onClick={() => setActiveChatOrder(o)}
                       >
                         <MessageCircle size={14} /> Chat
                       </Button>
                     </div>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        )}

        {/* Chat Modal */}
        {activeChatOrder && (
          <ChatWindow 
            orderId={activeChatOrder.id} 
            currentUser={user} 
            onClose={() => setActiveChatOrder(null)}
            title={`${activeChatOrder.product_name} (${activeChatOrder.seller_id})`}
          />
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 max-w-md mx-auto z-10">
        <button onClick={() => setView('browse')} className={`p-2 rounded-lg flex flex-col items-center ${view === 'browse' ? 'text-brand-green' : 'text-gray-400'}`}>
          <Search size={20} />
          <span className="text-[10px] font-medium">Jelajah</span>
        </button>
        <button onClick={() => setView('cart')} className={`p-2 rounded-lg flex flex-col items-center relative ${view === 'cart' ? 'text-brand-green' : 'text-gray-400'}`}>
          <ShoppingCart size={20} />
          {cart.length > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
          <span className="text-[10px] font-medium">Keranjang</span>
        </button>
        <button onClick={() => setView('orders')} className={`p-2 rounded-lg flex flex-col items-center ${view === 'orders' ? 'text-brand-green' : 'text-gray-400'}`}>
          <Package size={20} />
          <span className="text-[10px] font-medium">Pesanan</span>
        </button>
      </div>
    </div>
  );
};
