import { Check, X, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface OverwritePromptProps {
  open: boolean;
  onResolve: (decision: 'ok' | 'cancel' | 'dont_remind') => void;
}

export function OverwritePrompt({ open, onResolve }: OverwritePromptProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg border border-red-500/30 bg-surface/95 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-border"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text">覆盖确认</h3>
              <p className="text-sm text-muted">请在继续前确认。</p>
            </div>
          </div>
          
          <div className="bg-surface-alt p-4 rounded-xl border border-border mb-6">
            <p className="text-sm text-muted leading-relaxed font-mono">
              <span className="text-red-500 font-bold">警告:</span> 此操作将生成新的 ZIP 文件，并可能覆盖本地和远程服务器上的同名文件。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={() => onResolve('cancel')}
              className="px-4 py-2.5 text-sm font-medium text-muted hover:text-text hover:bg-surface-alt rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> 取消
            </button>
            <button
              onClick={() => onResolve('dont_remind')}
              className="px-4 py-2.5 text-sm font-medium text-muted hover:text-text hover:bg-surface-alt rounded-lg transition-colors border border-transparent hover:border-border"
            >
              不再询问
            </button>
            <button
              onClick={() => onResolve('ok')}
              className="px-6 py-2.5 text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> 覆盖并发布
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
