import { FolderOpen, MoreHorizontal, CheckCircle } from 'lucide-react';

interface LocalSectionProps {
  workDir: string;
  pickWorkDir: () => void;
}

export function LocalSection({ workDir, pickWorkDir }: LocalSectionProps) {
  return (
    <section className="group relative overflow-hidden rounded-2xl border border-border bg-surface/30 backdrop-blur-sm p-6 transition-all hover:bg-surface/50 hover:border-muted/50 shadow-lg">
      <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20 pointer-events-none">
        <FolderOpen className="w-24 h-24 text-accent rotate-12" />
      </div>
      
      <h2 className="flex items-center gap-3 mb-6 text-sm font-bold uppercase tracking-widest text-accent">
        <div className="p-1.5 rounded bg-accent/10 border border-accent/20">
          <FolderOpen className="w-4 h-4" />
        </div>
        本地资源
      </h2>
      
      <div className="flex flex-col md:flex-row gap-6 relative z-10">
        <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-border shadow-xl shrink-0 group-hover:border-muted transition-colors bg-surface-alt flex items-center justify-center">
          {workDir ? (
            <div className="text-4xl font-black text-muted select-none">
              {workDir.slice(-2).toUpperCase()}
            </div>
          ) : (
            <div className="text-muted">?</div>
          )}
        </div>
        
        <div className="flex-1 space-y-4">
          <div>
            <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-muted">工作目录</label>
            <div className="flex shadow-sm rounded-lg overflow-hidden group/input focus-within:ring-2 focus-within:ring-accent transition-all">
              <input 
                type="text" 
                readOnly 
                value={workDir || ''} 
                placeholder="请选择项目文件夹..."
                className="flex-1 px-4 py-3 text-sm font-mono border-y border-l border-border bg-surface-alt text-text outline-none placeholder-muted/50 w-full min-w-0"
              />
              <button 
                onClick={pickWorkDir} 
                className="px-5 bg-surface-alt hover:bg-muted/10 border border-border text-muted hover:text-text transition-colors flex items-center justify-center"
                title="浏览..."
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3" /> 忽略规则已启用
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
