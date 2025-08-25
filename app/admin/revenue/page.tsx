'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import PlatformRevenueCard from '@/components/ui/PlatformRevenueCard';
import { BarChart3, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface RevenueData {
  revenue: any[];
  summary: {
    totalRevenue: number;
    saleFeeRevenue: number;
    tokenFeeRevenue: number;
    transactionCount: number;
    saleFeeCount: number;
    tokenFeeCount: number;
  };
}

export default function AdminRevenuePage() {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d, all

  const fetchRevenueData = async (range?: string) => {
    try {
      setLoading(true);
      setError('');

      const endDate = new Date().toISOString();
      let startDate = new Date();
      
      switch (range || dateRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case 'all':
          startDate = new Date(0); // Beginning of time
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate
      });

      const response = await fetch(`/api/platform-revenue?${params}`);
      const result = await response.json();

      if (result.success) {
        setRevenueData(result.data);
      } else {
        setError(result.error || 'Failed to fetch revenue data');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    fetchRevenueData(range);
  };

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(6)} SOL`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPath="/admin/revenue" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Platform Revenue Analytics</h1>
          <p className="mt-2 text-gray-600">Track platform revenue from marketplace sales and token fees</p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
            <div className="flex space-x-2">
              {[
                { value: '7d', label: '7 Days' },
                { value: '30d', label: '30 Days' },
                { value: '90d', label: '90 Days' },
                { value: 'all', label: 'All Time' }
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleDateRangeChange(range.value)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    dateRange === range.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => fetchRevenueData()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : revenueData ? (
          <>
            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatSOL(revenueData.summary.totalRevenue)}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sale Fees</p>
                    <p className="text-2xl font-bold text-blue-600">{formatSOL(revenueData.summary.saleFeeRevenue)}</p>
                    <p className="text-sm text-gray-500">{revenueData.summary.saleFeeCount} transactions</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Token Fees</p>
                    <p className="text-2xl font-bold text-green-600">{formatSOL(revenueData.summary.tokenFeeRevenue)}</p>
                    <p className="text-sm text-gray-500">{revenueData.summary.tokenFeeCount} collections</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Revenue Transactions */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Revenue Transactions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {revenueData.revenue.slice(0, 10).map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.revenue_type === 'sale_fee' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.revenue_type === 'sale_fee' ? 'Sale Fee' : 'Token Fee'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatSOL(item.amount_sol)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.marketplace_sales?.tokens?.symbol || 
                           item.token_fee_periods?.tokens?.symbol || 
                           'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.collected_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'collected' 
                              ? 'bg-green-100 text-green-800' 
                              : item.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center text-gray-600">
              <p>No revenue data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
