import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, where, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { Map, Bike, CheckCircle, Wallet, LogOut, Navigation, MessageSquare } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import ChatModal from '../components/ChatModal';

export default function DriverDashboard() {
  const { profile } = useAuthStore();
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'my_orders' | 'wallet'>('available');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeChatTxnId, setActiveChatTxnId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    // Listen to pending orders
    const qPending = query(collection(db, 'transactions'), where('status', '==', 'pending'));
    const pendingUnsub = onSnapshot(qPending, (snapshot) => {
      const ordersData: any[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });
      setAvailableOrders(ordersData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));

    // Listen to my active/completed orders
    const qMyOrders = query(collection(db, 'transactions'), where('driverId', '==', profile.uid));
    const myOrdersUnsub = onSnapshot(qMyOrders, (snapshot) => {
      const ordersData: any[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });
      setMyOrders(ordersData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));

    return () => {
      pendingUnsub();
      myOrdersUnsub();
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

  const handleAcceptOrder = async (txnId: string) => {
    if (!profile?.isVerified) {
      toast.error('Akun Anda belum diverifikasi oleh admin.');
      return;
    }

    try {
      await updateDoc(doc(db, 'transactions', txnId), {
        driverId: profile.uid,
        status: 'accepted_by_driver'
      });
      
      // Add driver to chat participants
      const chatId = `chat_${txnId}`;
      const chatRef = doc(db, 'chats', chatId);
      const { getDoc, arrayUnion } = await import('firebase/firestore');
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        await updateDoc(chatRef, {
          participants: arrayUnion(profile.uid)
        });
      }

      toast.success('Pesanan berhasil diambil!');
      setActiveTab('my_orders');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${txnId}`);
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
      <nav className="bg-emerald-600 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Bike className="h-6 w-6 mr-2" />
              <span className="font-bold text-lg">Driver Jastip</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Rp {profile?.balance.toLocaleString()}</span>
              <button onClick={handleLogout} className="p-2 rounded-md hover:bg-emerald-700">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'available' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Map className="mr-2 h-6 w-6 text-emerald-600" /> Pesanan Tersedia
            </h2>
            <div className="space-y-4">
              {availableOrders.map((txn) => (
                <div key={txn.id} className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Order #{txn.id.slice(-6)}</p>
                      <p className="text-sm text-gray-500">{new Date(txn.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full uppercase">
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
                      <span>Ongkir (Pendapatan)</span>
                      <span className="text-emerald-600">Rp {txn.deliveryFee.toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptOrder(txn.id)}
                    className="mt-4 w-full py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                  >
                    Ambil Pesanan
                  </button>
                </div>
              ))}
              {availableOrders.length === 0 && <p className="text-center text-gray-500 py-8">Belum ada pesanan baru.</p>}
            </div>
          </div>
        )}

        {activeTab === 'my_orders' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Pesanan Saya</h2>
            <div className="space-y-4">
              {myOrders.map((txn) => (
                <div key={txn.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Order #{txn.id.slice(-6)}</p>
                      <p className="text-sm text-gray-500">{new Date(txn.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full uppercase">
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
                      <span>Total Tagihan ke Pembeli</span>
                      <span>Rp {(txn.totalAmount + txn.deliveryFee).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    {txn.status === 'purchased' && (
                      <button
                        onClick={() => handleUpdateStatus(txn.id, 'delivering')}
                        className="flex-1 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                      >
                        Mulai Pengantaran
                      </button>
                    )}
                    {txn.status === 'delivering' && (
                      <button
                        onClick={() => handleUpdateStatus(txn.id, 'completed')}
                        className="flex-1 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                      >
                        Selesaikan Pesanan
                      </button>
                    )}
                    <button
                      onClick={() => setActiveChatTxnId(txn.id)}
                      className="flex-1 py-2 bg-emerald-50 text-emerald-600 font-medium rounded-lg hover:bg-emerald-100 flex items-center justify-center"
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Chat Grup
                    </button>
                  </div>
                </div>
              ))}
              {myOrders.length === 0 && <p className="text-center text-gray-500 py-8">Belum ada pesanan yang diambil.</p>}
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="max-w-md mx-auto">
            <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-lg mb-6">
              <p className="text-emerald-200 text-sm">Saldo Pendapatan</p>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Minimal 10000"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!profile || profile.balance < 10000}
                  className="w-full py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
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
        <button onClick={() => setActiveTab('available')} className={`flex flex-col items-center p-2 ${activeTab === 'available' ? 'text-emerald-600' : 'text-gray-500'}`}>
          <Navigation className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Tersedia</span>
        </button>
        <button onClick={() => setActiveTab('my_orders')} className={`flex flex-col items-center p-2 ${activeTab === 'my_orders' ? 'text-emerald-600' : 'text-gray-500'}`}>
          <CheckCircle className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Tugas</span>
        </button>
        <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center p-2 ${activeTab === 'wallet' ? 'text-emerald-600' : 'text-gray-500'}`}>
          <Wallet className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Dompet</span>
        </button>
      </div>
    </div>
  );
}
