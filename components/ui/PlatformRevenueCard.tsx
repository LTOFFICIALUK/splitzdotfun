'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calendar, BarChart3 } from 'lucide-react';

interface PlatformRevenueSummary {
  totalRevenue: number;
  saleFeeRevenue: number;
  tokenFeeRevenue: number;
  transactionCount: number;
  saleFeeCount: number;
  tokenFeeCount: number;
}

interface PlatformRevenueCardProps {
  className?: string;
}

export default function PlatformRevenueCard({ className = '' }: PlatformRevenueCardProps) {
  const [summary, setSummary] = useState<PlatformRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(6)} SOL`;
  };

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/platform-revenue');
      const result = await response.json();

      if (result.success) {
        setSummary(result.data.summary);
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

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Error loading revenue data</p>
          <button 
            onClick={fetchRevenueData}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-gray-600">
          <p>No revenue data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Platform Revenue</h3>
        <div className="flex items-center space-x-2 text-green-600">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-medium">Live</span>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Total Revenue</p>
            <p className="text-white text-2xl font-bold">{formatSOL(summary.totalRevenue)}</p>
          </div>
          <DollarSign className="w-8 h-8 text-white opacity-80" />
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Sale Fees</span>
          </div>
          <p className="text-lg font-semibold text-blue-600">{formatSOL(summary.saleFeeRevenue)}</p>
          <p className="text-xs text-gray-500">{summary.saleFeeCount} transactions</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Token Fees</span>
          </div>
          <p className="text-lg font-semibold text-green-600">{formatSOL(summary.tokenFeeRevenue)}</p>
          <p className="text-xs text-gray-500">{summary.tokenFeeCount} collections</p>
        </div>
      </div>

      {/* Revenue Sources */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Revenue Sources</h4>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Marketplace Sales</p>
                <p className="text-xs text-gray-500">10% fee on sale price</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{formatSOL(summary.saleFeeRevenue)}</p>
              <p className="text-xs text-gray-500">{summary.saleFeeCount} sales</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Token Fees</p>
                <p className="text-xs text-gray-500">10% for 7 days after sale</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{formatSOL(summary.tokenFeeRevenue)}</p>
              <p className="text-xs text-gray-500">{summary.tokenFeeCount} periods</p>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <button 
            onClick={fetchRevenueData}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
