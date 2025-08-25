'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X,
  TrendingUp,
  MessageSquare,
  Award,
  DollarSign,
  Calendar
} from 'lucide-react';

interface ToastNotificationProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
  data?: any;
}

export default function ToastNotification({ 
  id, 
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose,
  data 
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, 300); // Animation duration
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 w-96 max-w-sm transform transition-all duration-300 ease-in-out ${
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      } z-50`}
    >
      <div className={`rounded-lg border p-4 shadow-lg ${getBackgroundColor()}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className={`text-sm font-medium ${getTextColor()}`}>
                  {title}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {message}
                </p>
                
                {/* Additional data display */}
                {data && (
                  <div className="mt-2 text-xs text-gray-500">
                    {data.amount && (
                      <p>Amount: {data.amount} SOL</p>
                    )}
                    {data.tokenName && (
                      <p>Token: {data.tokenName}</p>
                    )}
                    {data.bidderUsername && (
                      <p>Bidder: {data.bidderUsername}</p>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleClose}
                className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast Manager Component
interface ToastManagerProps {
  children: React.ReactNode;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  data?: any;
}

export function ToastManager({ children }: ToastManagerProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Expose addToast function globally
  useEffect(() => {
    (window as any).showToast = addToast;
    return () => {
      delete (window as any).showToast;
    };
  }, []);

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </div>
    </>
  );
}

// Utility functions for different notification types
export const showNotification = {
  success: (title: string, message: string, data?: any) => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({ type: 'success', title, message, data });
    }
  },
  
  error: (title: string, message: string, data?: any) => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({ type: 'error', title, message, data });
    }
  },
  
  info: (title: string, message: string, data?: any) => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({ type: 'info', title, message, data });
    }
  },
  
  warning: (title: string, message: string, data?: any) => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({ type: 'warning', title, message, data });
    }
  },

  // Auction-specific notifications
  newBid: (tokenName: string, bidAmount: number, bidderUsername: string) => {
    showNotification.info(
      'New Bid Received',
      `${bidderUsername} placed a bid of ${bidAmount} SOL on ${tokenName}`,
      { tokenName, amount: bidAmount, bidderUsername }
    );
  },

  outbid: (tokenName: string, bidAmount: number) => {
    showNotification.warning(
      'You\'ve Been Outbid',
      `Someone outbid you on ${tokenName} with ${bidAmount} SOL`,
      { tokenName, amount: bidAmount }
    );
  },

  auctionWon: (tokenName: string, winningBid: number) => {
    showNotification.success(
      'Auction Won!',
      `Congratulations! You won the ${tokenName} auction for ${winningBid} SOL`,
      { tokenName, amount: winningBid }
    );
  },

  auctionEnded: (tokenName: string, winningBid: number, winnerUsername: string) => {
    showNotification.info(
      'Auction Ended',
      `${tokenName} auction ended. ${winnerUsername} won with ${winningBid} SOL`,
      { tokenName, amount: winningBid, winnerUsername }
    );
  },

  // Offer-specific notifications
  newOffer: (tokenName: string, offerAmount: number, buyerUsername: string) => {
    showNotification.info(
      'New Offer Received',
      `${buyerUsername} made an offer of ${offerAmount} SOL on ${tokenName}`,
      { tokenName, amount: offerAmount, buyerUsername }
    );
  },

  offerAccepted: (tokenName: string, offerAmount: number) => {
    showNotification.success(
      'Offer Accepted!',
      `Your offer of ${offerAmount} SOL on ${tokenName} was accepted`,
      { tokenName, amount: offerAmount }
    );
  },

  offerRejected: (tokenName: string, offerAmount: number) => {
    showNotification.error(
      'Offer Rejected',
      `Your offer of ${offerAmount} SOL on ${tokenName} was rejected`,
      { tokenName, amount: offerAmount }
    );
  },

  counterOffer: (tokenName: string, counterAmount: number) => {
    showNotification.info(
      'Counter Offer Received',
      `Seller countered your offer on ${tokenName} with ${counterAmount} SOL`,
      { tokenName, amount: counterAmount }
    );
  },

  // Revenue notifications
  feeCollected: (amount: number, type: string) => {
    showNotification.success(
      'Fee Collected',
      `Platform fee of ${amount} SOL collected from ${type}`,
      { amount, type }
    );
  },

  feePeriodStarted: (tokenName: string) => {
    showNotification.info(
      'Fee Period Started',
      `7-day fee collection period started for ${tokenName}`,
      { tokenName }
    );
  },

  feePeriodCompleted: (tokenName: string, totalCollected: number) => {
    showNotification.success(
      'Fee Period Completed',
      `Fee collection period completed for ${tokenName}. Total collected: ${totalCollected} SOL`,
      { tokenName, amount: totalCollected }
    );
  }
};
