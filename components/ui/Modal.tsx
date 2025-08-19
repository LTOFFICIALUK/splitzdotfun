import React, { useEffect } from 'react';
import { ModalProps } from '@/types';
import { X } from 'lucide-react';

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="relative bg-background-card rounded-2xl border border-background-elevated shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header - only show if title is provided */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-background-elevated">
            <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-background-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-primary-mint"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className={title ? "p-6" : "p-6"}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
