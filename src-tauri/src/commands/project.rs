use std::sync::Arc;
use tauri::State;

use crate::db::Database;
use crate::models::{Chapter, Project, Sentence};

#[tauri::command]
pub async fn get_projects(db: State<'_, Arc<Database>>) -> Result<Vec<Project>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.get_all_projects())
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_chapters(
    project_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<Chapter>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.get_chapters(&project_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_sentences(
    chapter_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<Sentence>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.get_sentences(&chapter_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_sentence_text(
    sentence_id: String,
    text: String,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.update_sentence_text(&sentence_id, &text))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_character(
    character: crate::models::CharacterProfile,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.insert_character(&character))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_project_characters(
    project_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<crate::models::CharacterProfile>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.get_characters(&project_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_project_character(
    character_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.delete_character(&character_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn assign_sentence_speaker(
    sentence_id: String,
    speaker: String,
    voice: String,
    speed: f32,
    temperature: f32,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.assign_sentence_speaker(&sentence_id, &speaker, &voice, speed, temperature)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn batch_assign_dialogues(
    chapter_id: String,
    speaker: String,
    voice: String,
    speed: f32,
    temperature: f32,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.batch_assign_dialogues(&chapter_id, &speaker, &voice, speed, temperature)
    })
    .await
    .map_err(|e| e.to_string())?
}

