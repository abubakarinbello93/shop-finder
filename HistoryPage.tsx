
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Clock, ArrowLeft, Trash2, ShieldAlert } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, HistoryItem } from './types';
import { collection, query, orderBy, onSnapshot, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

interface HistoryPageProps {
  state: AppState;
  onLogout: () => void;
  onClearHistory: () => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ state, onLogout, onClearHistory, onUpdateShop }) => {
  const navigate = useNavigate();
  const { currentUser, shops } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userShop) return;

    // 1. Setup real-time listener for the sub-collection
    const historyRef = collection(db, 'shops', userShop.id, 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HistoryItem));
      setHistoryList(items);
      setIsLoading(false);
    });

    // 2. Perform auto-deletion of history older than 30 days
    const cleanupOldHistory = async () => {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const oldQuery = query(historyRef, where('timestamp', '<', thirtyDaysAgo));
      
      try {
        const oldDocs = await getDocs(oldQuery);
        if (!oldDocs.empty) {
          const batch = writeBatch(db);
          oldDocs.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`Cleaned up ${oldDocs.size} old history entries.`);
        }
      } catch (err) {
        console.error("History cleanup failed:", err);
      }
    };

    cleanupOldHistory();

    return () => unsubscribe();
  }, [userShop?.id]);

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout} onUpdateShop={onUpdateShop}>
      <div className="mb-8 flex flex-col gap-4">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 text-blue-600 font-black hover:gap-3 transition-all w-fit"
        >
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-gray-900 leading-none">Activity History</h1>
            <p className="text-gray-500 font-bold mt-2">Facility status log (Stored for 30 days).</p>
          </div>
          <button 
            onClick={onClearHistory} 
            className="flex items-center gap-2 text-red-500 font-black text-xs hover:text-red-700 transition-colors bg-red-50 px-4 py-2 rounded-xl"
          >
            <Trash2 className="h-4 w-4" /> Clear All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center p-20 flex-col gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Loading log...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {historyList.length > 0 ? historyList.map((item) => {
              const date = new Date(item.timestamp);
              return (
                <div key={item.id} className="p-6 flex items-start gap-5 hover:bg-gray-50 transition-colors animate-in fade-in duration-300">
                  <div className={`p-3 rounded-2xl shadow-sm ${item.status === 'Open' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1">
                      <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Facility {item.status}ed</h3>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border">
                        {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-500 mt-1 tracking-tight">
                      Modified by <span className="text-blue-600 font-black">@{item.changedBy}</span>
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className="p-32 text-center flex flex-col items-center">
                <div className="p-6 bg-slate-50 rounded-full mb-4">
                  <History className="h-12 w-12 text-slate-200" />
                </div>
                <p className="text-xl font-black text-gray-400 uppercase tracking-tight">Empty History</p>
                <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-widest">No status changes recorded yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4">
        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">Data Retention Policy</p>
          <p className="text-xs font-bold text-amber-700 leading-tight">
            For performance and privacy, activity logs are automatically purged after 30 days. Contact admin for extended data needs.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default HistoryPage;
