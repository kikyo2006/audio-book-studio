use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

use crate::db::Database;
use crate::models::{Chapter, EbookParsedData, Project};
use crate::services::ebook::parse_ebook_file;
use crate::services::tokenizer::tokenize_chapter;

#[tauri::command]
pub async fn parse_ebook(file_path: String) -> Result<EbookParsedData, String> {
    tokio::task::spawn_blocking(move || parse_ebook_file(&file_path))
        .await
        .map_err(|e| format!("Task lỗi: {}", e))?
}

#[tauri::command]
pub async fn import_ebook_to_project(
    file_path: String,
    data: EbookParsedData,
    db: State<'_, Arc<Database>>,
) -> Result<Project, String> {
    let db = db.inner().clone();

    tokio::task::spawn_blocking(move || {
        let project_id = Uuid::new_v4().to_string();
        let now = chrono_now();

        let ext = std::path::Path::new(&file_path)
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("epub")
            .to_string();

        let mut project = Project {
            id: project_id.clone(),
            title: data.title,
            author: data.author,
            description: data.description,
            source_file_path: Some(file_path),
            source_format: Some(ext),
            cover_path: None,
            cover_base64: data.cover_base64,
            chapter_count: data.chapters.len(),
            total_sentences: 0,
            completed_sentences: 0,
            total_duration: 0.0,
            status: "active".to_string(),
            created_at: now.clone(),
            updated_at: now,
        };

        let mut all_chapters = Vec::new();
        let mut all_sentences = Vec::new();

        for parsed_chap in data.chapters {
            let chap_id = Uuid::new_v4().to_string();
            let sentences = tokenize_chapter(&chap_id, &parsed_chap.content);
            let sentence_count = sentences.len();

            all_chapters.push(Chapter {
                id: chap_id,
                project_id: project_id.clone(),
                index: parsed_chap.index,
                title: parsed_chap.title,
                raw_content: parsed_chap.content,
                sentence_count,
                ready_sentence_count: 0,
                total_duration: 0.0,
                bgm_path: None,
                bgm_volume: Some(0.2),
                is_enabled: true,
            });

            all_sentences.extend(sentences);
        }

        project.total_sentences = all_sentences.len();

        db.insert_project(&project)?;
        db.insert_chapters(&all_chapters)?;
        db.insert_sentences(&all_sentences)?;

        Ok(project)
    })
    .await
    .map_err(|e| format!("Lỗi import project: {}", e))?
}

fn chrono_now() -> String {
    use std::time::SystemTime;
    let now = SystemTime::now();
    let duration = now
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}
