import { User, Product, Order, UserRole, OrderStatus, Transaction, Message } from '../types';

// --- KONFIGURASI DATABASE ---
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/c4w14i8u3j50z';

// Constants Keys for LocalStorage Fallback
const USERS_KEY = 'jastip_users';
const PRODUCTS_KEY = 'jastip_products';
const ORDERS_KEY = 'jastip_orders';
const TRANSACTIONS_KEY = 'jastip_transactions';
const MESSAGES_KEY = 'jastip_messages';
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
  if (!localStorage.getItem(USERS_KEY)) {
    const users: User[] = [
      { id: 'u1', username: 'penjual1', password: '123', role: UserRole.SELLER, nama_lengkap: 'Warung Bu Siti' },
      { id: 'u2', username: 'pembeli1', password: '123', role: UserRole.BUYER, nama_lengkap: 'Budi Santoso' },
      { id: 'u3', username: 'driver1', password: '123', role: UserRole.DRIVER, nama_lengkap: 'Kang Asep' },
      { id: 'u4', username: 'penjual2', password: '123', role: UserRole.SELLER, nama_lengkap: 'Toko Oleh-Oleh Majalengka' },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  // Other seeds exist in previous versions... keeping them simple here
};

seedData();

// --- API Service Methods ---

export const api = {
  // Auth
  login: async (username: string): Promise<User | null> => {
    if (isApiConfigured()) {
      try {
        const response = await fetch(`${SHEETDB_API_URL}/search?username=${username}&sheet=users`);
        const data = await response.json();
        return data.length > 0 ? data[0] : null;
      } catch (e) { console.error("API Error", e); }
    }
    await new Promise(r => setTimeout(r, 500)); 
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return users.find((u: User) => u.username === username) || null;
  },

  register: async (user: Omit<User, 'id'>): Promise<User> => {
    const newUser = { ...user, id: `u${Date.now()}` };
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
    const newProduct = { ...product, id: `p${Date.now()}`, created_at: new Date().toISOString() };
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

  updateOrderStatus: async (orderId: string, status: OrderStatus, driverId?: string): Promise<void> => {
    if (isApiConfigured()) {
      try {
        const payload: any = { status };
        if (driverId) payload.driver_id = driverId;
        await fetch(`${SHEETDB_API_URL}/id/${orderId}?sheet=orders`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: payload })
        });
        return;
      } catch (e) { console.error("API Error", e); }
    }
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const index = orders.findIndex((o: Order) => o.id === orderId);
    if (index !== -1) {
      orders[index].status = status;
      if (driverId) orders[index].driver_id = driverId;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }
  },

  // --- FINANCE (JASTIP PAY) ---
  
  getWalletBalance: async (userId: string): Promise<number> => {
    let transactions: Transaction[] = [];
    
    if (isApiConfigured()) {
      try {
        const response = await fetch(`${SHEETDB_API_URL}/search?user_id=${userId}&sheet=transactions`);
        transactions = await response.json();
      } catch(e) { console.error("API Error", e); }
    } else {
      const allTrans = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
      transactions = allTrans.filter((t: Transaction) => t.user_id === userId);
    }

    return transactions.reduce((acc, curr) => {
      if (curr.type === 'TOPUP' || curr.type === 'INCOME') return acc + Number(curr.amount);
      if (curr.type === 'PAYMENT' || curr.type === 'WITHDRAW') return acc - Number(curr.amount);
      return acc;
    }, 0);
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

    if (isApiConfigured()) {
      try {
        await fetch(`${SHEETDB_API_URL}?sheet=transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: newTrans })
        });
      } catch(e) { console.error("API Error", e); }
    } else {
      const trans = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
      trans.push(newTrans);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(trans));
    }
    return newTrans;
  },

  // --- MESSAGING ---
  getMessages: async (orderId: string): Promise<Message[]> => {
    if (isApiConfigured()) {
      try {
        const response = await fetch(`${SHEETDB_API_URL}/search?order_id=${orderId}&sheet=messages`);
        return await response.json();
      } catch(e) { console.error("API Error", e); return []; }
    } else {
      const msgs = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
      return msgs.filter((m: Message) => m.order_id === orderId);
    }
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

    if (isApiConfigured()) {
      try {
        await fetch(`${SHEETDB_API_URL}?sheet=messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: newMsg })
        });
      } catch(e) { console.error("API Error", e); }
    } else {
      const msgs = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
      msgs.push(newMsg);
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
    }
    return newMsg;
  },

  getRate: () => BIAYA_PER_KM
};
