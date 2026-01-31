import { User, Product, Order, UserRole, OrderStatus } from '../types';

// --- KONFIGURASI DATABASE ---
// URL API SheetDB yang telah dikonfigurasi
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/c4w14i8u3j50z';

// Constants Keys for LocalStorage Fallback
const USERS_KEY = 'jastip_users';
const PRODUCTS_KEY = 'jastip_products';
const ORDERS_KEY = 'jastip_orders';
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
  // Checks if the user has replaced the placeholder text
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

  if (!localStorage.getItem(PRODUCTS_KEY)) {
    const products: Product[] = [
      {
        id: 'p1', seller_id: 'u1', seller_name: 'Warung Bu Siti', nama: 'Jalakotek Pedas', deskripsi: 'Jalakotek khas Majalengka isi tahu pedas.', harga: 15000, stok: 20,
        gambar_url: 'https://picsum.photos/id/22/300/300', lat_long: '-6.838328,108.230756', created_at: new Date().toISOString()
      },
      {
        id: 'p2', seller_id: 'u1', seller_name: 'Warung Bu Siti', nama: 'Seblak Ceker', deskripsi: 'Seblak basah dengan toping ceker lunak.', harga: 12000, stok: 15,
        gambar_url: 'https://picsum.photos/id/292/300/300', lat_long: '-6.838328,108.230756', created_at: new Date().toISOString()
      },
      {
        id: 'p3', seller_id: 'u4', seller_name: 'Toko Oleh-Oleh', nama: 'Kecap Majalengka', deskripsi: 'Kecap manis legendaris asli.', harga: 25000, stok: 50,
        gambar_url: 'https://picsum.photos/id/75/300/300', lat_long: '-6.845000,108.240000', created_at: new Date().toISOString()
      },
    ];
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }
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
    // Fallback
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

    // Fallback
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

    // Fallback
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

    // Fallback
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

    // Fallback
    await new Promise(r => setTimeout(r, 300));
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

    // Fallback
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
        // SheetDB supports batch create if passed as array
        await fetch(`${SHEETDB_API_URL}?sheet=orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: newOrders })
        });
        return;
      } catch (e) { console.error("API Error", e); }
    }

    // Fallback
    await new Promise(r => setTimeout(r, 800));
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

    // Fallback
    await new Promise(r => setTimeout(r, 400));
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const index = orders.findIndex((o: Order) => o.id === orderId);
    if (index !== -1) {
      orders[index].status = status;
      if (driverId) orders[index].driver_id = driverId;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }
  },

  getRate: () => BIAYA_PER_KM
};