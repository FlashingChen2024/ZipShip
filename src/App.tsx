import { useEffect, useMemo, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Settings, FolderOpen, Server, Key, Terminal, X, ChevronUp, ChevronDown, CheckCircle, Send, Zap, MoreHorizontal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { type ApiError, packageCreate, sshTrustHostKey, sftpUploadZip, sshUnzip, versionNext } from './zipship-api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type LogEntry = {
  id: string;
  timestamp: string;
  module: string;
  message: string;
  type: 'info' | 'error' | 'success';
};

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [status, setStatus] = useState('准备就绪');
  const [version, setVersion] = useState('v1.0.0');
  const [nextVersion, setNextVersion] = useState<string>('v1.0.1');
  const [errorBanner, setErrorBanner] = useState<string>('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [suppressOverwritePrompt, setSuppressOverwritePrompt] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zipship.suppressOverwritePrompt') === '1';
    } catch {
      return false;
    }
  });
  const [keepLocalHistory, setKeepLocalHistory] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('zipship.keepLocalHistory');
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  });

  const [projectName, setProjectName] = useState<string>(() => {
    try {
      return localStorage.getItem('zipship.projectName') || 'ZipShip';
    } catch {
      return 'ZipShip';
    }
  });
  const [workDir, setWorkDir] = useState<string>(() => {
    try {
      return localStorage.getItem('zipship.workDir') || '';
    } catch {
      return '';
    }
  });

  const [host, setHost] = useState<string>(() => {
    try {
      return localStorage.getItem('zipship.host') || '';
    } catch {
      return '';
    }
  });
  const [port, setPort] = useState<number>(() => {
    try {
      const s = localStorage.getItem('zipship.port');
      const n = s ? Number(s) : 22;
      return Number.isFinite(n) && n > 0 ? n : 22;
    } catch {
      return 22;
    }
  });
  const [username, setUsername] = useState<string>(() => {
    try {
      return localStorage.getItem('zipship.username') || '';
    } catch {
      return '';
    }
  });
  const [remoteDir, setRemoteDir] = useState<string>(() => {
    try {
      return localStorage.getItem('zipship.remoteDir') || '';
    } catch {
      return '';
    }
  });
  const [hostOs, setHostOs] = useState<'linux' | 'windows'>(() => {
    try {
      const v = localStorage.getItem('zipship.hostOs');
      return v === 'windows' ? 'windows' : 'linux';
    } catch {
      return 'linux';
    }
  });

  const [authType, setAuthType] = useState<'password' | 'key_file'>(() => {
    try {
      const v = localStorage.getItem('zipship.authType');
      return v === 'key_file' ? 'key_file' : 'password';
    } catch {
      return 'password';
    }
  });
  const [password, setPassword] = useState('');
  const [privateKeyPath, setPrivateKeyPath] = useState<string>(() => {
    try {
      return localStorage.getItem('zipship.privateKeyPath') || '';
    } catch {
      return '';
    }
  });
  const [passphrase, setPassphrase] = useState('');
  const [overwritePrompt, setOverwritePrompt] = useState<{
    open: boolean;
    resolve: ((v: 'ok' | 'cancel' | 'dont_remind') => void) | null;
  }>({ open: false, resolve: null });

  useEffect(() => {
    addLog('系统', 'ZipShip 已启动。', 'info');
  }, []);

  const addLog = (module: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      module,
      message,
      type
    };
    setLogs(prev => [...prev, entry]);
  };

  useEffect(() => {
    try {
      localStorage.setItem('zipship.suppressOverwritePrompt', suppressOverwritePrompt ? '1' : '0');
    } catch {
    }
  }, [suppressOverwritePrompt]);

  useEffect(() => {
    try {
      localStorage.setItem('zipship.keepLocalHistory', keepLocalHistory ? '1' : '0');
    } catch {
    }
  }, [keepLocalHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('zipship.projectName', projectName);
    } catch {
    }
  }, [projectName]);

  useEffect(() => {
    try {
      localStorage.setItem('zipship.workDir', workDir);
    } catch {
    }
  }, [workDir]);

  useEffect(() => {
    try {
      localStorage.setItem('zipship.host', host);
      localStorage.setItem('zipship.port', String(port));
      localStorage.setItem('zipship.username', username);
      localStorage.setItem('zipship.remoteDir', remoteDir);
      localStorage.setItem('zipship.hostOs', hostOs);
      localStorage.setItem('zipship.authType', authType);
      localStorage.setItem('zipship.privateKeyPath', privateKeyPath);
    } catch {
    }
  }, [authType, host, hostOs, port, privateKeyPath, remoteDir, username]);

  useEffect(() => {
    let active = true;
    versionNext(version)
      .then(v => {
        if (active) setNextVersion(v);
      })
      .catch(() => {
      });
    return () => {
      active = false;
    };
  }, [version]);

  const canShip = useMemo(() => {
    if (!projectName.trim()) return false;
    if (!workDir.trim()) return false;
    if (!host.trim()) return false;
    if (!username.trim()) return false;
    if (!remoteDir.trim()) return false;
    if (authType === 'password') return password.length > 0;
    return privateKeyPath.trim().length > 0;
  }, [authType, host, password, privateKeyPath, projectName, remoteDir, username, workDir]);

  const opsLogPath = useMemo(() => {
    if (!workDir) return '';
    const sep = workDir.includes('\\') ? '\\' : '/';
    return `${workDir}${sep}.zipship${sep}logs${sep}ops.jsonl`;
  }, [workDir]);

  const pickWorkDir = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === 'string') setWorkDir(selected);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('错误', `无法打开目录选择框：${msg}`, 'error');
      setErrorBanner(`无法打开目录选择框：${msg}\n\n请确认使用 “npm run tauri dev” 启动，并已配置 dialog 权限。`);
    }
  };

  const pickPrivateKey = async () => {
    try {
      const selected = await open({ directory: false, multiple: false });
      if (typeof selected === 'string') setPrivateKeyPath(selected);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('错误', `无法打开文件选择框：${msg}`, 'error');
      setErrorBanner(`无法打开文件选择框：${msg}\n\n请确认使用 “npm run tauri dev” 启动，并已配置 dialog 权限。`);
    }
  };

  const ensureTrusted = async (err: ApiError) => {
    if (err.code !== 'host_key_not_trusted') throw err;
    const msg =
      err.status === 'Mismatch'
        ? `主机指纹发生变化：${err.host}:${err.port}\n${err.fingerprint}\n\n是否信任并继续？`
        : `首次连接主机：${err.host}:${err.port}\n${err.fingerprint}\n\n是否信任并继续？`;
    const ok = window.confirm(msg);
    if (!ok) throw { code: 'message', message: '已取消主机信任。' } satisfies ApiError;
    await sshTrustHostKey({ host: err.host, port: err.port });
  };

  const requestOverwriteDecision = () =>
    new Promise<'ok' | 'cancel' | 'dont_remind'>(resolve => {
      setOverwritePrompt({ open: true, resolve });
    });

  const handleShip = async () => {
    if (isShipping) return;
    
    setIsShipping(true);
    setErrorBanner('');
    setStatus('准备发布...');
    addLog('系统', '开始执行发布流程...', 'info');
    const slowTimer = window.setTimeout(() => {
      addLog('系统', '操作耗时较长（压缩/上传/解压可能需要较久），请耐心等待。', 'info');
    }, 15000);

    try {
      if (!canShip) {
        const msg = '请先完善必要配置（目录/远端/认证）。';
        addLog('系统', msg, 'error');
        setErrorBanner(msg);
        setStatus('配置不完整');
        return;
      }

      if (!suppressOverwritePrompt) {
        const decision = await requestOverwriteDecision();
        if (decision === 'cancel') {
          setStatus('已取消');
          addLog('系统', '用户已取消。', 'info');
          return;
        }
        if (decision === 'dont_remind') {
          setSuppressOverwritePrompt(true);
        }
      }

      setStatus('压缩中...');
      addLog('压缩', `开始打包：${workDir}`, 'info');
      const pkg = await packageCreate({
        projectName,
        version,
        workDir,
        keepLocalHistory
      });
      addLog('压缩', `已生成：${pkg.zip_name}`, 'success');

      setStatus('上传中...');
      addLog('SFTP', `连接并上传到 ${host}:${port}...`, 'info');
      const auth =
        authType === 'password'
          ? { type: 'password' as const, username, password }
          : { type: 'key_file' as const, username, privateKeyPath, passphrase: passphrase || undefined };

      const uploadReq = {
        target: { host, port },
        auth,
        localPath: pkg.zip_path,
        remoteDir,
        remoteName: pkg.zip_name
      };

      try {
        const res = await sftpUploadZip(uploadReq);
        addLog('SFTP', `上传成功（${res.remote_total} bytes）`, 'success');
      } catch (e) {
        const err = e as ApiError;
        if (err.code === 'host_key_not_trusted') {
          await ensureTrusted(err);
          const res = await sftpUploadZip(uploadReq);
          addLog('SFTP', `上传成功（${res.remote_total} bytes）`, 'success');
        } else {
          throw err;
        }
      }

      setStatus('解压中...');
      addLog('SSH', '执行远端解压命令...', 'info');
      const unzipReq = {
        target: { host, port },
        auth,
        os: hostOs,
        remoteDir,
        zipName: pkg.zip_name
      };

      let unzipRes;
      try {
        unzipRes = await sshUnzip(unzipReq);
      } catch (e) {
        const err = e as ApiError;
        if (err.code === 'host_key_not_trusted') {
          await ensureTrusted(err);
          unzipRes = await sshUnzip(unzipReq);
        } else {
          throw err;
        }
      }

      const exit = unzipRes.unzip.exit_status ?? 1;
      if (exit !== 0) {
        const msg = `解压失败（exit ${exit}）。`;
        addLog('SSH', msg, 'error');
        if (unzipRes.unzip.stderr) addLog('SSH', unzipRes.unzip.stderr, 'error');
        setErrorBanner(msg);
        setStatus('失败');
        return;
      }

      const bumped = await versionNext(version);
      setVersion(bumped);
      addLog('SSH', `发布成功！当前版本：${bumped}`, 'success');
      addLog('日志', opsLogPath ? `操作日志：${opsLogPath}` : '操作日志：未设置工作目录', 'info');
      setStatus(`已发布 ${bumped}`);
      
      setTimeout(() => {
        setStatus('准备就绪');
      }, 3000);
    } catch (error) {
      const msg = error && typeof error === 'object' && 'message' in (error as any) ? String((error as any).message) : String(error);
      const finalMsg = msg || '发布失败。';
      addLog('错误', finalMsg, 'error');
      setErrorBanner(finalMsg);
      setStatus('失败');
    } finally {
      window.clearTimeout(slowTimer);
      setIsShipping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text font-sans selection:bg-accent selection:text-white">
      <div className="crt-overlay pointer-events-none fixed inset-0 z-50 opacity-15" />
      {overwritePrompt.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-lg border border-gray-700 bg-surface p-6">
            <div className="mb-2 text-sm font-bold uppercase tracking-widest text-muted">覆盖确认</div>
            <div className="mb-6 text-sm text-gray-300 font-mono">
              将生成 ZIP 并可能覆盖本地已存在的同名 ZIP。解压阶段会覆盖远端目录中的同名文件。
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:justify-end">
              <button
                onClick={() => {
                  overwritePrompt.resolve?.('cancel');
                  setOverwritePrompt({ open: false, resolve: null });
                }}
                className="px-4 py-2 text-sm font-mono border border-gray-700 bg-bg hover:border-gray-500"
              >
                取消
              </button>
              <button
                onClick={() => {
                  overwritePrompt.resolve?.('dont_remind');
                  setOverwritePrompt({ open: false, resolve: null });
                }}
                className="px-4 py-2 text-sm font-mono border border-gray-700 bg-bg hover:border-gray-500"
              >
                知道了，不要再提醒我
              </button>
              <button
                onClick={() => {
                  overwritePrompt.resolve?.('ok');
                  setOverwritePrompt({ open: false, resolve: null });
                }}
                className="px-4 py-2 text-sm font-mono bg-accent text-bg hover:bg-orange-500"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="flex items-center justify-between p-6 border-b border-surface/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 font-black transform -rotate-6 bg-accent text-bg">
            Z
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">ZipShip</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-2 py-1 text-xs font-mono rounded text-muted bg-surface">
            {version}
          </div>
          <button onClick={() => setIsSettingsOpen(v => !v)} className="transition-colors text-muted hover:text-white">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex flex-col flex-1 w-full max-w-4xl gap-6 p-6 mx-auto overflow-y-auto">
        {errorBanner ? (
          <div className="border border-red-500/50 bg-red-500/10 p-4 text-sm font-mono text-red-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 font-bold">发生错误</div>
                <div className="break-words">{errorBanner}</div>
              </div>
              <button onClick={() => setErrorBanner('')} className="text-red-200/80 hover:text-red-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}

        {isSettingsOpen ? (
          <section className="p-6 border-l-4 border-gray-600 rounded-none bg-surface animate-slide-in [animation-delay:0ms]">
            <h2 className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-widest text-muted">
              <Settings className="w-4 h-4" /> 设置
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-xs font-mono text-muted">项目名</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-mono text-muted">压缩覆盖提醒</label>
                <div className="flex items-center gap-3 h-[46px] px-3 bg-bg border border-gray-700 text-sm font-mono">
                  <input
                    type="checkbox"
                    checked={suppressOverwritePrompt}
                    onChange={e => setSuppressOverwritePrompt(e.target.checked)}
                  />
                  <span className="text-muted">本项目不再提醒</span>
                </div>
              </div>
              <div>
                <label className="block mb-1 text-xs font-mono text-muted">保留本地历史包</label>
                <div className="flex items-center gap-3 h-[46px] px-3 bg-bg border border-gray-700 text-sm font-mono">
                  <input type="checkbox" checked={keepLocalHistory} onChange={e => setKeepLocalHistory(e.target.checked)} />
                  <span className="text-muted">保留</span>
                </div>
              </div>
              <div>
                <label className="block mb-1 text-xs font-mono text-muted">远端系统</label>
                <select
                  value={hostOs}
                  onChange={e => setHostOs(e.target.value === 'windows' ? 'windows' : 'linux')}
                  className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
                >
                  <option value="linux">Linux</option>
                  <option value="windows">Windows</option>
                </select>
              </div>
            </div>
          </section>
        ) : null}
        
        <section className="p-6 border-l-4 rounded-none bg-surface border-accent animate-slide-in [animation-delay:0ms]">
          <h2 className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-widest text-muted">
            <FolderOpen className="w-4 h-4" /> 本地
          </h2>
          <div className="flex gap-4">
            <div className="relative w-16 h-16 overflow-hidden border border-gray-700 shrink-0 group">
              <img 
                src="https://picsum.photos/seed/zipship/200/200" 
                alt="Project Thumbnail" 
                className="object-cover w-full h-full transition-all duration-500 grayscale group-hover:grayscale-0"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-xs font-mono text-muted">工作目录</label>
              <div className="flex">
                <input 
                  type="text" 
                  readOnly 
                  value={workDir || ''} 
                  placeholder="请选择工作目录"
                  className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
                />
                <button onClick={pickWorkDir} className="px-4 transition-colors bg-gray-700 hover:bg-gray-600">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="w-32">
              <label className="block mb-1 text-xs font-mono text-muted">忽略规则</label>
              <div className="flex items-center gap-2 h-[46px] px-3 bg-bg border border-gray-700 text-sm text-green-500 font-mono">
                <CheckCircle className="w-4 h-4" /> 已启用
              </div>
            </div>
          </div>
        </section>

        <section className="p-6 border-l-4 border-gray-600 rounded-none bg-surface animate-slide-in [animation-delay:100ms]">
          <h2 className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-widest text-muted">
            <Server className="w-4 h-4" /> 远端
          </h2>
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-xs font-mono text-muted">Host</label>
              <input 
                type="text" 
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="例如 192.168.1.100"
                className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-mono text-muted">端口</label>
              <input 
                type="number"
                value={port}
                onChange={e => setPort(Number(e.target.value))}
                className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-xs font-mono text-muted">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-mono text-muted">认证方式</label>
              <select
                value={authType}
                onChange={e => setAuthType(e.target.value === 'key_file' ? 'key_file' : 'password')}
                className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
              >
                <option value="password">密码</option>
                <option value="key_file">私钥</option>
              </select>
            </div>
          </div>

          {authType === 'password' ? (
            <div className="mb-4">
              <label className="block mb-1 text-xs font-mono text-muted">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-xs font-mono text-muted">私钥文件</label>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={privateKeyPath || ''}
                    placeholder="请选择私钥文件"
                    className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
                  />
                  <button onClick={pickPrivateKey} className="px-4 transition-colors bg-gray-700 hover:bg-gray-600">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block mb-1 text-xs font-mono text-muted">私钥口令（可选）</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block mb-1 text-xs font-mono text-muted">远端目录</label>
            <input 
              type="text" 
              value={remoteDir}
              onChange={e => setRemoteDir(e.target.value)}
              onBlur={() => {
                if (!remoteDir.trim()) return;
                const recommended = hostOs === 'windows' ? '\\' : '/';
                if (remoteDir.endsWith(recommended)) return;
                const ok = window.confirm(`远端目录建议以 “${recommended}” 结尾，是否补上？`);
                if (ok) setRemoteDir(v => v + recommended);
              }}
              placeholder={hostOs === 'windows' ? '例如 C:\\deploy\\www\\' : '例如 /var/www/html/'}
              className="w-full p-3 text-sm font-mono border border-gray-700 outline-none bg-bg focus:border-accent"
            />
            {remoteDir.trim() ? (
              <div className="mt-2 flex items-center justify-between text-xs font-mono text-muted">
                <span>
                  {hostOs === 'windows' ? '提示：建议以 \\ 结尾（可选）。' : '提示：建议以 / 结尾（可选）。'}
                </span>
                <button
                  onClick={() => {
                    const recommended = hostOs === 'windows' ? '\\' : '/';
                    if (!remoteDir.endsWith(recommended)) setRemoteDir(v => v + recommended);
                  }}
                  className="text-accent hover:text-orange-500"
                >
                  一键补全
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between p-2 text-xs border border-dashed border-gray-700 text-muted font-mono bg-bg/50">
            <span className="flex items-center">
              <Key className="w-4 h-4 mr-2 text-accent" /> {authType === 'password' ? '认证：密码' : '认证：私钥'}
            </span>
            <span className={canShip ? "text-green-500" : "text-muted"}>{canShip ? '可发布' : '待完善'}</span>
          </div>
        </section>

        <div className="mt-auto pt-6 animate-slide-in [animation-delay:200ms]">
          <div className="flex items-center justify-between mb-2">
            <span className={cn(
              "text-sm font-mono uppercase transition-colors duration-300",
              status.includes('Deployed') || status === 'Upload complete.' ? "text-green-500" : "text-muted"
            )}>
              {status}
            </span>
            <span className="text-xs text-gray-600 font-mono">
              {version} &rarr; {nextVersion}
            </span>
          </div>
          <button 
            onClick={handleShip}
            disabled={isShipping || !canShip}
            className={cn(
              "w-full py-6 text-xl font-black text-white uppercase transition-all shadow-lg group relative overflow-hidden tracking-widest bg-accent hover:bg-orange-500 active:scale-[0.98]",
              (isShipping || !canShip) && "opacity-75 cursor-not-allowed"
            )}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <Send className={cn("w-6 h-6", isShipping && "animate-pulse")} /> 
              {isShipping ? '发布中...' : '一键发布'}
            </span>
            <div className="absolute inset-0 transition-transform duration-300 translate-y-full bg-white/10 group-hover:translate-y-0" />
          </button>
        </div>
      </main>

      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex flex-col transition-transform duration-300 bg-black/90 backdrop-blur-md border-t border-gray-800 shadow-2xl h-64",
        isLogsOpen ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
          <div className="min-w-0">
            <div className="flex items-center text-xs font-bold uppercase tracking-widest text-muted">
              <Terminal className="w-4 h-4 mr-2" /> 日志
            </div>
            <div className="mt-1 truncate text-[10px] font-mono text-gray-500">
              {opsLogPath ? `操作日志：${opsLogPath}` : '操作日志：未选择工作目录'}
            </div>
          </div>
          <button onClick={() => setIsLogsOpen(false)} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-1 overflow-y-auto text-xs text-gray-400 font-mono">
          {logs.map((log) => (
            <div key={log.id} className="py-1 border-b border-gray-800">
              <span className="text-gray-500">[{log.timestamp}]</span>{' '}
              <span className={cn(
                "font-bold",
                log.type === 'info' && "text-blue-400",
                log.type === 'success' && "text-green-400",
                log.type === 'error' && "text-red-400"
              )}>[{log.module}]</span>{' '}
              {log.message}
            </div>
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-between p-2 text-xs border-t border-surface bg-surface/50 text-gray-500 font-mono">
        <div className="flex gap-4">
          <span className="flex items-center"><Terminal className="w-3 h-3 mr-1" /> 远端：{hostOs === 'windows' ? 'Windows' : 'Linux'}</span>
          <span className="flex items-center"><Zap className="w-3 h-3 mr-1" /> 模式：快速</span>
        </div>
        <button 
          onClick={() => setIsLogsOpen(!isLogsOpen)}
          className="flex items-center gap-2 transition-colors hover:text-accent"
        >
          日志 {isLogsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
      </footer>
    </div>
  );
}
