import { User, Product, Order, UserRole, OrderStatus, Transaction, Message, Review } from '../types';

// --- KONFIGURASI DATABASE ---
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/c4w14i8u3j50z';

// Constants Keys for LocalStorage Fallback
const USERS_KEY = 'jastip_users';
const PRODUCTS_KEY = 'jastip_products';
const ORDERS_KEY = 'jastip_orders';
const TRANSACTIONS_KEY = 'jastip_transactions';
const MESSAGES_KEY = 'jastip_messages';
const REVIEWS_KEY = 'jastip_reviews';
const BIAYA_PER_KM = 2500; // Rp 2.500 per km

// --- Helper: Haversine Formula for Distance ---
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(2));
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// --- Helper: Check if using Real API ---
const isApiConfigured = () => {
  return SHEETDB_API_URL && !SHEETDB_API_URL.includes('YOUR_API_ID_HERE');
};

// --- Data Seeding (Mock Database for Fallback) ---
const seedData = () => {
  let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  
  // Jika kosong sama sekali, isi data dummy
  if (users.length === 0) {
    users = [
      { id: 'u1', username: 'penjual1', password: '123', role: UserRole.SELLER, nama_lengkap: 'Warung Bu Siti', saldo: 0, nomor_whatsapp: '081234567890', verified: 'Y' },
      { id: 'u2', username: 'pembeli1', password: '123', role: UserRole.BUYER, nama_lengkap: 'Budi Santoso', saldo: 1000000, nomor_whatsapp: '081234567891', verified: 'N' },
      { id: 'u3', username: 'driver1', password: '123', role: UserRole.DRIVER, nama_lengkap: 'Kang Asep', saldo: 0, nomor_whatsapp: '081234567892', verified: 'Y' },
      { id: 'u4', username: 'penjual2', password: '123', role: UserRole.SELLER, nama_lengkap: 'Toko Oleh-Oleh Majalengka', saldo: 0, nomor_whatsapp: '081234567893', verified: 'Y' },
    ];
  }

  // Force Inject Admin Account jika belum ada
  if (!users.find((u: User) => u.username === 'admin')) {
      users.unshift({ id: 'admin', username: 'admin', password: '123', role: UserRole.ADMIN, nama_lengkap: 'Administrator', saldo: 0, nomor_whatsapp: '-', verified: 'Y' });
  }

  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

seedData();

// --- API Service Methods ---

export const api = {
  // Auth
  login: async (username: string): Promise<User | null> => {
    // KHUSUS ADMIN: Selalu gunakan data lokal untuk menjamin akses (bypass API check)
    if (username === 'admin') {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        return users.find((u: User) => u.username === 'admin') || null;
    }

    if (isApiConfigured()) {
      try {
        const response = await fetch(`${SHEETDB_API_URL}/search?username=${username}&sheet=users`);
        const data = await response.json();
        return data.length > 0 ? data[0] : null;
      } catch (e) { console.error("API Error", e); }
    }
    
    // Fallback Local Storage
    await new Promise(r => setTimeout(r, 500)); 
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return users.find((u: User) => u.username === username) || null;
  },

  register: async (user: Omit<User, 'id'>): Promise<User> => {
    const newUser = { ...user, id: `u${Date.now()}`, saldo: 0, verified: 'N' };
    if (isApiConfigured()) {
      try {
        await fetch(`${SHEETDB_API_URL}?sheet=users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: newUser })
        });
        return newUser;
      } catch (e) { console.error("API Error", e); }
    }
    await new Promise(r => setTimeout(r, 500));
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  // --- ADMIN FUNCTIONS ---
  getAllUsers: async (): Promise<User[]> => {
    // Admin functions always rely on local storage for this demo to ensure stability
    // In production, this would fetch from API
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  updateUser: async (user: User): Promise<void> => {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      const index = users.findIndex((u: User) => u.id === user.id);
      if (index !== -1) {
          users[index] = user;
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
      
      // Try updating API as well if configured
      if(isApiConfigured()) {
          try {
             // SheetDB update requires ID search usually, implementing basic patch
             // await fetch(`${SHEETDB_API_URL}/id/${user.id}?sheet=users`, { ... });
          } catch(e) {}
      }
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    if (isApiConfigured()) {
      try {
        const response = await fetch(`${SHEETDB_API_URL}?sheet=products`);
        return await response.json();
      } catch (e) { console.error("API Error", e); }
    }
    await new Promise(r => setTimeout(r, 400));
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
  },

  addProduct: async (product: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const newProduct = { ...product, id: `p${Date.now()}`, created_at: new Date().toISOString(), average_rating: 0, total_reviews: 0 };
    if (isApiConfigured()) {
      try {
        await fetch(`${SHEETDB_API_URL}?sheet=products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: newProduct })
        });
        return newProduct;
      } catch (e) { console.error("API Error", e); }
    }
    await new Promise(r => setTimeout(r, 600));
    const products = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    products.push(newProduct);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    return newProduct;
  },

  deleteProduct: async (id: string): Promise<void> => {
    if (isApiConfigured()) {
      try {
        await fetch(`${SHEETDB_API_URL}/id/${id}?sheet=products`, { method: 'DELETE' });
        return;
      } catch (e) { console.error("API Error", e); }
    }
    let products = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    products = products.filter((p: Product) => p.id !== id);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    if (isApiConfigured()) {
      try {
        const response = await fetch(`${SHEETDB_API_URL}?sheet=orders`);
        return await response.json();
      } catch (e) { console.error("API Error", e); }
    }
    await new Promise(r => setTimeout(r, 400));
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  },

  createOrder: async (orders: Omit<Order, 'id' | 'created_at' | 'status'>[]): Promise<void> => {
    const newOrders = orders.map(o => ({
      ...o,
      id: `ord${Math.floor(Math.random() * 100000)}`,
      status: OrderStatus.PENDING,
      created_at: new Date().toISOString()
    }));

    // Local Storage: Reduce Stock immediately
    const products = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    newOrders.forEach(order => {
        const pIdx = products.findIndex((p: Product) => p.id === order.product_id);
        if (pIdx !== -1) {
            products[pIdx].stok = Math.max(0, products[pIdx].stok - order.jumlah);
        }
    });
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

    if (isApiConfigured()) {
      try {
        await fetch(`${SHEETDB_API_URL}?sheet=orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: newOrders })
        });
        return;
      } catch (e) { console.error("API Error", e); }
    }
    const currentOrders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    localStorage.setItem(ORDERS_KEY, JSON.stringify([...newOrders, ...currentOrders]));
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus, driverId?: string, driverName?: string): Promise<void> => {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const index = orders.findIndex((o: Order) => o.id === orderId);
    if (index !== -1) {
      orders[index].status = status;
      if (driverId) orders[index].driver_id = driverId;
      if (driverName) orders[index].driver_name = driverName;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }
  },

  // --- FINANCE (JASTIP PAY) ---
  
  getWalletBalance: async (userId: string): Promise<number> => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find((u: User) => u.id === userId);
    return user ? Number(user.saldo) || 0 : 0;
  },

  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const allTrans = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
    return allTrans.filter((t: Transaction) => t.user_id === userId).sort((a: Transaction, b: Transaction) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addTransaction: async (userId: string, type: 'TOPUP' | 'PAYMENT' | 'INCOME' | 'WITHDRAW', amount: number, description: string) => {
    const newTrans: Transaction = {
      id: `trx${Date.now()}`,
      user_id: userId,
      type,
      amount,
      description,
      created_at: new Date().toISOString()
    };

    // Update Balance
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const userIdx = users.findIndex((u: User) => u.id === userId);
    if (userIdx !== -1) {
      const currentSaldo = Number(users[userIdx].saldo) || 0;
      if (type === 'TOPUP' || type === 'INCOME') users[userIdx].saldo = currentSaldo + amount;
      else users[userIdx].saldo = currentSaldo - amount;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    const trans = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
    trans.push(newTrans);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(trans));
    
    return newTrans;
  },

  // --- REVIEWS ---
  addReview: async (review: Omit<Review, 'id' | 'created_at'>): Promise<void> => {
    const newReview: Review = { ...review, id: `rev${Date.now()}`, created_at: new Date().toISOString() };
    const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    reviews.push(newReview);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));

    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const ordIdx = orders.findIndex((o: Order) => o.id === review.order_id);
    if(ordIdx !== -1) {
      orders[ordIdx].is_reviewed = true;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }

    // Update Product Rating
    const productReviews = reviews.filter((r: Review) => r.product_id === review.product_id);
    const total = productReviews.reduce((sum: number, r: Review) => sum + r.rating, 0);
    const avg = total / productReviews.length;

    const products = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    const prodIdx = products.findIndex((p: Product) => p.id === review.product_id);
    if(prodIdx !== -1) {
      products[prodIdx].average_rating = parseFloat(avg.toFixed(1));
      products[prodIdx].total_reviews = productReviews.length;
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    }
  },

  getReviews: async (productId: string): Promise<Review[]> => {
     const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
     return reviews.filter((r: Review) => r.product_id === productId);
  },

  // --- MESSAGING ---
  getMessages: async (orderId: string): Promise<Message[]> => {
    const msgs = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    return msgs.filter((m: Message) => m.order_id === orderId);
  },

  sendMessage: async (orderId: string, senderId: string, senderName: string, content: string) => {
    const newMsg: Message = {
      id: `msg${Date.now()}`,
      order_id: orderId,
      sender_id: senderId,
      sender_name: senderName,
      content,
      timestamp: new Date().toISOString()
    };
    const msgs = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    msgs.push(newMsg);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
    return newMsg;
  },

  getRate: () => BIAYA_PER_KM
};