import React, { useState, useEffect } from 'react';
import { User, Product, Order, CartItem, OrderStatus } from '../types';
import { api, calculateDistance } from '../services/api';
import { Button, Input, Badge, LoadingSpinner } from '../components/ui';
import { ShoppingCart, MapPin, Search, Plus, Minus, X, Package, MessageCircle, CheckCircle, Wallet, Filter, Star, Store, ShoppingBag, ArrowRight } from 'lucide-react';
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
  
  // Chat & Review State
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);
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
    await loadOrders(); // Update "is_reviewed" status
    await loadProducts(); // Update product rating display
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
            // Dynamic Pricing Logic: Distance * Rate
            shippingCost = Math.ceil(distance * api.getRate());
            // Minimum Ongkir Logic
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
        // Distribute shipping cost per item
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
    setCheckoutStep('success');
    setUserLocation(null);
    setLoading(false);
    loadOrders();
    setWalletBalance(prev => prev - grandTotal);
  };

  // --- Renders ---

  return (
    <div className="pb-20">
      {/* View Switcher */}
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
                <button 
                    onClick={() => setShowFilter(!showFilter)} 
                    className={`p-3 rounded-lg border flex items-center gap-2 ${showFilter ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                    <Filter size={18} />
                    <span className="text-xs font-medium">Filter</span>
                </button>
            </div>
            
            {showFilter && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 animate-in slide-in-from-top-2">
                    <h4 className="font-bold text-sm mb-3 text-gray-800">Filter Produk</h4>
                    
                    <div className="mb-3">
                        <label className="text-xs text-gray-500 block mb-1">Nama Penjual</label>
                        <div className="relative">
                            <Store className="absolute left-3 top-3 text-gray-400" size={14} />
                            <Input 
                                placeholder="Cari nama toko..." 
                                className="pl-9 text-xs" 
                                value={filterSellerName}
                                onChange={e => setFilterSellerName(e.target.value)}
                            />
                        </div>
                    </div>

                    <label className="text-xs text-gray-500 block mb-1">Rentang Harga (Rp)</label>
                    <div className="flex gap-2 mb-3">
                        <Input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="text-xs" />
                        <span className="self-center">-</span>
                        <Input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="text-xs" />
                    </div>
                    
                    <div className="mb-2">
                        <label className="text-xs text-gray-500 block mb-2">Minimal Rating</label>
                        <div className="flex gap-2">
                            {[0,3,4,4.5].map(r => (
                                <button 
                                    key={r}
                                    onClick={() => setFilterRating(r)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterRating === r ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {r === 0 ? 'Semua' : `${r}+ ⭐`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="p-4 pt-0">
        {loading && <LoadingSpinner /> }

        {/* BROWSE */}
        {view === 'browse' && !loading && (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.length === 0 ? <p className="col-span-2 text-center text-gray-400 py-10">Produk tidak ditemukan.</p> :
            filteredProducts.map(p => (
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
                  <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-gray-800 text-sm line-clamp-1 cursor-help" title={p.deskripsi}>{p.nama}</h3>
                  </div>
                  <div className="mb-2">
                     <StarRating rating={p.average_rating || 0} count={p.total_reviews || 0} />
                  </div>
                  <p className="text-brand-green font-bold text-sm mb-2">Rp {p.harga.toLocaleString()}</p>
                  <div className="mt-auto">
                    <Button 
                      size="sm" 
                      onClick={() => addToCart(p)} 
                      className={`py-2 text-xs w-full transition-all ${addedToCartId === p.id ? 'bg-brand-dark' : 'bg-brand-green/90 hover:bg-brand-green'}`}
                    >
                      {addedToCartId === p.id ? (
                        <span className="flex items-center gap-1"><CheckCircle size={12} /> Masuk Keranjang</span>
                      ) : (
                        <span className="flex items-center gap-1"><Plus size={12} /> Beli</span>
                      )}
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
                              <button onClick={() => updateQty(item.id, -1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Minus size={14}/></button>
                              <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, 1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Plus size={14}/></button>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 self-start p-1"><X size={16}/></button>
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
                        <p className="text-gray-500 text-sm">Pilih lokasi agar kami bisa menghitung ongkir jastip secara akurat.</p>
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
                    
                    {/* Confirmed Address Block */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-green relative overflow-hidden">
                       <div className="absolute top-0 right-0 bg-brand-green text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold flex items-center gap-1">
                           <CheckCircle size={10} /> Alamat Terkonfirmasi
                       </div>
                       <div className="flex items-start gap-3 mt-2">
                           <div className="bg-green-100 p-2 rounded-full shrink-0">
                               <MapPin className="text-brand-green" size={20} />
                           </div>
                           <div className="flex-1">
                               <p className="text-xs text-gray-500 mb-1">Dikirim ke:</p>
                               <p className="font-bold text-gray-800 text-sm leading-tight mb-2">{userLocation.address}</p>
                               <button onClick={() => setCheckoutStep('location')} className="text-xs text-gray-400 font-semibold underline hover:text-brand-green">
                                   Ubah Lokasi
                               </button>
                           </div>
                       </div>
                    </div>

                    <WalletCard user={user} onBalanceChange={setWalletBalance} />

                    {calculateCartTotals().groups.map(group => (
                      <div key={group.sellerId} className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                        <div className="flex justify-between items-center border-b pb-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Store size={14} className="text-gray-500"/>
                            <span className="font-bold text-sm text-gray-700">{group.sellerName}</span>
                          </div>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{group.distance.toFixed(1)} km</span>
                        </div>
                        {group.items.map(item => (
                          <div key={item.id} className="flex justify-between text-sm mb-1 text-gray-600">
                            <span>{item.qty}x {item.nama}</span>
                            <span>Rp {(item.harga * item.qty).toLocaleString()}</span>
                          </div>
                        ))}
                        
                        <div className="mt-3 pt-2 border-t border-dashed bg-gray-50 -mx-4 px-4 pb-2">
                           <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Jarak Pengiriman</span>
                              <span>{group.distance} km</span>
                           </div>
                           <div className="flex justify-between text-xs text-gray-500 mb-2">
                              <span>Tarif Jastip</span>
                              <span>{api.getRate()} /km</span>
                           </div>
                           <div className="flex justify-between text-sm font-semibold text-gray-700">
                              <span>Total Ongkir</span>
                              <span>Rp {group.shippingCost.toLocaleString()}</span>
                           </div>
                        </div>

                        <div className="flex justify-between font-bold text-brand-green mt-2 text-base border-t pt-2">
                          <span>Subtotal Penjual</span>
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
                        {loading ? 'Memproses...' : 'Beli Sekarang'}
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
            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 sticky top-0 bg-gray-50 pt-2 z-10 no-scrollbar">
                {(['ALL', OrderStatus.PENDING, OrderStatus.DIKIRIM, OrderStatus.SELESAI] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setOrderStatusFilter(status)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${orderStatusFilter === status ? 'bg-brand-green text-white shadow-green-200' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        {status === 'ALL' ? 'Semua' : status}
                    </button>
                ))}
            </div>

             {filteredOrders.length === 0 ? <p className="text-center text-gray-500 mt-10">Tidak ada pesanan dengan status ini.</p> :
             filteredOrders.map(o => (
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
                     
                     <div className="mt-3 flex justify-end gap-2">
                        {o.status === OrderStatus.SELESAI && !o.is_reviewed && (
                            <Button size="sm" variant="outline" className="py-1 px-3 text-xs w-auto" onClick={() => setReviewOrder(o)}>
                                <Star size={14} /> Ulas
                            </Button>
                        )}
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

        {/* TRANSACTIONS */}
        {view === 'transactions' && (
            <div className="space-y-4">
                <h3 className="font-bold text-gray-700 px-1">Riwayat Transaksi</h3>
                <TransactionHistory userId={user.id} />
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

        {/* Review Modal */}
        {reviewOrder && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                    <h3 className="font-bold text-lg mb-2">Beri Ulasan</h3>
                    <p className="text-sm text-gray-500 mb-4">{reviewOrder.product_name}</p>
                    
                    <div className="flex justify-center mb-4 gap-2">
                        {[1,2,3,4,5].map(star => (
                            <button key={star} onClick={() => setReviewRating(star)}>
                                <Star 
                                    size={32} 
                                    className={`${reviewRating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                />
                            </button>
                        ))}
                    </div>

                    <textarea 
                        className="w-full border p-2 rounded-lg mb-4 text-sm" 
                        rows={3} 
                        placeholder="Tulis pendapatmu tentang produk ini..."
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                    />

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setReviewOrder(null)}>Batal</Button>
                        <Button onClick={submitReview} disabled={loading}>Kirim</Button>
                    </div>
                </div>
            </div>
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
        <button onClick={() => setView('transactions')} className={`p-2 rounded-lg flex flex-col items-center ${view === 'transactions' ? 'text-brand-green' : 'text-gray-400'}`}>
          <Wallet size={20} />
          <span className="text-[10px] font-medium">Dompet</span>
        </button>
      </div>
    </div>
  );
};