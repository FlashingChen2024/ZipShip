import { invoke } from '@tauri-apps/api/core';

export type ApiError =
  | {
      code: 'host_key_not_trusted';
      host: string;
      port: number;
      fingerprint: string;
      status: 'NotFound' | 'Mismatch';
    }
  | {
      code: 'message';
      message: string;
    };

function normalizeInvokeError(err: unknown): ApiError {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const e = err as any;
    if (e.code === 'host_key_not_trusted') return e as ApiError;
    if (e.code === 'message') return e as ApiError;
  }

  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'code' in parsed) {
      return parsed as ApiError;
    }
  } catch {
  }
  return { code: 'message', message: raw };
}

export type HostOs = 'linux' | 'windows';

export type Auth =
  | { type: 'password'; username: string; password: string }
  | { type: 'key_file'; username: string; privateKeyPath: string; passphrase?: string };

export type PackageRequest = {
  projectName: string;
  version: string;
  workDir: string;
  keepLocalHistory: boolean;
};

export type PackageResult = {
  zip_path: string;
  zip_name: string;
  overwritten: boolean;
  included_files: number;
  bytes_written: number;
};

export type UploadRequest = {
  target: { host: string; port: number };
  auth: Auth;
  localPath: string;
  remoteDir: string;
  remoteName: string;
};

export type UploadResult = {
  remote_path: string;
  bytes_sent: number;
  resumed_from: number | null;
  remote_total: number;
};

export type ExecResult = {
  exit_status: number | null;
  stdout: string;
  stderr: string;
};

export type UnzipRequest = {
  target: { host: string; port: number };
  auth: Auth;
  os: HostOs;
  remoteDir: string;
  zipName: string;
};

export type UnzipResult = {
  unzip: ExecResult;
  delete_zip: ExecResult | null;
};

export async function versionNext(current: string): Promise<string> {
  return invoke('version_next', { current });
}

export async function packageCreate(req: PackageRequest): Promise<PackageResult> {
  return invoke('package_create', { req });
}

export async function sshTrustHostKey(target: { host: string; port: number }): Promise<{ fingerprint: string; key_base64: string }> {
  return invoke('ssh_trust_host_key', { host: target.host, port: target.port });
}

export async function sftpUploadZip(req: UploadRequest): Promise<UploadResult> {
  try {
    const wireReq = {
      ...req,
      auth:
        req.auth.type === 'password'
          ? { type: 'password', username: req.auth.username, password: req.auth.password }
          : {
              type: 'key_file',
              username: req.auth.username,
              private_key_path: req.auth.privateKeyPath,
              passphrase: req.auth.passphrase
            }
    };
    return await invoke('sftp_upload_zip', { req: wireReq });
  } catch (e) {
    throw normalizeInvokeError(e);
  }
}

export async function sshUnzip(req: UnzipRequest): Promise<UnzipResult> {
  try {
    const wireReq = {
      ...req,
      auth:
        req.auth.type === 'password'
          ? { type: 'password', username: req.auth.username, password: req.auth.password }
          : {
              type: 'key_file',
              username: req.auth.username,
              private_key_path: req.auth.privateKeyPath,
              passphrase: req.auth.passphrase
            }
    };
    return await invoke('ssh_unzip', { req: wireReq });
  } catch (e) {
    throw normalizeInvokeError(e);
  }
}

