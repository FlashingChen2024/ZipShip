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
    <div className="fixed bottom-24 left-0 right-0 z-30 px-6 max-w-4xl mx-auto w-full pointer-events-none flex justify-center">
      <div className="w-full max-w-md pointer-events-auto shadow-2xl shadow-accent/20 rounded-2xl overflow-hidden bg-surface/80 backdrop-blur-md border border-border p-2">
        <div className="flex items-center justify-between px-4 py-2 mb-2 text-xs font-mono text-muted uppercase tracking-wider border-b border-border">
          <span className={clsx(
            "flex items-center gap-1.5 transition-colors duration-300",
            isSuccess ? "text-green-500" : isError ? "text-red-500" : "text-muted"
          )}>
            {isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
            {status}
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            {version} <span className="text-text">&rarr;</span> <span className="text-accent">{nextVersion}</span>
          </span>
        </div>
        
        <motion.button
          whileHover={!isShipping && canShip ? { scale: 1.02 } : {}}
          whileTap={!isShipping && canShip ? { scale: 0.98 } : {}}
          onClick={onShip}
          disabled={isShipping || !canShip}
          className={clsx(
            "w-full py-4 text-lg font-black text-white uppercase tracking-widest rounded-xl transition-all relative overflow-hidden group flex items-center justify-center gap-3 shadow-lg",
            isShipping ? "bg-accent/80 cursor-wait" : 
            canShip ? "bg-accent hover:bg-orange-500 hover:shadow-accent/40 active:bg-orange-600" : 
            "bg-surface-alt text-muted cursor-not-allowed border border-border"
          )}
        >
          {isShipping ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              发布中...
            </>
          ) : (
            <>
              <Rocket className={clsx("w-6 h-6 transition-transform duration-300", canShip && "group-hover:-translate-y-1 group-hover:translate-x-1")} />
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
