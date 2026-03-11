import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { ShoppingBag, MapPin, Wallet, History, LogOut, MessageSquare, Star } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import ChatModal from '../components/ChatModal';
import ReviewModal from '../components/ReviewModal';
import NearbySellers from '../components/NearbySellers';

export default function BuyerDashboard() {
  const { profile } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'shop' | 'history' | 'wallet' | 'nearby'>('shop');
  const [topupAmount, setTopupAmount] = useState('');
  const [activeChatTxnId, setActiveChatTxnId] = useState<string | null>(null);
  const [reviewTxn, setReviewTxn] = useState<any | null>(null);

  useEffect(() => {
    if (!profile) return;

    const productsUnsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData: any[] = [];
      snapshot.forEach((doc) => {
        if (!doc.data().isDeleted) {
          productsData.push({ id: doc.id, ...doc.data() });
        }
      });
      setProducts(productsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));

    const q = query(collection(db, 'transactions'), where('buyerId', '==', profile.uid));
    const transUnsub = onSnapshot(q, (snapshot) => {
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

  const handleBuy = async (product: any) => {
    if (!profile?.isVerified) {
      toast.error('Akun Anda belum diverifikasi oleh admin.');
      return;
    }
    if (profile.balance < product.price) {
      toast.error('Saldo tidak cukup. Silakan top up.');
      return;
    }

    try {
      const transactionId = `txn_${Date.now()}`;
      await setDoc(doc(db, 'transactions', transactionId), {
        buyerId: profile.uid,
        sellerId: product.sellerId,
        driverId: '',
        status: 'pending',
        items: [{ productId: product.id, name: product.name, quantity: 1, price: product.price }],
        totalAmount: product.price,
        deliveryFee: 5000, // Flat fee for prototype
        createdAt: Date.now()
      });

      // Create a chat group for this transaction
      const chatId = `chat_${transactionId}`;
      await setDoc(doc(db, 'chats', chatId), {
        transactionId,
        participants: [profile.uid, product.sellerId], // Driver will be added when they accept
        createdAt: Date.now()
      });

      // Deduct balance
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: profile.balance - product.price - 5000
      });

      toast.success('Pesanan berhasil dibuat! Menunggu driver.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(topupAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const topupId = `topup_${Date.now()}`;
      await setDoc(doc(db, 'topups', topupId), {
        userId: profile?.uid,
        amount,
        status: 'pending',
        type: 'topup',
        createdAt: Date.now()
      });
      toast.success('Permintaan top up terkirim. Menunggu admin.');
      setTopupAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'topups');
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-indigo-600 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <ShoppingBag className="h-6 w-6 mr-2" />
              <span className="font-bold text-lg">Jastip Jajan</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Rp {profile?.balance.toLocaleString()}</span>
              <button onClick={handleLogout} className="p-2 rounded-md hover:bg-indigo-700">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'shop' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Jajan Terdekat</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="h-48 bg-gray-200 relative">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold text-indigo-600">Rp {product.price.toLocaleString()}</span>
                      <button
                        onClick={() => handleBuy(product)}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                      >
                        Beli
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Riwayat Transaksi</h2>
            <div className="space-y-4">
              {transactions.map((txn) => (
                <div key={txn.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Order #{txn.id.slice(-6)}</p>
                      <p className="text-sm text-gray-500">{new Date(txn.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full uppercase">
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
                    <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-100">
                      <span>Ongkir</span>
                      <span>Rp {txn.deliveryFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold mt-2">
                      <span>Total</span>
                      <span>Rp {(txn.totalAmount + txn.deliveryFee).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setActiveChatTxnId(txn.id)}
                      className="flex-1 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 flex items-center justify-center"
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Chat Grup
                    </button>
                    {txn.status === 'completed' && !txn.isReviewed && (
                      <button
                        onClick={() => setReviewTxn(txn)}
                        className="flex-1 py-2 bg-yellow-50 text-yellow-600 font-medium rounded-lg hover:bg-yellow-100 flex items-center justify-center"
                      >
                        <Star className="h-5 w-5 mr-2" />
                        Beri Ulasan
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center text-gray-500 py-8">Belum ada transaksi.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'nearby' && (
          <div className="max-w-4xl mx-auto">
            <NearbySellers />
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="max-w-md mx-auto">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg mb-6">
              <p className="text-indigo-200 text-sm">Saldo Anda</p>
              <h2 className="text-4xl font-bold mt-2">Rp {profile?.balance.toLocaleString()}</h2>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top Up Saldo</h3>
              <form onSubmit={handleTopup}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    min="10000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Contoh: 50000"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
                >
                  Ajukan Top Up
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {activeChatTxnId && (
        <ChatModal transactionId={activeChatTxnId} onClose={() => setActiveChatTxnId(null)} />
      )}

      {reviewTxn && (
        <ReviewModal 
          transactionId={reviewTxn.id} 
          sellerId={reviewTxn.sellerId} 
          driverId={reviewTxn.driverId} 
          onClose={() => setReviewTxn(null)} 
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-20">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex flex-col items-center p-2 ${activeTab === 'shop' ? 'text-indigo-600' : 'text-gray-500'}`}
        >
          <ShoppingBag className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Belanja</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center p-2 ${activeTab === 'history' ? 'text-indigo-600' : 'text-gray-500'}`}
        >
          <History className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Riwayat</span>
        </button>
        <button
          onClick={() => setActiveTab('nearby')}
          className={`flex flex-col items-center p-2 ${activeTab === 'nearby' ? 'text-indigo-600' : 'text-gray-500'}`}
        >
          <MapPin className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Terdekat</span>
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center p-2 ${activeTab === 'wallet' ? 'text-indigo-600' : 'text-gray-500'}`}
        >
          <Wallet className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Dompet</span>
        </button>
      </div>
    </div>
  );
}
