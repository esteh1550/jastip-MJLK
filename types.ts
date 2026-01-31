
export enum UserRole {
  SELLER = 'SELLER',
  BUYER = 'BUYER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN'
}

export enum OrderStatus {
  PENDING = 'PENDING',              // Menunggu Konfirmasi Penjual
  CONFIRMED = 'CONFIRMED',          // Penjual Menerima, Menunggu Driver
  DRIVER_OTW_PICKUP = 'DRIVER_OTW', // Driver Menuju Penjual
  DIKIRIM = 'DIKIRIM',              // Penjual menyerahkan ke Driver, OTW Pembeli
  SELESAI = 'SELESAI'               // Diterima Pembeli
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  nama_lengkap: string;
  saldo?: number;
  nomor_whatsapp?: string;
  verified?: string; // "Y" or "N"
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
  lat_long: string;
  address_name?: string;
  created_at: string;
  average_rating?: number;
  total_reviews?: number;
}

export interface Review {
  id: string;
  product_id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  rating: number; // 1-5
  comment: string;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  driver_id?: string;
  driver_name?: string;
  product_id: string;
  product_name: string;
  product_img: string;
  jumlah: number;
  catatan?: string; // New: Catatan Pesanan
  zona_ongkir?: string; 
  jarak_km: number;
  total_ongkir: number;
  total_harga: number;
  status: OrderStatus;
  alamat_pengiriman: string; 
  lat_long_pengiriman: string;
  created_at: string;
  is_reviewed?: boolean;
}

export interface CartItem extends Product {
  qty: number;
  note?: string; // Note per item in cart
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
  order_id: string; // Can use suffixes like "-driver" for separate channels
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
}
