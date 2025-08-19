'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ArrowLeft, Book, FileText, Users, ShoppingCart, Trophy, Shield, HelpCircle, Settings } from 'lucide-react';

// Import all documentation content
import platformOverview from '@/docs/platform-overview.md';
import walletIntegration from '@/docs/WALLET_INTEGRATION.md';
import tokenLaunching from '@/docs/token-launching.md';
import royaltyManagement from '@/docs/royalty-management.md';
import marketplace from '@/docs/marketplace.md';
import leaderboard from '@/docs/leaderboard.md';
import communityNominations from '@/docs/community-nominations.md';
import security from '@/docs/security.md';
import faq from '@/docs/faq.md';
import support from '@/docs/support.md';

const DocPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Map slugs to documentation content and metadata
  const docMap: Record<string, { content: string; title: string; description: string; icon: React.ReactNode; category: string }> = {
    'platform-overview': {
      content: platformOverview,
      title: 'Platform Overview',
      description: 'Understanding the SplitzFun ecosystem and how all components work together',
      icon: <Book className="w-6 h-6" />,
      category: 'getting-started'
    },
    'WALLET_INTEGRATION': {
      content: walletIntegration,
      title: 'Wallet Integration',
      description: 'How to connect and use wallets with SplitzFun',
      icon: <Settings className="w-6 h-6" />,
      category: 'getting-started'
    },
    'token-launching': {
      content: tokenLaunching,
      title: 'Token Launching',
      description: 'Complete guide to launching tokens with royalty distribution',
      icon: <FileText className="w-6 h-6" />,
      category: 'core-features'
    },
    'royalty-management': {
      content: royaltyManagement,
      title: 'Royalty Management',
      description: 'How royalty distribution works and how to optimize it',
      icon: <Users className="w-6 h-6" />,
      category: 'core-features'
    },
    'marketplace': {
      content: marketplace,
      title: 'Marketplace',
      description: 'Buying and selling ownership rights in the marketplace',
      icon: <ShoppingCart className="w-6 h-6" />,
      category: 'marketplace'
    },
    'leaderboard': {
      content: leaderboard,
      title: 'Leaderboard System',
      description: 'How the ranking system works and how to improve your position',
      icon: <Trophy className="w-6 h-6" />,
      category: 'community'
    },
    'community-nominations': {
      content: communityNominations,
      title: 'Community Nominations',
      description: 'Suggesting new royalty earners and participating in governance',
      icon: <Users className="w-6 h-6" />,
      category: 'community'
    },
    'security': {
      content: security,
      title: 'Security Best Practices',
      description: 'Keeping your assets safe and secure',
      icon: <Shield className="w-6 h-6" />,
      category: 'advanced'
    },
    'faq': {
      content: faq,
      title: 'FAQ',
      description: 'Frequently asked questions and answers',
      icon: <HelpCircle className="w-6 h-6" />,
      category: 'troubleshooting'
    },
    'support': {
      content: support,
      title: 'Support',
      description: 'Getting help and contacting support',
      icon: <HelpCircle className="w-6 h-6" />,
      category: 'troubleshooting'
    }
  };

  const doc = docMap[slug];

  if (!doc) {
    return (
      <div className="min-h-screen bg-background-dark">
        <Header currentPath="/docs" />
        <main className="pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-text-primary mb-4">Documentation Not Found</h1>
              <p className="text-text-secondary mb-8">The documentation you're looking for doesn't exist.</p>
              <button
                onClick={() => router.push('/docs')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-mint/25 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Documentation
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <Header currentPath="/docs" />
      
      <main className="pt-16">
        {/* Documentation Header */}
        <section className="py-12 bg-gradient-to-br from-background-card to-background-elevated">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-6">
              <button
                onClick={() => router.push('/docs')}
                className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Documentation</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                {doc.icon}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-text-primary">{doc.title}</h1>
                <p className="text-text-secondary mt-2">{doc.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-text-secondary">Category:</span>
              <span className="px-3 py-1 bg-background-dark rounded-full text-sm font-medium text-primary-mint capitalize">
                {doc.category.replace('-', ' ')}
              </span>
            </div>
          </div>
        </section>

        {/* Documentation Content */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-background-card rounded-2xl border border-background-elevated p-8">
              <div className="prose prose-invert max-w-none">
                <div 
                  className="text-text-primary leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: doc.content }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <button
                onClick={() => router.push('/docs')}
                className="inline-flex items-center px-6 py-3 bg-background-elevated text-text-primary font-semibold rounded-xl hover:bg-background-card transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Documentation
              </button>
              
              <div className="text-center">
                <p className="text-text-secondary text-sm">Need help?</p>
                <button
                  onClick={() => router.push('/docs/support')}
                  className="text-primary-mint hover:text-primary-aqua transition-colors text-sm font-medium"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default DocPage;
