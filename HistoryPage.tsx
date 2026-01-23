import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Clock, ArrowLeft, Trash2, ShieldAlert, Calendar, RefreshCw } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, HistoryItem } from './types';
import { collection, query, orderBy, onSnapshot, where, getDocs, writeBatch } from 'firebase/firestore';
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
    if (!userShop) {
      setIsLoading(false);
      return;
    }

    // 1. Setup real-time listener for the shop's history sub-collection
    const historyRef = collection(db, 'shops', userShop.id, 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HistoryItem));
      setHistoryList(items);
      setIsLoading(false);
    }, (error) => {
      console.error("History Stream Error:", error);
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
          console.log(`OpenShop: Cleaned up ${oldDocs.size} logs older than 30 days.`);
        }
      } catch (err) {
        console.error("OpenShop: Automated history cleanup failed:", err);
      }
    };

    cleanupOldHistory();

    return () => unsubscribe();
  }, [userShop?.id]);

  if (!userShop) {
    return (
      <Layout user={currentUser!} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-700">
          <div className="p-10 bg-slate-100 rounded-[50px] mb-8">
            <ShieldAlert className="h-20 w-20 text-slate-300" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">No Linked Facility</h2>
          <p className="text-slate-400 font-bold max-w-sm mt-4 text-lg">
            Operational history is only available for facility managers. Link a shop to begin logging status changes.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-10 px-10 py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  const handleClearRequest = () => {
    if (window.confirm("ARE YOU SURE? This will permanently delete your entire activity log. This action cannot be undone.")) {
      onClearHistory();
    }
  };

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout} onUpdateShop={onUpdateShop}>
      <div className="mb-12 flex flex-col gap-6">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 text-blue-600 font-black hover:gap-3 transition-all w-fit uppercase text-[10px] tracking-widest group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Dashboard
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Operational Log</h1>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <Calendar className="h-3.5 w-3.5" /> 30-Day Auto-Purge
              </span>
              <span className="text-blue-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" /> Live Sync
              </span>
            </div>
          </div>
          <button 
            onClick={handleClearRequest}
            disabled={historyList.length === 0}
            className="flex items-center gap-3 text-red-500 font-black text-[10px] hover:bg-red-50 px-6 py-4 rounded-[20px] transition-all border border-red-100 uppercase tracking-widest shadow-sm disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Trash2 className="h-4 w-4" /> Wipe Log
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-8">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-slate-300 uppercase tracking-[0.4em] text-xs">Accessing Cloud Log</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {historyList.length > 0 ? historyList.map((item) => {
              const date = new Date(item.timestamp);
              const isOpen = item.status === 'Open';
              return (
                <div key={item.id} className="p-10 flex items-start gap-8 hover:bg-slate-50/50 transition-all group animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className={`p-5 rounded-[24px] shadow-sm transition-all group-hover:scale-110 group-hover:rotate-3 ${isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    <Clock className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <h3 className={`font-black text-2xl uppercase tracking-tighter ${isOpen ? 'text-green-700' : 'text-red-700'}`}>
                          Facility {item.status}ed
                        </h3>
                        <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm shrink-0">
                          {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-5 py-2.5 rounded-xl border border-blue-100 shadow-sm shrink-0">
                          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Modified By</p>
                      <span className="text-xs font-black text-blue-700 px-3 py-1 bg-blue-50 border border-blue-100 rounded-lg shadow-sm">
                        @{item.changedBy}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="flex-1 flex flex-col items-center justify-center py-40">
                <div className="p-12 bg-slate-50 rounded-[60px] mb-8 border border-slate-100 shadow-inner">
                  <History className="h-20 w-20 text-slate-200" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter text-center">Log Empty</h3>
                <p className="text-slate-400 font-bold text-lg mt-3 uppercase tracking-widest max-w-sm text-center">
                  Status changes will be recorded here automatically.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 p-8 bg-blue-50 border-2 border-blue-100 rounded-[40px] flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="p-5 bg-white rounded-[24px] shadow-md">
          <ShieldAlert className="h-8 w-8 text-blue-600 shrink-0" />
        </div>
        <div className="text-center md:text-left">
          <p className="text-sm font-black text-blue-900 uppercase tracking-[0.2em] mb-2">Automated Retention Policy</p>
          <p className="text-xs font-bold text-blue-700 leading-relaxed uppercase tracking-tight">
            OpenShop automatically purges activity logs older than 30 days to maintain high performance and ensure privacy. 
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default HistoryPage;
