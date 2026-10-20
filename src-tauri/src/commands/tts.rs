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
    // Khoảng lặng / hiệu ứng có audio tạo riêng, không được đọc bằng TTS (kẻo ghi đè file im lặng
    // thành giọng đọc "Khoảng lặng 45 giây"). Phải chặn trước khi xóa file âm thanh cũ.
    if text.starts_with("[Khoảng lặng") || text.starts_with("[Hiệu ứng:") {
        return Err("Câu khoảng lặng / hiệu ứng không được đọc bằng TTS".to_string());
    }

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./data"));

    let audio_path = get_sentence_audio_cache_path(&app_dir, &project_id, &sentence_id);

    // Xóa file âm thanh cũ nếu đang tồn tại để đảm bảo nạp file mới
    if audio_path.exists() {
        let _ = std::fs::remove_file(&audio_path);
    }

    // Reset thông tin audio cũ trong database
    let db_clone_init = db.inner().clone();
    let s_id_init = sentence_id.clone();
    let _ = tokio::task::spawn_blocking(move || {
        db_clone_init.clear_sentence_audio(&s_id_init)
    })
    .await;

    // Luôn gửi speed = 1.0 qua TTS engine để model sinh ra giọng đọc gốc chuẩn nhất,
    // không bị méo giọng / lệch cao độ (pitch shift) do thuật toán resample.
    // Tốc độ `speed` người dùng chọn thực chất là Speak Rate (playback rate) sẽ được
    // lưu vào database và áp dụng khi phát (WaveSurfer) cũng như khi ghép audio.
    let req = TtsSynthesizeRequest {
        model: "vieneu-v3-turbo".to_string(),
        voice: voice.clone(),
        input: text.clone(),
        response_format: "wav".to_string(),
        speed: 1.0,
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
