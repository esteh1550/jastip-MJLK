
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
  saldo?: number;
  nomor_whatsapp?: string; // New: Nomor WA
  verified?: string; // New: "Y" or "N"
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
  is_reviewed?: boolean;
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
