
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Clock, ArrowLeft, Trash2 } from 'lucide-react';
import Layout from './Layout';
import { AppState } from './types';

interface HistoryPageProps {
  state: AppState;
  onLogout: () => void;
  onClearHistory: () => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ state, onLogout, onClearHistory }) => {
  const navigate = useNavigate();
  const { currentUser, shops, history } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);

  const filteredHistory = history
    .filter(h => h.shopId === userShop?.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout}>
      <div className="mb-8 flex flex-col gap-4">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black hover:gap-3 transition-all w-fit"><ArrowLeft className="h-5 w-5" /> Back to Dashboard</button>
        <div className="flex justify-between items-end">
          <div><h1 className="text-3xl font-black text-gray-900 leading-none">Activity History</h1><p className="text-gray-500 font-bold mt-2">Facility status log.</p></div>
          <button onClick={onClearHistory} className="flex items-center gap-2 text-red-500 font-black text-xs hover:text-red-700 transition-colors"><Trash2 className="h-4 w-4" /> Clear History</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredHistory.length > 0 ? filteredHistory.map((item) => {
            const date = new Date(item.timestamp);
            return (
              <div key={item.id} className="p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                <div className={`p-2.5 rounded-xl ${item.action.includes('Opened') ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}><Clock className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center"><h3 className="font-black text-gray-900 text-base uppercase tracking-tight">{item.action}</h3><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  <p className="text-sm font-bold text-gray-500 mt-0.5 tracking-tight">By <span className="text-blue-600">{item.username}</span></p>
                </div>
              </div>
            );
          }) : <div className="p-16 text-center"><History className="h-12 w-12 text-gray-200 mx-auto mb-3" /><p className="text-lg font-black text-gray-400">No activity logged yet.</p></div>}
        </div>
      </div>
    </Layout>
  );
};

export default HistoryPage;
