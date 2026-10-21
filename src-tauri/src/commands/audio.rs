use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::State;

use crate::db::Database;
use crate::services::audio::{item_kind_from_text, AudioConcatenateOptions, ItemKind};

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
        // Kiểm tra nếu chương đang bị disable thì từ chối xuất
        let chapter = db.get_chapter_by_id(&chapter_id)?;
        if let Some(c) = chapter.as_ref() {
            if !c.is_enabled {
                return Err("Chương này đang bị vô hiệu hóa (disabled), không thể xuất file audio.".to_string());
            }
        }

        let sentences = db.get_sentences(&chapter_id)?;
        let mut audio_items: Vec<(PathBuf, f32)> = Vec::new();
        let mut item_kinds: Vec<ItemKind> = Vec::new();

        for s in sentences {
            let kind = item_kind_from_text(&s.clean_text);
            if let Some(path_str) = s.audio_path {
                let p = PathBuf::from(path_str);
                if p.exists() {
                    let rate = s.speed.unwrap_or(1.0);
                    audio_items.push((p, rate));
                    item_kinds.push(kind);
                }
            }
        }

        if audio_items.is_empty() {
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
                &audio_items,
                &item_kinds,
                target,
                &opts,
                bgm_opt.as_deref(),
                vol,
            )
        } else {
            // Không có BGM tổng vẫn dùng bản có item_kinds để khoảng lặng / hiệu ứng không bị time-stretch
            crate::services::audio::concatenate_sentence_wavs_with_bgm(
                &audio_items,
                &item_kinds,
                target,
                &opts,
                None,
                0.0,
            )
        }
    })
    .await
    .map_err(|e| format!("Task export lỗi: {}", e))?
}

