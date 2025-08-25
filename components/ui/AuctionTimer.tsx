'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface AuctionTimerProps {
  endTime: string;
  isActive: boolean;
  onTimeUp?: () => void;
  className?: string;
}

export default function AuctionTimer({ endTime, isActive, onTimeUp, className = '' }: AuctionTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
        if (onTimeUp) {
          onTimeUp();
        }
        return;
      }

      setTimeLeft(difference);
      setIsExpired(false);
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime, onTimeUp]);

  const formatTime = (milliseconds: number) => {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  const { days, hours, minutes, seconds } = formatTime(timeLeft);

  const getTimerColor = () => {
    if (isExpired) return 'text-red-600';
    if (timeLeft < 60000) return 'text-red-500'; // Less than 1 minute
    if (timeLeft < 300000) return 'text-orange-500'; // Less than 5 minutes
    if (timeLeft < 3600000) return 'text-yellow-600'; // Less than 1 hour
    return 'text-blue-600';
  };

  const getTimerBgColor = () => {
    if (isExpired) return 'bg-red-50 border-red-200';
    if (timeLeft < 60000) return 'bg-red-50 border-red-200';
    if (timeLeft < 300000) return 'bg-orange-50 border-orange-200';
    if (timeLeft < 3600000) return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

  if (isExpired) {
    return (
      <div className={`p-4 border rounded-lg ${getTimerBgColor()} ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <Clock className="w-5 h-5 text-red-600" />
          <span className="text-lg font-semibold text-red-600">Auction Ended</span>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className={`p-4 border rounded-lg bg-gray-50 border-gray-200 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <span className="text-lg font-semibold text-gray-600">Auction Inactive</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg ${getTimerBgColor()} ${className}`}>
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Clock className="w-5 h-5" />
          <span className="text-sm font-medium">Time Remaining</span>
          {timeLeft < 300000 && (
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          )}
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {days > 0 && (
            <div className="text-center">
              <div className={`text-2xl font-bold ${getTimerColor()}`}>{days}</div>
              <div className="text-xs text-gray-600">Days</div>
            </div>
          )}
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getTimerColor()}`}>
              {hours.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-600">Hours</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getTimerColor()}`}>
              {minutes.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-600">Minutes</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getTimerColor()}`}>
              {seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-600">Seconds</div>
          </div>
        </div>

        {timeLeft < 300000 && (
          <div className="mt-2 text-sm text-orange-600 font-medium">
            ⚠️ Auction ending soon!
          </div>
        )}
      </div>
    </div>
  );
}
