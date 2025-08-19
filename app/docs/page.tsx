'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Book, FileText, Users, ShoppingCart, Trophy, Shield, HelpCircle, Settings, ArrowRight, ExternalLink } from 'lucide-react';

interface DocSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  category: 'getting-started' | 'core-features' | 'marketplace' | 'community' | 'advanced' | 'troubleshooting';
}

const DocsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const docSections: DocSection[] = [
    // Getting Started
    {
      title: 'Platform Overview',
      description: 'Understanding the SplitzFun ecosystem and how all components work together',
      icon: <Book className="w-6 h-6" />,
      link: '/docs/platform-overview',
      category: 'getting-started'
    },
    {
      title: 'Wallet Integration',
      description: 'How to connect and use wallets with SplitzFun',
      icon: <Settings className="w-6 h-6" />,
      link: '/docs/WALLET_INTEGRATION',
      category: 'getting-started'
    },
    {
      title: 'Creating Your First Token',
      description: 'Step-by-step guide to launching your first token',
      icon: <FileText className="w-6 h-6" />,
      link: '/docs/token-creation',
      category: 'getting-started'
    },

    // Core Features
    {
      title: 'Token Launching',
      description: 'Complete guide to launching tokens with royalty distribution',
      icon: <FileText className="w-6 h-6" />,
      link: '/docs/token-launching',
      category: 'core-features'
    },
    {
      title: 'Royalty Management',
      description: 'How royalty distribution works and how to optimize it',
      icon: <Users className="w-6 h-6" />,
      link: '/docs/royalty-management',
      category: 'core-features'
    },
    {
      title: 'Fee Sharing System',
      description: 'Understanding the fee structure and economic model',
      icon: <Settings className="w-6 h-6" />,
      link: '/docs/fee-sharing',
      category: 'core-features'
    },
    {
      title: 'Ownership Transfer',
      description: 'How ownership rights work and are transferred',
      icon: <FileText className="w-6 h-6" />,
      link: '/docs/ownership-transfer',
      category: 'core-features'
    },

    // Marketplace
    {
      title: 'Marketplace Overview',
      description: 'Buying and selling ownership rights in the marketplace',
      icon: <ShoppingCart className="w-6 h-6" />,
      link: '/docs/marketplace',
      category: 'marketplace'
    },
    {
      title: 'Listing Your Token',
      description: 'How to list ownership for sale in the marketplace',
      icon: <FileText className="w-6 h-6" />,
      link: '/docs/listing-tokens',
      category: 'marketplace'
    },
    {
      title: 'Auction System',
      description: 'Participating in ownership auctions',
      icon: <Trophy className="w-6 h-6" />,
      link: '/docs/auctions',
      category: 'marketplace'
    },
    {
      title: 'Trading Guidelines',
      description: 'Best practices for marketplace trading',
      icon: <FileText className="w-6 h-6" />,
      link: '/docs/trading-guidelines',
      category: 'marketplace'
    },

    // Community Features
    {
      title: 'Leaderboard System',
      description: 'How the ranking system works and how to improve your position',
      icon: <Trophy className="w-6 h-6" />,
      link: '/docs/leaderboard',
      category: 'community'
    },
    {
      title: 'Community Nominations',
      description: 'Suggesting new royalty earners and participating in governance',
      icon: <Users className="w-6 h-6" />,
      link: '/docs/community-nominations',
      category: 'community'
    },
    {
      title: 'Voting Mechanisms',
      description: 'How community voting works and governance processes',
      icon: <Users className="w-6 h-6" />,
      link: '/docs/voting',
      category: 'community'
    },
    {
      title: 'Rewards System',
      description: 'Understanding earnings and incentives',
      icon: <Trophy className="w-6 h-6" />,
      link: '/docs/rewards',
      category: 'community'
    },

    // Advanced Topics
    {
      title: 'Delegation Management',
      description: 'Managing token metadata and royalties',
      icon: <Settings className="w-6 h-6" />,
      link: '/docs/delegation',
      category: 'advanced'
    },
    {
      title: 'Security Best Practices',
      description: 'Keeping your assets safe and secure',
      icon: <Shield className="w-6 h-6" />,
      link: '/docs/security',
      category: 'advanced'
    },
    {
      title: 'API Integration',
      description: 'Technical integration guide for developers',
      icon: <FileText className="w-6 h-6" />,
      link: '/docs/api-integration',
      category: 'advanced'
    },
    {
      title: 'Smart Contract Details',
      description: 'Technical implementation details and architecture',
      icon: <FileText className="w-6 h-6" />,
      link: '/docs/smart-contracts',
      category: 'advanced'
    },

    // Troubleshooting
    {
      title: 'Common Issues',
      description: 'Solutions to frequent problems and issues',
      icon: <HelpCircle className="w-6 h-6" />,
      link: '/docs/troubleshooting',
      category: 'troubleshooting'
    },
    {
      title: 'FAQ',
      description: 'Frequently asked questions and answers',
      icon: <HelpCircle className="w-6 h-6" />,
      link: '/docs/faq',
      category: 'troubleshooting'
    },
    {
      title: 'Support',
      description: 'Getting help and contacting support',
      icon: <HelpCircle className="w-6 h-6" />,
      link: '/docs/support',
      category: 'troubleshooting'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Documentation', count: docSections.length },
    { id: 'getting-started', name: 'Getting Started', count: docSections.filter(d => d.category === 'getting-started').length },
    { id: 'core-features', name: 'Core Features', count: docSections.filter(d => d.category === 'core-features').length },
    { id: 'marketplace', name: 'Marketplace', count: docSections.filter(d => d.category === 'marketplace').length },
    { id: 'community', name: 'Community Features', count: docSections.filter(d => d.category === 'community').length },
    { id: 'advanced', name: 'Advanced Topics', count: docSections.filter(d => d.category === 'advanced').length },
    { id: 'troubleshooting', name: 'Troubleshooting', count: docSections.filter(d => d.category === 'troubleshooting').length }
  ];

  const filteredDocs = activeCategory === 'all' 
    ? docSections 
    : docSections.filter(doc => doc.category === activeCategory);

  const handleDocClick = (link: string) => {
    // Extract the slug from the link
    const slug = link.replace('/docs/', '');
    window.location.href = `/docs/${slug}`;
  };

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <Header currentPath="/docs" />

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-background-card to-background-elevated">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-background-dark rounded-full px-4 py-2 mb-4">
                <Book className="w-5 h-5 text-primary-mint" />
                <span className="text-sm font-medium text-text-primary">Documentation</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                SplitzFun Documentation
              </h1>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                Everything you need to know about launching tokens, managing royalties, trading ownership, and building community on SplitzFun.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-background-dark rounded-xl p-6 border border-background-elevated text-center">
                <div className="text-2xl font-bold text-primary-mint mb-2">22</div>
                <div className="text-text-secondary text-sm">Documentation Guides</div>
              </div>
              <div className="bg-background-dark rounded-xl p-6 border border-background-elevated text-center">
                <div className="text-2xl font-bold text-primary-aqua mb-2">7</div>
                <div className="text-text-secondary text-sm">Categories</div>
              </div>
              <div className="bg-background-dark rounded-xl p-6 border border-background-elevated text-center">
                <div className="text-2xl font-bold text-primary-mint mb-2">24/7</div>
                <div className="text-text-secondary text-sm">Community Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Content */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Category Filter */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeCategory === category.id
                        ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark'
                        : 'bg-background-card text-text-secondary hover:text-text-primary border border-background-elevated'
                    }`}
                  >
                    {category.name} ({category.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Documentation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocs.map((doc, index) => (
                <div
                  key={index}
                  className="bg-background-card rounded-xl border border-background-elevated p-6 hover:border-primary-mint transition-all duration-200 cursor-pointer group"
                  onClick={() => handleDocClick(doc.link)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      {doc.icon}
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-secondary group-hover:text-primary-mint transition-colors" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-primary-mint transition-colors">
                    {doc.title}
                  </h3>
                  
                  <p className="text-text-secondary text-sm leading-relaxed mb-4">
                    {doc.description}
                  </p>
                  
                  <div className="flex items-center text-xs text-text-secondary">
                    <span className="capitalize bg-background-elevated px-2 py-1 rounded">
                      {doc.category.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Call to Action */}
            <div className="mt-12 text-center">
              <div className="bg-background-card rounded-2xl border border-background-elevated p-8">
                <h3 className="text-2xl font-bold text-text-primary mb-4">
                  Need Help?
                </h3>
                <p className="text-text-secondary mb-6 max-w-md mx-auto">
                  Can't find what you're looking for? Our community is here to help you succeed on SplitzFun.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => window.open('https://discord.gg/splitzfun', '_blank')}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-mint/25 transition-all duration-200"
                  >
                    Join Discord
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </button>
                  <button
                    onClick={() => window.open('mailto:support@splitz.fun', '_blank')}
                    className="inline-flex items-center px-6 py-3 bg-background-elevated text-text-primary font-semibold rounded-xl hover:bg-background-dark transition-all duration-200"
                  >
                    Contact Support
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default DocsPage;
