'use client';

import React from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Award, 
  AlertCircle,
  TrendingUp,
  Users
} from 'lucide-react';

interface AuctionStatusProps {
  status: 'active' | 'ended' | 'sold' | 'cancelled';
  className?: string;
}

export default function AuctionStatus({ status, className = '' }: AuctionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          icon: TrendingUp,
          label: 'Active',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        };
      case 'sold':
        return {
          icon: Award,
          label: 'Sold',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200'
        };
      case 'ended':
        return {
          icon: Clock,
          label: 'Ended',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Cancelled',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: AlertCircle,
          label: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${config.bgColor} ${config.borderColor} ${className}`}>
      <IconComponent className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}
