
import React from 'react';
import { Ingredient } from '../types';
import { AlertTriangle, Calendar } from 'lucide-react';

interface InventoryTableProps {
  ingredients: Ingredient[];
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ ingredients }) => {
  return (
    <div className="h-full overflow-auto custom-scrollbar w-full">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-2 font-medium text-xs text-slate-500 uppercase tracking-wider bg-slate-50">Item</th>
              <th className="px-2 py-2 font-medium text-xs text-slate-500 uppercase text-center bg-slate-50">Total</th>
              <th className="px-2 py-2 font-medium text-xs text-slate-500 uppercase text-center text-amber-600 bg-slate-50">Rsrv</th>
              <th className="px-2 py-2 font-medium text-xs text-slate-500 uppercase text-center text-emerald-600 bg-slate-50">Avail</th>
              <th className="px-2 py-2 font-medium text-xs text-slate-500 uppercase text-right bg-slate-50">Exp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ingredients.map((item) => {
              const available = item.totalStock - item.reservedStock;
              const isLow = available <= item.lowStockThreshold;
              const isCritical = available <= 0;
              const daysToExpiry = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
              const isExpiring = daysToExpiry <= 3;

              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-2 font-medium text-slate-700 truncate max-w-[120px]" title={item.name}>
                    <div className="flex items-center gap-1">
                      {item.name}
                      {isLow && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center text-slate-500 font-mono text-xs">
                    {item.totalStock}
                  </td>
                  <td className="px-2 py-2 text-center font-bold text-amber-600 font-mono text-xs bg-amber-50/30">
                    {item.reservedStock > 0 ? `-${item.reservedStock}` : '-'}
                  </td>
                  <td className={`px-2 py-2 text-center font-bold font-mono text-xs ${isCritical ? 'text-red-600' : 'text-emerald-600'}`}>
                    {available}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className={`flex items-center justify-end gap-1 text-xs ${isExpiring ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      {daysToExpiry}d
                      {isExpiring && <Calendar className="w-3 h-3" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
