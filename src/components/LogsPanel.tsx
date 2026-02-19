import { Terminal, X, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

interface LogEntry {
  id: string;
  timestamp: string;
  module: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface LogsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  opsLogPath: string;
}

export function LogsPanel({ isOpen, onClose, logs, opsLogPath }: LogsPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.module}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={clsx(
      "fixed bottom-0 left-0 right-0 z-40 flex flex-col transition-transform duration-300 bg-surface-alt/95 backdrop-blur-md border-t border-border shadow-2xl h-80",
      isOpen ? "translate-y-0" : "translate-y-full"
    )}>
      <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <div className="min-w-0 flex items-center gap-4">
          <div className="flex items-center text-xs font-bold uppercase tracking-widest text-muted">
            <Terminal className="w-4 h-4 mr-2 text-accent" /> 系统日志
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="truncate text-[10px] font-mono text-muted max-w-md" title={opsLogPath}>
            {opsLogPath ? `日志路径: ${opsLogPath}` : '路径: 未设置'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={copyToClipboard} 
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono text-muted rounded hover:text-text hover:bg-surface-alt transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '已复制' : '复制'}
          </button>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded text-muted hover:text-text hover:bg-surface-alt transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-1.5 overflow-y-auto text-xs text-muted font-mono scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted/60 italic">
            暂无日志。开始发布以查看活动。
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="group flex items-start py-1 border-b border-border/50 hover:bg-muted/5 px-2 -mx-2 rounded transition-colors">
              <span className="text-muted/60 shrink-0 w-20 text-right mr-3 font-mono opacity-60">
                {log.timestamp}
              </span>
              <span className={clsx(
                "font-bold shrink-0 w-24 uppercase tracking-wider text-[10px] py-0.5 rounded text-center mr-3",
                log.type === 'info' && "bg-blue-500/10 text-blue-500 border border-blue-500/20",
                log.type === 'success' && "bg-green-500/10 text-green-500 border border-green-500/20",
                log.type === 'error' && "bg-red-500/10 text-red-500 border border-red-500/20"
              )}>
                {log.module}
              </span>
              <span className={clsx(
                "break-all",
                log.type === 'error' ? "text-red-400" : "text-text"
              )}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
