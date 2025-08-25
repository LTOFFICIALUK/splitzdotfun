import MarketplaceAnalytics from '@/components/ui/MarketplaceAnalytics';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function AdminAnalyticsPage() {
  return (
    <div className="min-h-screen bg-background-dark text-text-primary">
      <Header currentPath="/admin/analytics" />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-mint to-primary-aqua bg-clip-text text-transparent">
            Admin Analytics
          </h1>
          <p className="text-text-secondary mt-2">
            Comprehensive marketplace analytics and reporting dashboard
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-background-card rounded-xl p-6 border border-background-elevated">
            <h3 className="text-text-secondary text-sm font-medium">Total Revenue</h3>
            <p className="text-2xl font-bold text-primary-mint mt-2">$0.00</p>
          </div>
          <div className="bg-background-card rounded-xl p-6 border border-background-elevated">
            <h3 className="text-text-secondary text-sm font-medium">Active Auctions</h3>
            <p className="text-2xl font-bold text-primary-aqua mt-2">0</p>
          </div>
          <div className="bg-background-card rounded-xl p-6 border border-background-elevated">
            <h3 className="text-text-secondary text-sm font-medium">Total Sales</h3>
            <p className="text-2xl font-bold text-primary-mint mt-2">0</p>
          </div>
          <div className="bg-background-card rounded-xl p-6 border border-background-elevated">
            <h3 className="text-text-secondary text-sm font-medium">Platform Fees</h3>
            <p className="text-2xl font-bold text-primary-aqua mt-2">$0.00</p>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="bg-background-card rounded-xl border border-background-elevated overflow-hidden">
          <MarketplaceAnalytics />
        </div>

        {/* Export Options */}
        <div className="mt-8 bg-background-card rounded-xl p-6 border border-background-elevated">
          <h3 className="text-xl font-semibold text-text-primary mb-4">Export Options</h3>
          <div className="flex flex-wrap gap-4">
            <button className="px-4 py-2 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark rounded-xl font-medium hover:shadow-lg hover:shadow-primary-mint/25 transition-all duration-200">
              Export CSV
            </button>
            <button className="px-4 py-2 bg-background-elevated text-text-primary border border-background-elevated rounded-xl font-medium hover:bg-background-card hover:border-primary-mint/30 transition-all duration-200">
              Export PDF
            </button>
            <button className="px-4 py-2 bg-background-elevated text-text-primary border border-background-elevated rounded-xl font-medium hover:bg-background-card hover:border-primary-mint/30 transition-all duration-200">
              Schedule Report
            </button>
          </div>
        </div>

        {/* Information */}
        <div className="mt-8 bg-background-card rounded-xl p-6 border border-background-elevated">
          <h3 className="text-xl font-semibold text-text-primary mb-4">Analytics Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-text-secondary">
            <div>
              <h4 className="font-medium text-text-primary mb-2">Data Sources</h4>
              <ul className="space-y-1 text-sm">
                <li>• Marketplace sales and auctions</li>
                <li>• Platform fee collections</li>
                <li>• Token fee periods</li>
                <li>• User activity and engagement</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-text-primary mb-2">Update Frequency</h4>
              <ul className="space-y-1 text-sm">
                <li>• Real-time transaction data</li>
                <li>• Hourly aggregated metrics</li>
                <li>• Daily summary reports</li>
                <li>• Weekly trend analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
