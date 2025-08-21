import React from 'react';
import { InfoCardProps } from '@/types';
import Button from './Button';

const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  title,
  body,
  action,
}) => {
  return (
    <div className="bg-background-dark rounded-2xl border border-background-elevated p-6 hover:border-primary-mint/30 transition-all duration-200 group">
      <div className="flex flex-col h-full">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-mint to-primary-aqua flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
          <div className="text-background-dark text-xl">
            {icon}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">{body}</p>
        </div>
        
        {/* Action */}
        <Button
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          className="self-start text-primary-mint hover:text-primary-aqua"
        >
          {action.label}
        </Button>
      </div>
    </div>
  );
};

export default InfoCard;
