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
  
  const filteredHistory = history.filter(h => h.shopId === userShop?.id).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout}>
      <div className="mb-8 flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black hover:gap-3 transition-all w-fit"><ArrowLeft className="h-5 w-5" /> Dashboard</button>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 leading-none uppercase tracking-tight">Facility Activity Log</h1>
            <p className="text-gray-500 font-bold mt-2 italic">A real-time record of status changes for your Shop Finder facility.</p>
          </div>
          <button onClick={() => { if(confirm("Clear log history?")) onClearHistory(); }} className="flex items-center gap-2 text-red-500 font-black text-xs hover:text-red-700 transition-colors uppercase tracking-widest border border-red-100 px-4 py-2 rounded-xl hover:bg-red-50"><Trash2 className="h-4 w-4" /> Reset Log</button>
        </div>
      </div>
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {filteredHistory.length > 0 ? filteredHistory.map((item) => { 
            const date = new Date(item.timestamp); 
            const isOpenAction = item.action.includes('Opened');
            return ( 
              <div key={item.id} className="p-6 flex items-start gap-6 hover:bg-slate-50/50 transition-colors group">
                <div className={`p-3 rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${isOpenAction ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                    <Clock className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">{item.action}</h3>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">{date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-500 mt-1 tracking-tight">Operation triggered by <span className="text-blue-600 font-black">{item.username}</span></p>
                </div>
              </div> 
            ); 
          }) : (
            <div className="p-24 text-center">
                <History className="h-16 w-16 text-slate-100 mx-auto mb-4" />
                <p className="text-xl font-black text-slate-300 uppercase tracking-widest">No activity recorded</p>
                <p className="text-slate-200 font-bold mt-1 text-sm italic">Facility status updates will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
export default HistoryPage;