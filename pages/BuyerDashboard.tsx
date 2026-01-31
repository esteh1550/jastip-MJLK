import React, { useState, useEffect } from 'react';
import { User, Product, Order, CartItem, OrderStatus } from '../types';
import { api, calculateDistance } from '../services/api';
import { Button, Input, Badge, LoadingSpinner } from '../components/ui';
import { ShoppingCart, MapPin, Search, Plus, Minus, X, Package, MessageCircle, CheckCircle, Wallet, Filter, Star, Store, ShoppingBag } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';
import { WalletCard } from '../components/WalletCard';
import { ChatWindow } from '../components/ChatWindow';
import { TransactionHistory } from '../components/TransactionHistory';
import { StarRating } from '../components/StarRating';

interface BuyerDashboardProps {
  user: User;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'browse' | 'cart' | 'orders' | 'transactions'>('browse');
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [filterSellerName, setFilterSellerName] = useState('');

  // Orders Filter
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | OrderStatus>('ALL');

  // Checkout & Wallet State
  const [userLocation, setUserLocation] = useState<{lat: number, long: number, address?: string} | null>(null);
  const [locating, setLocating] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'location' | 'confirm' | 'success'>('review');
  const [walletBalance, setWalletBalance] = useState(0);
  const [orderNotes, setOrderNotes] = useState(''); // Global note for checkout
  
  // Chat & Review State
  const [activeChatOrder, setActiveChatOrder] = useState<{order: Order, type: 'SELLER' | 'DRIVER'} | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // UI Feedback
  const [addedToCartId, setAddedToCartId] = useState<string | null>(null);

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
    
    // UI Feedback
    setAddedToCartId(product.id);
    setTimeout(() => setAddedToCartId(null), 1000);
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

  const submitReview = async () => {
    if(!reviewOrder) return;
    setLoading(true);
    await api.addReview({
        product_id: reviewOrder.product_id,
        order_id: reviewOrder.id,
        user_id: user.id,
        user_name: user.nama_lengkap,
        rating: reviewRating,
        comment: reviewComment
    });
    setReviewOrder(null);
    setReviewComment('');
    setReviewRating(5);
    await loadOrders(); 
    await loadProducts(); 
    setLoading(false);
  };

  // --- Filter Logic ---
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nama.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeller = filterSellerName ? p.seller_name.toLowerCase().includes(filterSellerName.toLowerCase()) : true;
    const price = p.harga;
    const matchesMin = minPrice ? price >= Number(minPrice) : true;
    const matchesMax = maxPrice ? price <= Number(maxPrice) : true;
    const matchesRating = filterRating > 0 ? (p.average_rating || 0) >= filterRating : true;

