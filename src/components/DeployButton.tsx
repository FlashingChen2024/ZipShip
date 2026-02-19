import { Rocket, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface DeployButtonProps {
  isShipping: boolean;
  canShip: boolean;
  status: string;
  version: string;
  nextVersion: string;
  onShip: () => void;
}

export function DeployButton({
  isShipping,
  canShip,
  status,
  version,
  nextVersion,
  onShip
}: DeployButtonProps) {
  const isSuccess = status.includes('Deployed') || status === 'Upload complete.';
  const isError = status === 'Failed';

  return (
    <div className="fixed bottom-12 sm:bottom-14 left-0 right-0 z-30 px-4 sm:px-6 max-w-4xl mx-auto w-full pointer-events-none flex justify-center">
      <div className="w-full max-w-xs sm:max-w-sm pointer-events-auto shadow-xl shadow-accent/20 rounded-lg sm:rounded-xl overflow-hidden bg-surface/95 backdrop-blur-md border border-border p-1.5 sm:p-2">
        <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 mb-1.5 sm:mb-2 text-[10px] sm:text-xs font-mono text-muted uppercase tracking-wider border-b border-border">
          <span className={clsx(
            "flex items-center gap-1 transition-colors duration-300 truncate",
            isSuccess ? "text-green-500" : isError ? "text-red-500" : "text-muted"
          )}>
            {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : null}
            <span className="truncate max-w-[80px] sm:max-w-[120px]">{status}</span>
          </span>
          <span className="flex items-center gap-1 text-muted shrink-0">
            {version} <span className="text-text">&rarr;</span> <span className="text-accent">{nextVersion}</span>
          </span>
        </div>
        
        <motion.button
          whileHover={!isShipping && canShip ? { scale: 1.01 } : {}}
          whileTap={!isShipping && canShip ? { scale: 0.99 } : {}}
          onClick={onShip}
          disabled={isShipping || !canShip}
          className={clsx(
            "w-full py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white uppercase tracking-wider sm:tracking-widest rounded-lg sm:rounded-xl transition-all relative overflow-hidden group flex items-center justify-center gap-2 shadow-md",
            isShipping ? "bg-accent/80 cursor-wait" : 
            canShip ? "bg-accent hover:bg-orange-500 hover:shadow-accent/40 active:bg-orange-600" : 
            "bg-surface-alt text-muted cursor-not-allowed border border-border"
          )}
        >
          {isShipping ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              <span className="hidden sm:inline">发布中...</span>
              <span className="sm:hidden">发布中</span>
            </>
          ) : (
            <>
              <Rocket className={clsx("w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300", canShip && "group-hover:-translate-y-0.5 group-hover:translate-x-0.5")} />
              一键发布
            </>
          )}
          
          {canShip && !isShipping && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
