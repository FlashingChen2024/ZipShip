use std::{
  fs,
  io::{self, Write},
  path::{Path, PathBuf},
};

use time::OffsetDateTime;

use crate::error::{Result, ZipShipError};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum OperationStage {
  Package,
  Upload,
  Unzip,
  Pipeline,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum OperationStatus {
  Success,
  Failure,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OperationLogEntry {
  pub time: OffsetDateTime,
  pub project_name: String,
  pub version: Option<String>,
  pub stage: OperationStage,
  pub status: OperationStatus,
  pub message: String,
  pub stdout: Option<String>,
  pub stderr: Option<String>,
}

pub fn default_work_dir_logs_dir(work_dir: &Path) -> PathBuf {
  work_dir.join(".zipship").join("logs")
}

pub fn append_jsonl(path: &Path, entry: &OperationLogEntry) -> Result<()> {
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|e| ZipShipError::CreateDirFailed { path: parent.to_path_buf(), source: e })?;
  }
  let mut f = fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(path)
    .map_err(|e| ZipShipError::WriteFailed { path: path.to_path_buf(), source: e })?;
  let line = serde_json::to_string(entry).map_err(|e| ZipShipError::WriteFailed { path: path.to_path_buf(), source: io::Error::new(io::ErrorKind::Other, e) })?;
  f.write_all(line.as_bytes())
    .and_then(|_| f.write_all(b"\n"))
    .map_err(|e| ZipShipError::WriteFailed { path: path.to_path_buf(), source: e })?;
  Ok(())
}

