
import React, { useState, useEffect } from 'react';
import { User, Product, Order, CartItem, OrderStatus } from '../types';
import { api, calculateDistance } from '../services/api';
import { Button, Input, Badge, LoadingSpinner } from '../components/ui';
import { ShoppingCart, MapPin, Search, Plus, Minus, X, Package, MessageCircle, CheckCircle, Store, Filter } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';
import { WalletCard } from '../components/WalletCard';
import { ChatWindow } from '../components/ChatWindow';

interface BuyerDashboardProps { user: User; }

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<'browse' | 'cart' | 'orders'>('browse');
  const [loading, setLoading] = useState(false);
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterLoc, setFilterLoc] = useState<string | null>(null);

  // Checkout
  const [loc, setLoc] = useState<{lat: number, long: number, addr: string} | null>(null);
  
  // Chat
  const [activeChat, setActiveChat] = useState<{orderId: string, title: string} | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      setLoading(true);
      const p = await api.getProducts();
      setProducts(p);
      setLoading(false);
  };

  const filtered = products.filter(p => {
      const matchName = p.nama.toLowerCase().includes(search.toLowerCase());
      if(filterLoc) return matchName && p.seller_village?.includes(filterLoc);
      return matchName;
  });

  // Calculate Totals including Admin Fee
  const totals = () => {
     let totalItems = 0;
     let totalOngkir = 0;
     const fees = api.getFees();
     
     // Group by Seller to calc Distance/Ongkir
     const sellerGroups: any = {};
     cart.forEach(item => {
         if(!sellerGroups[item.seller_id]) sellerGroups[item.seller_id] = { items: [], seller: item };
         sellerGroups[item.seller_id].items.push(item);
     });

     Object.values(sellerGroups).forEach((group: any) => {
         let dist = 0;
         if(loc && group.seller.lat_long) {
             const [slat, slon] = group.seller.lat_long.split(',').map(Number);
             dist = calculateDistance(slat, slon, loc.lat, loc.long);
         }
         // Min Ongkir 5000
         const ongkir = Math.max(5000, Math.ceil(dist * api.getRate()));
         totalOngkir += ongkir;
         
         group.items.forEach((i: CartItem) => totalItems += (i.harga * i.qty));
         group.dist = dist;
         group.ongkir = ongkir;
     });

     const grandTotal = totalItems + totalOngkir + fees.buyer;
     return { totalItems, totalOngkir, adminFee: fees.buyer, grandTotal, sellerGroups };
  };

  const handleCheckout = async () => {
      if(!loc) return alert('Pilih lokasi dulu');
      const t = totals();
      if(user.saldo < t.grandTotal) return alert('Saldo tidak cukup!');

      if(!confirm(`Total: Rp ${t.grandTotal.toLocaleString()}. Lanjutkan?`)) return;

      setLoading(true);
      const orderPayloads = [];
      const groups = Object.values(t.sellerGroups) as any[];

      for(const group of groups) {
          // Distribute Ongkir & Admin Fee per item proportionally (simplified: attach to first item or split)
          // For simplicity: Admin fee is recorded once in transaction, but here attached to first order logic or distributed? 
          // Better: Create transaction for admin fee separately.
          
          for(const item of group.items) {
             // Split Ongkir per item for data structure
             const itemOngkir = Math.floor(group.ongkir / group.items.length);
             const itemAdmin = Math.floor(t.adminFee / cart.length); 

             orderPayloads.push({
                 buyer_id: user.id, buyer_name: user.nama_lengkap,
                 seller_id: group.seller.seller_id,
                 product_id: item.id, product_name: item.nama, product_img: item.gambar_url,
                 product_price: item.harga,
                 jumlah: item.qty,
                 jarak_km: group.dist,
                 biaya_ongkir: itemOngkir,
                 biaya_admin_buyer: itemAdmin,
                 total_bayar_buyer: (item.harga * item.qty) + itemOngkir + itemAdmin,
                 status: OrderStatus.PENDING,
                 alamat_pengiriman: loc.addr,
                 lat_long_pengiriman: `${loc.lat},${loc.long}`,
                 created_at: new Date().toISOString()
             });
          }
      }

      await api.createOrder(orderPayloads);
      
      // Cut Balance
      await api.addTransaction(user.id, 'PAYMENT', t.grandTotal, `Pembelian ${cart.length} item + Ongkir + Fee`);
      await api.addAdminBalance(t.adminFee, `Fee Buyer (${user.username})`);

      setCart([]);
      setLoc(null);
      alert('Pesanan dibuat! Menunggu konfirmasi penjual.');
      setView('orders');
      setLoading(false);
  };

  return (
    <div className="pb-24">
       <div className="bg-white sticky top-0 z-20 shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
              <h1 className="font-extrabold text-xl text-brand-green tracking-tight">JASTIP MJLK</h1>
              <div className="flex gap-4 text-xs font-bold text-gray-500">
                  <button onClick={() => setView('browse')} className={view === 'browse' ? 'text-brand-green' : ''}>BELANJA</button>
                  <button onClick={() => setView('orders')} className={view === 'orders' ? 'text-brand-green' : ''}>PESANAN</button>
                  <button onClick={() => setView('cart')} className={`relative ${view === 'cart' ? 'text-brand-green' : ''}`}>
                      KERANJANG
                      {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">{cart.length}</span>}
                  </button>
              </div>
          </div>
          {view === 'browse' && (
              <div className="flex gap-2">
                  <div className="bg-gray-100 flex items-center px-3 rounded-lg flex-1">
                      <Search size={16} className="text-gray-400"/>
                      <input className="bg-transparent p-2 text-sm w-full outline-none" placeholder="Cari seblak, kopi..." value={search} onChange={e=>setSearch(e.target.value)}/>
                  </div>
                  <button className="bg-gray-100 p-2 rounded-lg" onClick={() => setFilterLoc(prompt('Filter Desa (Kosongkan untuk reset):'))}><Filter size={18} className="text-gray-600"/></button>
              </div>
          )}
       </div>

       <div className="p-4">
          {view === 'browse' && (
              <>
                <WalletCard user={user} />
                <div className="grid grid-cols-2 gap-4">
                    {filtered.map(p => (
                        <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
                            <div className="h-32 bg-gray-200 relative">
                                <img src={p.gambar_url} className="w-full h-full object-cover"/>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-2">
                                    <p className="text-[10px] text-white font-bold flex items-center gap-1"><Store size={10}/> {p.seller_name}</p>
                                    <p className="text-[9px] text-gray-200">{p.seller_village}</p>
                                </div>
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{p.nama}</h3>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-brand-green font-bold text-sm">Rp {p.harga.toLocaleString()}</span>
                                    <button onClick={() => setCart([...cart, {...p, qty: 1}])} className="bg-brand-green text-white p-1.5 rounded-lg active:scale-95"><Plus size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
              </>
          )}

          {view === 'cart' && (
              <div className="space-y-6">
                  {cart.map((item, idx) => (
                      <div key={idx} className="flex gap-3 bg-white p-3 rounded-xl shadow-sm">
                          <img src={item.gambar_url} className="w-16 h-16 rounded-lg object-cover bg-gray-100"/>
                          <div className="flex-1">
                              <h4 className="font-bold text-sm">{item.nama}</h4>
                              <p className="text-xs text-gray-500">{item.seller_name}</p>
                              <div className="flex justify-between items-center mt-2">
                                  <p className="text-brand-green font-bold text-sm">Rp {(item.harga * item.qty).toLocaleString()}</p>
                                  <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-500 bg-red-50 p-1 rounded"><X size={14}/></button>
                              </div>
                          </div>
                      </div>
                  ))}
                  
                  {cart.length > 0 && (
                      <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                          <h3 className="font-bold mb-3">Pengiriman</h3>
                          <LocationPicker label="Lokasi Terima" onLocationSelect={(lat,long,addr) => setLoc({lat: Number(lat), long: Number(long), addr})} />
                          
                          {loc && (
                             <div className="mt-4 space-y-2 text-sm border-t pt-4">
                                 <div className="flex justify-between"><span>Total Harga</span><span>Rp {totals().totalItems.toLocaleString()}</span></div>
                                 <div className="flex justify-between"><span>Ongkir (Est)</span><span>Rp {totals().totalOngkir.toLocaleString()}</span></div>
                                 <div className="flex justify-between"><span>Biaya Layanan</span><span>Rp {totals().adminFee.toLocaleString()}</span></div>
                                 <div className="flex justify-between font-bold text-lg text-brand-green pt-2 border-t"><span>Total Bayar</span><span>Rp {totals().grandTotal.toLocaleString()}</span></div>
                                 <Button onClick={handleCheckout} disabled={loading} className="mt-4">{loading ? 'Memproses...' : 'Bayar Sekarang'}</Button>
                             </div>
                          )}
                      </div>
                  )}
              </div>
          )}
          
          {view === 'orders' && <OrderList user={user} onChat={(oid, t) => setActiveChat({orderId: oid, title: t})} />}
       </div>

       {activeChat && <ChatWindow orderId={activeChat.orderId} currentUser={user} onClose={() => setActiveChat(null)} title={activeChat.title} />}
    </div>
  );
};

// Sub-component for Order List
const OrderList = ({ user, onChat }: { user: User, onChat: (id: string, t: string) => void }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    useEffect(() => { api.getOrders().then(o => setOrders(o.filter(x => x.buyer_id === user.id))); }, []);

    return (
        <div className="space-y-4">
            {orders.map(o => (
                <div key={o.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-brand-green">
                    <div className="flex justify-between mb-2">
                        <span className="font-bold text-xs">Order #{o.id.slice(-4)}</span>
                        <Badge status={o.status} />
                    </div>
                    <div className="flex gap-3">
                        <img src={o.product_img} className="w-12 h-12 rounded bg-gray-100 object-cover"/>
                        <div>
                            <h4 className="font-bold text-sm">{o.product_name}</h4>
                            <p className="text-xs text-gray-500">{o.jumlah}x • Rp {o.total_bayar_buyer.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                        <Button size="sm" variant="secondary" className="w-auto px-3 py-1 text-xs" onClick={() => onChat(o.id, `Seller`)}>Chat Penjual</Button>
                        {(o.status === OrderStatus.DRIVER_OTW_PICKUP || o.status === OrderStatus.DIKIRIM) && (
                            <Button size="sm" variant="outline" className="w-auto px-3 py-1 text-xs" onClick={() => onChat(`${o.id}-driver`, `Driver`)}>Chat Driver</Button>
                        )}
                        {o.status === OrderStatus.DIKIRIM && (
                            <Button size="sm" className="w-auto px-3 py-1 text-xs" onClick={async () => {
                                if(confirm('Pesanan diterima?')) { await api.finishOrder(o); location.reload(); }
                            }}>Pesanan Diterima</Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
