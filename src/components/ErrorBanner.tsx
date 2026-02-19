import { AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ErrorBannerProps {
  message: string;
  onClear: () => void;
}

export function ErrorBanner({ message, onClear }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      className="mb-6 overflow-hidden rounded-xl border border-red-500/50 bg-red-500/10 shadow-lg shadow-red-500/10"
    >
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg text-red-500 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-500 uppercase tracking-wide mb-1">发生错误</h3>
            <p className="text-sm text-red-500/80 font-mono break-words leading-relaxed">{message}</p>
          </div>
        </div>
        <button 
          onClick={onClear}
          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
