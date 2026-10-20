use hound::WavReader;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsSynthesizeRequest {
    pub model: String,
    pub voice: String,
    pub input: String,
    pub response_format: String,
    pub speed: f32,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsSentenceResult {
    pub sentence_id: String,
    pub audio_path: String,
    pub duration: f64,
}

use std::sync::LazyLock;

static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .pool_idle_timeout(Duration::from_secs(90))
        .tcp_nodelay(true)
        .build()
        .expect("Không thể khởi tạo HTTP Client")
});

pub async fn check_tts_health(server_url: &str) -> bool {
    let normalized = server_url.replace("localhost", "127.0.0.1");
    let base = normalized.trim_end_matches('/');
    let url = format!("{}/v1/models", base);
    match HTTP_CLIENT
        .get(&url)
        .timeout(Duration::from_millis(3000))
        .send()
        .await
    {
        Ok(res) => res.status().is_success(),
        Err(_) => false,
    }
}

pub async fn synthesize_to_file(
    server_url: &str,
    req: &TtsSynthesizeRequest,
    output_path: &Path,
) -> Result<f64, String> {
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Không tạo được thư mục cache âm thanh: {}", e))?;
    }

    let normalized = server_url.replace("localhost", "127.0.0.1");
    let base = normalized.trim_end_matches('/');
    let endpoint = format!("{}/v1/audio/speech", base);

    let res = HTTP_CLIENT
        .post(&endpoint)
        .json(req)
        .send()
        .await
        .map_err(|e| format!("Lỗi kết nối tới VieNeu-TTS ({}): {}", endpoint, e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_else(|_| "Lỗi không xác định".into());
        return Err(format!("VieNeu-TTS trả về lỗi HTTP: {}", err_text));
    }

    let mut bytes = res
        .bytes()
        .await
        .map_err(|e| format!("Lỗi đọc stream âm thanh: {}", e))?
        .to_vec();

    // Chuẩn hóa header WAV (VieNeu-TTS / OpenAI stream trả về 0xFFFFFFFF placeholder)
    sanitize_wav_bytes(&mut bytes);

    fs::write(output_path, &bytes)
        .map_err(|e| format!("Lỗi lưu file WAV: {}", e))?;

    // Đọc thời lượng từ WAV bằng hound
    let duration = read_wav_duration(output_path)?;
    Ok(duration)
}

pub fn sanitize_wav_bytes(bytes: &mut [u8]) {
    if bytes.len() < 44 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return;
    }

    let file_len = bytes.len();
    let current_riff = u32::from_le_bytes(bytes[4..8].try_into().unwrap_or([0; 4]));
    if current_riff == 0xFFFFFFFF || current_riff == 0 {
        let riff_size = (file_len.saturating_sub(8)) as u32;
        bytes[4..8].copy_from_slice(&riff_size.to_le_bytes());
    }

    // Duyệt tìm data chunk
    let mut offset = 12;
    while offset + 8 <= file_len {
        let chunk_id = &bytes[offset..offset + 4];
        let current_chunk_size = u32::from_le_bytes(bytes[offset + 4..offset + 8].try_into().unwrap_or([0; 4]));

        if chunk_id == b"data" {
            if current_chunk_size == 0xFFFFFFFF || current_chunk_size == 0 || (current_chunk_size % 2 != 0) {
                let actual_data_size = (file_len.saturating_sub(offset + 8)) as u32 & !1;
                bytes[offset + 4..offset + 8].copy_from_slice(&actual_data_size.to_le_bytes());
            }
            break;
        }

        if current_chunk_size == 0xFFFFFFFF {
            // Fallback nếu chunk size không rõ trước data chunk
            if offset + 44 <= file_len && &bytes[36..40] == b"data" {
                let actual_data_size = (file_len.saturating_sub(44)) as u32 & !1;
                bytes[40..44].copy_from_slice(&actual_data_size.to_le_bytes());
            }
            break;
        }

        offset += 8 + (current_chunk_size as usize);
        if current_chunk_size % 2 != 0 {
            offset += 1;
        }
    }
}

pub fn sanitize_wav_file(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    let mut bytes = fs::read(path).map_err(|e| format!("Không đọc được file WAV: {}", e))?;
    if bytes.len() < 44 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Ok(());
    }

    let current_riff = u32::from_le_bytes(bytes[4..8].try_into().unwrap_or([0; 4]));
    let current_data = if bytes.len() >= 44 {
        u32::from_le_bytes(bytes[40..44].try_into().unwrap_or([0; 4]))
    } else {
        0
    };

    if current_riff == 0xFFFFFFFF || current_data == 0xFFFFFFFF || (current_data % 2 != 0) {
        sanitize_wav_bytes(&mut bytes);
        let _ = fs::write(path, &bytes);
    }
    Ok(())
}

pub fn read_wav_duration(path: &Path) -> Result<f64, String> {
    let _ = sanitize_wav_file(path);

    let reader = match WavReader::open(path) {
        Ok(r) => r,
        Err(e) => {
            // Fallback ước lượng thời lượng từ dung lượng nếu có sai lệch nhỏ
            if let Ok(metadata) = path.metadata() {
                let pcm_bytes = metadata.len().saturating_sub(44) as f64;
                if pcm_bytes > 0.0 {
                    // Mặc định VieNeu-TTS: 24000Hz, 16bit (2 bytes), mono = 48000 bytes/sec
                    return Ok(pcm_bytes / 48000.0);
                }
            }
            return Err(format!("Không đọc được file WAV: {}", e));
        }
    };
    let spec = reader.spec();
    let duration = reader.duration() as f64 / spec.sample_rate as f64;
    Ok(duration)
}

pub fn get_sentence_audio_cache_path(
    app_cache_dir: &Path,
    project_id: &str,
    sentence_id: &str,
) -> PathBuf {
    app_cache_dir
        .join("audio_cache")
        .join(project_id)
        .join(format!("{}.wav", sentence_id))
}
