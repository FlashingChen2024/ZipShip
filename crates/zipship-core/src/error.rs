use std::{io, path::PathBuf};

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ZipShipError {
  #[error("工作目录不存在: {0}")]
  WorkDirNotFound(PathBuf),

  #[error("无法创建目录: {path}")]
  CreateDirFailed { path: PathBuf, source: io::Error },

  #[error("读取文件失败: {path}")]
  ReadFailed { path: PathBuf, source: io::Error },

  #[error("写入文件失败: {path}")]
  WriteFailed { path: PathBuf, source: io::Error },

  #[error("路径不在工作目录内: {path}")]
  PathOutsideWorkDir { path: PathBuf },

  #[error("忽略规则解析失败: {message}")]
  IgnoreRulesInvalid { message: String },

  #[error("版本号格式不合法: {0}")]
  InvalidVersion(String),

  #[error("SSH 连接失败: {0}")]
  SshConnectFailed(String),

  #[error("SSH 认证失败: {0}")]
  SshAuthFailed(String),

  #[error("主机指纹未被信任: {host}:{port} {fingerprint}")]
  HostKeyNotTrusted {
    host: String,
    port: u16,
    fingerprint: String,
    key_base64: String,
    known_hosts_path: PathBuf,
    status: HostKeyStatus,
  },

  #[error("SFTP 失败: {0}")]
  SftpFailed(String),

  #[error("远端命令执行失败: {0}")]
  RemoteExecFailed(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum HostKeyStatus {
  NotFound,
  Mismatch,
}

pub type Result<T> = std::result::Result<T, ZipShipError>;

