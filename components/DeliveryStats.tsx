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
        console.log('DeliveryStats: Token available:', !!token);
        console.log('DeliveryStats: Token value:', token);

        const response = await fetch('http://localhost:3001/api/delivery-stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('DeliveryStats: Response status:', response.status);
        console.log('DeliveryStats: Response ok:', response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('DeliveryStats: API Error:', errorText);
          throw new Error(`Failed to fetch delivery statistics: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('DeliveryStats: Received data:', data);
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
          <p className="text-lg font-semibold">Error Loading Statistics</p>
          <p className="text-sm mt-2">Please check the console for detailed error information.</p>
          <p className="text-xs mt-1 text-gray-500">Make sure the server is running on port 3001</p>
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
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Truck className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Delivery Statistics</h2>
          </div>
          <p className="text-gray-600 ml-11">Track your delivery performance and revenue metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Deliveries */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{stats.totalDeliveries.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '100%'}}></div>
              </div>
            </div>
          </div>

          {/* Today's Deliveries */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{stats.todayDeliveries.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Today</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Deliveries</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: `${Math.min((stats.todayDeliveries / 20) * 100, 100)}%`}}></div>
              </div>
            </div>
          </div>

          {/* This Week's Deliveries */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{stats.weekDeliveries.toLocaleString()}</p>
                <p className="text-sm text-gray-500">This Week</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Weekly Deliveries</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: `${Math.min((stats.weekDeliveries / 150) * 100, 100)}%`}}></div>
              </div>
            </div>
          </div>

          {/* This Month's Deliveries */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{stats.monthDeliveries.toLocaleString()}</p>
                <p className="text-sm text-gray-500">This Month</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Deliveries</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{width: `${Math.min((stats.monthDeliveries / 500) * 100, 100)}%`}}></div>
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">₹{(stats.totalRevenue || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                <p className="text-sm text-gray-500">Revenue</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{width: '100%'}}></div>
              </div>
            </div>
          </div>

          {/* Average Order Value */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">₹{(stats.avgOrderValue || 0).toFixed(0)}</p>
                <p className="text-sm text-gray-500">Avg Order</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Average Order Value</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{width: `${Math.min((stats.avgOrderValue / 100) * 100, 100)}%`}}></div>
              </div>
            </div>
          </div>
        </div>

      {/* Summary Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 lg:p-6 mt-6 lg:mt-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Daily Average</p>
            <p className="text-xl font-bold text-slate-900 truncate">
              {stats.monthDeliveries > 0 ? (stats.monthDeliveries / new Date().getDate()).toFixed(1) : 0} deliveries/day
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Revenue per Delivery</p>
            <p className="text-xl font-bold text-slate-900 truncate">
              ₹{stats.totalDeliveries > 0 ? (stats.totalRevenue / stats.totalDeliveries).toFixed(2) : 0}
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default DeliveryStats;


