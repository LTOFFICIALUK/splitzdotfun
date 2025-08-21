import React from 'react';
import InfoCard from '../ui/InfoCard';
import { 
  Share2, 
  Users, 
  ShoppingCart, 
  Lightbulb 
} from 'lucide-react';

const ExplainerTiles: React.FC = () => {
  const explainerCards = [
    {
      icon: <Share2 className="w-6 h-6" />,
      title: 'Royalty Router',
      body: 'Route attention into royalties. Automatically distribute earnings to creators, influencers, and community members based.',
      action: {
        label: 'Learn more',
        onClick: () => alert('Royalty Router details coming soon!'),
      },
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Management Delegation',
      body: 'Assign metadata and royalty managers to trusted community members. Delegate control while maintaining ownership.',
      action: {
        label: 'Learn more',
        onClick: () => alert('Management Delegation details coming soon!'),
      },
    },
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: 'Ownership Marketplace',
      body: 'List, auction, or offer to buy token ownership. Trade creator rights like startup equity in a transparent marketplace.',
      action: {
        label: 'Learn more',
        onClick: () => alert('Ownership Marketplace details coming soon!'),
      },
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: 'Community Nominations',
      body: 'Holders suggest new royalty earners with evidence. Community-driven growth through transparent nominations.',
      action: {
        label: 'Learn more',
        onClick: () => alert('Community Nominations details coming soon!'),
      },
    },
  ];

  return (
    <section className="py-20 bg-background-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            How SplitzFun Works
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Four powerful features that transform how you launch, manage, and monetize tokens on Solana.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {explainerCards.map((card, index) => (
            <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <InfoCard {...card} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExplainerTiles;
