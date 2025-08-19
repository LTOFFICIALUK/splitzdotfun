import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, CheckCircle, Zap } from 'lucide-react';

const HowItWorks: React.FC = () => {
  const [openStep, setOpenStep] = useState<number | null>(0);

  const steps = [
    {
      id: 1,
      title: 'Launch coin',
      description: 'Create your token using Bags API integration with automatic royalty routing',
      details: 'Launch your token with built-in royalty distribution. Every transaction automatically routes a percentage to creators, influencers, and community members based on your configuration.',
      status: 'available',
    },
    {
      id: 2,
      title: 'Configure splits',
      description: 'Set up royalty distribution to creators, influencers, and community members',
      details: 'Configure how royalties are distributed among your ecosystem. Assign percentages to different stakeholders and set up automatic payments based on engagement metrics.',
      status: 'coming-soon',
    },
    {
      id: 3,
      title: 'Delegate management',
      description: 'Assign metadata and royalty managers to trusted community members',
      details: 'Delegate control of your token to trusted community members while maintaining ownership. Give them the ability to manage metadata, royalties, and other aspects of your token.',
      status: 'coming-soon',
    },
    {
      id: 4,
      title: 'List ownership',
      description: 'List your token ownership for sale or auction in the marketplace',
      details: 'Sell or auction your token ownership rights in our transparent marketplace. Set your own terms and let the community bid on your creator rights.',
      status: 'coming-soon',
    },
    {
      id: 5,
      title: 'Community nominations',
      description: 'Holders suggest new royalty earners with evidence and voting',
      details: 'Let your community drive growth by nominating new royalty earners. Holders can suggest influencers or creators with evidence, and the community votes on proposals.',
      status: 'coming-soon',
    },
  ];

  const toggleStep = (stepId: number) => {
    setOpenStep(openStep === stepId ? null : stepId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'coming-soon':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Zap className="w-5 h-5 text-primary-mint" />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'coming-soon') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
          Coming Soon
        </span>
      );
    }
    return null;
  };

  return (
    <section className="py-20 bg-background-dark" id="how-it-works">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            How It Works
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Five simple steps to launch, manage, and monetize your token like a startup
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className="bg-background-card rounded-2xl border border-background-elevated overflow-hidden"
            >
              {/* Step Header */}
              <button
                className="w-full p-6 text-left flex items-center justify-between hover:bg-background-elevated transition-colors"
                onClick={() => toggleStep(step.id)}
                aria-expanded={openStep === step.id}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
                    <span className="text-background-dark font-bold text-lg">{step.id}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">{step.title}</h3>
                      <p className="text-text-secondary">{step.description}</p>
                    </div>
                    {getStatusIcon(step.status)}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {getStatusBadge(step.status)}
                  {openStep === step.id ? (
                    <ChevronDown className="w-5 h-5 text-text-secondary" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-text-secondary" />
                  )}
                </div>
              </button>

              {/* Step Details */}
              {openStep === step.id && (
                <div className="px-6 pb-6 border-t border-background-elevated">
                  <div className="pt-6">
                    <p className="text-text-secondary leading-relaxed mb-4">
                      {step.details}
                    </p>
                    
                    {step.status === 'coming-soon' && (
                      <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Clock className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-yellow-400 font-medium mb-1">Coming Soon</p>
                            <p className="text-text-secondary text-sm">
                              This feature is currently in development. We're working hard to bring you the best possible experience.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <div className="bg-background-card rounded-2xl border border-background-elevated p-8">
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              Ready to get started?
            </h3>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              Launch your first token and start building your community-driven ecosystem today.
            </p>
            <button
              onClick={() => alert('Create coin modal coming soon!')}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-mint/25 transition-all duration-200"
            >
              Create your first coin
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
