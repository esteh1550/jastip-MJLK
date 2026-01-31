
export enum UserRole {
  SELLER = 'SELLER',
  BUYER = 'BUYER',
  DRIVER = 'DRIVER'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  DIKIRIM = 'DIKIRIM',
  SELESAI = 'SELESAI'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  nama_lengkap: string;
  saldo?: number; // Kolom baru di database sheet users
}

export interface Product {
  id: string;
  seller_id: string;
  seller_name: string;
  nama: string;
  deskripsi: string;
  harga: number;
  stok: number;
  gambar_url: string;
  lat_long: string; // Format: "-6.8365,108.2285"
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  driver_id?: string;
  product_id: string;
  product_name: string;
  product_img: string;
  jumlah: number;
  zona_ongkir?: string; 
  jarak_km: number;
  total_ongkir: number;
  total_harga: number;
  status: OrderStatus;
  alamat_pengiriman: string; 
  lat_long_pengiriman: string;
  created_at: string;
}

export interface CartItem extends Product {
  qty: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'TOPUP' | 'PAYMENT' | 'INCOME' | 'WITHDRAW';
  amount: number;
  description: string;
  created_at: string;
}

export interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
}
