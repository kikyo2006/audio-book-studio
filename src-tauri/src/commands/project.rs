use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

use crate::db::Database;
use crate::models::{Chapter, MergeChaptersResult, Project, Sentence};
use crate::services::audio::{generate_silence_wav, trim_and_export_bgm_wav, trim_and_export_sfx_wav};
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
pub async fn get_all_project_sentences(
    project_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<Sentence>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.get_all_project_sentences(&project_id))
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
pub async fn get_project_role_settings(
    project_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<Option<crate::models::ProjectRoleSettings>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.get_project_role_settings(&project_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_project_role_settings(
    project_id: String,
    settings: crate::models::ProjectRoleSettings,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.save_project_role_settings(&project_id, &settings))
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
pub async fn toggle_chapter_enabled(
    chapter_id: String,
    is_enabled: bool,
    db: State<'_, Arc<Database>>,
) -> Result<Chapter, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || db.set_chapter_enabled(&chapter_id, is_enabled))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn insert_empty_chapter(
    project_id: String,
    target_chapter_id: String,
    place_before: bool,
    title: Option<String>,
    db: State<'_, Arc<Database>>,
) -> Result<Chapter, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.insert_empty_chapter(
            &project_id,
            &target_chapter_id,
            place_before,
            title.as_deref(),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn merge_chapters(
    project_id: String,
    current_chapter_id: String,
    target_chapter_id: String,
    final_title: String,
    db: State<'_, Arc<Database>>,
) -> Result<MergeChaptersResult, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.merge_chapters(
            &project_id,
            &current_chapter_id,
            &target_chapter_id,
            &final_title,
        )
    })
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
pub async fn insert_sfx_sentence(
    project_id: String,
    chapter_id: String,
    target_sentence_id: String,
    position: String,
    sfx_path: String,
    sfx_name: String,
    start_secs: f64,
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
        // Tìm đường dẫn file SFX thực tế
        let clean_rel = sfx_path.trim_start_matches('/').trim_start_matches('\\');
        let mut candidate_paths = vec![
            PathBuf::from(&sfx_path),
            PathBuf::from(clean_rel),
            PathBuf::from("public").join(clean_rel),
        ];
        if let Ok(res_dir) = app_handle.path().resource_dir() {
            candidate_paths.push(res_dir.join(clean_rel));
            candidate_paths.push(res_dir.join("public").join(clean_rel));
        }

        let actual_source = candidate_paths
            .into_iter()
            .find(|p| p.exists())
            .ok_or_else(|| format!("Không tìm thấy file SFX nguồn: {}", sfx_path))?;

        let temp_id = uuid::Uuid::new_v4().to_string();
        let audio_path = get_sentence_audio_cache_path(&app_dir, &project_id, &temp_id);

        let actual_duration =
            trim_and_export_sfx_wav(&actual_source, &audio_path, start_secs, duration_secs)?;
        let audio_str = audio_path.to_string_lossy().to_string();

        db.insert_sfx_sentence(
            &chapter_id,
            &target_sentence_id,
            &position,
            &sfx_name,
            actual_duration,
            &audio_str,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Chèn dòng "Nhạc nền" từ file nhạc trên máy: cắt đoạn, lặp cho đủ độ dài, fade, volume,
/// lưu WAV 48kHz rồi chèn vào danh sách câu. BGM tổng của chương sẽ tắt tiếng trong lúc dòng này chạy khi xuất.
#[tauri::command]
pub async fn insert_bgm_sentence(
    project_id: String,
    chapter_id: String,
    target_sentence_id: String,
    position: String,
    bgm_path: String,
    bgm_name: String,
    start_secs: f64,
    cut_secs: f64,
    target_secs: f64,
    fade_in_secs: f64,
    fade_out_secs: f64,
    volume: f32,
    app_handle: AppHandle,
    db: State<'_, Arc<Database>>,
) -> Result<Sentence, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./data"));

    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        let source = PathBuf::from(&bgm_path);
        if !source.exists() {
            return Err(format!("Không tìm thấy file nhạc nền: {}", bgm_path));
        }

        let temp_id = uuid::Uuid::new_v4().to_string();
        let audio_path = get_sentence_audio_cache_path(&app_dir, &project_id, &temp_id);

        let actual_duration = trim_and_export_bgm_wav(
            &source,
            &audio_path,
            start_secs,
            cut_secs,
            target_secs,
            fade_in_secs,
            fade_out_secs,
            volume,
        )?;
        let audio_str = audio_path.to_string_lossy().to_string();

        db.insert_bgm_sentence(
            &chapter_id,
            &target_sentence_id,
            &position,
            &bgm_name,
            actual_duration,
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
pub async fn move_sentence(
    chapter_id: String,
    sentence_id: String,
    target_mode: String,
    target_idx: Option<i64>,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<Sentence>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        db.move_sentence(&chapter_id, &sentence_id, &target_mode, target_idx)
    })
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
pub async fn reset_project_cover(
    project_id: String,
    db: State<'_, Arc<Database>>,
) -> Result<Option<String>, String> {
    let db = db.inner().clone();
    tokio::task::spawn_blocking(move || {
        let project = db.get_project_by_id(&project_id)?;
        let source_path = project.source_file_path.ok_or("Dự án không có đường dẫn tệp nguồn sách")?;
        if !std::path::Path::new(&source_path).exists() {
            return Err("Tệp sách gốc không còn tồn tại trên máy tính".to_string());
        }
        let parsed = crate::services::ebook::parse_ebook_file(&source_path)?;
        let original_cover = parsed.cover_base64;
        let cover_to_save = original_cover.clone().unwrap_or_default();
        db.update_project_cover(&project_id, &cover_to_save)?;
        Ok(original_cover)
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
