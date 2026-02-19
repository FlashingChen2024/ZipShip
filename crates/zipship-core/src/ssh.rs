use std::{
  fs,
  io::{self, Read, Seek, SeekFrom, Write},
  net::TcpStream,
  path::{Path, PathBuf},
};

use base64::Engine;
use sha2::{Digest, Sha256};
use ssh2::{KnownHostFileKind, KnownHosts, Session};

use crate::error::{HostKeyStatus, Result, ZipShipError};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Auth {
  Password { username: String, password: String },
  KeyFile { username: String, private_key_path: PathBuf, passphrase: Option<String> },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum HostOs {
  Linux,
  Windows,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SshTarget {
  pub host: String,
  pub port: u16,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct HostKeyInfo {
  pub fingerprint: String,
  pub key_base64: String,
}

fn sha256_fingerprint_base64(key: &[u8]) -> String {
  let mut hasher = Sha256::new();
  hasher.update(key);
  let digest = hasher.finalize();
  format!("SHA256:{}", base64::engine::general_purpose::STANDARD.encode(digest))
}

fn connect_session(target: &SshTarget) -> Result<Session> {
  let tcp = TcpStream::connect((target.host.as_str(), target.port))
    .map_err(|e| ZipShipError::SshConnectFailed(e.to_string()))?;
  let mut sess = Session::new().map_err(|e| ZipShipError::SshConnectFailed(e.to_string()))?;
  sess.set_tcp_stream(tcp);
  sess.handshake().map_err(|e| ZipShipError::SshConnectFailed(e.to_string()))?;
  Ok(sess)
}

fn load_known_hosts(sess: &Session, path: &Path) -> Result<KnownHosts> {
  let mut known_hosts = sess.known_hosts().map_err(|e| ZipShipError::SshConnectFailed(e.to_string()))?;
  if path.exists() {
    known_hosts
      .read_file(path, KnownHostFileKind::OpenSSH)
      .map_err(|e| ZipShipError::ReadFailed { path: path.to_path_buf(), source: io::Error::new(io::ErrorKind::Other, e) })?;
  }
  Ok(known_hosts)
}

fn ensure_host_key_trusted(sess: &Session, target: &SshTarget, known_hosts_path: &Path) -> Result<()> {
  let (key, _key_type) = sess
    .host_key()
    .ok_or_else(|| ZipShipError::SshConnectFailed("无法获取主机公钥".to_string()))?;

  let fingerprint = sha256_fingerprint_base64(key);
  let key_base64 = base64::engine::general_purpose::STANDARD.encode(key);

  let known_hosts = load_known_hosts(sess, known_hosts_path)?;

  let check = known_hosts.check_port(&target.host, target.port, key);

  match check {
    ssh2::CheckResult::Match => Ok(()),
    ssh2::CheckResult::NotFound => Err(ZipShipError::HostKeyNotTrusted {
      host: target.host.clone(),
      port: target.port,
      fingerprint,
      key_base64,
      known_hosts_path: known_hosts_path.to_path_buf(),
      status: HostKeyStatus::NotFound,
    }),
    ssh2::CheckResult::Mismatch => Err(ZipShipError::HostKeyNotTrusted {
      host: target.host.clone(),
      port: target.port,
      fingerprint,
      key_base64,
      known_hosts_path: known_hosts_path.to_path_buf(),
      status: HostKeyStatus::Mismatch,
    }),
    ssh2::CheckResult::Failure => Err(ZipShipError::SshConnectFailed("主机指纹校验失败".to_string())),
  }
}

pub fn fetch_host_key(target: &SshTarget) -> Result<HostKeyInfo> {
  let sess = connect_session(target)?;
  let (key, _key_type) = sess
    .host_key()
    .ok_or_else(|| ZipShipError::SshConnectFailed("无法获取主机公钥".to_string()))?;
  Ok(HostKeyInfo {
    fingerprint: sha256_fingerprint_base64(key),
    key_base64: base64::engine::general_purpose::STANDARD.encode(key),
  })
}

pub fn trust_host_key(target: &SshTarget, known_hosts_path: &Path) -> Result<HostKeyInfo> {
  if let Some(parent) = known_hosts_path.parent() {
    fs::create_dir_all(parent).map_err(|e| ZipShipError::CreateDirFailed { path: parent.to_path_buf(), source: e })?;
  }
  let sess = connect_session(target)?;
  let (key, key_type) = sess
    .host_key()
    .ok_or_else(|| ZipShipError::SshConnectFailed("无法获取主机公钥".to_string()))?;

  let mut known_hosts = load_known_hosts(&sess, known_hosts_path)?;
  let host_port = format!("[{}]:{}", target.host, target.port);
  known_hosts
    .add(&host_port, key, &host_port, key_type.into())
    .map_err(|e| ZipShipError::SshConnectFailed(e.to_string()))?;
  known_hosts
    .write_file(known_hosts_path, KnownHostFileKind::OpenSSH)
    .map_err(|e| ZipShipError::WriteFailed { path: known_hosts_path.to_path_buf(), source: io::Error::new(io::ErrorKind::Other, e) })?;

  Ok(HostKeyInfo {
    fingerprint: sha256_fingerprint_base64(key),
    key_base64: base64::engine::general_purpose::STANDARD.encode(key),
  })
}

fn auth_session(sess: &Session, auth: &Auth) -> Result<()> {
  match auth {
    Auth::Password { username, password } => sess
      .userauth_password(username, password)
      .map_err(|e| ZipShipError::SshAuthFailed(e.to_string()))?,
    Auth::KeyFile { username, private_key_path, passphrase } => sess
      .userauth_pubkey_file(username, None, private_key_path, passphrase.as_deref())
      .map_err(|e| ZipShipError::SshAuthFailed(e.to_string()))?,
  }
  if !sess.authenticated() {
    return Err(ZipShipError::SshAuthFailed("认证未通过".to_string()));
  }
  Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UploadRequest {
  pub target: SshTarget,
  pub auth: Auth,
  pub known_hosts_path: PathBuf,
  pub local_path: PathBuf,
  pub remote_dir: String,
  pub remote_name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UploadResult {
  pub remote_path: String,
  pub bytes_sent: u64,
  pub resumed_from: Option<u64>,
  pub remote_total: u64,
}

pub fn sftp_upload(req: &UploadRequest) -> Result<UploadResult> {
  let sess = connect_session(&req.target)?;
  ensure_host_key_trusted(&sess, &req.target, &req.known_hosts_path)?;
  auth_session(&sess, &req.auth)?;

  let sftp = sess.sftp().map_err(|e| ZipShipError::SftpFailed(e.to_string()))?;

  let mut local = fs::File::open(&req.local_path).map_err(|e| ZipShipError::ReadFailed { path: req.local_path.clone(), source: e })?;
  let local_size = local.metadata().map_err(|e| ZipShipError::ReadFailed { path: req.local_path.clone(), source: e })?.len();

  let remote_path = format!("{}/{}", req.remote_dir.trim_end_matches('/'), req.remote_name);
  let mut resumed_from = None;

  let remote_size = match sftp.stat(Path::new(&remote_path)) {
    Ok(stat) => stat.size.unwrap_or(0),
    Err(_) => 0,
  };

  let mut remote_file = if remote_size > 0 && remote_size < local_size {
    let mut f = sftp
      .open_mode(
        Path::new(&remote_path),
        ssh2::OpenFlags::WRITE | ssh2::OpenFlags::APPEND,
        0o644,
        ssh2::OpenType::File,
      )
      .map_err(|e| ZipShipError::SftpFailed(e.to_string()))?;
    f.seek(SeekFrom::Start(remote_size)).map_err(|e| ZipShipError::SftpFailed(e.to_string()))?;
    local.seek(SeekFrom::Start(remote_size)).map_err(|e| ZipShipError::ReadFailed { path: req.local_path.clone(), source: e })?;
    resumed_from = Some(remote_size);
    f
  } else {
    sftp
      .open_mode(
        Path::new(&remote_path),
        ssh2::OpenFlags::WRITE | ssh2::OpenFlags::CREATE | ssh2::OpenFlags::TRUNCATE,
        0o644,
        ssh2::OpenType::File,
      )
      .map_err(|e| ZipShipError::SftpFailed(e.to_string()))?
  };

  let mut buf = vec![0u8; 1024 * 1024];
  let mut sent = 0u64;
  loop {
    let n = local.read(&mut buf).map_err(|e| ZipShipError::ReadFailed { path: req.local_path.clone(), source: e })?;
    if n == 0 {
      break;
    }
    remote_file.write_all(&buf[..n]).map_err(|e| ZipShipError::SftpFailed(e.to_string()))?;
    sent += n as u64;
  }
  remote_file.flush().ok();

  let final_stat = sftp.stat(Path::new(&remote_path)).map_err(|e| ZipShipError::SftpFailed(e.to_string()))?;
  let remote_total = final_stat.size.unwrap_or(remote_size + sent);

  Ok(UploadResult {
    remote_path,
    bytes_sent: sent,
    resumed_from,
    remote_total,
  })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExecRequest {
  pub target: SshTarget,
  pub auth: Auth,
  pub known_hosts_path: PathBuf,
  pub command: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExecResult {
  pub exit_status: Option<i32>,
  pub stdout: String,
  pub stderr: String,
}

pub fn ssh_exec(req: &ExecRequest) -> Result<ExecResult> {
  let sess = connect_session(&req.target)?;
  ensure_host_key_trusted(&sess, &req.target, &req.known_hosts_path)?;
  auth_session(&sess, &req.auth)?;

  let mut channel = sess.channel_session().map_err(|e| ZipShipError::RemoteExecFailed(e.to_string()))?;
  channel.exec(&req.command).map_err(|e| ZipShipError::RemoteExecFailed(e.to_string()))?;

  let mut stdout = String::new();
  let mut stderr = String::new();
  channel.read_to_string(&mut stdout).ok();
  channel.stderr().read_to_string(&mut stderr).ok();
  channel.wait_close().ok();
  let exit_status = channel.exit_status().ok();

  Ok(ExecResult {
    exit_status,
    stdout,
    stderr,
  })
}

pub fn build_unzip_command(os: HostOs, remote_dir: &str, zip_name: &str) -> String {
  let remote_dir = remote_dir.trim_end_matches('/');
  match os {
    HostOs::Linux => format!(
      "cd \"{d}\" && unzip -o \"{z}\" -d \"{d}\"",
      d = remote_dir,
      z = zip_name
    ),
    HostOs::Windows => {
      let zip_path = format!("{}\\{}", remote_dir.replace('/', "\\"), zip_name);
      let dir_path = remote_dir.replace('/', "\\");
      format!(
        "powershell -NoProfile -Command \"Expand-Archive -Path '{zip}' -DestinationPath '{dir}' -Force\"",
        zip = zip_path.replace('\'', "''"),
        dir = dir_path.replace('\'', "''")
      )
    }
  }
}

pub fn build_delete_zip_command(os: HostOs, remote_dir: &str, zip_name: &str) -> String {
  let remote_dir = remote_dir.trim_end_matches('/');
  match os {
    HostOs::Linux => format!("cd \"{d}\" && rm -f \"{z}\"", d = remote_dir, z = zip_name),
    HostOs::Windows => {
      let zip_path = format!("{}\\{}", remote_dir.replace('/', "\\"), zip_name);
      format!("del \"{}\"", zip_path)
    }
  }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UnzipRequest {
  pub target: SshTarget,
  pub auth: Auth,
  pub known_hosts_path: PathBuf,
  pub os: HostOs,
  pub remote_dir: String,
  pub zip_name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UnzipResult {
  pub unzip: ExecResult,
  pub delete_zip: Option<ExecResult>,
}

pub fn unzip_and_maybe_delete(req: &UnzipRequest) -> Result<UnzipResult> {
  let unzip_cmd = build_unzip_command(req.os, &req.remote_dir, &req.zip_name);
  let unzip = ssh_exec(&ExecRequest {
    target: req.target.clone(),
    auth: req.auth.clone(),
    known_hosts_path: req.known_hosts_path.clone(),
    command: unzip_cmd,
  })?;

  let ok = unzip.exit_status.unwrap_or(1) == 0;
  let delete_zip = if ok {
    let del_cmd = build_delete_zip_command(req.os, &req.remote_dir, &req.zip_name);
    Some(ssh_exec(&ExecRequest {
      target: req.target.clone(),
      auth: req.auth.clone(),
      known_hosts_path: req.known_hosts_path.clone(),
      command: del_cmd,
    })?)
  } else {
    None
  };

  Ok(UnzipResult { unzip, delete_zip })
}
