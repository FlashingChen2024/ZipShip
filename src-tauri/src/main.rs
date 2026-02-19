use std::path::PathBuf;

use tauri::command;
use tauri::async_runtime;
use zipship_core::{
  config::default_app_paths,
  error::ZipShipError,
  package::{create_package, PackageRequest, PackageResult},
  ssh::{fetch_host_key, sftp_upload, trust_host_key, unzip_and_maybe_delete, Auth, HostKeyInfo, HostOs, SshTarget, UnzipRequest, UnzipResult, UploadRequest, UploadResult},
  version::VersionTriple,
};

#[derive(Debug, serde::Serialize)]
#[serde(tag = "code", rename_all = "snake_case")]
enum ApiError {
  HostKeyNotTrusted {
    host: String,
    port: u16,
    fingerprint: String,
    status: zipship_core::error::HostKeyStatus,
  },
  Message {
    message: String,
  },
}

impl From<ZipShipError> for ApiError {
  fn from(value: ZipShipError) -> Self {
    match value {
      ZipShipError::HostKeyNotTrusted {
        host,
        port,
        fingerprint,
        status,
        ..
      } => ApiError::HostKeyNotTrusted {
        host,
        port,
        fingerprint,
        status,
      },
      other => ApiError::Message {
        message: other.to_string(),
      },
    }
  }
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiPackageRequest {
  project_name: String,
  version: String,
  work_dir: PathBuf,
  keep_local_history: bool,
}

#[derive(Debug, serde::Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum UiAuth {
  Password { username: String, password: String },
  KeyFile {
    username: String,
    private_key_path: PathBuf,
    passphrase: Option<String>,
  },
}

impl UiAuth {
  fn into_core(self) -> Auth {
    match self {
      UiAuth::Password { username, password } => Auth::Password { username, password },
      UiAuth::KeyFile {
        username,
        private_key_path,
        passphrase,
      } => Auth::KeyFile {
        username,
        private_key_path,
        passphrase,
      },
    }
  }
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiTarget {
  host: String,
  port: u16,
}

impl UiTarget {
  fn into_core(self) -> SshTarget {
    SshTarget {
      host: self.host,
      port: self.port,
    }
  }
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
enum UiHostOs {
  Linux,
  Windows,
}

impl UiHostOs {
  fn into_core(self) -> HostOs {
    match self {
      UiHostOs::Linux => HostOs::Linux,
      UiHostOs::Windows => HostOs::Windows,
    }
  }
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiUploadRequest {
  target: UiTarget,
  auth: UiAuth,
  local_path: PathBuf,
  remote_dir: String,
  remote_name: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct UiUnzipRequest {
  target: UiTarget,
  auth: UiAuth,
  os: UiHostOs,
  remote_dir: String,
  zip_name: String,
}

#[command]
fn version_next(current: String) -> Result<String, ApiError> {
  let v = VersionTriple::parse(&current).map_err(ApiError::from)?;
  Ok(v.next_default().to_string_v())
}

#[command]
async fn package_create(req: UiPackageRequest) -> Result<PackageResult, ApiError> {
  async_runtime::spawn_blocking(move || {
    create_package(&PackageRequest {
      project_name: req.project_name,
      version: req.version,
      work_dir: req.work_dir,
      keep_local_history: req.keep_local_history,
    })
    .map_err(ApiError::from)
  })
  .await
  .map_err(|e| ApiError::Message {
    message: format!("任务执行失败：{}", e),
  })?
}

#[command]
fn known_hosts_path() -> Result<PathBuf, ApiError> {
  Ok(default_app_paths().map_err(ApiError::from)?.known_hosts_path)
}

#[command]
async fn ssh_fetch_host_key(host: String, port: u16) -> Result<HostKeyInfo, ApiError> {
  async_runtime::spawn_blocking(move || fetch_host_key(&SshTarget { host, port }).map_err(ApiError::from))
    .await
    .map_err(|e| ApiError::Message {
      message: format!("任务执行失败：{}", e),
    })?
}

#[command]
async fn ssh_trust_host_key(host: String, port: u16) -> Result<HostKeyInfo, ApiError> {
  async_runtime::spawn_blocking(move || {
    let paths = default_app_paths().map_err(ApiError::from)?;
    trust_host_key(&SshTarget { host, port }, &paths.known_hosts_path).map_err(ApiError::from)
  })
  .await
  .map_err(|e| ApiError::Message {
    message: format!("任务执行失败：{}", e),
  })?
}

#[command]
async fn sftp_upload_zip(req: UiUploadRequest) -> Result<UploadResult, ApiError> {
  async_runtime::spawn_blocking(move || {
    let paths = default_app_paths().map_err(ApiError::from)?;
    sftp_upload(&UploadRequest {
      target: req.target.into_core(),
      auth: req.auth.into_core(),
      known_hosts_path: paths.known_hosts_path,
      local_path: req.local_path,
      remote_dir: req.remote_dir,
      remote_name: req.remote_name,
    })
    .map_err(ApiError::from)
  })
  .await
  .map_err(|e| ApiError::Message {
    message: format!("任务执行失败：{}", e),
  })?
}

#[command]
async fn ssh_unzip(req: UiUnzipRequest) -> Result<UnzipResult, ApiError> {
  async_runtime::spawn_blocking(move || {
    let paths = default_app_paths().map_err(ApiError::from)?;
    unzip_and_maybe_delete(&UnzipRequest {
      target: req.target.into_core(),
      auth: req.auth.into_core(),
      known_hosts_path: paths.known_hosts_path,
      os: req.os.into_core(),
      remote_dir: req.remote_dir,
      zip_name: req.zip_name,
    })
    .map_err(ApiError::from)
  })
  .await
  .map_err(|e| ApiError::Message {
    message: format!("任务执行失败：{}", e),
  })?
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      version_next,
      package_create,
      known_hosts_path,
      ssh_fetch_host_key,
      ssh_trust_host_key,
      sftp_upload_zip,
      ssh_unzip
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
