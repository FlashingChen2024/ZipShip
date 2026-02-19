use std::path::PathBuf;

use clap::{Parser, Subcommand};
use zipship_core::{
  config::{default_app_paths, load_config, save_config},
  error::{Result, ZipShipError},
  log::{append_jsonl, OperationLogEntry, OperationStage, OperationStatus},
  package::{create_package, PackageRequest},
  ssh::{fetch_host_key, sftp_upload, trust_host_key, unzip_and_maybe_delete, Auth, HostOs, SshTarget, UnzipRequest, UploadRequest},
  version::VersionTriple,
};

#[derive(Debug, Parser)]
#[command(name = "zipship")]
struct Cli {
  #[command(subcommand)]
  cmd: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
  ConfigShow,
  ConfigSet {
    #[arg(long)]
    project_name: Option<String>,
    #[arg(long)]
    work_dir: Option<PathBuf>,
    #[arg(long)]
    remote_host: Option<String>,
    #[arg(long)]
    remote_port: Option<u16>,
    #[arg(long)]
    username: Option<String>,
    #[arg(long)]
    remote_dir: Option<String>,
    #[arg(long)]
    host_os: Option<String>,
    #[arg(long)]
    keep_local_history: Option<bool>,
  },
  VersionNext {
    #[arg(long)]
    current: String,
  },
  Package {
    #[arg(long)]
    project_name: String,
    #[arg(long)]
    version: String,
    #[arg(long)]
    work_dir: PathBuf,
    #[arg(long, default_value_t = true)]
    keep_local_history: bool,
  },
  HostKeyFetch {
    #[arg(long)]
    host: String,
    #[arg(long, default_value_t = 22)]
    port: u16,
  },
  HostKeyTrust {
    #[arg(long)]
    host: String,
    #[arg(long, default_value_t = 22)]
    port: u16,
  },
  Upload {
    #[arg(long)]
    host: String,
    #[arg(long, default_value_t = 22)]
    port: u16,
    #[arg(long)]
    username: String,
    #[arg(long)]
    password: Option<String>,
    #[arg(long)]
    key: Option<PathBuf>,
    #[arg(long)]
    key_pass: Option<String>,
    #[arg(long)]
    local_zip: PathBuf,
    #[arg(long)]
    remote_dir: String,
    #[arg(long)]
    remote_name: String,
  },
  Unzip {
    #[arg(long)]
    host: String,
    #[arg(long, default_value_t = 22)]
    port: u16,
    #[arg(long)]
    username: String,
    #[arg(long)]
    password: Option<String>,
    #[arg(long)]
    key: Option<PathBuf>,
    #[arg(long)]
    key_pass: Option<String>,
    #[arg(long)]
    os: String,
    #[arg(long)]
    remote_dir: String,
    #[arg(long)]
    zip_name: String,
  },
  Pipeline {
    #[arg(long)]
    project_name: String,
    #[arg(long)]
    version: String,
    #[arg(long)]
    work_dir: PathBuf,
    #[arg(long, default_value_t = true)]
    keep_local_history: bool,
    #[arg(long)]
    host: String,
    #[arg(long, default_value_t = 22)]
    port: u16,
    #[arg(long)]
    username: String,
    #[arg(long)]
    password: Option<String>,
    #[arg(long)]
    key: Option<PathBuf>,
    #[arg(long)]
    key_pass: Option<String>,
    #[arg(long)]
    os: String,
    #[arg(long)]
    remote_dir: String,
  },
}

fn parse_os(s: &str) -> Result<HostOs> {
  match s.to_lowercase().as_str() {
    "linux" => Ok(HostOs::Linux),
    "windows" => Ok(HostOs::Windows),
    _ => Err(ZipShipError::RemoteExecFailed("os 只能是 linux 或 windows".to_string())),
  }
}

fn pick_auth(username: String, password: Option<String>, key: Option<PathBuf>, key_pass: Option<String>) -> Result<Auth> {
  match (password, key) {
    (Some(pw), None) => Ok(Auth::Password { username, password: pw }),
    (None, Some(k)) => Ok(Auth::KeyFile { username, private_key_path: k, passphrase: key_pass }),
    _ => Err(ZipShipError::SshAuthFailed("必须选择 password 或 key 其中一种".to_string())),
  }
}

