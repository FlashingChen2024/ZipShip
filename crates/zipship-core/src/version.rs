use crate::error::{Result, ZipShipError};

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct VersionTriple {
  pub major: u32,
  pub minor: u32,
  pub patch: u32,
}

impl VersionTriple {
  pub fn parse(input: &str) -> Result<Self> {
    let s = input.trim();
    let s = s.strip_prefix('v').unwrap_or(s);
    let parts: Vec<&str> = s.split('.').collect();
    if parts.len() != 3 {
      return Err(ZipShipError::InvalidVersion(input.to_string()));
    }
    let major = parts[0].parse::<u32>().map_err(|_| ZipShipError::InvalidVersion(input.to_string()))?;
    let minor = parts[1].parse::<u32>().map_err(|_| ZipShipError::InvalidVersion(input.to_string()))?;
    let patch = parts[2].parse::<u32>().map_err(|_| ZipShipError::InvalidVersion(input.to_string()))?;
    Ok(Self { major, minor, patch })
  }

  pub fn next_default(&self) -> Self {
    let mut major = self.major;
    let mut minor = self.minor;
    let mut patch = self.patch + 1;
    if patch >= 10 {
      patch = 0;
      minor += 1;
    }
    if minor >= 10 {
      minor = 0;
      major += 1;
    }
    Self { major, minor, patch }
  }

  pub fn to_string_v(&self) -> String {
    format!("v{}.{}.{}", self.major, self.minor, self.patch)
  }
}

