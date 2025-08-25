'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import PlatformRevenueCard from './PlatformRevenueCard';

interface RevenueDashboardProps {
  className?: string;
}

interface RevenueData {
  summary: {
    totalRevenue: number;
    saleFeeRevenue: number;
    tokenFeeRevenue: number;
    transactionCount: number;
    saleFeeCount: number;
    tokenFeeCount: number;
    revenueGrowth: number;
    projectedRevenue: number;
  };
  timeSeries: Record<string, any>;
  topTokens: Array<{
    symbol: string;
    total: number;
    count: number;
    type: string;
    average: number;
  }>;
  performanceMetrics: {
    dailyAverage: number;
    weeklyAverage: number;
    monthlyAverage: number;
    bestDay: number;
    worstDay: number;
  };
}

export default function RevenueDashboard({ className = '' }: RevenueDashboardProps) {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, all

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
          startDate = new Date(0);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate,
        includeProjections: 'true'
      });

      const response = await fetch(`/api/platform/revenue/analytics?${params}`);
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

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <button 
            onClick={() => fetchRevenueData()}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!revenueData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-gray-600">
          <p>No revenue data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h2>
            <p className="text-sm text-gray-600">Platform revenue analytics and insights</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Date Range Selector */}
            <div className="flex space-x-2">
              {[
                { value: '7d', label: '7D' },
                { value: '30d', label: '30D' },
                { value: '90d', label: '90D' },
                { value: 'all', label: 'All' }
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleDateRangeChange(range.value)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    dateRange === range.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => fetchRevenueData()}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Total Revenue</p>
                <p className="text-2xl font-bold">{formatSOL(revenueData.summary.totalRevenue)}</p>
                <div className="flex items-center mt-2">
                  {revenueData.summary.revenueGrowth >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                  )}
                  <span className="text-sm">
                    {formatPercentage(revenueData.summary.revenueGrowth)}
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 opacity-80" />
            </div>
          </div>

          {/* Sale Fees */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Sale Fees</p>
                <p className="text-2xl font-bold text-blue-900">{formatSOL(revenueData.summary.saleFeeRevenue)}</p>
                <p className="text-sm text-blue-600">{revenueData.summary.saleFeeCount} transactions</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Token Fees */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Token Fees</p>
                <p className="text-2xl font-bold text-green-900">{formatSOL(revenueData.summary.tokenFeeRevenue)}</p>
                <p className="text-sm text-green-600">{revenueData.summary.tokenFeeCount} collections</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Projected Revenue */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Projected (30D)</p>
                <p className="text-2xl font-bold text-orange-900">{formatSOL(revenueData.summary.projectedRevenue)}</p>
                <p className="text-sm text-orange-600">Based on trends</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Average:</span>
                <span className="font-semibold">{formatSOL(revenueData.performanceMetrics.dailyAverage)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Weekly Average:</span>
                <span className="font-semibold">{formatSOL(revenueData.performanceMetrics.weeklyAverage)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Best Day:</span>
                <span className="font-semibold text-green-600">{formatSOL(revenueData.performanceMetrics.bestDay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Worst Day:</span>
                <span className="font-semibold text-red-600">{formatSOL(revenueData.performanceMetrics.worstDay)}</span>
              </div>
            </div>
          </div>

          {/* Top Performing Tokens */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Tokens</h3>
            <div className="space-y-3">
              {revenueData.topTokens.slice(0, 5).map((token, index) => (
                <div key={token.symbol} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{token.symbol}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      token.type === 'sale_fee' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {token.type === 'sale_fee' ? 'Sale' : 'Token'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold">{formatSOL(token.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Growth */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Analysis</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Revenue Growth:</span>
                <span className={`font-semibold ${
                  revenueData.summary.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(revenueData.summary.revenueGrowth)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Avg per Transaction:</span>
                <span className="font-semibold">{formatSOL(revenueData.summary.averageRevenuePerTransaction)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Transactions:</span>
                <span className="font-semibold">{revenueData.summary.transactionCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Series Chart Placeholder */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
          <div className="h-64 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2" />
              <p>Revenue chart would be displayed here</p>
              <p className="text-sm">Time series data available for {Object.keys(revenueData.timeSeries).length} periods</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
