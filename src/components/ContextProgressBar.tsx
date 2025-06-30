import React from 'react';
import { Activity, AlertTriangle, AlertCircle } from 'lucide-react';

interface ContextProgressBarProps {
  tokensUsed: number;
  maxTokens?: number;
  className?: string;
}

const ContextProgressBar: React.FC<ContextProgressBarProps> = ({
  tokensUsed,
  maxTokens = 128000, // gpt-4o-mini default
  className = ''
}) => {
  const percentage = Math.min((tokensUsed / maxTokens) * 100, 100);
  
  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getIcon = () => {
    if (percentage >= 90) return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (percentage >= 70) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <Activity className="w-4 h-4 text-green-400" />;
  };

  const getStatusText = () => {
    if (percentage >= 90) return 'Context limit approaching';
    if (percentage >= 70) return 'Context will compress soon';
    return 'Context usage healthy';
  };

  const getTooltipText = () => {
    const compressionThreshold = Math.ceil(maxTokens * 0.7);
    const tokensUntilCompression = Math.max(0, compressionThreshold - tokensUsed);
    
    return `${tokensUsed.toLocaleString()} tokens used / ${maxTokens.toLocaleString()} total (${percentage.toFixed(1)}%)\nCompression at ${compressionThreshold.toLocaleString()} tokens (${tokensUntilCompression.toLocaleString()} remaining)`;
  };

  return (
    <div className={`bg-white/5 rounded-lg p-4 border border-white/10 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <span className="text-white text-sm font-medium">Context Usage</span>
        {percentage >= 70 && (
          <span className="text-xs bg-orange-500/20 text-orange-200 px-2 py-1 rounded-full">
            Compressing
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <div 
          className="relative w-full bg-white/10 rounded-full h-3 overflow-hidden"
          title={getTooltipText()}
        >
          <div
            className={`h-full transition-all duration-500 ease-in-out ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          />
          {percentage >= 70 && (
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
          )}
        </div>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-purple-200">{getStatusText()}</span>
          <span className="text-purple-300 font-mono">
            {percentage.toFixed(1)}%
          </span>
        </div>
        
        <div className="text-xs text-purple-300 opacity-75">
          {tokensUsed.toLocaleString()} / {maxTokens.toLocaleString()} tokens
        </div>
        
        {percentage > 50 && (
          <div className="text-xs text-purple-300 opacity-75">
            {percentage >= 70 
              ? 'Context compression active - preserving key moments' 
              : `Compression in ${Math.ceil((maxTokens * 0.7 - tokensUsed) / 100)} messages`
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextProgressBar;