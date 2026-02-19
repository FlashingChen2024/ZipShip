import { Server, MoreHorizontal, Lock, Globe, Terminal, FolderUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RemoteSectionProps {
  host: string;
  setHost: (v: string) => void;
  port: number;
  setPort: (v: number) => void;
  username: string;
  setUsername: (v: string) => void;
  authType: 'password' | 'key_file';
  setAuthType: (v: 'password' | 'key_file') => void;
  password: string;
  setPassword: (v: string) => void;
  privateKeyPath: string;
  pickPrivateKey: () => void;
  passphrase: string;
  setPassphrase: (v: string) => void;
  remoteDir: string;
  setRemoteDir: (v: string) => void;
  hostOs: 'linux' | 'windows';
  canShip: boolean;
}

export function RemoteSection({
  host,
  setHost,
  port,
  setPort,
  username,
  setUsername,
  authType,
  setAuthType,
  password,
  setPassword,
  privateKeyPath,
  pickPrivateKey,
  passphrase,
  setPassphrase,
  remoteDir,
  setRemoteDir,
  hostOs,
  canShip
}: RemoteSectionProps) {
  return (
    <section className="group relative overflow-hidden rounded-2xl border border-border bg-surface/30 backdrop-blur-sm p-6 transition-all hover:bg-surface/50 hover:border-muted/50 shadow-lg">
      <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20 pointer-events-none">
        <Server className="w-24 h-24 text-blue-500 rotate-12" />
      </div>
      
      <h2 className="flex items-center gap-3 mb-6 text-sm font-bold uppercase tracking-widest text-blue-500">
        <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20">
          <Server className="w-4 h-4" />
        </div>
        远程目标
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr,80px] gap-4">
            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-blue-500" /> 主机 (Host)
              </label>
              <input 
                type="text" 
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-4 py-3 text-sm font-mono border border-border rounded-lg outline-none bg-surface-alt text-text focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-muted/50"
              />
            </div>
            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-muted text-center">端口</label>
              <input 
                type="number"
                value={port}
                onChange={e => setPort(Number(e.target.value))}
                className="w-full px-2 py-3 text-sm font-mono border border-border rounded-lg outline-none bg-surface-alt text-text text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-muted/50"
              />
            </div>
          </div>
          
          <div>
            <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-blue-500" /> 用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="root"
              className="w-full px-4 py-3 text-sm font-mono border border-border rounded-lg outline-none bg-surface-alt text-text focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-muted/50"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr,auto] gap-4">
            <div className="flex-1">
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-yellow-500" /> 认证方式
              </label>
              <div className="flex bg-surface-alt rounded-lg p-1 border border-border">
                <button
                  onClick={() => setAuthType('password')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${authType === 'password' ? 'bg-muted/20 text-text shadow-sm' : 'text-muted hover:text-text'}`}
                >
                  密码
                </button>
                <button
                  onClick={() => setAuthType('key_file')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${authType === 'key_file' ? 'bg-muted/20 text-text shadow-sm' : 'text-muted hover:text-text'}`}
                >
                  私钥
                </button>
              </div>
            </div>
          </div>

          <div className="h-[74px]">
            <AnimatePresence mode="wait">
              {authType === 'password' ? (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-muted">密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 text-sm font-mono border border-border rounded-lg outline-none bg-surface-alt text-text focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all placeholder-muted/50"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="key_file"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-muted">私钥路径 & 口令</label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex shadow-sm rounded-lg overflow-hidden group/input focus-within:ring-2 focus-within:ring-yellow-500 transition-all">
                      <input
                        type="text"
                        readOnly
                        value={privateKeyPath || ''}
                        placeholder="私钥路径"
                        className="flex-1 px-4 py-3 text-sm font-mono border-y border-l border-border bg-surface-alt text-text outline-none placeholder-muted/50 w-full min-w-0"
                      />
                      <button 
                        onClick={pickPrivateKey} 
                        className="px-3 bg-surface-alt hover:bg-muted/10 border border-border text-muted hover:text-text transition-colors flex items-center justify-center"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={e => setPassphrase(e.target.value)}
                      placeholder="口令 (可选)"
                      className="w-1/3 px-4 py-3 text-sm font-mono border border-border rounded-lg outline-none bg-surface-alt text-text focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all placeholder-muted/50"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 space-y-2 pt-2 border-t border-border">
          <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <FolderUp className="w-3 h-3 text-green-500" /> 远程目录
          </label>
          <div className="relative group/path">
            <input 
              type="text" 
              value={remoteDir}
              onChange={e => setRemoteDir(e.target.value)}
              onBlur={() => {
                if (!remoteDir.trim()) return;
                const recommended = hostOs === 'windows' ? '\\' : '/';
                if (remoteDir.endsWith(recommended)) return;
                const ok = window.confirm(`建议以 “${recommended}” 结尾。是否自动补全？`);
                if (ok) setRemoteDir(remoteDir + recommended);
              }}
              placeholder={hostOs === 'windows' ? 'C:\\inetpub\\wwwroot\\' : '/var/www/html/'}
              className="w-full px-4 py-3 text-sm font-mono border border-border rounded-lg outline-none bg-surface-alt text-text focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder-muted/50 pr-24"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/path:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  const recommended = hostOs === 'windows' ? '\\' : '/';
                  if (!remoteDir.endsWith(recommended)) setRemoteDir(remoteDir + recommended);
                }}
                className="px-2 py-1 text-[10px] font-bold uppercase bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 transition-colors"
              >
                自动补全
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex items-center justify-end">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${canShip ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          <div className={`w-2 h-2 rounded-full ${canShip ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {canShip ? '配置就绪' : '配置不完整'}
        </div>
      </div>
    </section>
  );
}
