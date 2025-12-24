
import React, { useState, useEffect } from 'react';
import { StockAlert, AlertType } from '../types';
import { AlertTriangle, Clock, Zap, CheckCircle2, TrendingDown, Calendar } from 'lucide-react';

interface AlertsPanelProps {
  alerts: StockAlert[];
  onGenerateInsight: () => void;
  isGenerating: boolean;
  aiInsight: string | null;
  showAiInsights?: boolean;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onGenerateInsight,
  isGenerating,
  aiInsight,
  showAiInsights = true
}) => {
  const [currentExpiryIndex, setCurrentExpiryIndex] = useState(0);

  // Filter expiry alerts for the ticker
  const expiryAlerts = alerts.filter(alert => alert.type === AlertType.EXPIRY);

  // Auto-scroll through expiry alerts
  useEffect(() => {
    if (expiryAlerts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentExpiryIndex(prev => (prev + 1) % expiryAlerts.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [expiryAlerts.length]);

  // Separate alerts by type
  const criticalAlerts = alerts.filter(alert => alert.type === AlertType.CRITICAL);
  const lowStockAlerts = alerts.filter(alert => alert.type === AlertType.LOW_STOCK);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200/60">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Smart Inventory Alerts</h3>
              <p className="text-sm text-slate-600">Real-time stock monitoring & AI insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm"></span>
            <span className="text-xs text-slate-600 font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Dynamic Expiry Ticker */}
      {expiryAlerts.length > 0 && (
        <div className="px-6 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Expiry Alerts</span>
          </div>
          <div className="relative overflow-hidden h-8">
            <div
              className="flex transition-all duration-500 ease-in-out transform"
              style={{ transform: `translateX(-${currentExpiryIndex * 100}%)` }}
            >
              {expiryAlerts.map((alert, index) => (
                <div
                  key={alert.id}
                  className="flex-shrink-0 w-full flex items-center gap-2 text-sm text-amber-700"
                >
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="truncate">{alert.message}</span>
                  {expiryAlerts.length > 1 && (
                    <div className="flex gap-1 ml-2">
                      {expiryAlerts.map((_, dotIndex) => (
                        <div
                          key={dotIndex}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            dotIndex === currentExpiryIndex ? 'bg-amber-600' : 'bg-amber-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Critical & Low Stock Alerts */}
      <div className="px-6 py-4 space-y-3">
        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-700">Critical Stock</span>
            </div>
            <div className="space-y-2">
              {criticalAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-left-2"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-red-800 flex-1">{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">Low Stock Warnings</span>
            </div>
            <div className="space-y-2">
              {lowStockAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in slide-in-from-left-2"
                >
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm text-amber-800 flex-1">{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Alerts State */}
        {alerts.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-slate-900 mb-1">All Systems Green</h4>
            <p className="text-sm text-slate-600">No critical alerts at this time</p>
          </div>
        )}
      </div>

      {/* AI Insights Section */}
      {showAiInsights && (
        <div className="px-6 py-4 border-t border-slate-200/60 bg-slate-50/50">
          {!aiInsight ? (
            <button
              onClick={onGenerateInsight}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing Inventory...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate AI Insight
                </>
              )}
            </button>
          ) : (
            <div className="bg-white border border-indigo-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-slate-900">AI Inventory Insight</span>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-slate-500 hover:text-slate-700 underline transition-colors"
                >
                  Refresh
                </button>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{aiInsight}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


