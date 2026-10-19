use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

use crate::db::Database;
use crate::services::tts::{
    check_tts_health, get_sentence_audio_cache_path, synthesize_to_file,
    TtsSentenceResult, TtsSynthesizeRequest,
};

#[tauri::command]
pub async fn check_tts_connection(server_url: String) -> Result<bool, String> {
    Ok(check_tts_health(&server_url).await)
}

#[tauri::command]
pub async fn synthesize_sentence(
    sentence_id: String,
    project_id: String,
    text: String,
    voice: String,
    speed: f32,
    temperature: Option<f32>,
    server_url: String,
    app_handle: AppHandle,
    db: State<'_, Arc<Database>>,
) -> Result<TtsSentenceResult, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./data"));

    let audio_path = get_sentence_audio_cache_path(&app_dir, &project_id, &sentence_id);

    let req = TtsSynthesizeRequest {
        model: "vieneu-v3-turbo".to_string(),
        voice: voice.clone(),
        input: text.clone(),
        response_format: "wav".to_string(),
        speed,
        temperature,
    };

    let duration = synthesize_to_file(&server_url, &req, &audio_path).await?;
    let audio_path_str = audio_path.to_string_lossy().to_string();

    let db_clone = db.inner().clone();
    let s_id = sentence_id.clone();
    let a_path = audio_path_str.clone();
    let v_clone = voice.clone();

    tokio::task::spawn_blocking(move || {
        db_clone.update_sentence_audio(
            &s_id,
            &a_path,
            duration,
            Some(&v_clone),
            temperature,
            Some(speed),
        )
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(TtsSentenceResult {
        sentence_id,
        audio_path: audio_path_str,
        duration,
    })
}

#[tauri::command]
pub async fn regenerate_sentence(
    sentence_id: String,
    project_id: String,
    text: String,
    voice: String,
    speed: f32,
    temperature: Option<f32>,
    server_url: String,
    app_handle: AppHandle,
    db: State<'_, Arc<Database>>,
) -> Result<TtsSentenceResult, String> {
    synthesize_sentence(
        sentence_id,
        project_id,
        text,
        voice,
        speed,
        temperature,
        server_url,
        app_handle,
        db,
    )
    .await
}
