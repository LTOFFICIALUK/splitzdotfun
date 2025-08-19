import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  change,
  changeType,
  className = '',
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-400';
      case 'negative':
        return 'text-red-400';
      case 'neutral':
        return 'text-text-secondary';
      default:
        return 'text-text-secondary';
    }
  };

  return (
    <div className={`bg-background-dark rounded-xl p-6 border border-background-elevated ${className}`}>
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-text-secondary text-sm">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
      </div>
      <p className={`text-sm font-medium ${getChangeColor()}`}>
        {change}
      </p>
    </div>
  );
};

export default StatCard;
