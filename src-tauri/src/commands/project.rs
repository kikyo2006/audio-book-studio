use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

use crate::db::Database;
use crate::models::{Chapter, Project, Sentence};
use crate::services::audio::generate_silence_wav;
use crate::services::tts::get_sentence_audio_cache_path;

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

#[derive(serde::Deserialize)]
pub struct SentenceTextUpdate {
    pub sentence_id: String,
    pub text: String,
}

#[tauri::command]
pub async fn batch_update_sentences_text(
    updates: Vec<SentenceTextUpdate>,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    let pairs: Vec<(String, String)> = updates
        .into_iter()
        .map(|u| (u.sentence_id, u.text))
        .collect();
    tokio::task::spawn_blocking(move || db.batch_update_sentences_text(&pairs))
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
pub async fn get_casting_presets(
    db: State<'_, Arc<Database>>,
) -> Result<Vec<crate::models::CastingPreset>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.get_all_presets())
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_casting_preset(
    preset: crate::models::CastingPreset,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.insert_or_update_preset(&preset))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_casting_preset(
    preset_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.delete_preset(&preset_id))
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

#[tauri::command]
pub async fn batch_assign_narration(
    chapter_id: String,
    voice: String,
    speed: f32,
    temperature: f32,
    apply_all_chapters: bool,
    project_id: Option<String>,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.batch_assign_narration(
            &chapter_id,
            &voice,
            speed,
            temperature,
            apply_all_chapters,
            project_id.as_deref(),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn batch_assign_dialogues_extended(
    chapter_id: String,
    speaker: String,
    voice: String,
    speed: f32,
    temperature: f32,
    only_unassigned: bool,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.batch_assign_dialogues_extended(
            &chapter_id,
            &speaker,
            &voice,
            speed,
            temperature,
            only_unassigned,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn batch_assign_speaker_range(
    chapter_id: String,
    from_index: usize,
    to_index: usize,
    target_mode: String,
    speaker: String,
    voice: String,
    speed: f32,
    temperature: f32,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.batch_assign_speaker_range(
            &chapter_id,
            from_index,
            to_index,
            &target_mode,
            &speaker,
            &voice,
            speed,
            temperature,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn rename_chapter(
    chapter_id: String,
    new_title: String,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.rename_chapter(&chapter_id, &new_title))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_chapter(
    chapter_id: String,
    return_sentences_to_chapter_id: Option<String>,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.delete_chapter(
            &chapter_id,
            return_sentences_to_chapter_id.as_deref(),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn reorder_chapter(
    chapter_id: String,
    direction: String,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<Chapter>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.reorder_chapter(&chapter_id, &direction))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn split_sentences_to_chapter(
    project_id: String,
    source_chapter_id: String,
    new_title: String,
    from_idx: usize,
    to_idx: usize,
    place_before: Option<bool>,
    db: State<'_, Arc<Database>>,
) -> Result<Chapter, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.split_sentences_to_chapter(
            &project_id,
            &source_chapter_id,
            &new_title,
            from_idx,
            to_idx,
            place_before.unwrap_or(true),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn add_silence_sentence(
    project_id: String,
    chapter_id: String,
    target_sentence_id: String,
    position: String,
    duration_secs: f64,
    app_handle: AppHandle,
    db: State<'_, Arc<Database>>,
) -> Result<Sentence, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./data"));

    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        let temp_id = uuid::Uuid::new_v4().to_string();
        let audio_path = get_sentence_audio_cache_path(&app_dir, &project_id, &temp_id);
        generate_silence_wav(&audio_path, duration_secs)?;
        let audio_str = audio_path.to_string_lossy().to_string();

        db.insert_silence_sentence(
            &chapter_id,
            &target_sentence_id,
            &position,
            duration_secs,
            &audio_str,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_silence_duration(
    project_id: String,
    sentence_id: String,
    duration_secs: f64,
    app_handle: AppHandle,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./data"));

    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        let audio_path = get_sentence_audio_cache_path(&app_dir, &project_id, &sentence_id);
        generate_silence_wav(&audio_path, duration_secs)?;
        db.update_silence_duration(&sentence_id, duration_secs)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_sentence(
    sentence_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.delete_sentence(&sentence_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn insert_blank_sentences(
    chapter_id: String,
    target_sentence_id: Option<String>,
    target_index: Option<usize>,
    position: String,
    count: usize,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<Sentence>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.insert_blank_sentences(
            &chapter_id,
            target_sentence_id.as_deref(),
            target_index,
            &position,
            count,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_chapter_bgm(
    chapter_id: String,
    bgm_path: Option<String>,
    bgm_volume: Option<f64>,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.update_chapter_bgm(&chapter_id, bgm_path, bgm_volume)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_project_cover(
    project_id: String,
    cover_base64: String,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.update_project_cover(&project_id, &cover_base64)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_project(
    project_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.delete_project(&project_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_project_status(
    project_id: String,
    status: String,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.update_project_status(&project_id, &status))
        .await
        .map_err(|e| e.to_string())?
}
