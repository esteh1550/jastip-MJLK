import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { Store, Package, ListOrdered, Wallet, LogOut, PlusCircle, MessageSquare } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import ChatModal from '../components/ChatModal';

export default function SellerDashboard() {
  const { profile } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'wallet'>('products');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeChatTxnId, setActiveChatTxnId] = useState<string | null>(null);
  
  // New Product Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!profile) return;

    const qProducts = query(collection(db, 'products'), where('sellerId', '==', profile.uid));
    const productsUnsub = onSnapshot(qProducts, (snapshot) => {
      const productsData: any[] = [];
      snapshot.forEach((doc) => {
        if (!doc.data().isDeleted) {
          productsData.push({ id: doc.id, ...doc.data() });
        }
      });
      setProducts(productsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));

    const qTrans = query(collection(db, 'transactions'), where('sellerId', '==', profile.uid));
    const transUnsub = onSnapshot(qTrans, (snapshot) => {
      const transData: any[] = [];
      snapshot.forEach((doc) => {
        transData.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(transData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));

    return () => {
      productsUnsub();
      transUnsub();
    };
  }, [profile]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < 10000) {
      toast.error('Minimal penarikan Rp 10.000');
      return;
    }
    
    if (amount > profile.balance) {
      toast.error('Saldo tidak mencukupi');
      return;
    }

    try {
      const topupId = `wd_${Date.now()}`;
      await setDoc(doc(db, 'topups', topupId), {
        userId: profile.uid,
        amount,
        status: 'pending',
        type: 'withdraw',
        createdAt: Date.now()
      });
      toast.success('Permintaan penarikan saldo berhasil dikirim');
      setWithdrawAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'topups');
    }
  };
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.isVerified) {
      toast.error('Akun Anda belum diverifikasi oleh admin.');
      return;
    }

    try {
      const productId = `prod_${Date.now()}`;
      await setDoc(doc(db, 'products', productId), {
        sellerId: profile.uid,
        name,
        description,
        price: parseInt(price),
        imageUrl,
        isDeleted: false,
        createdAt: Date.now()
      });
      toast.success('Produk berhasil ditambahkan!');
      setName('');
      setDescription('');
      setPrice('');
      setImageUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const handleUpdateStatus = async (txnId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'transactions', txnId), { status: newStatus });
      toast.success('Status pesanan diperbarui');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${txnId}`);
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-orange-600 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Store className="h-6 w-6 mr-2" />
              <span className="font-bold text-lg">Toko Saya</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Rp {profile?.balance.toLocaleString()}</span>
              <button onClick={handleLogout} className="p-2 rounded-md hover:bg-orange-700">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'products' && (
          <div>
            <div className="bg-white rounded-2xl p-6 shadow-md mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <PlusCircle className="mr-2 h-5 w-5 text-orange-600" /> Tambah Jajanan
              </h3>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Jajanan</label>
                  <input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp)</label>
                    <input type="number" required min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar (Opsional)</label>
                    <input type="url" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700">
                  Simpan Produk
                </button>
              </form>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Daftar Jajanan Saya</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden flex items-center p-4">
                  <div className="h-16 w-16 bg-gray-200 rounded-lg flex-shrink-0">
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" /> : null}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                    <p className="text-sm font-medium text-orange-600">Rp {product.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Pesanan Masuk</h2>
            <div className="space-y-4">
              {transactions.map((txn) => (
                <div key={txn.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Order #{txn.id.slice(-6)}</p>
                      <p className="text-sm text-gray-500">{new Date(txn.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full uppercase">
                      {txn.status}
                    </span>
                  </div>
                  <div className="mt-4">
                    {txn.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span>Rp {item.price.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold mt-2 pt-2 border-t border-gray-100">
                      <span>Total Pendapatan</span>
                      <span>Rp {txn.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    {txn.status === 'accepted_by_driver' && (
                      <button
                        onClick={() => handleUpdateStatus(txn.id, 'purchased')}
                        className="flex-1 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700"
                      >
                        Tandai Sudah Dibeli / Siap
                      </button>
                    )}
                    <button
                      onClick={() => setActiveChatTxnId(txn.id)}
                      className="flex-1 py-2 bg-orange-50 text-orange-600 font-medium rounded-lg hover:bg-orange-100 flex items-center justify-center"
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Chat Grup
                    </button>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && <p className="text-center text-gray-500 py-8">Belum ada pesanan.</p>}
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="max-w-md mx-auto">
            <div className="bg-orange-600 rounded-2xl p-6 text-white shadow-lg mb-6">
              <p className="text-orange-200 text-sm">Saldo Pendapatan</p>
              <h2 className="text-4xl font-bold mt-2">Rp {profile?.balance.toLocaleString()}</h2>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tarik Saldo</h3>
              <form onSubmit={handleWithdraw}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    min="10000"
                    max={profile?.balance || 0}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Minimal 10000"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!profile || profile.balance < 10000}
                  className="w-full py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  Ajukan Penarikan
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {activeChatTxnId && (
        <ChatModal transactionId={activeChatTxnId} onClose={() => setActiveChatTxnId(null)} />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-20">
        <button onClick={() => setActiveTab('products')} className={`flex flex-col items-center p-2 ${activeTab === 'products' ? 'text-orange-600' : 'text-gray-500'}`}>
          <Package className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Produk</span>
        </button>
        <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center p-2 ${activeTab === 'orders' ? 'text-orange-600' : 'text-gray-500'}`}>
          <ListOrdered className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Pesanan</span>
        </button>
        <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center p-2 ${activeTab === 'wallet' ? 'text-orange-600' : 'text-gray-500'}`}>
          <Wallet className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Dompet</span>
        </button>
      </div>
    </div>
  );
}
