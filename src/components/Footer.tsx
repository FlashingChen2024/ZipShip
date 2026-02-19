import { Terminal, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface FooterProps {
  hostOs: 'linux' | 'windows';
  isLogsOpen: boolean;
  onToggleLogs: () => void;
  status: string;
}

export function Footer({ hostOs, isLogsOpen, onToggleLogs, status }: FooterProps) {
  return (
    <footer className="flex items-center justify-between p-3 text-xs border-t border-border bg-surface/90 backdrop-blur-md text-muted font-mono fixed bottom-0 left-0 right-0 z-50 transition-colors duration-300">
      <div className="flex gap-4 items-center">
        <span className="flex items-center text-muted group relative">
          <Terminal className="w-3.5 h-3.5 mr-1.5 text-accent/70" /> 
          远端: <span className="ml-1 text-text">{hostOs === 'windows' ? 'Windows' : 'Linux'}</span>
        </span>
        <div className="w-px h-3 bg-border" />
        <span className="flex items-center text-muted">
          <Zap className="w-3.5 h-3.5 mr-1.5 text-accent/70" /> 
          模式: <span className="ml-1 text-text">快速</span>
        </span>
        <div className="w-px h-3 bg-border" />
        <span className={clsx(
          "transition-colors duration-300 flex items-center gap-2",
          status.includes('Deployed') || status === 'Upload complete.' ? "text-green-500" : "text-muted"
        )}>
          {status}
        </span>
      </div>
      <button 
        onClick={onToggleLogs}
        className={clsx(
          "flex items-center gap-2 px-3 py-1 rounded transition-all hover:bg-surface-alt hover:text-text active:scale-95",
          isLogsOpen && "bg-surface-alt text-text"
        )}
      >
        日志 {isLogsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </footer>
  );
}
