
import React from 'react';
import { Ingredient } from '../types';
import { AlertTriangle, Calendar, Package, Clock, TrendingDown, TrendingUp } from 'lucide-react';

interface InventoryTableProps {
  ingredients: Ingredient[];
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ ingredients }) => {
  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg">
              <Package className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Inventory Management
              </h2>
              <p className="text-slate-600 text-sm">Real-time stock levels and expiry tracking</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2.5 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-900">{ingredients.length}</p>
                <p className="text-xs text-slate-600 font-medium">Total Items</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2.5 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-900">
                  {ingredients.filter(item => (item.totalStock - item.reservedStock) <= item.lowStockThreshold).length}
                </p>
                <p className="text-xs text-slate-600 font-medium">Low Stock</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2.5 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-900">
                  {ingredients.filter(item => {
                    const daysToExpiry = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
                    return daysToExpiry <= 3;
                  }).length}
                </p>
                <p className="text-xs text-slate-600 font-medium">Expiring Soon</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2.5 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-900">
                  {ingredients.reduce((sum, item) => sum + (item.totalStock - item.reservedStock), 0)}
                </p>
                <p className="text-xs text-slate-600 font-medium">Total Available</p>
              </div>
            </div>
          </div>
        </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Item Details
                  </div>
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Package className="w-3 h-3" />
                    Total Stock
                  </div>
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Reserved
                  </div>
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Available
                  </div>
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Expiry
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {ingredients.map((item, index) => {
                const available = item.totalStock - item.reservedStock;
                const isLow = available <= item.lowStockThreshold;
                const isCritical = available <= 0;
                const daysToExpiry = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
                const isExpiring = daysToExpiry <= 3;
                const isExpired = daysToExpiry < 0;

                return (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                          isCritical ? 'bg-red-100' :
                          isLow ? 'bg-amber-100' :
                          'bg-emerald-100'
                        }`}>
                          <Package className={`w-6 h-6 ${
                            isCritical ? 'text-red-600' :
                            isLow ? 'text-amber-600' :
                            'text-emerald-600'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-900 truncate" title={item.name}>
                              {item.name}
                            </p>
                            {isLow && (
                              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" title="Low stock alert" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{item.unit}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {item.totalStock}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {item.reservedStock > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          -{item.reservedStock}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400">
                          0
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isCritical ? 'bg-red-100 text-red-800' :
                        isLow ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {available}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isExpired ? 'bg-red-100 text-red-800' :
                        isExpiring ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {isExpired ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            Expired
                          </>
                        ) : (
                          <>
                            {daysToExpiry}d
                            {isExpiring && <Calendar className="w-3 h-3" />}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {ingredients.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No inventory items</h3>
            <p className="text-slate-500">Inventory items will appear here once added.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};


