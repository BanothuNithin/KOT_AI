import React, { useState, useEffect } from 'react';
import { Truck, DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface DeliveryStats {
  totalDeliveries: number;
  todayDeliveries: number;
  weekDeliveries: number;
  monthDeliveries: number;
  totalRevenue: number;
  avgOrderValue: number;
}

interface DeliveryStatsProps {
  token: string | null;
}

const DeliveryStats: React.FC<DeliveryStatsProps> = ({ token }) => {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/delivery-stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch delivery statistics');
        }

        const data = await response.json();
        // Ensure numeric values are properly typed
        const processedStats: DeliveryStats = {
          totalDeliveries: Number(data.totalDeliveries) || 0,
          todayDeliveries: Number(data.todayDeliveries) || 0,
          weekDeliveries: Number(data.weekDeliveries) || 0,
          monthDeliveries: Number(data.monthDeliveries) || 0,
          totalRevenue: Number(data.totalRevenue) || 0,
          avgOrderValue: Number(data.avgOrderValue) || 0,
        };
        setStats(processedStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 text-center">
          <p className="text-lg font-semibold">Error loading statistics</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Truck className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-slate-900">Delivery Statistics</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Deliveries */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Deliveries</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalDeliveries}</p>
            </div>
            <Truck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Today's Deliveries */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Today's Deliveries</p>
              <p className="text-3xl font-bold text-slate-900">{stats.todayDeliveries}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* This Week's Deliveries */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">This Week</p>
              <p className="text-3xl font-bold text-slate-900">{stats.weekDeliveries}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        {/* This Month's Deliveries */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">This Month</p>
              <p className="text-3xl font-bold text-slate-900">{stats.monthDeliveries}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Revenue</p>
              <p className="text-3xl font-bold text-slate-900">${(stats.totalRevenue || 0).toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg Order Value</p>
              <p className="text-3xl font-bold text-slate-900">${(stats.avgOrderValue || 0).toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 mt-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded p-4">
            <p className="text-sm text-slate-600">Daily Average</p>
            <p className="text-xl font-bold text-slate-900">
              {stats.monthDeliveries > 0 ? (stats.monthDeliveries / new Date().getDate()).toFixed(1) : 0} deliveries/day
            </p>
          </div>
          <div className="bg-white rounded p-4">
            <p className="text-sm text-slate-600">Revenue per Delivery</p>
            <p className="text-xl font-bold text-slate-900">
              ${stats.totalDeliveries > 0 ? (stats.totalRevenue / stats.totalDeliveries).toFixed(2) : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryStats;