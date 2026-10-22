use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::db::Database;
use crate::services::project_archive::{
    self, ArchiveProgress, ExportSummary, ImportSummary,
};

const PROGRESS_EVENT: &str = "project-archive-progress";

/// Emits at most ~100 progress events per run so a book with thousands of sentences does not
/// flood the webview.
fn progress_emitter(app: AppHandle, kind: &'static str) -> impl FnMut(usize, usize) {
    let mut last_percent = usize::MAX;
    move |current, total| {
        let percent = if total == 0 { 100 } else { current * 100 / total };
        if percent != last_percent || current == total {
            last_percent = percent;
            let _ = app.emit(
                PROGRESS_EVENT,
                ArchiveProgress { kind: kind.to_string(), current, total },
            );
        }
    }
}

/// Export a project with all its text, settings and audio into a single `.bsproj` file.
#[tauri::command]
pub async fn export_project_archive(
    project_id: String,
    dest_path: String,
    app_handle: AppHandle,
    db: State<'_, Arc<Database>>,
) -> Result<ExportSummary, String> {
    let db = db.inner().clone();
    let emitter = progress_emitter(app_handle, "export");
    tokio::task::spawn_blocking(move || {
        project_archive::export_project(&db, &project_id, &PathBuf::from(dest_path), emitter)
    })
    .await
    .map_err(|e| format!("Task xuất dự án lỗi: {}", e))?
}

/// Import a `.bsproj` file as a new project in this machine's library.
#[tauri::command]
pub async fn import_project_archive(
    file_path: String,
    app_handle: AppHandle,
    db: State<'_, Arc<Database>>,
) -> Result<ImportSummary, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./data"));
    let db = db.inner().clone();
    let emitter = progress_emitter(app_handle, "import");
    tokio::task::spawn_blocking(move || {
        project_archive::import_project(&db, &PathBuf::from(file_path), &app_dir, emitter)
    })
    .await
    .map_err(|e| format!("Task nhập dự án lỗi: {}", e))?
}
