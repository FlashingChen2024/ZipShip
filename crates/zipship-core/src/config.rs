use std::{
  fs,
  io,
  path::{Path, PathBuf},
};

use directories::ProjectDirs;

use crate::error::{Result, ZipShipError};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AppConfig {
  pub project_name: String,
  pub work_dir: Option<PathBuf>,
  pub remote_host: Option<String>,
  pub remote_port: Option<u16>,
  pub username: Option<String>,
  pub remote_dir: Option<String>,
  pub host_os: Option<crate::ssh::HostOs>,
  pub keep_local_history: bool,
  pub suppress_overwrite_prompt: bool,
  pub last_version: Option<String>,
}

impl Default for AppConfig {
  fn default() -> Self {
    Self {
      project_name: "ZipShip".to_string(),
      work_dir: None,
      remote_host: None,
      remote_port: Some(22),
      username: None,
      remote_dir: None,
      host_os: Some(crate::ssh::HostOs::Linux),
      keep_local_history: true,
      suppress_overwrite_prompt: false,
      last_version: Some("v1.0.0".to_string()),
    }
  }
}

#[derive(Debug, Clone)]
pub struct AppPaths {
  pub data_dir: PathBuf,
  pub config_path: PathBuf,
  pub known_hosts_path: PathBuf,
  pub logs_dir: PathBuf,
}

pub fn default_app_paths() -> Result<AppPaths> {
  let proj = ProjectDirs::from("dev", "zipship", "ZipShip")
    .ok_or_else(|| ZipShipError::CreateDirFailed { path: PathBuf::from("."), source: io::Error::new(io::ErrorKind::Other, "无法确定应用数据目录") })?;
  let data_dir = proj.data_dir().to_path_buf();
  let config_path = data_dir.join("config.json");
  let known_hosts_path = data_dir.join("known_hosts");
  let logs_dir = data_dir.join("logs");
  Ok(AppPaths {
    data_dir,
    config_path,
    known_hosts_path,
    logs_dir,
  })
}

pub fn load_config(path: &Path) -> Result<AppConfig> {
  if !path.exists() {
    return Ok(AppConfig::default());
  }
  let bytes = fs::read(path).map_err(|e| ZipShipError::ReadFailed { path: path.to_path_buf(), source: e })?;
  serde_json::from_slice(&bytes).map_err(|e| ZipShipError::ReadFailed { path: path.to_path_buf(), source: io::Error::new(io::ErrorKind::Other, e) })
}

pub fn save_config(path: &Path, cfg: &AppConfig) -> Result<()> {
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|e| ZipShipError::CreateDirFailed { path: parent.to_path_buf(), source: e })?;
  }
  let bytes = serde_json::to_vec_pretty(cfg).map_err(|e| ZipShipError::WriteFailed { path: path.to_path_buf(), source: io::Error::new(io::ErrorKind::Other, e) })?;
  fs::write(path, bytes).map_err(|e| ZipShipError::WriteFailed { path: path.to_path_buf(), source: e })?;
  Ok(())
}

