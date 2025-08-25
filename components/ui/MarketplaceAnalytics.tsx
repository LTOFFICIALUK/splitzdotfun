'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Clock, 
  BarChart3, 
  PieChart,
  Calendar,
  Target,
  Award,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

interface MarketplaceAnalyticsProps {
  className?: string;
}

interface AnalyticsData {
  timeRange: string;
  period: {
    start: string;
    end: string;
  };
  auctions?: any;
  offers?: any;
  revenue?: any;
}

export default function MarketplaceAnalytics({ className = '' }: MarketplaceAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'auctions' | 'offers' | 'revenue'>('overview');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/analytics/marketplace?timeRange=${timeRange}&type=all`);
      const result = await response.json();

      if (result.success) {
        setAnalytics(result.data);
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

  const StatCard = ({ title, value, subtitle, icon: Icon, trend }: any) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      {trend && (
        <div className="flex items-center mt-4">
          <TrendingUp className={`w-4 h-4 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-sm font-medium ml-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </div>
      )}
    </div>
  );

  const MetricCard = ({ title, value, unit = '', className = '' }: any) => (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">
        {value}{unit}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 ${className}`}>
        <p className="text-gray-600 text-center">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Marketplace Analytics</h2>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(analytics.period.start).toLocaleDateString()} - {new Date(analytics.period.end).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={fetchAnalytics}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'auctions', label: 'Auctions', icon: Award },
            { id: 'offers', label: 'Offers', icon: MessageSquare },
            { id: 'revenue', label: 'Revenue', icon: DollarSign }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Auctions"
                value={analytics.auctions?.overview?.totalAuctions || 0}
                subtitle={`${analytics.auctions?.overview?.soldAuctions || 0} sold`}
                icon={Award}
              />
              <StatCard
                title="Total Offers"
                value={analytics.offers?.overview?.totalOffers || 0}
                subtitle={`${analytics.offers?.overview?.acceptedOffers || 0} accepted`}
                icon={MessageSquare}
              />
              <StatCard
                title="Total Revenue"
                value={`${analytics.revenue?.overview?.totalRevenue || 0} SOL`}
                subtitle={`${analytics.revenue?.overview?.totalTransactions || 0} transactions`}
                icon={DollarSign}
              />
              <StatCard
                title="Active Users"
                value={analytics.auctions?.overview?.uniqueBidders || 0}
                subtitle="Unique bidders"
                icon={Users}
              />
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Auction Success Rate"
                value={`${analytics.auctions?.overview?.successRate || 0}%`}
                className="bg-green-50"
              />
              <MetricCard
                title="Offer Acceptance Rate"
                value={`${analytics.offers?.overview?.acceptanceRate || 0}%`}
                className="bg-blue-50"
              />
              <MetricCard
                title="Fee Collection Efficiency"
                value={`${analytics.revenue?.efficiency?.feeCollectionEfficiency || 0}%`}
                className="bg-purple-50"
              />
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Tokens</h3>
                <div className="space-y-3">
                  {analytics.auctions?.topTokens?.slice(0, 5).map((token: any, index: number) => (
                    <div key={token.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="ml-3 text-sm font-medium text-gray-900">{token.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{token.count} auctions</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Sellers</h3>
                <div className="space-y-3">
                  {analytics.auctions?.topSellers?.slice(0, 5).map((seller: any, index: number) => (
                    <div key={seller.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="ml-3 text-sm font-medium text-gray-900">{seller.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{seller.count} sales</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'auctions' && analytics.auctions && (
          <div className="space-y-6">
            {/* Auction Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Auctions"
                value={analytics.auctions.overview.totalAuctions}
                icon={Award}
              />
              <StatCard
                title="Success Rate"
                value={`${analytics.auctions.overview.successRate}%`}
                icon={Target}
              />
              <StatCard
                title="Total Volume"
                value={`${analytics.auctions.financial.totalVolume} SOL`}
                icon={DollarSign}
              />
              <StatCard
                title="Avg Duration"
                value={`${analytics.auctions.performance.averageDuration}h`}
                icon={Clock}
              />
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Average Starting Bid"
                value={analytics.auctions.financial.averageStartingBid}
                unit=" SOL"
              />
              <MetricCard
                title="Average Winning Bid"
                value={analytics.auctions.financial.averageWinningBid}
                unit=" SOL"
              />
              <MetricCard
                title="Average Reserve Price"
                value={analytics.auctions.financial.averageReservePrice}
                unit=" SOL"
              />
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Average Bids per Auction"
                value={analytics.auctions.performance.averageBidsPerAuction}
              />
              <MetricCard
                title="Reserve Price Met Rate"
                value={`${analytics.auctions.performance.reservePriceMetRate}%`}
              />
              <MetricCard
                title="Unique Bidders"
                value={analytics.auctions.overview.uniqueBidders}
              />
            </div>
          </div>
        )}

        {activeTab === 'offers' && analytics.offers && (
          <div className="space-y-6">
            {/* Offer Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Offers"
                value={analytics.offers.overview.totalOffers}
                icon={MessageSquare}
              />
              <StatCard
                title="Acceptance Rate"
                value={`${analytics.offers.overview.acceptanceRate}%`}
                icon={Target}
              />
              <StatCard
                title="Counter Offer Rate"
                value={`${analytics.offers.overview.counterOfferRate}%`}
                icon={TrendingUp}
              />
              <StatCard
                title="Total Volume"
                value={`${analytics.offers.financial.totalVolume} SOL`}
                icon={DollarSign}
              />
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Average Offer Amount"
                value={analytics.offers.financial.averageOfferAmount}
                unit=" SOL"
              />
              <MetricCard
                title="Average Accepted Amount"
                value={analytics.offers.financial.averageAcceptedAmount}
                unit=" SOL"
              />
              <MetricCard
                title="Average Counter Amount"
                value={analytics.offers.financial.averageCounterAmount}
                unit=" SOL"
              />
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Average Time to Acceptance"
                value={`${analytics.offers.performance.averageTimeToAcceptance}h`}
              />
              <MetricCard
                title="Median Time to Acceptance"
                value={`${analytics.offers.performance.medianTimeToAcceptance}h`}
              />
              <MetricCard
                title="Pending Offers"
                value={analytics.offers.overview.pendingOffers}
              />
            </div>
          </div>
        )}

        {activeTab === 'revenue' && analytics.revenue && (
          <div className="space-y-6">
            {/* Revenue Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={`${analytics.revenue.overview.totalRevenue} SOL`}
                icon={DollarSign}
              />
              <StatCard
                title="Sale Fee Revenue"
                value={`${analytics.revenue.overview.saleFeeRevenue} SOL`}
                icon={TrendingUp}
              />
              <StatCard
                title="Token Fee Revenue"
                value={`${analytics.revenue.overview.tokenFeeRevenue} SOL`}
                icon={PieChart}
              />
              <StatCard
                title="Total Transactions"
                value={analytics.revenue.overview.totalTransactions}
                icon={BarChart3}
              />
            </div>

            {/* Efficiency Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Fee Collection Efficiency"
                value={`${analytics.revenue.efficiency.feeCollectionEfficiency}%`}
              />
              <MetricCard
                title="Total Sales Volume"
                value={`${analytics.revenue.efficiency.totalSalesVolume} SOL`}
              />
              <MetricCard
                title="Revenue to Volume Ratio"
                value={`${(analytics.revenue.efficiency.revenueToVolumeRatio * 100).toFixed(2)}%`}
              />
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">By Type</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sale Fees</span>
                      <span className="text-sm font-medium">{analytics.revenue.breakdown.revenueByType.sale_fee} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Token Fees</span>
                      <span className="text-sm font-medium">{analytics.revenue.breakdown.revenueByType.token_fee} SOL</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span className="text-sm">Total</span>
                      <span className="text-sm">{analytics.revenue.breakdown.revenueByType.total} SOL</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Monthly Trends</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {analytics.revenue.breakdown.revenueByMonth?.slice(0, 6).map((month: any) => (
                      <div key={month.month} className="flex justify-between">
                        <span className="text-sm text-gray-600">{month.month}</span>
                        <span className="text-sm font-medium">{month.count} transactions</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
