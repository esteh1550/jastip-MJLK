import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuthStore, UserProfile } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { Shield, Users, Package, LogOut, CheckCircle, XCircle, Trash2, Ban, Wallet } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'topups'>('users');
  const { profile } = useAuthStore();

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: UserProfile[] = [];
      snapshot.forEach((doc) => {
        if (doc.data().role !== 'admin') {
          usersData.push(doc.data() as UserProfile);
        }
      });
      setUsers(usersData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    const productsUnsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData: any[] = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));

    const topupsUnsub = onSnapshot(collection(db, 'topups'), (snapshot) => {
      const topupsData: any[] = [];
      snapshot.forEach((doc) => {
        topupsData.push({ id: doc.id, ...doc.data() });
      });
      setTopups(topupsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'topups'));

    return () => {
      usersUnsub();
      productsUnsub();
      topupsUnsub();
    };
  }, [profile]);

  const handleVerifyUser = async (userId: string, isVerified: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isVerified });
      toast.success(isVerified ? 'User verified' : 'User unverified');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned });
      toast.success(isBanned ? 'User banned' : 'User unbanned');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success('Product deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  };

  const handleApproveTopup = async (topupId: string, userId: string, amount: number, type: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentBalance = userSnap.data().balance || 0;
        if (type === 'withdraw') {
          if (currentBalance < amount) {
            toast.error('Saldo user tidak mencukupi untuk penarikan');
            return;
          }
          await updateDoc(userRef, { balance: currentBalance - amount });
          await updateDoc(doc(db, 'topups', topupId), { status: 'approved' });
          toast.success('Penarikan disetujui');
        } else {
          await updateDoc(userRef, { balance: currentBalance + amount });
          await updateDoc(doc(db, 'topups', topupId), { status: 'approved' });
          toast.success('Top up disetujui');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `topups/${topupId}`);
    }
  };

  const handleRejectTopup = async (topupId: string, type: string) => {
    try {
      await updateDoc(doc(db, 'topups', topupId), { status: 'rejected' });
      toast.success(type === 'withdraw' ? 'Penarikan ditolak' : 'Top up ditolak');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `topups/${topupId}`);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 mr-2" />
              <span className="font-bold text-xl">Admin Super</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Halo, {profile?.name}</span>
              <button onClick={handleLogout} className="p-2 rounded-md hover:bg-indigo-700">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 shadow'}`}
          >
            <Users className="h-5 w-5 mr-2" />
            Kelola Pengguna
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${activeTab === 'products' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 shadow'}`}
          >
            <Package className="h-5 w-5 mr-2" />
            Kelola Postingan
          </button>
          <button
            onClick={() => setActiveTab('topups')}
            className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${activeTab === 'topups' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 shadow'}`}
          >
            <Wallet className="h-5 w-5 mr-2" />
            Kelola Saldo
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.uid} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between">
                  <div className="flex flex-col mb-4 sm:mb-0">
                    <span className="font-medium text-gray-900">{user.name} ({user.role})</span>
                    <span className="text-sm text-gray-500">{user.email} | {user.phone}</span>
                    <span className="text-sm font-bold text-indigo-600">Saldo: Rp {user.balance?.toLocaleString() || 0}</span>
                    <div className="flex space-x-2 mt-1">
                      {user.isVerified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Verified</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Unverified</span>
                      )}
                      {user.isBanned && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Banned</span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleVerifyUser(user.uid, !user.isVerified)}
                      className={`p-2 rounded-md ${user.isVerified ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                      title={user.isVerified ? "Cabut Verifikasi" : "Verifikasi User"}
                    >
                      {user.isVerified ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => handleBanUser(user.uid, !user.isBanned)}
                      className={`p-2 rounded-md ${user.isBanned ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                      title={user.isBanned ? "Buka Ban" : "Ban User"}
                    >
                      <Ban className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
              {users.length === 0 && <li className="p-4 text-center text-gray-500">Tidak ada pengguna</li>}
            </ul>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {products.map((product) => (
                <li key={product.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    {product.imageUrl && (
                      <img src={product.imageUrl} alt={product.name} className="h-12 w-12 object-cover rounded-md mr-4" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{product.name}</span>
                      <span className="text-sm text-gray-500">Rp {product.price}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                    title="Hapus Postingan"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </li>
              ))}
              {products.length === 0 && <li className="p-4 text-center text-gray-500">Tidak ada postingan</li>}
            </ul>
          </div>
        )}

        {activeTab === 'topups' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {topups.map((topup) => {
                const user = users.find(u => u.uid === topup.userId);
                return (
                  <li key={topup.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex flex-col mb-4 sm:mb-0">
                      <span className="font-medium text-gray-900">
                        {topup.type === 'withdraw' ? 'Penarikan' : 'Top Up'}: Rp {topup.amount.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500">User: {user ? user.name : topup.userId}</span>
                      <span className="text-xs text-gray-400">{new Date(topup.createdAt).toLocaleString()}</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          topup.status === 'approved' ? 'bg-green-100 text-green-800' :
                          topup.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {topup.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {topup.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveTopup(topup.id, topup.userId, topup.amount, topup.type || 'topup')}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium text-sm"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleRejectTopup(topup.id, topup.type || 'topup')}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium text-sm"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
              {topups.length === 0 && <li className="p-4 text-center text-gray-500">Tidak ada permintaan top up</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