#[tauri::command]
pub async fn export_book_audio(
    project_id: String,
    output_path: String,
    sentence_pause_ms: u32,
    paragraph_pause_ms: u32,
    chapter_pause_ms: u32,
    mix_bgm: Option<bool>,
    bgm_volume: Option<f32>,
    db: State<'_, Arc<Database>>,
) -> Result<f64, String> {
    let db = db.inner().clone();

    tokio::task::spawn_blocking(move || {
        let chapters = db.get_chapters(&project_id)?;
        let enabled_chapters: Vec<_> = chapters.into_iter().filter(|c| c.is_enabled).collect();

        if enabled_chapters.is_empty() {
            return Err("Không có chương nào đang được kích hoạt (bật) để xuất.".to_string());
        }

        let temp_dir = std::env::temp_dir().join(format!("book_studio_export_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);

        let mut chapter_wav_paths = Vec::new();

        let opts = AudioConcatenateOptions {
            sentence_pause_ms,
            paragraph_pause_ms,
            ..Default::default()
        };

        for (idx, chap) in enabled_chapters.iter().enumerate() {
            let sentences = match db.get_sentences(&chap.id) {
                Ok(s) => s,
                Err(_) => continue,
            };

            let mut audio_items: Vec<(PathBuf, f32)> = Vec::new();
            let mut item_kinds: Vec<ItemKind> = Vec::new();
            for s in sentences {
                let kind = item_kind_from_text(&s.clean_text);
                if let Some(path_str) = s.audio_path {
                    let p = PathBuf::from(path_str);
                    if p.exists() {
                        let rate = s.speed.unwrap_or(1.0);
                        audio_items.push((p, rate));
                        item_kinds.push(kind);
                    }
                }
            }

            if audio_items.is_empty() {
                continue;
            }

            let temp_chap_file = temp_dir.join(format!("chap_{:04}.wav", idx));
            let should_mix = mix_bgm.unwrap_or(false);

            let res = if should_mix && chap.bgm_path.is_some() {
                let bgm_opt = chap.bgm_path.as_ref().map(PathBuf::from);
                let vol = bgm_volume.unwrap_or_else(|| {
                    chap.bgm_volume.unwrap_or(0.2) as f32
                });
                crate::services::audio::concatenate_sentence_wavs_with_bgm(
                    &audio_items,
                    &item_kinds,
                    &temp_chap_file,
                    &opts,
                    bgm_opt.as_deref(),
                    vol,
                )
            } else {
                crate::services::audio::concatenate_sentence_wavs_with_bgm(
                    &audio_items,
                    &item_kinds,
                    &temp_chap_file,
                    &opts,
                    None,
                    0.0,
                )
            };

            if res.is_ok() {
                chapter_wav_paths.push(temp_chap_file);
            }
        }

        if chapter_wav_paths.is_empty() {
            let _ = std::fs::remove_dir_all(&temp_dir);
            return Err("Không có chương nào có câu âm thanh hoàn chỉnh để xuất.".to_string());
        }

        let target = Path::new(&output_path);
        let total_duration = crate::services::audio::concatenate_wav_files(
            &chapter_wav_paths,
            target,
            chapter_pause_ms,
        );

        let _ = std::fs::remove_dir_all(&temp_dir);

        total_duration
    })
    .await
    .map_err(|e| format!("Task export toàn bộ sách lỗi: {}", e))?
}

#[derive(serde::Serialize)]
pub struct BatchExportResult {
    pub exported_count: usize,
    pub total_chapters: usize,
    pub output_dir: String,
}

#[tauri::command]
pub async fn export_batch_chapters(
    project_id: String,
    output_dir: String,
    sentence_pause_ms: u32,
    paragraph_pause_ms: u32,
    mix_bgm: Option<bool>,
    bgm_volume: Option<f32>,
    db: State<'_, Arc<Database>>,
) -> Result<BatchExportResult, String> {
    let db = db.inner().clone();

    tokio::task::spawn_blocking(move || {
        let chapters = db.get_chapters(&project_id)?;
        let enabled_chapters: Vec<_> = chapters.into_iter().filter(|c| c.is_enabled).collect();

        if enabled_chapters.is_empty() {
            return Err("Không có chương nào đang được kích hoạt (bật) để xuất.".to_string());
        }

        let out_dir = Path::new(&output_dir);
        std::fs::create_dir_all(out_dir)
            .map_err(|e| format!("Không tạo được thư mục xuất ({}): {}", output_dir, e))?;

        let opts = AudioConcatenateOptions {
            sentence_pause_ms,
            paragraph_pause_ms,
            ..Default::default()
        };

        let mut exported_count = 0usize;
        let total_chapters = enabled_chapters.len();

        for chap in &enabled_chapters {
            let sentences = match db.get_sentences(&chap.id) {
                Ok(s) => s,
                Err(_) => continue,
            };

            let mut audio_items: Vec<(PathBuf, f32)> = Vec::new();
            let mut item_kinds: Vec<ItemKind> = Vec::new();
            for s in sentences {
                let kind = item_kind_from_text(&s.clean_text);
                if let Some(path_str) = s.audio_path {
                    let p = PathBuf::from(path_str);
                    if p.exists() {
                        let rate = s.speed.unwrap_or(1.0);
                        audio_items.push((p, rate));
                        item_kinds.push(kind);
                    }
                }
            }

            if audio_items.is_empty() {
                continue;
            }

            let clean_title = chap
                .title
                .trim()
                .replace(&['/', '\\', ':', '*', '?', '"', '<', '>', '|'][..], "_");

            let filename = format!("{:02} - {}.wav", chap.index, clean_title);
            let target_file = out_dir.join(filename);

            let should_mix = mix_bgm.unwrap_or(false);
            let res = if should_mix && chap.bgm_path.is_some() {
                let bgm_opt = chap.bgm_path.as_ref().map(PathBuf::from);
                let vol = bgm_volume.unwrap_or_else(|| {
                    chap.bgm_volume.unwrap_or(0.2) as f32
                });
                crate::services::audio::concatenate_sentence_wavs_with_bgm(
                    &audio_items,
                    &item_kinds,
                    &target_file,
                    &opts,
                    bgm_opt.as_deref(),
                    vol,
                )
            } else {
                crate::services::audio::concatenate_sentence_wavs_with_bgm(
                    &audio_items,
                    &item_kinds,
                    &target_file,
                    &opts,
                    None,
                    0.0,
                )
            };

            if res.is_ok() {
                exported_count += 1;
            }
        }

        if exported_count == 0 {
            return Err("Không có chương nào có file âm thanh sẵn sàng để xuất.".to_string());
        }

        Ok(BatchExportResult {
            exported_count,
            total_chapters,
            output_dir,
        })
    })
    .await
    .map_err(|e| format!("Task export hàng loạt lỗi: {}", e))?
}

#[derive(serde::Serialize)]
pub struct CutRegionResult {
    pub path: String,
    pub duration: f64,
}

/// Cắt bỏ vùng [start, end] khỏi audio của câu thoại (`voice`) hoặc BGM chương (`bgm`).
/// File gốc được giữ nguyên, kết quả ghi ra file mới cùng thư mục rồi cập nhật DB.
#[tauri::command]
pub async fn cut_audio_region(
    target: String,
    id: String,
    file_path: String,
    bgm_volume: Option<f64>,
    start_secs: f64,
    end_secs: f64,
    db: State<'_, Arc<Database>>,
) -> Result<CutRegionResult, String> {
    let db = db.inner().clone();

    tokio::task::spawn_blocking(move || {
        let is_voice = match target.as_str() {
            "voice" => true,
            "bgm" => false,
            other => return Err(format!("Track không hợp lệ: {}", other)),
        };

        let source = PathBuf::from(&file_path);
        if !source.exists() {
            return Err(format!("Không tìm thấy file audio: {}", source.display()));
        }

        let stem = source.file_stem().and_then(|s| s.to_str()).unwrap_or("audio");
        let stem = stem.split("_cut_").next().unwrap_or(stem);
        let output = source.with_file_name(format!(
            "{}_cut_{}.wav",
            stem,
            &uuid::Uuid::new_v4().simple().to_string()[..8]
        ));

        let duration =
            crate::services::audio::remove_region_to_wav(&source, &output, start_secs, end_secs)?;
        let out_str = output.to_string_lossy().to_string();

        if is_voice {
            db.update_sentence_audio_file(&id, &out_str, duration)?;
        } else {
            db.update_chapter_bgm(&id, Some(out_str.clone()), bgm_volume)?;
        }

        Ok(CutRegionResult { path: out_str, duration })
    })
    .await
    .map_err(|e| format!("Task cắt audio lỗi: {}", e))?
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
