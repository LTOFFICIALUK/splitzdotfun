'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  RefreshCw,
  BarChart3
} from 'lucide-react';

interface FeePeriodTrackerProps {
  className?: string;
}

interface FeePeriod {
  id: string;
  token_id: string;
  sale_id: string;
  period_start: string;
  period_end: string;
  fee_percentage: number;
  total_fees_generated_sol: number;
  platform_fee_collected_sol: number;
  status: 'active' | 'completed' | 'cancelled';
  tokens: {
    id: string;
    name: string;
    symbol: string;
    contract_address: string;
    image_url?: string;
  };
  marketplace_sales: {
    id: string;
    sale_price_sol: number;
    completed_at: string;
  };
}

export default function FeePeriodTracker({ className = '' }: FeePeriodTrackerProps) {
  const [feePeriods, setFeePeriods] = useState<FeePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const fetchFeePeriods = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        status: filter,
        includeAnalytics: 'true'
      });

      const response = await fetch(`/api/platform/revenue/periods?${params}`);
      const result = await response.json();

      if (result.success) {
        setFeePeriods(result.data.feePeriods || []);
      } else {
        setError(result.error || 'Failed to fetch fee periods');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeePeriods();
  }, [filter]);

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(6)} SOL`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimeLeft = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const difference = end - now;

    if (difference <= 0) return 'Expired';

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: Clock,
          label: 'Active',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Completed',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200'
        };
      case 'cancelled':
        return {
          icon: AlertCircle,
          label: 'Cancelled',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        };
    }
  };

  const calculateProgress = (period: FeePeriod) => {
    const now = new Date().getTime();
    const start = new Date(period.period_start).getTime();
    const end = new Date(period.period_end).getTime();
    
    if (now <= start) return 0;
    if (now >= end) return 100;
    
    return Math.round(((now - start) / (end - start)) * 100);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
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
            onClick={fetchFeePeriods}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
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
            <h2 className="text-2xl font-bold text-gray-900">Fee Period Tracker</h2>
            <p className="text-sm text-gray-600">Track 7-day token fee collection periods</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Filter */}
            <div className="flex space-x-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value as any)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filter === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={fetchFeePeriods}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {feePeriods.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No fee periods found</p>
            <p className="text-sm text-gray-500">Fee periods are created automatically when tokens are sold</p>
          </div>
        ) : (
          <div className="space-y-6">
            {feePeriods.map((period) => {
              const statusConfig = getStatusConfig(period.status);
              const StatusIcon = statusConfig.icon;
              const progress = calculateProgress(period);
              const timeLeft = formatTimeLeft(period.period_end);

              return (
                <div key={period.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      {period.tokens.image_url && (
                        <img 
                          src={period.tokens.image_url} 
                          alt={period.tokens.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {period.tokens.name} ({period.tokens.symbol})
                        </h3>
                        <p className="text-sm text-gray-600">
                          {period.tokens.contract_address.slice(0, 8)}...{period.tokens.contract_address.slice(-6)}
                        </p>
                      </div>
                    </div>

                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
                      <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                      <span className={`text-sm font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {period.status === 'active' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Period Progress</span>
                        <span className="text-sm text-gray-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Fee Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Total Fees Generated</span>
                      </div>
                      <p className="text-lg font-semibold text-green-600">
                        {formatSOL(period.total_fees_generated_sol)}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Platform Fee Collected</span>
                      </div>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatSOL(period.platform_fee_collected_sol)}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-700">Time Remaining</span>
                      </div>
                      <p className="text-lg font-semibold text-purple-600">
                        {timeLeft}
                      </p>
                    </div>
                  </div>

                  {/* Period Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Period Start:</span>
                        <span className="font-medium">{formatDate(period.period_start)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Period End:</span>
                        <span className="font-medium">{formatDate(period.period_end)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Fee Percentage:</span>
                        <span className="font-medium">{period.fee_percentage}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Original Sale Price:</span>
                        <span className="font-medium">{formatSOL(period.marketplace_sales.sale_price_sol)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sale Date:</span>
                        <span className="font-medium">{formatDate(period.marketplace_sales.completed_at)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Collection Rate:</span>
                        <span className="font-medium">
                          {period.total_fees_generated_sol > 0 
                            ? `${((period.platform_fee_collected_sol / period.total_fees_generated_sol) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
