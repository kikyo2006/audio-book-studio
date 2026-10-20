use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::State;

use crate::db::Database;
use crate::services::audio::AudioConcatenateOptions;

#[tauri::command]
pub async fn export_chapter_audio(
    _project_id: String,
    chapter_id: String,
    output_path: String,
    sentence_pause_ms: u32,
    paragraph_pause_ms: u32,
    mix_bgm: Option<bool>,
    bgm_volume: Option<f32>,
    db: State<'_, Arc<Database>>,
) -> Result<f64, String> {
    let db = db.inner().clone();

    tokio::task::spawn_blocking(move || {
        let sentences = db.get_sentences(&chapter_id)?;
        let mut audio_paths = Vec::new();

        for s in sentences {
            if let Some(path_str) = s.audio_path {
                let p = PathBuf::from(path_str);
                if p.exists() {
                    audio_paths.push(p);
                }
            }
        }

        if audio_paths.is_empty() {
            return Err("Không có file âm thanh nào đã được tạo trong chương này".to_string());
        }

        let opts = AudioConcatenateOptions {
            sentence_pause_ms,
            paragraph_pause_ms,
            ..Default::default()
        };

        let target = Path::new(&output_path);

        let should_mix = mix_bgm.unwrap_or(false);
        if should_mix {
            let chapter = db.get_chapter_by_id(&chapter_id)?;
            let bgm_opt = chapter.as_ref().and_then(|c| c.bgm_path.as_ref()).map(PathBuf::from);
            let vol = bgm_volume.unwrap_or_else(|| {
                chapter.as_ref().and_then(|c| c.bgm_volume).unwrap_or(0.2) as f32
            });

            crate::services::audio::concatenate_sentence_wavs_with_bgm(
                &audio_paths,
                target,
                &opts,
                bgm_opt.as_deref(),
                vol,
            )
        } else {
            crate::services::audio::concatenate_sentence_wavs(&audio_paths, target, &opts)
        }
    })
    .await
    .map_err(|e| format!("Task export lỗi: {}", e))?
}

#[tauri::command]
pub async fn read_audio_base64(file_path: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let bytes = fs::read(&file_path)
            .map_err(|e| format!("Không đọc được file âm thanh ({}): {}", file_path, e))?;

        let b64 = base64_encode(&bytes);
        Ok(format!("data:audio/wav;base64,{}", b64))
    })
    .await
    .map_err(|e| e.to_string())?
}

fn base64_encode(data: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    let mut i = 0;
    while i < data.len() {
        let b0 = data[i] as u32;
        let b1 = if i + 1 < data.len() { data[i + 1] as u32 } else { 0 };
        let b2 = if i + 2 < data.len() { data[i + 2] as u32 } else { 0 };

        let triple = (b0 << 16) | (b1 << 8) | b2;

        result.push(CHARSET[((triple >> 18) & 63) as usize] as char);
        result.push(CHARSET[((triple >> 12) & 63) as usize] as char);

        if i + 1 < data.len() {
            result.push(CHARSET[((triple >> 6) & 63) as usize] as char);
        } else {
            result.push('=');
        }

        if i + 2 < data.len() {
            result.push(CHARSET[(triple & 63) as usize] as char);
        } else {
            result.push('=');
        }

        i += 3;
    }
    result
}
