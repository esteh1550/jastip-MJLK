
import { User, Product, Order, UserRole, OrderStatus, Transaction, Message, Review } from '../types';

// --- KONFIGURASI DATABASE ---
// Ganti dengan API ID SheetDB Anda sendiri jika perlu
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/c4w14i8u3j50z';
const BIAYA_PER_KM = 2500;

// --- Helper Functions ---

// Menghitung Jarak (Haversine)
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Helper untuk fetch ke SheetDB dengan Error Handling
async function fetchSheet(sheetName: string, query?: string) {
  try {
    let url = `${SHEETDB_API_URL}${query ? query : ''}`;
    // Cek apakah sudah ada query param (?)
    const hasQuery = url.includes('?');
    // Tambahkan sheet param dengan separator yang benar
    url += `${hasQuery ? '&' : '?'}sheet=${sheetName}`;
    // Tambahkan cache buster untuk menghindari caching browser
    url += `&t=${Date.now()}`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching ${sheetName}:`, error);
    return [];
  }
}

// Helper untuk POST (Tambah Data)
async function postSheet(sheetName: string, data: any) {
  try {
    await fetch(`${SHEETDB_API_URL}?sheet=${sheetName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: data })
    });
    return data;
  } catch (error) {
    console.error(`Error posting to ${sheetName}:`, error);
    throw error;
  }
}

// Helper untuk UPDATE (Edit Data berdasarkan ID)
async function updateSheet(sheetName: string, id: string, data: any) {
  try {
    // SheetDB update endpoint: /id/{value}
    await fetch(`${SHEETDB_API_URL}/id/${id}?sheet=${sheetName}`, {
      method: 'PATCH', // Menggunakan PATCH agar hanya update field yang dikirim
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: data })
    });
  } catch (error) {
    console.error(`Error updating ${sheetName}:`, error);
  }
}

