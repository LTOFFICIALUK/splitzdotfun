'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import ExplainerTiles from '@/components/sections/ExplainerTiles';
import TrendingTokens from '@/components/sections/TrendingTokens';
import LeaderboardStrip from '@/components/sections/LeaderboardStrip';
import HowItWorks from '@/components/sections/HowItWorks';

export default function Home() {
  const handleHowItWorks = () => {
    // Smooth scroll to the how it works section
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <Header currentPath="/" />

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section */}
        <Hero
          headline="Clout → Cash. Launch, manage, and flip tokens like startups."
          subhead="Royalties route through Splitz and get redistributed transparently. Ownership is tradable. Social handles earn."
          onPrimaryCTA={() => window.location.href = '/create'}
          onSecondaryCTA={handleHowItWorks}
        />

        {/* Explainer Tiles */}
        <ExplainerTiles />

        {/* Trending Tokens */}
        <TrendingTokens />

        {/* Leaderboard Strip */}
        <LeaderboardStrip />

        {/* How It Works */}
        <HowItWorks />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
