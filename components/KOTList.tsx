import React, { useState, useEffect } from 'react';
import { KOT, KOTStatus } from '../types';
import { CheckCircle2, Trash2, Clock, Receipt, Download } from 'lucide-react';
import RazorpayPayment from './RazorpayPayment';

interface KOTListProps {
  kots: KOT[];
  currentUser?: any;
  deliveryAddress?: string;
  setDeliveryAddress?: (address: string) => void;
  onPayKOT: (id: string, address: string) => void;
  onDeleteKOT: (id: string) => void;
}

export const KOTList: React.FC<KOTListProps> = ({
  kots,
  currentUser,
  deliveryAddress: propDeliveryAddress,
  setDeliveryAddress: propSetDeliveryAddress,
  onPayKOT,
  onDeleteKOT
}) => {
  const [payingKOTId, setPayingKOTId] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<string>(propDeliveryAddress || '');

  // Sync delivery address with props
  useEffect(() => {
    if (propDeliveryAddress !== undefined) {
      setDeliveryAddress(propDeliveryAddress);
    }
  }, [propDeliveryAddress]);

  // Sync local delivery address changes with parent
  const handleDeliveryAddressChange = (address: string) => {
    setDeliveryAddress(address);
    if (propSetDeliveryAddress) {
      propSetDeliveryAddress(address);
    }
  };

  const sortedKots = [...kots].sort((a, b) => {
    if (a.status === KOTStatus.ACTIVE && b.status !== KOTStatus.ACTIVE) return -1;
    if (a.status !== KOTStatus.ACTIVE && b.status === KOTStatus.ACTIVE) return 1;
    return b.timestamp - a.timestamp;
  });

  const handleDownloadInvoice = async (kotId: string) => {
  try {
    const kot = kots.find(k => k.id === kotId);
    if (!kot) throw new Error('KOT not found');
    if (!kot.invoiceId) {
      alert('Invoice not generated yet. Please pay first.');
      return;
    }

    const pdfResponse = await fetch(`http://localhost:3001/api/invoices/${kot.invoiceId}/pdf`);
    if (!pdfResponse.ok) throw new Error('Failed to download PDF');

    const blob = await pdfResponse.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${kot.invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    alert('Failed to download invoice. Please try again.');
  }
};


  const handleCommitPayment = (kotId: string) => {
    if (!deliveryAddress.trim()) {
      alert('Please enter delivery address');
      return;
    }
    onPayKOT(kotId, deliveryAddress);
    setPayingKOTId(null);
    setDeliveryAddress('');
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      console.log('✅ Payment success data:', paymentData);

      // Find the KOT being paid
      const kot = kots.find(k => k.id === payingKOTId);
      if (!kot) {
        alert('Order not found');
        return;
      }

      // Process the payment with delivery address
      await onPayKOT(kot.id, deliveryAddress);

      // Reset state
      setPayingKOTId(null);
      setDeliveryAddress('');

      alert(`Payment successful! ₹${(paymentData.amount / 100).toFixed(2)} paid. Invoice has been generated.`);
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment successful but failed to process order. Please contact support.');
    }
  };

  // Debug function to check authentication
  const debugAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('🔍 Auth Debug:');
    console.log('- Token exists:', !!token);
    console.log('- Token length:', token?.length);
    console.log('- User exists:', !!user);
    console.log('- Current user prop:', !!currentUser);
    console.log('- User data:', currentUser);

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('- Token expires:', new Date(payload.exp * 1000));
        console.log('- Token expired:', Date.now() > payload.exp * 1000);
      } catch (e) {
        console.log('- Token decode failed');
      }
    }
  };

  // Call debug on component mount
  React.useEffect(() => {
    debugAuth();
  }, []);

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);

    // Provide user-friendly error messages
    let errorMessage = 'Payment failed. Please try again.';

    if (error.message?.includes('Authentication required')) {
      errorMessage = 'Please log in again to continue with payment.';
    } else if (error.message?.includes('HTTP 401')) {
      errorMessage = 'Session expired. Please log in again.';
    } else if (error.message?.includes('HTTP 500')) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.message?.includes('Failed to load Razorpay SDK')) {
      errorMessage = 'Payment service unavailable. Please check your internet connection.';
    }

    alert(errorMessage);
  };

  return (
    <div className="p-6">
      <div className="max-w-md mx-auto space-y-4">
      {sortedKots.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Receipt className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">No active tickets</p>
        </div>
      )}

      {sortedKots.map((kot) => (
        <div
          key={kot.id}
          className={`relative border rounded-xl p-4 transition-all shadow-sm ${
            kot.status === KOTStatus.ACTIVE ? 'bg-white border-indigo-100 ring-1 ring-indigo-50' : ''
          } ${
            kot.status === KOTStatus.PAID ? 'bg-emerald-50/50 border-emerald-100 opacity-80' : ''
          } ${
            kot.status === KOTStatus.DELETED ? 'bg-red-50/50 border-red-100 opacity-60 grayscale' : ''
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-lg">KOT #{kot.id.slice(-4)}</span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    kot.status === KOTStatus.ACTIVE ? 'bg-indigo-100 text-indigo-700' : ''
                  } ${
                    kot.status === KOTStatus.PAID ? 'bg-emerald-100 text-emerald-700' : ''
                  } ${
                    kot.status === KOTStatus.DELETED ? 'bg-red-100 text-red-700' : ''
                  }`}
                >
                  {kot.status}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                <Clock className="w-3 h-3" />
                {new Date(kot.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <div className="text-right">
              <span className="block font-bold text-slate-900">₹{kot.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1 mb-4">
            {kot.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm text-slate-600">
                <span>
                  {item.dish.name} <span className="text-slate-400">x{item.quantity}</span>
                </span>
                <span className="font-mono">₹{(item.dish.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {kot.status === KOTStatus.ACTIVE && (
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
              {!payingKOTId || payingKOTId !== kot.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setPayingKOTId(kot.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-emerald-200 shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Pay with Razorpay
                  </button>
                  <button
                    onClick={() => onDeleteKOT(kot.id)}
                    className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete & Revert
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Delivery Address Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Delivery Address *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter complete delivery address"
                      value={deliveryAddress}
                      onChange={(e) => handleDeliveryAddressChange(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Razorpay Payment Component */}
                  <RazorpayPayment
                    amount={kot.totalAmount}
                    orderId={kot.id}
                    customerDetails={{
                      name: currentUser?.name || 'Customer',
                      email: currentUser?.email || '',
                      phone: currentUser?.phone || ''
                    }}
                    onSuccess={handlePaymentSuccess}
                    onFailure={handlePaymentFailure}
                    disabled={!deliveryAddress.trim()}
                    className="w-full"
                  />

                  <button
                    onClick={() => setPayingKOTId(null)}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {kot.status === KOTStatus.PAID && (
            <div className="flex gap-2 pt-3 border-t border-emerald-100">
              <button
                onClick={() => handleDownloadInvoice(kot.id)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-blue-200 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Invoice
              </button>
              <div className="flex-1 text-xs text-center text-emerald-600 font-medium italic flex items-center justify-center">
                Stock permanently deducted.
              </div>
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
    </div>
  );
};


