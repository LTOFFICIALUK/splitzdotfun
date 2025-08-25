import React from 'react';
import Link from 'next/link';
import { Shield, BarChart3, Settings, TrendingUp } from 'lucide-react';

const AdminNav: React.FC = () => {
  return (
    <nav className="bg-background-card border-b border-background-elevated">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2 py-4">
            <Shield className="w-6 h-6 text-primary-mint" />
            <span className="text-lg font-semibold text-text-primary">Admin</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link 
              href="/admin/analytics"
              className="flex items-center space-x-2 py-4 text-text-secondary hover:text-text-primary transition-colors border-b-2 border-transparent hover:border-primary-mint"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Analytics</span>
            </Link>
            
            <Link 
              href="/admin/reconciliation"
              className="flex items-center space-x-2 py-4 text-text-secondary hover:text-text-primary transition-colors border-b-2 border-transparent hover:border-primary-mint"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reconciliation</span>
            </Link>
            
            <Link 
              href="/admin/settings"
              className="flex items-center space-x-2 py-4 text-text-secondary hover:text-text-primary transition-colors border-b-2 border-transparent hover:border-primary-mint"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNav;
