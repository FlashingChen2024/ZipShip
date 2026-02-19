use std::{
  fs,
  io::{self},
  path::{Path, PathBuf},
};

use walkdir::WalkDir;
use zip::write::FileOptions;

use crate::{
  error::{Result, ZipShipError},
  ignore_rules::IgnoreRules,
};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PackageRequest {
  pub project_name: String,
  pub version: String,
  pub work_dir: PathBuf,
  pub keep_local_history: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PackageResult {
  pub zip_path: PathBuf,
  pub zip_name: String,
  pub overwritten: bool,
  pub included_files: u64,
  pub bytes_written: u64,
}

pub fn default_dist_dir(work_dir: &Path) -> PathBuf {
  work_dir.join(".zipship").join("dist")
}

pub fn make_zip_name(project_name: &str, version: &str) -> String {
  format!("{}_{}.zip", project_name, version)
}

pub fn create_package(req: &PackageRequest) -> Result<PackageResult> {
  if !req.work_dir.exists() {
    return Err(ZipShipError::WorkDirNotFound(req.work_dir.clone()));
  }

  let dist_dir = default_dist_dir(&req.work_dir);
  fs::create_dir_all(&dist_dir).map_err(|e| ZipShipError::CreateDirFailed { path: dist_dir.clone(), source: e })?;

  if !req.keep_local_history {
    for entry in fs::read_dir(&dist_dir).map_err(|e| ZipShipError::ReadFailed { path: dist_dir.clone(), source: e })? {
      let entry = entry.map_err(|e| ZipShipError::ReadFailed { path: dist_dir.clone(), source: e })?;
      let path = entry.path();
      if path.is_file() {
        let _ = fs::remove_file(&path);
      }
    }
  }

  let zip_name = make_zip_name(&req.project_name, &req.version);
  let zip_path = dist_dir.join(&zip_name);
  let overwritten = zip_path.exists();

  let ignore = IgnoreRules::from_work_dir(&req.work_dir)?;

  let zip_file = fs::File::create(&zip_path).map_err(|e| ZipShipError::WriteFailed { path: zip_path.clone(), source: e })?;
  let mut zip = zip::ZipWriter::new(zip_file);
  let options = FileOptions::<()>::default()
    .compression_method(zip::CompressionMethod::Deflated)
    .unix_permissions(0o644);

  let mut included_files = 0u64;
  let mut bytes_written = 0u64;

  for entry in WalkDir::new(&req.work_dir).follow_links(false).into_iter() {
    let entry = entry.map_err(|e| ZipShipError::ReadFailed { path: req.work_dir.clone(), source: io::Error::new(io::ErrorKind::Other, e) })?;
    let path = entry.path();
    if path == req.work_dir {
      continue;
    }

    let is_dir = entry.file_type().is_dir();
    if ignore.is_ignored(&req.work_dir, path, is_dir)? {
      continue;
    }

    let rel = path.strip_prefix(&req.work_dir).map_err(|_| ZipShipError::PathOutsideWorkDir { path: path.to_path_buf() })?;
    let name = rel.to_string_lossy().replace('\\', "/");

    if is_dir {
      zip.add_directory(name, options).map_err(|e| ZipShipError::WriteFailed {
        path: zip_path.clone(),
        source: io::Error::new(io::ErrorKind::Other, e),
      })?;
      continue;
    }

    zip.start_file(name, options).map_err(|e| ZipShipError::WriteFailed {
      path: zip_path.clone(),
      source: io::Error::new(io::ErrorKind::Other, e),
    })?;

    let mut f = fs::File::open(path).map_err(|e| ZipShipError::ReadFailed { path: path.to_path_buf(), source: e })?;
    let copied = io::copy(&mut f, &mut zip).map_err(|e| ZipShipError::WriteFailed { path: zip_path.clone(), source: e })?;
    included_files += 1;
    bytes_written += copied;
  }

  zip.finish().map_err(|e| ZipShipError::WriteFailed {
    path: zip_path.clone(),
    source: io::Error::new(io::ErrorKind::Other, e),
  })?;

  Ok(PackageResult {
    zip_path,
    zip_name,
    overwritten,
    included_files,
    bytes_written,
  })
}
