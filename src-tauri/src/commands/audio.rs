use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

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
    chapter_ids: Option<Vec<String>>,
    db: State<'_, Arc<Database>>,
) -> Result<f64, String> {
    let db = db.inner().clone();

    tokio::task::spawn_blocking(move || {
        let chapters = db.get_chapters(&project_id)?;
        // Chỉ nối các chương được chọn (None = tất cả chương đang bật)
        let enabled_chapters: Vec<_> = chapters
            .into_iter()
            .filter(|c| c.is_enabled)
            .filter(|c| chapter_ids.as_ref().map_or(true, |ids| ids.contains(&c.id)))
            .collect();

        if enabled_chapters.is_empty() {
            return Err("Không có chương nào được chọn (và đang bật) để xuất.".to_string());
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

fn app_data_dir_of(app_handle: &AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./data"))
}

fn norm_path(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/").to_lowercase()
}

/// Xóa file nếu nó nằm trong thư mục audio_cache của app. Thư viện BGM (`bgm/`) và file gốc của
/// người dùng không bao giờ bị xóa tự động.
fn remove_if_app_owned(app_handle: &AppHandle, path: &Path) {
    let app_dir = app_data_dir_of(app_handle);
    let p = norm_path(path);
    let owned = [app_dir.join("audio_cache")]
        .iter()
        .any(|d| p.starts_with(&format!("{}/", norm_path(d))));
    if owned {
        let _ = fs::remove_file(path);
    }
}

/// Dọn file chỉnh sửa / BGM đã copy mà không còn dòng DB nào tham chiếu (chạy lúc khởi động app).
pub fn cleanup_orphan_audio(app_data_dir: &Path, db: &Database) {
    let Ok(referenced) = db.get_referenced_audio_paths() else {
        return;
    };
    let referenced: std::collections::HashSet<String> =
        referenced.iter().map(|p| norm_path(Path::new(p))).collect();

    // Thư viện BGM (`bgm/`) được giữ lại, chỉ dọn file chỉnh sửa không còn dùng
    for dir in [app_data_dir.join("audio_cache").join("edits")] {
        let Ok(entries) = fs::read_dir(&dir) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && !referenced.contains(&norm_path(&path)) {
                let _ = fs::remove_file(&path);
            }
        }
    }
}

fn bgm_library_dir(app_handle: &AppHandle) -> PathBuf {
    app_data_dir_of(app_handle).join("bgm")
}

/// Marker trong tên file BGM đã chỉnh sửa (cắt / dời) lưu trong thư viện
const EDITED_MARKER: &str = " (edited ";

/// Đường dẫn bản BGM đã chỉnh sửa trong thư viện: `<tên gốc> (edited xxxxxxxx).wav`
fn bgm_edited_path(app_handle: &AppHandle, source: &Path) -> PathBuf {
    let dir = bgm_library_dir(app_handle);
    let _ = fs::create_dir_all(&dir);
    let stem = source.file_stem().and_then(|s| s.to_str()).unwrap_or("bgm");
    let stem = stem.split(EDITED_MARKER).next().unwrap_or(stem);
    dir.join(format!(
        "{}{}{}).wav",
        stem,
        EDITED_MARKER,
        &uuid::Uuid::new_v4().simple().to_string()[..8]
    ))
}

/// Sau khi chỉnh sửa BGM: xóa bản chỉnh sửa cũ trong thư viện nếu không còn chương nào dùng.
/// File người dùng tải lên (không có marker) luôn được giữ lại.
fn remove_replaced_edited_bgm(app_handle: &AppHandle, db: &Database, old: &Path) {
    let is_edited = old
        .file_stem()
        .and_then(|s| s.to_str())
        .map_or(false, |s| s.contains(EDITED_MARKER));
    let in_library = norm_path(old).starts_with(&format!("{}/", norm_path(&bgm_library_dir(app_handle))));
    if !is_edited || !in_library {
        return;
    }
    let key = norm_path(old);
    let still_used = db
        .get_referenced_audio_paths()
        .map(|paths| paths.iter().any(|p| norm_path(Path::new(p)) == key))
        .unwrap_or(true);
    if !still_used {
        let _ = fs::remove_file(old);
    }
}

/// Cache độ dài file thư viện, khóa theo đường dẫn + dung lượng + thời gian sửa
static DURATION_CACHE: std::sync::LazyLock<std::sync::Mutex<std::collections::HashMap<String, Option<f64>>>> =
    std::sync::LazyLock::new(|| std::sync::Mutex::new(std::collections::HashMap::new()));

#[derive(serde::Serialize)]
pub struct BgmLibraryItem {
    pub path: String,
    pub name: String,
    pub size_bytes: u64,
    pub modified_secs: u64,
    pub duration_secs: Option<f64>,
    /// Số chương đang dùng file này làm BGM (chặn xóa file đang dùng)
    pub used_by: usize,
}

/// Thêm file nhạc nền vào thư viện BGM của app (copy một lần, dùng lại cho nhiều chương).
/// Trùng tên và dung lượng với file đã có thì dùng lại file cũ thay vì copy thêm.
#[tauri::command]
pub async fn import_bgm_file(
    source_path: String,
    app_handle: AppHandle,
) -> Result<String, String> {
    let dir = bgm_library_dir(&app_handle);

    tokio::task::spawn_blocking(move || {
        let source = PathBuf::from(&source_path);
        if !source.is_file() {
            return Err(format!("Không tìm thấy file nhạc nền: {}", source_path));
        }
        fs::create_dir_all(&dir).map_err(|e| format!("Không tạo được thư mục BGM: {}", e))?;

        let source_size = fs::metadata(&source).map(|m| m.len()).unwrap_or(0);
        let stem = source.file_stem().and_then(|s| s.to_str()).unwrap_or("bgm");
        let ext = source.extension().and_then(|s| s.to_str()).unwrap_or("wav");

        let mut target = dir.join(format!("{}.{}", stem, ext));
        let mut counter = 2;
        while target.exists() {
            if fs::metadata(&target).map(|m| m.len()).unwrap_or(u64::MAX) == source_size {
                return Ok(target.to_string_lossy().to_string());
            }
            target = dir.join(format!("{} ({}).{}", stem, counter, ext));
            counter += 1;
        }
        fs::copy(&source, &target).map_err(|e| format!("Không copy được file nhạc nền: {}", e))?;
        Ok(target.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| format!("Task copy BGM lỗi: {}", e))?
}

/// Liệt kê thư viện BGM (mới nhất trước) kèm số chương đang dùng từng file.
#[tauri::command]
pub async fn list_bgm_library(
    app_handle: AppHandle,
    db: State<'_, Arc<Database>>,
) -> Result<Vec<BgmLibraryItem>, String> {
    let dir = bgm_library_dir(&app_handle);
    let db = db.inner().clone();

    tokio::task::spawn_blocking(move || {
        let referenced: Vec<String> = db
            .get_referenced_audio_paths()?
            .iter()
            .map(|p| norm_path(Path::new(p)))
            .collect();

        let mut items = Vec::new();
        let Ok(entries) = fs::read_dir(&dir) else {
            return Ok(items);
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let Some(name) = path.file_name().and_then(|n| n.to_str()).map(|n| n.to_string()) else {
                continue;
            };
            let meta = entry.metadata().ok();
            let modified_secs = meta
                .as_ref()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let key = norm_path(&path);
            let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
            items.push(BgmLibraryItem {
                path: path.to_string_lossy().to_string(),
                name,
                size_bytes: size,
                modified_secs,
                duration_secs: {
                    let cache_key = format!("{}|{}|{}", key, size, modified_secs);
                    let cached = DURATION_CACHE.lock().ok().and_then(|c| c.get(&cache_key).copied());
                    match cached {
                        Some(v) => v,
                        None => {
                            let v = crate::services::audio::probe_audio_duration(&path);
                            if let Ok(mut c) = DURATION_CACHE.lock() {
                                c.insert(cache_key, v);
                            }
                            v
                        }
                    }
                },
                used_by: referenced.iter().filter(|r| **r == key).count(),
            });
        }
        items.sort_by(|a, b| b.modified_secs.cmp(&a.modified_secs));
        Ok(items)
    })
    .await
    .map_err(|e| format!("Task đọc thư viện BGM lỗi: {}", e))?
}

/// Xóa một file khỏi thư viện BGM. Từ chối nếu file không nằm trong thư viện hoặc đang được chương dùng.
#[tauri::command]
pub async fn delete_bgm_library_file(
    file_path: String,
    app_handle: AppHandle,
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    let dir = bgm_library_dir(&app_handle);
    let db = db.inner().clone();

    tokio::task::spawn_blocking(move || {
        let path = PathBuf::from(&file_path);
        let key = norm_path(&path);
        if !key.starts_with(&format!("{}/", norm_path(&dir))) {
            return Err("File không nằm trong thư viện BGM.".to_string());
        }
        let in_use = db
            .get_referenced_audio_paths()?
            .iter()
            .any(|p| norm_path(Path::new(p)) == key);
        if in_use {
            return Err("File đang được một chương dùng làm nhạc nền, không thể xóa.".to_string());
        }
        fs::remove_file(&path).map_err(|e| format!("Không xóa được file: {}", e))
    })
    .await
    .map_err(|e| format!("Task xóa BGM lỗi: {}", e))?
}

/// Đường dẫn file dẫn xuất (`<tên gốc>_<tag>_<8 ký tự>.wav`) nằm trong thư mục dữ liệu của app,
/// không ghi vào thư mục chứa file nguồn của người dùng. Không cộng dồn hậu tố cũ.
fn derived_wav_path(app_handle: &AppHandle, source: &Path, tag: &str) -> PathBuf {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./data"));
    let dir = app_dir.join("audio_cache").join("edits");
    let _ = fs::create_dir_all(&dir);

    let stem = source.file_stem().and_then(|s| s.to_str()).unwrap_or("audio");
    let stem = stem.split("_cut_").next().unwrap_or(stem);
    let stem = stem.split("_shift_").next().unwrap_or(stem);
    dir.join(format!(
        "{}_{}_{}.wav",
        stem,
        tag,
        &uuid::Uuid::new_v4().simple().to_string()[..8]
    ))
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
    app_handle: AppHandle,
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

        let output = if is_voice {
            derived_wav_path(&app_handle, &source, "cut")
        } else {
            bgm_edited_path(&app_handle, &source)
        };

        let duration =
            crate::services::audio::remove_region_to_wav(&source, &output, start_secs, end_secs)?;
        let out_str = output.to_string_lossy().to_string();

        if is_voice {
            db.update_sentence_audio_file(&id, &out_str, duration)?;
        } else {
            db.update_chapter_bgm(&id, Some(out_str.clone()), bgm_volume)?;
        }
        // File cũ không còn dùng nữa: xóa nếu do app tạo ra (không đụng file gốc của người dùng)
        remove_if_app_owned(&app_handle, &source);
        if !is_voice {
            remove_replaced_edited_bgm(&app_handle, &db, &source);
        }

        Ok(CutRegionResult { path: out_str, duration })
    })
    .await
    .map_err(|e| format!("Task cắt audio lỗi: {}", e))?
}

/// Dời toàn bộ nhạc nền của chương: `offset_secs` dương = trễ hơn (chèn lặng đầu), âm = sớm hơn (bỏ đầu).
/// File gốc được giữ nguyên, kết quả ghi ra file mới rồi cập nhật BGM chương.
#[tauri::command]
pub async fn shift_bgm_audio(
    chapter_id: String,
    file_path: String,
    bgm_volume: Option<f64>,
    offset_secs: f64,
    app_handle: AppHandle,
    db: State<'_, Arc<Database>>,
) -> Result<CutRegionResult, String> {
    let db = db.inner().clone();

    tokio::task::spawn_blocking(move || {
        let source = PathBuf::from(&file_path);
        if !source.exists() {
            return Err(format!("Không tìm thấy file audio: {}", source.display()));
        }
        let output = bgm_edited_path(&app_handle, &source);
        let duration =
            crate::services::audio::shift_audio_to_wav(&source, &output, offset_secs)?;
        let out_str = output.to_string_lossy().to_string();
        db.update_chapter_bgm(&chapter_id, Some(out_str.clone()), bgm_volume)?;
        remove_if_app_owned(&app_handle, &source);
        remove_replaced_edited_bgm(&app_handle, &db, &source);
        Ok(CutRegionResult { path: out_str, duration })
    })
    .await
    .map_err(|e| format!("Task dời BGM lỗi: {}", e))?
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