    return matchesSearch && matchesSeller && matchesMin && matchesMax && matchesRating;
  });

  const filteredOrders = orderStatusFilter === 'ALL' 
    ? orders 
    : orders.filter(o => o.status === orderStatusFilter);

  // --- Checkout Logic ---

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
    
    if (walletBalance < grandTotal) {
      alert(`Saldo tidak cukup! Total: Rp ${grandTotal.toLocaleString()}, Saldo: Rp ${walletBalance.toLocaleString()}`);
      return;
    }
    
    setLoading(true);
    const orderPayloads = [];

    // Create Orders
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
          catatan: orderNotes,
          jarak_km: group.distance,
          total_ongkir: shippingPerItem,
          total_harga: (item.harga * item.qty) + shippingPerItem,
          alamat_pengiriman: userLocation.address || `${userLocation.lat}, ${userLocation.long}`,
          lat_long_pengiriman: `${userLocation.lat},${userLocation.long}`
        });
      }
    }

    await api.createOrder(orderPayloads);
    // Deduct Balance Immediately
    await api.addTransaction(user.id, 'PAYMENT', grandTotal, `Pembayaran Order Jastip (${orderPayloads.length} item)`);

    setCart([]);
    setCheckoutStep('success');
    setUserLocation(null);
    setOrderNotes('');
    setLoading(false);
    loadOrders();
    setWalletBalance(prev => prev - grandTotal);
  };

  const handleReceiveOrder = async (order: Order) => {
    if (!confirm("Apakah Anda yakin sudah menerima pesanan ini? Dana akan diteruskan ke Penjual dan Driver.")) return;
    
    await api.updateOrderStatus(order.id, OrderStatus.SELESAI);
    
    // Logic: If status was already SELESAI (by driver), no money move. 
    // But since API logic for money move is simpler here, let's assume we trigger it safely.
    // In a real app, backend ensures idempotency.
    // Here we trust the flow: Driver or Buyer triggers status SELESAI -> Money moves.
    
    // NOTE: In DriverDashboard, Driver finishing order ALREADY moves money.
    // So if order status is NOT 'SELESAI' yet, we move money.
    if (order.status !== OrderStatus.SELESAI) {
        await api.addTransaction(order.seller_id, 'INCOME', order.total_harga - order.total_ongkir, `Penjualan Order #${order.id}`);
        if(order.driver_id) {
            await api.addTransaction(order.driver_id, 'INCOME', order.total_ongkir, `Ongkir Order #${order.id}`);
        }
    }

    loadOrders();
    alert("Terima kasih! Pesanan selesai.");
  };

  // --- Renders ---

  return (
    <div className="pb-20">
      {/* View Switcher (Same as before) */}
      {view === 'browse' && (
        <>
          <div className="bg-gray-50 p-4 pb-2">
             <WalletCard user={user} onBalanceChange={setWalletBalance} />
          </div>
          <div className="sticky top-0 bg-gray-50 pt-0 px-4 z-20 pb-2">
            <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <Input 
                    placeholder="Cari produk..." 
                    className="pl-10" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                </div>
                <button onClick={() => setShowFilter(!showFilter)} className="p-3 rounded-lg border bg-white border-gray-200">
                    <Filter size={18} />
                </button>
            </div>
          </div>
        </>
      )}

      <div className="p-4 pt-0">
        {loading && <LoadingSpinner /> }

        {/* BROWSE */}
        {view === 'browse' && !loading && (
          <div className="grid grid-cols-2 gap-4">
             {filteredProducts.map(p => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow group">
                <div className="h-32 bg-gray-200 relative">
                  <img src={p.gambar_url} alt={p.nama} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs font-semibold truncate flex items-center gap-1">
                        <Store size={10} /> {p.seller_name}
                    </p>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{p.nama}</h3>
                  <div className="mb-2"><StarRating rating={p.average_rating || 0} count={p.total_reviews || 0} /></div>
                  <p className="text-brand-green font-bold text-sm mb-2">Rp {p.harga.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mb-2">Stok: {p.stok}</p>
                  <div className="mt-auto">
                    <Button size="sm" onClick={() => addToCart(p)} disabled={p.stok <= 0} className={addedToCartId === p.id ? 'bg-brand-dark' : ''}>
                      {p.stok <= 0 ? 'Habis' : (addedToCartId === p.id ? 'Masuk Keranjang' : 'Beli')}
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
            {cart.length === 0 && checkoutStep !== 'success' ? <div className="text-center mt-20 text-gray-400">Keranjang kosong.</div> : (
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
                              <button onClick={() => updateQty(item.id, -1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Minus size={14}/></button>
                              <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, 1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Plus size={14}/></button>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 self-start p-1"><X size={16}/></button>
                      </div>
                    ))}
                    
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                        <label className="text-sm font-bold text-gray-700 block mb-1">Catatan Tambahan (Opsional)</label>
                        <textarea 
                            className="w-full text-sm p-2 border border-gray-300 rounded-lg"
                            rows={2}
                            placeholder="Contoh: Jangan terlalu pedas, rumah pagar hitam..."
                            value={orderNotes}
                            onChange={e => setOrderNotes(e.target.value)}
                        />
                    </div>

                    <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto">
                      <Button onClick={() => setCheckoutStep('location')}>Lanjut Checkout</Button>
                    </div>
                  </div>
                )}

                {/* Location Picker Step (Same as before) */}
                {checkoutStep === 'location' && (
                  <div className="text-center mt-4 px-2">
                     <LocationPicker label="Cari Lokasi Pengiriman" onLocationSelect={handleManualLocationSelect} />
                     <p className="my-3 text-xs text-gray-400">ATAU</p>
                     <Button variant="outline" onClick={requestGPSLocation} disabled={locating}>{locating ? 'Mencari...' : 'Gunakan GPS'}</Button>
                  </div>
                )}

                {/* Confirm Step */}
                {checkoutStep === 'confirm' && userLocation && (
                  <div className="space-y-6 pb-24">
                    <h2 className="font-bold text-lg">Konfirmasi Pembayaran</h2>
                    <div className="bg-white p-4 rounded-xl border border-brand-green relative">
                       <p className="text-xs text-gray-500">Dikirim ke:</p>
                       <p className="font-bold">{userLocation.address}</p>
                       {orderNotes && <p className="text-xs mt-2 italic text-gray-600">"Catatan: {orderNotes}"</p>}
                    </div>

                    <WalletCard user={user} onBalanceChange={setWalletBalance} />
                    
                    {calculateCartTotals().groups.map(group => (
                      <div key={group.sellerId} className="bg-white p-4 rounded-xl border border-gray-200">
                        <div className="flex justify-between font-bold text-sm mb-2">
                            <span>{group.sellerName}</span>
                            <span className="text-xs font-normal bg-gray-100 px-2 py-1 rounded">{group.distance} km</span>
                        </div>
                        {group.items.map(item => (
                             <div key={item.id} className="flex justify-between text-sm mb-1 text-gray-600">
                                <span>{item.qty}x {item.nama}</span>
                                <span>Rp {(item.harga * item.qty).toLocaleString()}</span>
                             </div>
                        ))}
                        <div className="flex justify-between text-sm text-gray-500 mt-2 pt-2 border-t border-dashed">
                             <span>Ongkir</span>
                             <span>Rp {group.shippingCost.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}

                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 max-w-md mx-auto">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600">Total Bayar</span>
                        <div className="text-right">
                          <div className="text-xl font-bold text-brand-green">Rp {calculateCartTotals().grandTotal.toLocaleString()}</div>
                          {walletBalance < calculateCartTotals().grandTotal && <div className="text-xs text-red-500 font-bold">Saldo Kurang</div>}
                        </div>
                      </div>
                      <Button onClick={handleCheckout} disabled={loading || walletBalance < calculateCartTotals().grandTotal}>
                        {loading ? 'Memproses...' : 'Beli Sekarang'}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Success Step */}
                {checkoutStep === 'success' && (
                   <div className="text-center pt-10">
                       <CheckCircle size={64} className="mx-auto text-brand-green mb-4" />
                       <h2 className="text-xl font-bold">Pesanan Berhasil!</h2>
                       <p className="text-gray-500 mb-6">Pembayaran dikonfirmasi. Saldo dan stok telah disesuaikan.</p>
                       <Button onClick={() => { setView('orders'); setCheckoutStep('review'); }}>Lihat Pesanan</Button>
                   </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ORDERS */}
        {view === 'orders' && (
          <div className="space-y-4">
             {/* Status Tabs Logic (Same as before) */}
             <div className="flex gap-2 overflow-x-auto pb-2 sticky top-0 bg-gray-50 pt-2 z-10 no-scrollbar">
                {(['ALL', OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.DRIVER_OTW_PICKUP, OrderStatus.DIKIRIM, OrderStatus.SELESAI] as const).map(status => (
                    <button key={status} onClick={() => setOrderStatusFilter(status)} 
                    className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${orderStatusFilter === status ? 'bg-brand-green text-white' : 'bg-white text-gray-500'}`}>
                        {status.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

             {filteredOrders.map(o => (
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
                     
                     <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                        <p>Seller: {o.seller_id}</p>
                        {o.driver_name && <p className="font-semibold text-brand-green">Driver: {o.driver_name}</p>}
                        {o.catatan && <p className="italic mt-1">"Note: {o.catatan}"</p>}
                     </div>

                     <div className="mt-3 flex flex-wrap gap-2 justify-end">
                        {/* CHAT BUTTONS */}
                        <Button size="sm" variant="secondary" className="w-auto py-1 px-3 text-[10px]" onClick={() => setActiveChatOrder({order: o, type: 'SELLER'})}>
                            <MessageCircle size={12} /> Penjual
                        </Button>
                        {(o.status === OrderStatus.DRIVER_OTW_PICKUP || o.status === OrderStatus.DIKIRIM) && o.driver_id && (
                            <Button size="sm" variant="secondary" className="w-auto py-1 px-3 text-[10px]" onClick={() => setActiveChatOrder({order: o, type: 'DRIVER'})}>
                                <MessageCircle size={12} /> Driver
                            </Button>
                        )}
                        
                        {/* ACTION: Receive Order */}
                        {o.status === OrderStatus.DIKIRIM && (
                            <Button size="sm" className="w-auto py-1 px-3 text-xs bg-brand-green" onClick={() => handleReceiveOrder(o)}>
                                <CheckCircle size={12} /> Pesanan Diterima
                            </Button>
                        )}

                        {o.status === OrderStatus.SELESAI && !o.is_reviewed && (
                            <Button size="sm" variant="outline" className="w-auto py-1 px-3 text-xs" onClick={() => setReviewOrder(o)}>
                                <Star size={12} /> Ulas
                            </Button>
                        )}
                     </div>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        )}

        {/* TRANSACTIONS View (Same) */}
        {view === 'transactions' && <div className="space-y-4"><TransactionHistory userId={user.id} /></div>}

        {/* Chat Modal */}
        {activeChatOrder && (
          <ChatWindow 
            orderId={activeChatOrder.type === 'DRIVER' ? `${activeChatOrder.order.id}-driver` : activeChatOrder.order.id} 
            currentUser={user} 
            onClose={() => setActiveChatOrder(null)}
            title={activeChatOrder.type === 'DRIVER' ? `Chat Driver: ${activeChatOrder.order.driver_name}` : `Chat Penjual: ${activeChatOrder.order.seller_id}`}
          />
        )}
        
        {/* Review Modal (Same) */}
        {reviewOrder && (
             <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                    <h3 className="font-bold mb-4">Ulas Pesanan</h3>
                    <div className="flex justify-center mb-4 gap-2">
                        {[1,2,3,4,5].map(star => <button key={star} onClick={() => setReviewRating(star)}><Star size={32} className={reviewRating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} /></button>)}
                    </div>
                    <textarea className="w-full border p-2 rounded mb-4" rows={3} value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
                    <Button onClick={submitReview}>Kirim</Button>
                </div>
            </div>
        )}
      </div>
      
      {/* Bottom Nav (Same) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 max-w-md mx-auto z-10">
        <button onClick={() => setView('browse')} className={`p-2 rounded-lg flex flex-col items-center ${view === 'browse' ? 'text-brand-green' : 'text-gray-400'}`}><Search size={20} /><span className="text-[10px]">Jelajah</span></button>
        <button onClick={() => setView('cart')} className={`p-2 rounded-lg flex flex-col items-center relative ${view === 'cart' ? 'text-brand-green' : 'text-gray-400'}`}><ShoppingCart size={20} />{cart.length > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}<span className="text-[10px]">Keranjang</span></button>
        <button onClick={() => setView('orders')} className={`p-2 rounded-lg flex flex-col items-center ${view === 'orders' ? 'text-brand-green' : 'text-gray-400'}`}><Package size={20} /><span className="text-[10px]">Pesanan</span></button>
        <button onClick={() => setView('transactions')} className={`p-2 rounded-lg flex flex-col items-center ${view === 'transactions' ? 'text-brand-green' : 'text-gray-400'}`}><Wallet size={20} /><span className="text-[10px]">Dompet</span></button>
      </div>
    </div>
  );
};
