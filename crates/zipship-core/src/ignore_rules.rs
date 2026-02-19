use std::{fs, path::{Path, PathBuf}};

use ignore::gitignore::GitignoreBuilder;

use crate::error::{Result, ZipShipError};

#[derive(Debug, Clone)]
pub struct IgnoreRules {
  gitignore: ignore::gitignore::Gitignore,
}

impl IgnoreRules {
  pub fn from_work_dir(work_dir: &Path) -> Result<Self> {
    let mut builder = GitignoreBuilder::new(work_dir);
    builder.add_line(None, ".zipship/").map_err(|e| ZipShipError::IgnoreRulesInvalid { message: e.to_string() })?;

    let ignore_path = work_dir.join(".zipshipignore");
    if ignore_path.exists() {
      let content = fs::read_to_string(&ignore_path).map_err(|e| ZipShipError::ReadFailed { path: ignore_path.clone(), source: e })?;
      for (idx, line) in content.lines().enumerate() {
        builder
          .add_line(Some(ignore_path.clone()), line)
          .map_err(|e| ZipShipError::IgnoreRulesInvalid { message: format!("第 {} 行: {}", idx + 1, e) })?;
      }
    }

    let gitignore = builder
      .build()
      .map_err(|e| ZipShipError::IgnoreRulesInvalid { message: e.to_string() })?;
    Ok(Self { gitignore })
  }

  pub fn is_ignored(&self, work_dir: &Path, path: &Path, is_dir: bool) -> Result<bool> {
    let rel = path.strip_prefix(work_dir).map_err(|_| ZipShipError::PathOutsideWorkDir { path: path.to_path_buf() })?;
    let matched = self.gitignore.matched_path_or_any_parents(rel, is_dir).is_ignore();
    Ok(matched)
  }

  pub fn ignore_file_path(work_dir: &Path) -> PathBuf {
    work_dir.join(".zipshipignore")
  }
}
