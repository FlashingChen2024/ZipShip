import { Settings, Sun, Moon } from 'lucide-react';
import Logo from '../assets/logo.svg';

interface HeaderProps {
  version: string;
  onToggleSettings: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Header({ version, onToggleSettings, theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-6 border-b border-border bg-bg/50 backdrop-blur-sm sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 overflow-hidden rounded-xl shadow-lg shadow-accent/20 transition-transform hover:scale-105">
          <img src={Logo} alt="ZipShip Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase text-text">
            Zip<span className="text-accent">Ship</span>
          </h1>
          <div className="text-[10px] font-mono text-muted tracking-widest uppercase">
            极速部署
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="px-2 py-1 text-xs font-mono rounded text-muted bg-surface border border-border mr-2">
          {version}
        </div>
        <button 
          onClick={onToggleTheme} 
          className="p-2 transition-colors rounded-lg text-muted hover:text-text hover:bg-surface active:bg-surface-alt"
          title={theme === 'dark' ? "切换到浅色模式" : "切换到深色模式"}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button 
          onClick={onToggleSettings} 
          className="p-2 transition-colors rounded-lg text-muted hover:text-text hover:bg-surface active:bg-surface-alt"
          title="设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
