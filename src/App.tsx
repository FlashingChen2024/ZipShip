import { useEffect, useMemo, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { type ApiError, packageCreate, sshTrustHostKey, sftpUploadZip, sshUnzip, versionNext } from './zipship-api';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SettingsPanel } from './components/SettingsPanel';
import { LocalSection } from './components/LocalSection';
import { RemoteSection } from './components/RemoteSection';
import { LogsPanel } from './components/LogsPanel';
import { DeployButton } from './components/DeployButton';
import { ErrorBanner } from './components/ErrorBanner';
import { OverwritePrompt } from './components/OverwritePrompt';

type LogEntry = {
  id: string;
  timestamp: string;
  module: string;
  message: string;
  type: 'info' | 'error' | 'success';
};

export default function App() {
  // --- State: Theme ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('zipship.theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });

  // --- State: Logs & Status ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [status, setStatus] = useState('就绪');
  const [version, setVersion] = useState('v1.0.0');
  const [nextVersion, setNextVersion] = useState<string>('v1.0.1');
  const [errorBanner, setErrorBanner] = useState<string>('');

  // --- State: Settings ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [suppressOverwritePrompt, setSuppressOverwritePrompt] = useState<boolean>(() => {
    try { return localStorage.getItem('zipship.suppressOverwritePrompt') === '1'; } catch { return false; }
  });
  const [keepLocalHistory, setKeepLocalHistory] = useState<boolean>(() => {
    try { const v = localStorage.getItem('zipship.keepLocalHistory'); return v === null ? true : v === '1'; } catch { return true; }
  });
  const [projectName, setProjectName] = useState<string>(() => {
    try { return localStorage.getItem('zipship.projectName') || 'ZipShip'; } catch { return 'ZipShip'; }
  });
  const [hostOs, setHostOs] = useState<'linux' | 'windows'>(() => {
    try { return localStorage.getItem('zipship.hostOs') === 'windows' ? 'windows' : 'linux'; } catch { return 'linux'; }
  });

  // --- State: Local Config ---
  const [workDir, setWorkDir] = useState<string>(() => {
    try { return localStorage.getItem('zipship.workDir') || ''; } catch { return ''; }
  });

  // --- State: Remote Config ---
  const [host, setHost] = useState<string>(() => {
    try { return localStorage.getItem('zipship.host') || ''; } catch { return ''; }
  });
  const [port, setPort] = useState<number>(() => {
    try { const s = localStorage.getItem('zipship.port'); const n = s ? Number(s) : 22; return Number.isFinite(n) && n > 0 ? n : 22; } catch { return 22; }
  });
  const [username, setUsername] = useState<string>(() => {
    try { return localStorage.getItem('zipship.username') || ''; } catch { return ''; }
  });
  const [remoteDir, setRemoteDir] = useState<string>(() => {
    try { return localStorage.getItem('zipship.remoteDir') || ''; } catch { return ''; }
  });
  const [authType, setAuthType] = useState<'password' | 'key_file'>(() => {
    try { return localStorage.getItem('zipship.authType') === 'key_file' ? 'key_file' : 'password'; } catch { return 'password'; }
  });
  const [password, setPassword] = useState('');
  const [privateKeyPath, setPrivateKeyPath] = useState<string>(() => {
    try { return localStorage.getItem('zipship.privateKeyPath') || ''; } catch { return ''; }
  });
  const [passphrase, setPassphrase] = useState('');
  
  // --- State: Overwrite Prompt ---
  const [overwritePrompt, setOverwritePrompt] = useState<{
    open: boolean;
    resolve: ((v: 'ok' | 'cancel' | 'dont_remind') => void) | null;
  }>({ open: false, resolve: null });

  // --- Effects: Theme ---
  useEffect(() => {
    try { localStorage.setItem('zipship.theme', theme); } catch {}
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // --- Effects: Logging ---
  useEffect(() => {
    addLog('系统', 'ZipShip 已初始化。', 'info');
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

  // --- Effects: LocalStorage Persistence ---
  useEffect(() => { try { localStorage.setItem('zipship.suppressOverwritePrompt', suppressOverwritePrompt ? '1' : '0'); } catch {} }, [suppressOverwritePrompt]);
  useEffect(() => { try { localStorage.setItem('zipship.keepLocalHistory', keepLocalHistory ? '1' : '0'); } catch {} }, [keepLocalHistory]);
  useEffect(() => { try { localStorage.setItem('zipship.projectName', projectName); } catch {} }, [projectName]);
  useEffect(() => { try { localStorage.setItem('zipship.workDir', workDir); } catch {} }, [workDir]);
  useEffect(() => {
    try {
      localStorage.setItem('zipship.host', host);
      localStorage.setItem('zipship.port', String(port));
      localStorage.setItem('zipship.username', username);
      localStorage.setItem('zipship.remoteDir', remoteDir);
      localStorage.setItem('zipship.hostOs', hostOs);
      localStorage.setItem('zipship.authType', authType);
      localStorage.setItem('zipship.privateKeyPath', privateKeyPath);
    } catch {}
  }, [authType, host, hostOs, port, privateKeyPath, remoteDir, username]);

  // --- Effects: Version Check ---
  useEffect(() => {
    let active = true;
    versionNext(version).then(v => { if (active) setNextVersion(v); }).catch(() => {});
    return () => { active = false; };
  }, [version]);

  // --- Computed ---
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

  // --- Handlers ---
  const pickWorkDir = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === 'string') setWorkDir(selected);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('错误', `无法打开目录选择框: ${msg}`, 'error');
      setErrorBanner(`无法打开目录选择框: ${msg}`);
    }
  };

  const pickPrivateKey = async () => {
    try {
      const selected = await open({ directory: false, multiple: false });
      if (typeof selected === 'string') setPrivateKeyPath(selected);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('错误', `无法打开文件选择框: ${msg}`, 'error');
      setErrorBanner(`无法打开文件选择框: ${msg}`);
    }
  };

  const ensureTrusted = async (err: ApiError) => {
    if (err.code !== 'host_key_not_trusted') throw err;
    const msg = err.status === 'Mismatch'
      ? `主机指纹已变更: ${err.host}:${err.port}\n${err.fingerprint}\n\n是否信任并继续？`
      : `首次连接: ${err.host}:${err.port}\n${err.fingerprint}\n\n是否信任并继续？`;
    const ok = window.confirm(msg);
    if (!ok) throw { code: 'message', message: '已取消信任主机。' } satisfies ApiError;
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
    setStatus('准备中...');
    addLog('系统', '开始发布流程...', 'info');
    const slowTimer = window.setTimeout(() => {
      addLog('系统', '操作耗时较长，请耐心等待...', 'info');
    }, 15000);

    try {
      if (!canShip) {
        const msg = '配置不完整。';
        addLog('系统', msg, 'error');
        setErrorBanner(msg);
        setStatus('不完整');
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

      setStatus('打包中...');
      addLog('打包', `压缩中: ${workDir}`, 'info');
      const pkg = await packageCreate({
        projectName,
        version,
        workDir,
        keepLocalHistory
      });
      addLog('打包', `已创建: ${pkg.zip_name}`, 'success');

      setStatus('上传中...');
      addLog('SFTP', `上传至 ${host}:${port}...`, 'info');
      const auth = authType === 'password'
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
        addLog('SFTP', `上传完成 (${res.remote_total} bytes)`, 'success');
      } catch (e) {
        const err = e as ApiError;
        if (err.code === 'host_key_not_trusted') {
          await ensureTrusted(err);
          const res = await sftpUploadZip(uploadReq);
          addLog('SFTP', `上传完成 (${res.remote_total} bytes)`, 'success');
        } else {
          throw err;
        }
      }

      setStatus('解压中...');
      addLog('SSH', '正在解压远程文件...', 'info');
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
        const msg = `解压失败 (exit ${exit})。`;
        addLog('SSH', msg, 'error');
        if (unzipRes.unzip.stderr) addLog('SSH', unzipRes.unzip.stderr, 'error');
        setErrorBanner(msg);
        setStatus('失败');
        return;
      }

      const bumped = await versionNext(version);
      setVersion(bumped);
      addLog('SSH', `发布成功！当前版本: ${bumped}`, 'success');
      addLog('日志', opsLogPath ? `日志已保存: ${opsLogPath}` : '日志已保存: (无路径)', 'info');
      setStatus(`已发布 ${bumped}`);
      
      setTimeout(() => {
        setStatus('就绪');
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
    <div className="flex flex-col h-screen bg-bg text-text font-sans selection:bg-accent selection:text-white relative transition-colors duration-300">
      <div className="crt-overlay pointer-events-none fixed inset-0 z-50 opacity-10" />
      
      <OverwritePrompt 
        open={overwritePrompt.open} 
        onResolve={(decision) => {
          overwritePrompt.resolve?.(decision);
          setOverwritePrompt({ open: false, resolve: null });
        }} 
      />

      <Header 
        version={version} 
        onToggleSettings={() => setIsSettingsOpen(v => !v)}
        theme={theme}
        onToggleTheme={() => setTheme(v => v === 'dark' ? 'light' : 'dark')}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto overflow-y-auto scrollbar-thin scrollbar-thumb-surface-alt scrollbar-track-transparent">
        <div className="flex flex-col gap-4 p-4 sm:p-6 pb-[400px]">
        <ErrorBanner message={errorBanner} onClear={() => setErrorBanner('')} />

        <SettingsPanel 
          isOpen={isSettingsOpen}
          projectName={projectName}
          setProjectName={setProjectName}
          suppressOverwritePrompt={suppressOverwritePrompt}
          setSuppressOverwritePrompt={setSuppressOverwritePrompt}
          keepLocalHistory={keepLocalHistory}
          setKeepLocalHistory={setKeepLocalHistory}
          hostOs={hostOs}
          setHostOs={setHostOs}
        />
        
        <LocalSection 
          workDir={workDir} 
          pickWorkDir={pickWorkDir} 
        />

        <RemoteSection 
          host={host} setHost={setHost}
          port={port} setPort={setPort}
          username={username} setUsername={setUsername}
          authType={authType} setAuthType={setAuthType}
          password={password} setPassword={setPassword}
          privateKeyPath={privateKeyPath}
          pickPrivateKey={pickPrivateKey}
          passphrase={passphrase} setPassphrase={setPassphrase}
          remoteDir={remoteDir} setRemoteDir={setRemoteDir}
          hostOs={hostOs}
          canShip={canShip}
        />
        </div>
      </main>

      <DeployButton 
        isShipping={isShipping}
        canShip={canShip}
        status={status}
        version={version}
        nextVersion={nextVersion}
        onShip={handleShip}
      />

      <LogsPanel 
        isOpen={isLogsOpen} 
        onClose={() => setIsLogsOpen(false)} 
        logs={logs} 
        opsLogPath={opsLogPath} 
      />

      <Footer 
        hostOs={hostOs} 
        isLogsOpen={isLogsOpen} 
        onToggleLogs={() => setIsLogsOpen(v => !v)} 
        status={status}
      />
    </div>
  );
}
