
import { User, Product, Order, UserRole, OrderStatus, Transaction, Message, Review } from '../types';

// --- KONFIGURASI ---
// Ganti ID ini dengan API ID SheetDB milik Anda sendiri dari sheetdb.io
// Sheet harus memiliki tabs: users, products, orders, transactions, messages, reviews
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/c4w14i8u3j50z'; 

const RATE_PER_KM = 2500;
const ADMIN_FEE_BUYER = 2000;
const ADMIN_FEE_DRIVER_PICKUP = 1000;
const ADMIN_FEE_SELLER_PERCENT = 0.10; // 10%

// --- Helper Functions ---
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

function deg2rad(deg: number) { return deg * (Math.PI / 180); }

async function fetchSheet(sheetName: string, query?: string) {
  try {
    let url = `${SHEETDB_API_URL}${query ? query : ''}`;
    url += `${url.includes('?') ? '&' : '?'}sheet=${sheetName}&t=${Date.now()}`;
    const res = await fetch(url);
    return res.ok ? await res.json() : [];
  } catch (error) {
    console.error(`Fetch error ${sheetName}:`, error);
    return [];
  }
}

async function postSheet(sheetName: string, data: any) {
  await fetch(`${SHEETDB_API_URL}?sheet=${sheetName}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data })
  });
}

async function updateSheet(sheetName: string, id: string, data: any) {
  await fetch(`${SHEETDB_API_URL}/id/${id}?sheet=${sheetName}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data })
  });
}

async function deleteSheet(sheetName: string, id: string) {
  await fetch(`${SHEETDB_API_URL}/id/${id}?sheet=${sheetName}`, { method: 'DELETE' });
}

