import React, { useState, useEffect } from 'react';
import { KOT, KOTStatus } from '../types';
import { CheckCircle2, Clock, MapPin, User, Phone, Mail, ChefHat, AlertCircle } from 'lucide-react';

interface ActiveOrdersDashboardProps {
  kots: KOT[];
  onPayKOT: (id: string, address: string) => void;
  onDeleteKOT: (id: string) => void;
  currentUser: any;
}

export const ActiveOrdersDashboard: React.FC<ActiveOrdersDashboardProps> = ({
  kots,
  onPayKOT,
  onDeleteKOT,
  currentUser
}) => {
  const [payingKOTId, setPayingKOTId] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  // Filter only active orders
  const activeOrders = kots.filter(kot => kot.status === KOTStatus.ACTIVE);

  const handleCommitPayment = (kotId: string) => {
    if (!deliveryAddress.trim()) {
      alert('Please enter delivery address');
      return;
    }
    onPayKOT(kotId, deliveryAddress);
    setPayingKOTId(null);
    setDeliveryAddress('');
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl shadow-lg">
              <ChefHat className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Active Orders Dashboard
              </h1>
              <p className="text-slate-600">Monitor and manage incoming orders in real-time</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{activeOrders.length}</p>
                  <p className="text-sm text-slate-600">Active Orders</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {kots.filter(kot => kot.status === KOTStatus.PAID).length}
                  </p>
                  <p className="text-sm text-slate-600">Completed Today</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    ${activeOrders.reduce((sum, kot) => sum + kot.totalAmount, 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-600">Pending Revenue</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
              <ChefHat className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Active Orders</h3>
              <p className="text-center text-slate-500">
                Waiting for customers to place orders...<br />
                Orders will appear here automatically.
              </p>
            </div>
          ) : (
            activeOrders.map((kot) => (
              <div
                key={kot.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Order Header */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">Order #{kot.id.slice(-4)}</h3>
                      <div className="flex items-center gap-1 text-blue-100 text-sm mt-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(kot.timestamp)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold">${kot.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4">
                  <div className="space-y-2 mb-4">
                    {kot.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <span className="font-medium text-slate-800">{item.dish.name}</span>
                          <span className="text-slate-500 text-sm ml-2">x{item.quantity}</span>
                        </div>
                        <span className="font-mono text-slate-600">
                          ${(item.dish.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Customer Info */}
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Customer Details</span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        <span>Customer ID: {kot.customerId.slice(-4)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        <span>Phone: Available on payment</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!payingKOTId || payingKOTId !== kot.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPayingKOTId(kot.id)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Process Order
                      </button>
                      <button
                        onClick={() => onDeleteKOT(kot.id)}
                        className="px-4 py-3 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <MapPin className="w-4 h-4 text-amber-600" />
                        <span className="font-medium">Delivery Address Required</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter complete delivery address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCommitPayment(kot.id)}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Confirm & Generate Invoice
                        </button>
                        <button
                          onClick={() => setPayingKOTId(null)}
                          className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveOrdersDashboard;