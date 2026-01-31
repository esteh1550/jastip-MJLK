import React, { useState, useEffect } from 'react';
import { User, Product, Order, CartItem, OrderStatus } from '../types';
import { api, calculateDistance } from '../services/api';
import { Button, Input, Badge, LoadingSpinner } from '../components/ui';
import { ShoppingCart, MapPin, Search, Plus, Minus, X, Package } from 'lucide-react';

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
  
  // Checkout State
  const [userLocation, setUserLocation] = useState<{lat: number, long: number} | null>(null);
  const [locating, setLocating] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'location' | 'confirm'>('review');

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

  const requestLocation = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            long: position.coords.longitude
          });
          setLocating(false);
          setCheckoutStep('confirm');
        },
        (error) => {
          alert('Gagal mengambil lokasi. Menggunakan lokasi default (Alun-Alun Majalengka).');
          setUserLocation({ lat: -6.8365, long: 108.2285 });
          setLocating(false);
          setCheckoutStep('confirm');
        }
      );
    } else {
      alert('Browser tidak support geolocation.');
      setLocating(false);
    }
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
      const [sLat, sLong] = group.originLatLong.split(',').map(Number);
      
      let distance = 0;
      let shippingCost = 0;

      if (userLocation) {
        distance = calculateDistance(sLat, sLong, userLocation.lat, userLocation.long);
        shippingCost = Math.ceil(distance * api.getRate());
        // Minimum shipping 5000
        if (shippingCost < 5000) shippingCost = 5000;
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
    const { groups } = calculateCartTotals();
    
    setLoading(true);
    const orderPayloads = [];

    for (const group of groups) {
      for (const item of group.items) {
        // Distribute shipping cost per item? No, usually per order/shipment.
        // For simplicity in this flat data structure, we'll assign the full shipping cost 
        // to the FIRST item of the seller, and 0 for the rest, OR split it.
        // Let's split strictly for the data record, but UX shows it grouped.
        // Actually, safer to create one record per item, but the prompt implies "Orders" table structure.
        // Let's say Total Ongkir is stored on each item record proportional to qty or just repeated for reference.
        // Simplification: We store the full calculated Shipping on the order record.
        
        // Wait, if I buy 2 items from Seller A, do I get 2 rows in Orders?
        // Yes, "product_id" is singular in Tab Orders.
        // So we need to flag them as part of same shipment or just divide cost.
        // Strategy: Divide shipping cost by number of items from that seller to store in DB
        // so sum(total_ongkir) matches user expectation.
        
        const shippingPerItem = Math.floor(group.shippingCost / group.items.length); // Rough split
        
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
          alamat_pengiriman: `${userLocation.lat.toFixed(5)}, ${userLocation.long.toFixed(5)}`,
          lat_long_pengiriman: `${userLocation.lat},${userLocation.long}`
        });
      }
    }

    await api.createOrder(orderPayloads);
    setCart([]);
    setView('orders');
    setCheckoutStep('review');
    setUserLocation(null);
    setLoading(false);
    loadOrders();
  };

  // --- Renders ---

  const filteredProducts = products.filter(p => p.nama.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="pb-20">
      {/* View Switcher */}
      {view === 'browse' && (
        <div className="sticky top-0 bg-gray-50 pt-2 px-4 z-20 pb-2">
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
            {cart.length === 0 ? (
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
                  <div className="text-center mt-10 px-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                      <MapPin size={48} className="mx-auto text-brand-green mb-4" />
                      <h3 className="text-xl font-bold mb-2">Dimana lokasimu?</h3>
                      <p className="text-gray-500 text-sm mb-6">Kami perlu lokasi kamu untuk menghitung jarak dan biaya ongkir Jastip dari setiap penjual.</p>
                      <Button onClick={requestLocation} disabled={locating}>
                        {locating ? 'Mencari Lokasi...' : 'Gunakan Lokasi Saat Ini'}
                      </Button>
                    </div>
                  </div>
                )}

                {checkoutStep === 'confirm' && userLocation && (
                  <div className="space-y-6 pb-24">
                    <h2 className="font-bold text-lg">Konfirmasi Pesanan</h2>
                    {calculateCartTotals().groups.map(group => (
                      <div key={group.sellerId} className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                        <div className="flex justify-between items-center border-b pb-2 mb-2">
                          <span className="font-bold text-sm text-gray-700">{group.sellerName}</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{group.distance} km</span>
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
                        <span className="text-xl font-bold text-brand-green">Rp {calculateCartTotals().grandTotal.toLocaleString()}</span>
                      </div>
                      <Button onClick={handleCheckout} disabled={loading}>
                        {loading ? 'Memproses...' : 'Buat Pesanan'}
                      </Button>
                    </div>
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
                   <div>
                     <h4 className="font-bold text-gray-800">{o.product_name}</h4>
                     <p className="text-sm text-gray-600">{o.jumlah} item • Rp {o.total_harga.toLocaleString()}</p>
                     <p className="text-xs text-gray-400 mt-1">Seller: {o.seller_id} (Jarak {o.jarak_km}km)</p>
                   </div>
                 </div>
               </div>
             ))}
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
      </div>
    </div>
  );
};