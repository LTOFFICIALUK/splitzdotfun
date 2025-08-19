import React from 'react';
import Button from '../ui/Button';
import { Star, TrendingUp, Users, ArrowRight } from 'lucide-react';

const TokenSpotlight: React.FC = () => {
  const handleViewProfile = () => {
    alert('Token profile page coming soon!');
  };

  return (
    <section className="py-20 bg-background-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-background-card rounded-full px-4 py-2 mb-4">
            <Star className="w-4 h-4 text-primary-mint" />
            <span className="text-sm font-medium text-text-primary">Featured Token</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Token Spotlight
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Discover the most innovative and promising tokens on SplitzFun
          </p>
        </div>

        {/* Featured Token Card */}
        <div className="bg-gradient-to-br from-background-card to-background-elevated rounded-3xl border border-background-elevated overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Image Section */}
            <div className="relative h-64 lg:h-full bg-gradient-to-br from-primary-mint/20 to-primary-aqua/20 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-mint/10 to-primary-aqua/10"></div>
              <div className="relative z-10 text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                  <span className="text-background-dark font-bold text-2xl">F</span>
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">FROGZ</h3>
                <p className="text-text-secondary">The next big meme sensation</p>
              </div>
              
              {/* Floating Stats */}
              <div className="absolute top-4 right-4 bg-background-dark/80 backdrop-blur-sm rounded-xl p-3">
                <div className="text-center">
                  <p className="text-primary-mint font-bold text-lg">+45.2%</p>
                  <p className="text-text-secondary text-xs">24h</p>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-text-primary mb-4">
                  FROGZ: The Meme Revolution
                </h3>
                <p className="text-text-secondary text-lg leading-relaxed mb-6">
                  FROGZ has taken the Solana ecosystem by storm, becoming the fastest-growing meme token with innovative royalty distribution and community-driven features.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-mint mb-1">$8.5M</div>
                  <div className="text-text-secondary text-sm">Market Cap</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-aqua mb-1">12.4K</div>
                  <div className="text-text-secondary text-sm">Holders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-mint mb-1">$2.1M</div>
                  <div className="text-text-secondary text-sm">Volume 24h</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-aqua mb-1">3.42</div>
                  <div className="text-text-secondary text-sm">SOL Earned</div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-text-primary mb-3">Key Features</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-primary-mint"></div>
                    <span className="text-text-secondary">Automatic royalty distribution</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-primary-aqua"></div>
                    <span className="text-text-secondary">Community governance</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-primary-mint"></div>
                    <span className="text-text-secondary">Transparent ownership marketplace</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleViewProfile}
                className="w-full lg:w-auto flex items-center justify-center"
              >
                View token profile
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TokenSpotlight;
