import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MarketplaceAnalytics from '@/components/ui/MarketplaceAnalytics';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPath="/analytics" />
      
      <main className="pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Comprehensive insights into marketplace performance, auctions, offers, and revenue
            </p>
          </div>

          {/* Analytics Dashboard */}
          <MarketplaceAnalytics className="mb-8" />

          {/* Additional Analytics Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Data Refresh</span>
                  <span className="text-sm font-medium text-gray-900">Real-time</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Time Range</span>
                  <span className="text-sm font-medium text-gray-900">Configurable</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Data Source</span>
                  <span className="text-sm font-medium text-gray-900">Live Database</span>
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h2>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Export Analytics Report
                </button>
                <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  Download CSV Data
                </button>
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Generate PDF Report
                </button>
              </div>
            </div>
          </div>

          {/* Information Section */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">About Analytics</h3>
            <p className="text-blue-800 text-sm">
              This analytics dashboard provides real-time insights into marketplace performance. 
              Data is updated automatically and includes comprehensive metrics for auctions, offers, 
              and revenue tracking. Use the time range selector to view data for different periods.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