fn main() -> Result<()> {
  let cli = Cli::parse();
  let paths = default_app_paths()?;

  match cli.cmd {
    Command::ConfigShow => {
      let cfg = load_config(&paths.config_path)?;
      println!("{}", serde_json::to_string_pretty(&cfg).unwrap());
    }
    Command::ConfigSet {
      project_name,
      work_dir,
      remote_host,
      remote_port,
      username,
      remote_dir,
      host_os,
      keep_local_history,
    } => {
      let mut cfg = load_config(&paths.config_path)?;
      if let Some(v) = project_name {
        cfg.project_name = v;
      }
      if let Some(v) = work_dir {
        cfg.work_dir = Some(v);
      }
      if let Some(v) = remote_host {
        cfg.remote_host = Some(v);
      }
      if let Some(v) = remote_port {
        cfg.remote_port = Some(v);
      }
      if let Some(v) = username {
        cfg.username = Some(v);
      }
      if let Some(v) = remote_dir {
        cfg.remote_dir = Some(v);
      }
      if let Some(v) = host_os {
        cfg.host_os = Some(parse_os(&v)?);
      }
      if let Some(v) = keep_local_history {
        cfg.keep_local_history = v;
      }
      save_config(&paths.config_path, &cfg)?;
      println!("ok");
    }
    Command::VersionNext { current } => {
      let v = VersionTriple::parse(&current)?;
      println!("{}", v.next_default().to_string_v());
    }
    Command::Package {
      project_name,
      version,
      work_dir,
      keep_local_history,
    } => {
      let res = create_package(&PackageRequest {
        project_name: project_name.clone(),
        version: version.clone(),
        work_dir: work_dir.clone(),
        keep_local_history,
      })?;
      println!("{}", serde_json::to_string_pretty(&res).unwrap());

      let log_path = zipship_core::log::default_work_dir_logs_dir(&work_dir).join("ops.jsonl");
      append_jsonl(
        &log_path,
        &OperationLogEntry {
          time: time::OffsetDateTime::now_utc(),
          project_name,
          version: Some(version),
          stage: OperationStage::Package,
          status: OperationStatus::Success,
          message: "package ok".to_string(),
          stdout: None,
          stderr: None,
        },
      )?;
    }
    Command::HostKeyFetch { host, port } => {
      let info = fetch_host_key(&SshTarget { host, port })?;
      println!("{}", serde_json::to_string_pretty(&info).unwrap());
    }
    Command::HostKeyTrust { host, port } => {
      let info = trust_host_key(&SshTarget { host, port }, &paths.known_hosts_path)?;
      println!("{}", serde_json::to_string_pretty(&info).unwrap());
    }
    Command::Upload {
      host,
      port,
      username,
      password,
      key,
      key_pass,
      local_zip,
      remote_dir,
      remote_name,
    } => {
      let auth = pick_auth(username, password, key, key_pass)?;
      let res = sftp_upload(&UploadRequest {
        target: SshTarget { host, port },
        auth,
        known_hosts_path: paths.known_hosts_path.clone(),
        local_path: local_zip,
        remote_dir,
        remote_name,
      })?;
      println!("{}", serde_json::to_string_pretty(&res).unwrap());
    }
    Command::Unzip {
      host,
      port,
      username,
      password,
      key,
      key_pass,
      os,
      remote_dir,
      zip_name,
    } => {
      let auth = pick_auth(username, password, key, key_pass)?;
      let res = unzip_and_maybe_delete(&UnzipRequest {
        target: SshTarget { host, port },
        auth,
        known_hosts_path: paths.known_hosts_path.clone(),
        os: parse_os(&os)?,
        remote_dir,
        zip_name,
      })?;
      println!("{}", serde_json::to_string_pretty(&res).unwrap());
    }
    Command::Pipeline {
      project_name,
      version,
      work_dir,
      keep_local_history,
      host,
      port,
      username,
      password,
      key,
      key_pass,
      os,
      remote_dir,
    } => {
      let pkg = create_package(&PackageRequest {
        project_name: project_name.clone(),
        version: version.clone(),
        work_dir: work_dir.clone(),
        keep_local_history,
      })?;

      let auth = pick_auth(username, password, key, key_pass)?;
      let target = SshTarget { host, port };

      let _upload = sftp_upload(&UploadRequest {
        target: target.clone(),
        auth: auth.clone(),
        known_hosts_path: paths.known_hosts_path.clone(),
        local_path: pkg.zip_path.clone(),
        remote_dir: remote_dir.clone(),
        remote_name: pkg.zip_name.clone(),
      })?;

      let unzip = unzip_and_maybe_delete(&UnzipRequest {
        target,
        auth,
        known_hosts_path: paths.known_hosts_path.clone(),
        os: parse_os(&os)?,
        remote_dir: remote_dir.clone(),
        zip_name: pkg.zip_name.clone(),
      })?;

      let ok = unzip.unzip.exit_status.unwrap_or(1) == 0;
      let stdout = unzip.unzip.stdout.clone();
      let stderr = unzip.unzip.stderr.clone();
      let log_path = zipship_core::log::default_work_dir_logs_dir(&work_dir).join("ops.jsonl");
      append_jsonl(
        &log_path,
        &OperationLogEntry {
          time: time::OffsetDateTime::now_utc(),
          project_name,
          version: Some(version),
          stage: OperationStage::Pipeline,
          status: if ok { OperationStatus::Success } else { OperationStatus::Failure },
          message: "pipeline done".to_string(),
          stdout: Some(stdout),
          stderr: Some(stderr),
        },
      )?;

      println!("{}", serde_json::to_string_pretty(&unzip).unwrap());
    }
  }

  Ok(())
}
