import React, { useState } from 'react';
import { KOT, KOTStatus } from '../types';
import { CheckCircle2, Trash2, Clock, Receipt, Download } from 'lucide-react';

interface KOTListProps {
  kots: KOT[];
  onPayKOT: (id: string, address: string) => void; // Pass address to backend
  onDeleteKOT: (id: string) => void;
}

export const KOTList: React.FC<KOTListProps> = ({ kots, onPayKOT, onDeleteKOT }) => {
  const [payingKOTId, setPayingKOTId] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

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
              <span className="block font-bold text-slate-900">${kot.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1 mb-4">
            {kot.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm text-slate-600">
                <span>
                  {item.dish.name} <span className="text-slate-400">x{item.quantity}</span>
                </span>
                <span className="font-mono">${(item.dish.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {kot.status === KOTStatus.ACTIVE && (
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
              {!payingKOTId || payingKOTId !== kot.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setPayingKOTId(kot.id)}
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
              ) : (
                <div className="flex flex-col gap-2">
                  {/* User Details (you can replace with actual user data) */}
                  <div className="text-sm text-slate-700">
                    <p><strong>Name:</strong> John Doe</p>
                    <p><strong>Email:</strong> john@example.com</p>
                    <p><strong>Phone:</strong> 9876543210</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="border rounded-lg p-2 text-sm w-full"
                  />
                  <button
                    onClick={() => handleCommitPayment(kot.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium"
                  >
                    Confirm & Generate Invoice
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
