import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Transaction } from '../types';
import { LoadingSpinner } from './ui';
import { ArrowUpRight, ArrowDownLeft, Plus, History } from 'lucide-react';

interface TransactionHistoryProps {
  userId: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ userId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrans = async () => {
      setLoading(true);
      const data = await api.getTransactions(userId);
      setTransactions(data);
      setLoading(false);
    };
    loadTrans();
  }, [userId]);

  if (loading) return <LoadingSpinner />;

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <History size={48} className="mx-auto mb-2 opacity-20" />
        <p>Belum ada riwayat transaksi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((t) => {
        const isIncome = t.type === 'TOPUP' || t.type === 'INCOME';
        return (
          <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{t.description}</p>
                <p className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div className={`font-bold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
              {isIncome ? '+' : '-'} Rp {t.amount.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
};
