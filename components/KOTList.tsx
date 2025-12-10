import React from 'react';
import { KOT, KOTStatus } from '../types';
import { CheckCircle2, Trash2, Clock, Receipt } from 'lucide-react';

interface KOTListProps {
  kots: KOT[];
  onPayKOT: (id: string) => void;
  onDeleteKOT: (id: string) => void;
}

export const KOTList: React.FC<KOTListProps> = ({ kots, onPayKOT, onDeleteKOT }) => {
  // Sort: Active first, then by timestamp descending
  const sortedKots = [...kots].sort((a, b) => {
    if (a.status === KOTStatus.ACTIVE && b.status !== KOTStatus.ACTIVE) return -1;
    if (a.status !== KOTStatus.ACTIVE && b.status === KOTStatus.ACTIVE) return 1;
    return b.timestamp - a.timestamp;
  });

  if (sortedKots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <Receipt className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm font-medium">No active tickets</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedKots.map((kot) => (
        <div 
          key={kot.id} 
          className={`relative border rounded-xl p-4 transition-all shadow-sm
            ${kot.status === KOTStatus.ACTIVE ? 'bg-white border-indigo-100 ring-1 ring-indigo-50' : ''}
            ${kot.status === KOTStatus.PAID ? 'bg-emerald-50/50 border-emerald-100 opacity-80' : ''}
            ${kot.status === KOTStatus.DELETED ? 'bg-red-50/50 border-red-100 opacity-60 grayscale' : ''}
          `}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-lg">KOT #{kot.id.slice(-4)}</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full
                  ${kot.status === KOTStatus.ACTIVE ? 'bg-indigo-100 text-indigo-700' : ''}
                  ${kot.status === KOTStatus.PAID ? 'bg-emerald-100 text-emerald-700' : ''}
                  ${kot.status === KOTStatus.DELETED ? 'bg-red-100 text-red-700' : ''}
                `}>
                  {kot.status}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                <Clock className="w-3 h-3" />
                {new Date(kot.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <div className="text-right">
              <span className="block font-bold text-slate-900">${kot.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1 mb-4">
            {kot.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm text-slate-600">
                <span>{item.dish.name} <span className="text-slate-400">x{item.quantity}</span></span>
                <span className="font-mono">${(item.dish.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Actions - Only for Active KOTs */}
          {kot.status === KOTStatus.ACTIVE && (
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => onPayKOT(kot.id)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-emerald-200 shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Pay & Commit
              </button>
              <button
                onClick={() => onDeleteKOT(kot.id)}
                className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete & Revert
              </button>
            </div>
          )}
          
          {kot.status === KOTStatus.PAID && (
            <div className="pt-2 text-xs text-center text-emerald-600 font-medium italic border-t border-emerald-100">
              Stock permanently deducted.
            </div>
          )}
          
           {kot.status === KOTStatus.DELETED && (
            <div className="pt-2 text-xs text-center text-red-600 font-medium italic border-t border-red-100">
              Stock reservation reverted.
            </div>
          )}
        </div>
      ))}
    </div>
  );
};