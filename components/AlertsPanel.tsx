
import React from 'react';
import { StockAlert, AlertType } from '../types';
import { AlertTriangle, Clock, Zap, CheckCircle2 } from 'lucide-react';

interface AlertsPanelProps {
  alerts: StockAlert[];
  onGenerateInsight: () => void;
  isGenerating: boolean;
  aiInsight: string | null;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onGenerateInsight, isGenerating, aiInsight }) => {
  return (
    <div className="bg-slate-900 text-slate-200 flex flex-col h-full max-h-[400px]">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-900 sticky top-0 z-10">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          AI Stock Agent
        </h3>
        <div className="flex gap-1.5 items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-900/50">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-slate-600">
            <CheckCircle2 className="w-6 h-6 text-green-500/50 mx-auto mb-2" />
            <p className="text-xs">No critical alerts.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id}
              className={`p-2.5 rounded border-l-2 text-xs animate-in fade-in slide-in-from-right-4 duration-300
                ${alert.type === AlertType.CRITICAL ? 'bg-red-950/40 border-red-500 text-red-200' : ''}
                ${alert.type === AlertType.LOW_STOCK ? 'bg-amber-950/40 border-amber-500 text-amber-200' : ''}
                ${alert.type === AlertType.EXPIRY ? 'bg-blue-950/40 border-blue-500 text-blue-200' : ''}
              `}
            >
              <div className="flex items-start gap-2">
                 {alert.type === AlertType.EXPIRY ? <Clock className="w-3.5 h-3.5 mt-0.5 opacity-70"/> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 opacity-70"/>}
                 <div className="flex-1">
                   <strong className="block text-[10px] uppercase opacity-60 mb-0.5 tracking-wider">{alert.type.replace('_', ' ')}</strong>
                   <span className="leading-tight block">{alert.message}</span>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Generative AI Section */}
      <div className="p-3 border-t border-slate-700 bg-slate-800/50">
         {!aiInsight && (
            <button 
              onClick={onGenerateInsight}
              disabled={isGenerating}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
               {isGenerating ? 'Analyzing...' : 'Generate Daily Insight'}
               {!isGenerating && <Zap className="w-3 h-3 fill-white" />}
            </button>
         )}
         
         {aiInsight && (
           <div className="bg-slate-800 p-2.5 rounded text-[11px] leading-relaxed border border-indigo-500/30 text-indigo-100">
              <div className="flex justify-between items-start mb-1">
                <strong className="text-indigo-400">Gemini Insight</strong>
                <button onClick={() => window.location.reload()} className="text-[10px] underline opacity-50 hover:opacity-100">Refresh</button>
              </div>
              {aiInsight}
           </div>
         )}
      </div>
    </div>
  );
};
