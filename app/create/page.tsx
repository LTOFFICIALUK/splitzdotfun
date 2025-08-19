'use client';

import React, { useState } from 'react';
import { ArrowLeft, Upload, X, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useWallet } from '@/components/ui/WalletProvider';

interface RoyaltyRecipient {
  id: string;
  type: 'wallet' | 'social';
  identifier: string;
  percentage: number;
  label: string;
}

const CreateCoin: React.FC = () => {
  const { isConnected, publicKey } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    twitterUrl: '',
    imageUrl: '',
    bannerUrl: '',
    initialBuyAmount: '0.01'
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [royaltyRecipients, setRoyaltyRecipients] = useState<RoyaltyRecipient[]>([
    {
      id: '1',
      type: 'wallet',
      identifier: publicKey || '',
      percentage: 100,
      label: 'You (Creator)'
    }
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({
          ...prev,
          imageUrl: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setBannerPreview(result);
        setFormData(prev => ({
          ...prev,
          bannerUrl: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      imageUrl: ''
    }));
  };

  const removeBanner = () => {
    setBannerPreview(null);
    setFormData(prev => ({
      ...prev,
      bannerUrl: ''
    }));
  };

  const addRoyaltyRecipient = () => {
    const newRecipient: RoyaltyRecipient = {
      id: Date.now().toString(),
      type: 'wallet',
      identifier: '',
      percentage: 0,
      label: ''
    };
    setRoyaltyRecipients(prev => [...prev, newRecipient]);
  };

  const removeRoyaltyRecipient = (id: string) => {
    setRoyaltyRecipients(prev => {
      const filtered = prev.filter(recipient => recipient.id !== id);
      
      // If we removed a recipient and the total is now less than 100%, 
      // automatically add the remaining percentage to the creator (first recipient)
      if (filtered.length > 0) {
        const total = filtered.reduce((sum, recipient) => sum + recipient.percentage, 0);
        if (total < 100) {
          const remaining = 100 - total;
          filtered[0].percentage += remaining;
        }
      }
      
      return filtered;
    });
  };

  const updateRoyaltyRecipient = (id: string, field: keyof RoyaltyRecipient, value: string | number) => {
    if (field === 'percentage') {
      const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
      
      // Calculate what the total would be if we update this recipient
      const currentTotal = getTotalPercentage();
      const currentRecipientPercentage = royaltyRecipients.find(r => r.id === id)?.percentage || 0;
      const newTotal = currentTotal - currentRecipientPercentage + numValue;
      
      // If the new total would exceed 100%, don't allow the update
      if (newTotal > 100) {
        return;
      }
      
      // Ensure the percentage is within valid bounds
      const clampedValue = Math.max(0, Math.min(100, numValue));
      
      setRoyaltyRecipients(prev => prev.map(recipient => 
        recipient.id === id ? { ...recipient, [field]: clampedValue } : recipient
      ));
    } else {
      setRoyaltyRecipients(prev => prev.map(recipient => 
        recipient.id === id ? { ...recipient, [field]: value } : recipient
      ));
    }
  };

  const getTotalPercentage = () => {
    return royaltyRecipients.reduce((total, recipient) => total + recipient.percentage, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      alert('Token creation coming soon! This will integrate with the Bags API.');
      setIsSubmitting(false);
    }, 2000);
  };

  const isFormValid = formData.name && 
    formData.symbol && 
    formData.description && 
    formData.imageUrl && 
    getTotalPercentage() <= 100;

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <Header currentPath="/create" />

      {/* Main Content */}
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              Create Your Token
            </h1>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Launch your Solana token with automatic royalty routing, management delegation, and ownership marketplace features.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Token Image */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Token Image</h3>
              
              {!imagePreview ? (
                <div className="border-2 border-dashed border-background-elevated rounded-lg p-8 text-center hover:border-primary-mint transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-primary font-medium mb-2">Upload Token Image</p>
                    <p className="text-text-secondary text-sm mb-2">PNG, JPG, or GIF up to 5MB</p>
                    <p className="text-text-secondary text-xs">Recommended: 512x512 pixels, square format</p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Token preview"
                    className="w-32 h-32 rounded-lg object-cover mx-auto"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Token Banner */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Token Banner</h3>
              
              {!bannerPreview ? (
                <div className="border-2 border-dashed border-background-elevated rounded-lg p-8 text-center hover:border-primary-mint transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                    id="banner-upload"
                  />
                  <label htmlFor="banner-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-primary font-medium mb-2">Upload Token Banner</p>
                    <p className="text-text-secondary text-sm mb-2">PNG, JPG, or GIF up to 5MB</p>
                    <p className="text-text-secondary text-xs">Recommended: 1500x500 pixels, landscape format</p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-32 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeBanner}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Token Details */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Token Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Token Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
                    Token Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., My Awesome Token"
                    className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent"
                    required
                  />
                </div>

                {/* Token Symbol */}
                <div>
                  <label htmlFor="symbol" className="block text-sm font-medium text-text-primary mb-2">
                    Token Symbol *
                  </label>
                  <input
                    type="text"
                    id="symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleInputChange}
                    placeholder="e.g., MAT"
                    maxLength={10}
                    className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent uppercase"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your token, its purpose, and what makes it unique..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent resize-none"
                  required
                />
              </div>
            </div>

            {/* Royalties */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Royalties</h3>
                <button
                  type="button"
                  onClick={addRoyaltyRecipient}
                  className="flex items-center space-x-2 px-3 py-1 bg-background-elevated text-text-primary rounded-lg hover:bg-background-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Recipient</span>
                </button>
              </div>
              
              <p className="text-text-secondary text-sm mb-6">
                Configure how royalties are distributed when your token is traded. You can keep 100% or share with other creators, influencers, or community members.
              </p>
              
              {/* Total Percentage Display */}
              <div className="flex items-center justify-between mb-4 p-3 bg-background-dark rounded-lg border border-background-elevated">
                <span className="text-sm font-medium text-text-primary">Total Distribution:</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-bold ${
                    getTotalPercentage() > 100 
                      ? 'text-red-400' 
                      : getTotalPercentage() === 100 
                        ? 'text-primary-mint' 
                        : 'text-text-secondary'
                  }`}>
                    {getTotalPercentage()}%
                  </span>
                  {getTotalPercentage() > 100 && (
                    <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                      Exceeds 100%
                    </span>
                  )}
                  {getTotalPercentage() === 100 && (
                    <span className="text-xs text-primary-mint bg-primary-mint/10 px-2 py-1 rounded">
                      Perfect!
                    </span>
                  )}
                  {getTotalPercentage() < 100 && (
                    <span className="text-xs text-text-secondary bg-background-elevated px-2 py-1 rounded">
                      {100 - getTotalPercentage()}% remaining
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {royaltyRecipients.map((recipient, index) => (
                  <div key={recipient.id} className="bg-background-dark rounded-lg p-4 border border-background-elevated">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-text-primary">
                          {index === 0 ? 'You (Creator)' : `Recipient ${index + 1}`}
                        </span>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeRoyaltyRecipient(recipient.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <span className="text-sm font-medium text-primary-mint">
                        {recipient.percentage}%
                      </span>
                    </div>
                    
                    {index > 0 && (
                      <div className="mb-3">
                        <select
                          value={recipient.type}
                          onChange={(e) => updateRoyaltyRecipient(recipient.id, 'type', e.target.value as 'wallet' | 'social')}
                          className="w-full px-3 py-2 pr-8 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-mint appearance-none bg-no-repeat bg-right"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1.5em 1.5em'
                          }}
                        >
                          <option value="wallet">Wallet Address</option>
                          <option value="social">Social Handle</option>
                        </select>
                      </div>
                    )}
                    
                    {index > 0 && (
                      <div className="mb-3">
                        <input
                          type="text"
                          value={recipient.identifier}
                          onChange={(e) => updateRoyaltyRecipient(recipient.id, 'identifier', e.target.value)}
                          placeholder={recipient.type === 'wallet' ? 'Enter wallet address' : 'Enter social handle (e.g., @username)'}
                          className="w-full px-3 py-2 bg-background-elevated border border-background-elevated rounded-lg text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min="0"
                        max={100 - (getTotalPercentage() - recipient.percentage)}
                        value={recipient.percentage}
                        onChange={(e) => updateRoyaltyRecipient(recipient.id, 'percentage', parseInt(e.target.value))}
                        className="flex-1 h-2 bg-background-elevated rounded-lg appearance-none cursor-pointer slider focus:outline-none focus:ring-0"
                        style={{
                          background: 'var(--background-elevated)',
                          outline: 'none'
                        }}
                      />
                      <input
                        type="number"
                        min="0"
                        max={100 - (getTotalPercentage() - recipient.percentage)}
                        value={recipient.percentage}
                        onChange={(e) => updateRoyaltyRecipient(recipient.id, 'percentage', parseInt(e.target.value) || 0)}
                        className={`w-16 px-2 py-1 bg-background-elevated border border-background-elevated rounded text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-mint ${
                          recipient.percentage >= (100 - (getTotalPercentage() - recipient.percentage))
                            ? 'border-primary-mint'
                            : ''
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              

            </div>

            {/* Social Links */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Social Links</h3>
              
              <div>
                <label htmlFor="twitterUrl" className="block text-sm font-medium text-text-primary mb-2">
                  Twitter/X URL
                </label>
                <input
                  type="url"
                  id="twitterUrl"
                  name="twitterUrl"
                  value={formData.twitterUrl}
                  onChange={handleInputChange}
                  placeholder="https://x.com/yourproject"
                  className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent"
                />
              </div>
            </div>

            {/* Initial Buy */}
            <div className="bg-background-card rounded-lg p-6 border border-background-elevated">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Initial Buy</h3>
              
              <div>
                <label htmlFor="initialBuyAmount" className="block text-sm font-medium text-text-primary mb-2">
                  Initial Buy Amount (SOL)
                </label>
                <input
                  type="number"
                  id="initialBuyAmount"
                  name="initialBuyAmount"
                  value={formData.initialBuyAmount}
                  onChange={handleInputChange}
                  placeholder="0.01"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 bg-background-dark border border-background-elevated rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-mint focus:border-transparent"
                />
                <p className="text-xs text-text-secondary mt-2">
                  Amount of SOL to use for the initial token purchase
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Make sure you have at least 0.05 SOL spare in your wallet to account for deployment fees.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting || !isConnected}
                className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-mint ${
                  isFormValid && !isSubmitting && isConnected
                    ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark hover:opacity-90'
                    : 'bg-background-elevated text-text-secondary cursor-not-allowed'
                }`}
              >
                {!isConnected 
                  ? 'Connect Wallet' 
                  : isSubmitting 
                    ? 'Creating Token...' 
                    : 'Launch Token'
                }
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default CreateCoin;
