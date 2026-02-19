import { Settings, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingsPanelProps {
  isOpen: boolean;
  projectName: string;
  setProjectName: (v: string) => void;
  suppressOverwritePrompt: boolean;
  setSuppressOverwritePrompt: (v: boolean) => void;
  keepLocalHistory: boolean;
  setKeepLocalHistory: (v: boolean) => void;
  hostOs: 'linux' | 'windows';
  setHostOs: (v: 'linux' | 'windows') => void;
}

export function SettingsPanel({
  isOpen,
  projectName,
  setProjectName,
  suppressOverwritePrompt,
  setSuppressOverwritePrompt,
  keepLocalHistory,
  setKeepLocalHistory,
  hostOs,
  setHostOs
}: SettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <motion.section 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 overflow-hidden rounded-xl border border-border bg-surface/50 backdrop-blur-md shadow-xl"
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            <Settings className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-text tracking-tight">全局设置</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">项目名称</label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="w-full px-4 py-3 text-sm font-mono border border-border rounded-lg outline-none bg-surface-alt text-text focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder-muted/50"
              placeholder="例如: MyProject"
            />
            <p className="text-[10px] text-muted">用于生成的 ZIP 文件命名。</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">远程系统类型</label>
            <div className="relative">
              <select
                value={hostOs}
                onChange={e => setHostOs(e.target.value as 'linux' | 'windows')}
                className="w-full px-4 py-3 text-sm font-mono border border-border rounded-lg outline-none bg-surface-alt text-text focus:border-accent focus:ring-1 focus:ring-accent appearance-none transition-all cursor-pointer hover:border-muted"
              >
                <option value="linux">Linux (标准)</option>
                <option value="windows">Windows Server</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-muted">决定路径分隔符和解压命令。</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">安全与历史</label>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 p-3 bg-surface-alt border border-border rounded-lg cursor-pointer hover:bg-surface transition-colors group">
                <input
                  type="checkbox"
                  checked={suppressOverwritePrompt}
                  onChange={e => setSuppressOverwritePrompt(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent bg-surface"
                />
                <span className="text-sm text-muted group-hover:text-text transition-colors">不再提示覆盖警告</span>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-surface-alt border border-border rounded-lg cursor-pointer hover:bg-surface transition-colors group">
                <input 
                  type="checkbox" 
                  checked={keepLocalHistory} 
                  onChange={e => setKeepLocalHistory(e.target.checked)} 
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent bg-surface"
                />
                <span className="text-sm text-muted group-hover:text-text transition-colors">保留本地历史版本 (备份)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