// Helper untuk DELETE
async function deleteSheet(sheetName: string, id: string) {
  try {
    await fetch(`${SHEETDB_API_URL}/id/${id}?sheet=${sheetName}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error(`Error deleting from ${sheetName}:`, error);
  }
}

export const api = {
  // --- AUTHENTICATION ---
  
  login: async (username: string): Promise<User | null> => {
    // Backdoor khusus Admin agar tetap bisa masuk jika Database kosong/error
    if (username === 'admin') {
       const adminOnline = await fetchSheet('users', `/search?username=admin`);
       if (adminOnline && adminOnline.length > 0) return adminOnline[0];
       
       // Fallback jika admin belum ada di sheet
       return { 
         id: 'admin', username: 'admin', password: '123', role: UserRole.ADMIN, 
         nama_lengkap: 'Administrator', saldo: 0, nomor_whatsapp: '-', verified: 'Y' 
       };
    }

    const users = await fetchSheet('users', `/search?username=${username}`);
    return users.length > 0 ? users[0] : null;
  },

  getUserById: async (id: string): Promise<User | null> => {
    if (id === 'admin') {
         const adminOnline = await fetchSheet('users', `/search?id=admin`);
         if (adminOnline && adminOnline.length > 0) return adminOnline[0];
         return { id: 'admin', username: 'admin', password: '123', role: UserRole.ADMIN, nama_lengkap: 'Administrator', saldo: 0, nomor_whatsapp: '-', verified: 'Y' };
    }
    const users = await fetchSheet('users', `/search?id=${id}`);
    return users.length > 0 ? users[0] : null;
  },

  register: async (user: Omit<User, 'id'>): Promise<User> => {
    const newUser = { 
      ...user, 
      id: `u${Date.now()}`, 
      saldo: 0, 
      verified: 'N',
      created_at: new Date().toISOString()
    };
    await postSheet('users', newUser);
    return newUser;
  },

  getAllUsers: async (): Promise<User[]> => {
    return await fetchSheet('users');
  },

  updateUser: async (user: User): Promise<void> => {
    await updateSheet('users', user.id, user);
  },

  // --- PRODUCTS ---

  getProducts: async (): Promise<Product[]> => {
    const products = await fetchSheet('products');
    // Konversi harga dan stok ke number karena SheetDB return string
    return products.map((p: any) => ({
      ...p,
      harga: Number(p.harga),
      stok: Number(p.stok),
      average_rating: Number(p.average_rating || 0),
      total_reviews: Number(p.total_reviews || 0)
    }));
  },

  addProduct: async (product: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const newProduct = { 
      ...product, 
      id: `p${Date.now()}`, 
      created_at: new Date().toISOString(), 
      average_rating: 0, 
      total_reviews: 0 
    };
    await postSheet('products', newProduct);
    return newProduct;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await deleteSheet('products', id);
  },

  // --- ORDERS ---

  getOrders: async (): Promise<Order[]> => {
    const orders = await fetchSheet('orders');
    return orders.map((o: any) => ({
      ...o,
      jumlah: Number(o.jumlah),
      jarak_km: Number(o.jarak_km),
      total_ongkir: Number(o.total_ongkir),
      total_harga: Number(o.total_harga),
      is_reviewed: o.is_reviewed === 'true' || o.is_reviewed === true
    }));
  },

  createOrder: async (ordersData: Omit<Order, 'id' | 'created_at' | 'status'>[]): Promise<void> => {
    const newOrders = ordersData.map(o => ({
      ...o,
      id: `ord${Math.floor(Math.random() * 100000) + Date.now()}`, // ID unik
      status: OrderStatus.PENDING,
      created_at: new Date().toISOString(),
      is_reviewed: false
    }));

    // 1. Kurangi Stok Produk di Database
    for (const order of newOrders) {
      const products = await fetchSheet('products', `/search?id=${order.product_id}`);
      if (products.length > 0) {
        const currentStock = Number(products[0].stok);
        const newStock = Math.max(0, currentStock - order.jumlah);
        await updateSheet('products', order.product_id, { stok: newStock });
      }
    }

    // 2. Simpan Order
    await postSheet('orders', newOrders);
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus, driverId?: string, driverName?: string): Promise<void> => {
    const updateData: any = { status };
    if (driverId) updateData.driver_id = driverId;
    if (driverName) updateData.driver_name = driverName;
    
    await updateSheet('orders', orderId, updateData);
  },

  // --- FINANCE (JASTIP PAY) ---

  getWalletBalance: async (userId: string): Promise<number> => {
    const users = await fetchSheet('users', `/search?id=${userId}`);
    if (users.length > 0) {
      return Number(users[0].saldo) || 0;
    }
    return 0;
  },

  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const all = await fetchSheet('transactions', `/search?user_id=${userId}`);
    return all.map((t: any) => ({
      ...t,
      amount: Number(t.amount)
    })).sort((a: Transaction, b: Transaction) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

    await postSheet('transactions', newTrans);

    const users = await fetchSheet('users', `/search?id=${userId}`);
    if (users.length > 0) {
      const currentSaldo = Number(users[0].saldo) || 0;
      let newSaldo = currentSaldo;
      
      if (type === 'TOPUP' || type === 'INCOME') {
        newSaldo = currentSaldo + amount;
      } else {
        newSaldo = currentSaldo - amount;
      }
      
      await updateSheet('users', userId, { saldo: newSaldo });
    }

    return newTrans;
  },

  // --- REVIEWS ---

  addReview: async (review: Omit<Review, 'id' | 'created_at'>): Promise<void> => {
    const newReview = { 
        ...review, 
        id: `rev${Date.now()}`, 
        created_at: new Date().toISOString() 
    };

    await postSheet('reviews', newReview);
    await updateSheet('orders', review.order_id, { is_reviewed: true });

    const productReviews = await fetchSheet('reviews', `/search?product_id=${review.product_id}`);
    
    let totalRating = 0;
    productReviews.forEach((r: any) => totalRating += Number(r.rating));
    const avgRating = totalRating / productReviews.length;

    await updateSheet('products', review.product_id, {
        average_rating: avgRating.toFixed(1),
        total_reviews: productReviews.length
    });
  },

  getReviews: async (productId: string): Promise<Review[]> => {
     const res = await fetchSheet('reviews', `/search?product_id=${productId}`);
     return res.map((r: any) => ({...r, rating: Number(r.rating)}));
  },

  // --- MESSAGING ---

  getMessages: async (orderId: string): Promise<Message[]> => {
    return await fetchSheet('messages', `/search?order_id=${orderId}`);
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
    await postSheet('messages', newMsg);
    return newMsg;
  },

  // --- UTILS: SEED DATABASE ---
  seedDatabase: async () => {
    // 1. Users Dummy
    const dummyUsers = [
        { id: 'admin', username: 'admin', password: '123', role: UserRole.ADMIN, nama_lengkap: 'Administrator', saldo: 0, nomor_whatsapp: '-', verified: 'Y', created_at: new Date().toISOString() },
        { id: 'u1', username: 'penjual1', password: '123', role: UserRole.SELLER, nama_lengkap: 'Warung Seblak Cihuy', saldo: 0, nomor_whatsapp: '085222333444', verified: 'Y', created_at: new Date().toISOString() },
        { id: 'u2', username: 'pembeli1', password: '123', role: UserRole.BUYER, nama_lengkap: 'Andi Warga Majalengka', saldo: 500000, nomor_whatsapp: '085777888999', verified: 'Y', created_at: new Date().toISOString() },
        { id: 'u3', username: 'driver1', password: '123', role: UserRole.DRIVER, nama_lengkap: 'Mang Asep Ojek', saldo: 50000, nomor_whatsapp: '081333444555', verified: 'Y', created_at: new Date().toISOString() },
    ];
    
    const existing = await fetchSheet('users');
    if (existing.length === 0) {
        await postSheet('users', dummyUsers);
    }

    // 2. Products Dummy
    const existingProds = await fetchSheet('products');
    if (existingProds.length === 0) {
        const dummyProducts = [
            { id: 'p1', seller_id: 'u1', seller_name: 'Warung Seblak Cihuy', nama: 'Seblak Ceker Pedas', deskripsi: 'Seblak super pedas dengan toping ceker lunak.', harga: 15000, stok: 20, gambar_url: 'https://images.unsplash.com/photo-1563539077-8d2b2c9b3c3e?auto=format&fit=crop&q=80&w=300&h=300', lat_long: '-6.8365,108.2267', address_name: 'Majalengka Kulon', created_at: new Date().toISOString(), average_rating: 0, total_reviews: 0 },
            { id: 'p2', seller_id: 'u1', seller_name: 'Warung Seblak Cihuy', nama: 'Es Campur Segar', deskripsi: 'Es campur dengan buah naga dan alpukat.', harga: 10000, stok: 50, gambar_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=300&h=300', lat_long: '-6.8365,108.2267', address_name: 'Majalengka Kulon', created_at: new Date().toISOString(), average_rating: 0, total_reviews: 0 }
        ];
        await postSheet('products', dummyProducts);
    }
  },

  getRate: () => BIAYA_PER_KM
};