// --- MAIN API ---
export const api = {
  
  // --- USER & AUTH ---
  login: async (identifier: string): Promise<User | null> => {
    // Admin Hardcode
    if (identifier === 'esteh') {
        // Cek apakah data admin ada di DB untuk sync saldo
        const dbAdmin = await fetchSheet('users', `/search?username=esteh`);
        if(dbAdmin.length > 0) return { ...dbAdmin[0], saldo: Number(dbAdmin[0].saldo) };
        
        return { 
            id: 'admin', username: 'esteh', password: 'esteh123', role: UserRole.ADMIN, 
            nama_lengkap: 'Super Admin', nomor_whatsapp: '-', saldo: 0, verified: 'Y' 
        };
    }

    // Try finding by username OR whatsapp
    let users = await fetchSheet('users', `/search?username=${identifier}`);
    if (users.length === 0) {
        users = await fetchSheet('users', `/search?nomor_whatsapp=${identifier}`);
    }

    if (users.length > 0) {
        return { ...users[0], saldo: Number(users[0].saldo || 0), is_new: users[0].is_new === 'true' };
    }
    return null;
  },

  register: async (user: Omit<User, 'id' | 'saldo' | 'verified'>): Promise<User> => {
    const newUser = { 
      ...user, 
      id: `u${Date.now()}`, 
      saldo: 0, 
      verified: 'Y', // Auto verify for demo
      is_new: true
    };
    await postSheet('users', newUser);
    return newUser;
  },

  updateUser: async (user: Partial<User> & { id: string }) => {
     await updateSheet('users', user.id, user);
  },

  getAllUsers: async (): Promise<User[]> => {
    const res = await fetchSheet('users');
    return res.map((u: any) => ({ ...u, saldo: Number(u.saldo) }));
  },

  getUserByWhatsapp: async (wa: string): Promise<User | null> => {
    const res = await fetchSheet('users', `/search?nomor_whatsapp=${wa}`);
    return res.length > 0 ? { ...res[0], saldo: Number(res[0].saldo) } : null;
  },

  // --- PRODUCTS ---
  getProducts: async (): Promise<Product[]> => {
    const res = await fetchSheet('products');
    return res.map((p: any) => ({ ...p, harga: Number(p.harga), stok: Number(p.stok), average_rating: Number(p.average_rating) }));
  },

  addProduct: async (p: any) => {
    const newP = { ...p, id: `p${Date.now()}`, created_at: new Date().toISOString(), average_rating: 0, total_reviews: 0 };
    await postSheet('products', newP);
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
      await updateSheet('products', id, data);
  },

  deleteProduct: async (id: string) => {
      await deleteSheet('products', id);
  },

  // --- ORDERS & LOGIC ---
  getOrders: async (): Promise<Order[]> => {
    const res = await fetchSheet('orders');
    return res.map((o: any) => ({
        ...o,
        jumlah: Number(o.jumlah), product_price: Number(o.product_price),
        jarak_km: Number(o.jarak_km), biaya_ongkir: Number(o.biaya_ongkir),
        biaya_admin_buyer: Number(o.biaya_admin_buyer), total_bayar_buyer: Number(o.total_bayar_buyer),
        is_reviewed: o.is_reviewed === 'true'
    }));
  },

  // BUYER: Checkout
  createOrder: async (orders: any[]) => {
    // Reduce Stock
    for(const o of orders) {
        const prod = await fetchSheet('products', `/search?id=${o.product_id}`);
        if(prod.length > 0) {
            await updateSheet('products', o.product_id, { stok: Number(prod[0].stok) - o.jumlah });
        }
    }
    await postSheet('orders', orders);
  },

  // DRIVER: Ambil Order (Bayar 1000 ke Admin)
  takeOrder: async (orderId: string, driver: User) => {
      // 1. Potong Saldo Driver (Fee Admin)
      const newSaldoDriver = driver.saldo - ADMIN_FEE_DRIVER_PICKUP;
      await updateSheet('users', driver.id, { saldo: newSaldoDriver });
      
      // 2. Tambah Saldo Admin
      await api.addAdminBalance(ADMIN_FEE_DRIVER_PICKUP, `Fee Driver Order #${orderId}`);

      // 3. Update Order
      await updateSheet('orders', orderId, { 
          status: OrderStatus.DRIVER_OTW_PICKUP, 
          driver_id: driver.id, 
          driver_name: driver.nama_lengkap 
      });
  },

  // SYSTEM: Order Selesai (Distribusi Uang)
  finishOrder: async (order: Order) => {
      await updateSheet('orders', order.id, { status: OrderStatus.SELESAI });

      // Hitung Pendapatan
      const totalOmset = order.product_price * order.jumlah;
      const feePlatformSeller = totalOmset * ADMIN_FEE_SELLER_PERCENT;
      const incomeSeller = totalOmset - feePlatformSeller;
      const incomeDriver = order.biaya_ongkir;

      // 1. Transfer ke Seller
      await api.addTransaction(order.seller_id, 'INCOME', incomeSeller, `Penjualan #${order.id} (Potongan 10%)`);
      
      // 2. Transfer ke Driver
      if(order.driver_id) {
          await api.addTransaction(order.driver_id, 'INCOME', incomeDriver, `Ongkir Order #${order.id}`);
      }

      // 3. Masukkan Fee ke Admin (Fee Buyer 2000 + Fee Seller 10%)
      // Note: Fee Driver 1000 sudah masuk saat takeOrder
      const totalAdminRevenue = order.biaya_admin_buyer + feePlatformSeller;
      await api.addAdminBalance(totalAdminRevenue, `Revenue Order #${order.id} (Buyer+Seller)`);
  },

  updateOrderStatus: async (id: string, status: OrderStatus) => {
      await updateSheet('orders', id, { status });
  },

  // --- TRANSACTIONS ---
  getTransactions: async (userId: string) => {
      const res = await fetchSheet('transactions', `/search?user_id=${userId}`);
      return res.map((t: any) => ({ ...t, amount: Number(t.amount) })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addTransaction: async (userId: string, type: string, amount: number, description: string) => {
      // Record Transaction
      const trx = { id: `tx${Date.now()}${Math.floor(Math.random()*100)}`, user_id: userId, type, amount, description, created_at: new Date().toISOString() };
      await postSheet('transactions', trx);

      // Update User Balance
      const user = await fetchSheet('users', `/search?id=${userId}`);
      if(user.length > 0) {
          const current = Number(user[0].saldo);
          const next = (type === 'INCOME' || type === 'TOPUP') ? current + amount : current - amount;
          await updateSheet('users', userId, { saldo: next });
      }
  },

  addAdminBalance: async (amount: number, desc: string) => {
      // Cari akun admin (username esteh atau id admin)
      // Asumsi admin sudah di init di users table dgn id 'admin'
      await api.addTransaction('admin', 'INCOME', amount, desc);
  },

  // --- REVIEWS & CHAT ---
  addReview: async (r: any) => {
      await postSheet('reviews', { ...r, id: `rev${Date.now()}`, created_at: new Date().toISOString() });
      await updateSheet('orders', r.order_id, { is_reviewed: true });
      // Recalc Rating (Simplified)
      const reviews = await fetchSheet('reviews', `/search?product_id=${r.product_id}`);
      const total = reviews.reduce((acc: number, cur: any) => acc + Number(cur.rating), 0) + r.rating;
      const avg = total / (reviews.length + 1);
      await updateSheet('products', r.product_id, { average_rating: avg.toFixed(1), total_reviews: reviews.length + 1 });
  },

  getMessages: async (orderId: string) => fetchSheet('messages', `/search?order_id=${orderId}`),
  sendMessage: async (msg: any) => postSheet('messages', { ...msg, id: `msg${Date.now()}`, timestamp: new Date().toISOString() }),

  // --- UTILS ---
  getRate: () => RATE_PER_KM,
  getFees: () => ({ buyer: ADMIN_FEE_BUYER, driver: ADMIN_FEE_DRIVER_PICKUP, sellerPct: ADMIN_FEE_SELLER_PERCENT }),

  seedDatabase: async () => {
    // Init Admin
    const users = await fetchSheet('users');
    if(!users.find((u:any) => u.username === 'esteh')) {
        await postSheet('users', {
            id: 'admin', username: 'esteh', password: 'esteh123', role: UserRole.ADMIN,
            nama_lengkap: 'Super Admin', nomor_whatsapp: '-', saldo: 0, verified: 'Y'
        });
    }
  }
};
