import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

interface AutoSaveIndicatorProps {
  status: 'saving' | 'saved' | 'error' | 'idle';
  className?: string;
}

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ status, className = '' }) => {
  if (status === 'idle') return null;

  const getIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case 'saved':
        return <Check className="w-3 h-3" />;
      case 'error':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getText = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return '';
    }
  };

  const getColor = () => {
    switch (status) {
      case 'saving':
        return 'text-blue-300 bg-blue-500/20 border-blue-500/30';
      case 'saved':
        return 'text-green-300 bg-green-500/20 border-green-500/30';
      case 'error':
        return 'text-red-300 bg-red-500/20 border-red-500/30';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`
        inline-flex items-center justify-center
        w-6 h-6 sm:w-auto sm:h-auto
        sm:gap-1 sm:px-2 sm:py-1 
        text-xs rounded-full border backdrop-blur-sm
        transition-all duration-200 ${getColor()} ${className}
        flex-shrink-0
      `}
      title={getText()} // Show text as tooltip on mobile
    >
      {getIcon()}
      {/* Only show text on larger screens */}
      <span className="hidden sm:inline">{getText()}</span>
    </div>
  );
};

export default AutoSaveIndicator;