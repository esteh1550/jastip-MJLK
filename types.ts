
export enum UserRole {
  SELLER = 'SELLER',
  BUYER = 'BUYER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN'
}

export enum OrderStatus {
  PENDING = 'PENDING',              // Menunggu Konfirmasi Penjual
  CONFIRMED = 'CONFIRMED',          // Penjual Menerima (Stok -), Menunggu Driver
  DRIVER_OTW_PICKUP = 'DRIVER_OTW', // Driver Menuju Penjual (Driver Fee Paid)
  DIKIRIM = 'DIKIRIM',              // Penjual menyerahkan ke Driver
  SELESAI = 'SELESAI'               // Diterima Pembeli (Money Released)
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  nama_lengkap: string;
  nomor_whatsapp: string;
  saldo: number;
  verified?: string; // "Y" or "N"
  
  // New Fields
  is_new?: boolean; // For Tutorial
  desa_kecamatan?: string; // Seller
  alamat_lengkap?: string; // Seller (Patokan)
  plat_nomor?: string; // Driver
}

export interface Product {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_village: string; // To help location context
  nama: string;
  deskripsi: string;
  harga: number;
  stok: number;
  gambar_url: string;
  lat_long: string;
  created_at: string;
  average_rating?: number;
  total_reviews?: number;
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
  product_price: number;
  
  jumlah: number;
  catatan?: string;
  
  // Finance
  jarak_km: number;
  biaya_ongkir: number;
  biaya_admin_buyer: number; // 2000
  total_bayar_buyer: number; // (Price*Qty) + Ongkir + AdminBuyer
  
  status: OrderStatus;
  alamat_pengiriman: string; 
  lat_long_pengiriman: string;
  created_at: string;
  is_reviewed?: boolean;
}

export interface CartItem extends Product {
  qty: number;
  note?: string; 
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'TOPUP' | 'PAYMENT' | 'INCOME' | 'WITHDRAW' | 'TRANSFER' | 'ADMIN_FEE';
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

export interface Review {
  id: string;
  product_id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}
