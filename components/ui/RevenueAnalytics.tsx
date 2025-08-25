'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  RefreshCw,
  AlertCircle,
  PieChart,
  LineChart
} from 'lucide-react';

interface RevenueAnalyticsProps {
  className?: string;
}

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    saleFeeRevenue: number;
    tokenFeeRevenue: number;
    transactionCount: number;
    revenueGrowth: number;
    projectedRevenue: number;
  };
  timeSeries: Record<string, {
    total: number;
    saleFees: number;
    tokenFees: number;
    count: number;
    average: number;
  }>;
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

export default function RevenueAnalytics({ className = '' }: RevenueAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [timeRange, setTimeRange] = useState('30d');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const endDate = new Date().toISOString();
      let startDate = new Date();
      
      switch (timeRange) {
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
        groupBy: 'day',
        includeProjections: 'true'
      });

      const response = await fetch(`/api/platform/revenue/analytics?${params}`);
      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        setError(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(6)} SOL`;
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getChartData = () => {
    if (!analyticsData) return [];

    const timeSeries = analyticsData.timeSeries;
    return Object.entries(timeSeries)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: formatDate(date),
        total: data.total,
        saleFees: data.saleFees,
        tokenFees: data.tokenFees,
        count: data.count
      }));
  };

  const getPieChartData = () => {
    if (!analyticsData) return [];

    return [
      {
        name: 'Sale Fees',
        value: analyticsData.summary.saleFeeRevenue,
        color: '#3B82F6'
      },
      {
        name: 'Token Fees',
        value: analyticsData.summary.tokenFeeRevenue,
        color: '#10B981'
      }
    ];
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
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
            onClick={fetchAnalytics}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-gray-600">
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  const chartData = getChartData();
  const pieData = getPieChartData();

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>
            <p className="text-sm text-gray-600">Detailed revenue analysis and trends</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <div className="flex space-x-2">
              {[
                { value: '7d', label: '7D' },
                { value: '30d', label: '30D' },
                { value: '90d', label: '90D' },
                { value: 'all', label: 'All' }
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    timeRange === range.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Chart Type Selector */}
            <div className="flex space-x-2">
              {[
                { value: 'line', label: 'Line', icon: LineChart },
                { value: 'bar', label: 'Bar', icon: BarChart3 },
                { value: 'pie', label: 'Pie', icon: PieChart }
              ].map((type) => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setChartType(type.value as any)}
                    className={`p-2 rounded-md transition-colors ${
                      chartType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={type.label}
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={fetchAnalytics}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Revenue</p>
                <p className="text-xl font-bold">{formatSOL(analyticsData.summary.totalRevenue)}</p>
              </div>
              <DollarSign className="w-6 h-6 opacity-80" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Growth</p>
                <p className={`text-xl font-bold ${
                  analyticsData.summary.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(analyticsData.summary.revenueGrowth)}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Transactions</p>
                <p className="text-xl font-bold text-green-900">{analyticsData.summary.transactionCount}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Projected</p>
                <p className="text-xl font-bold text-orange-900">{formatSOL(analyticsData.summary.projectedRevenue)}</p>
              </div>
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Over Time ({chartType.toUpperCase()} Chart)
          </h3>
          
          {chartType === 'line' && (
            <div className="h-64 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <LineChart className="w-12 h-12 mx-auto mb-2" />
                <p>Line chart would display revenue trends over time</p>
                <p className="text-sm">{chartData.length} data points available</p>
              </div>
            </div>
          )}

          {chartType === 'bar' && (
            <div className="h-64 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                <p>Bar chart would display revenue by period</p>
                <p className="text-sm">{chartData.length} periods available</p>
              </div>
            </div>
          )}

          {chartType === 'pie' && (
            <div className="h-64 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <PieChart className="w-12 h-12 mx-auto mb-2" />
                <p>Pie chart would display revenue breakdown</p>
                <p className="text-sm">Sale Fees vs Token Fees</p>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Breakdown */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
            <div className="space-y-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatSOL(item.value)}</p>
                    <p className="text-sm text-gray-600">
                      {analyticsData.summary.totalRevenue > 0 
                        ? `${((item.value / analyticsData.summary.totalRevenue) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Tokens */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Tokens</h3>
            <div className="space-y-3">
              {analyticsData.topTokens.slice(0, 5).map((token, index) => (
                <div key={token.symbol} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{token.symbol}</p>
                      <p className="text-sm text-gray-600">{token.count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatSOL(token.total)}</p>
                    <p className="text-sm text-gray-600">Avg: {formatSOL(token.average)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Daily Average</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatSOL(analyticsData.performanceMetrics.dailyAverage)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Weekly Average</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatSOL(analyticsData.performanceMetrics.weeklyAverage)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Best Day</p>
              <p className="text-lg font-semibold text-green-600">
                {formatSOL(analyticsData.performanceMetrics.bestDay)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Worst Day</p>
              <p className="text-lg font-semibold text-red-600">
                {formatSOL(analyticsData.performanceMetrics.worstDay)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Avg per Transaction</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatSOL(analyticsData.summary.totalRevenue / Math.max(analyticsData.summary.transactionCount, 1))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
