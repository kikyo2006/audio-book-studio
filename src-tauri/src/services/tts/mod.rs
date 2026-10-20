use hound::WavReader;
use regex::Regex;
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

/// Tag ngắt nghỉ chèn trong văn bản: `[pause:500ms]`, `[pause:1.5s]`, `[pause:500]` (mặc định ms)
static PAUSE_TAG_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\[\s*pause\s*:\s*(\d+(?:\.\d+)?)\s*(ms|s)?\s*\]")
        .expect("Regex tag pause không hợp lệ")
});

/// Giới hạn một lần ngắt nghỉ để tránh nhập nhầm quá lớn (VD: pause:500s)
const MAX_PAUSE_MS: u32 = 10_000;

/// Cấu hình WAV mặc định khi câu chỉ có tag pause mà không có đoạn đọc nào (VieNeu-TTS v3 Turbo: 48kHz)
const FALLBACK_SAMPLE_RATE: u32 = 48_000;

#[derive(Debug, Clone, PartialEq)]
enum TextSegment {
    Speech(String),
    Pause(u32),
}

/// Tách văn bản thành các đoạn đọc và đoạn ngắt nghỉ theo thứ tự xuất hiện
fn split_pause_segments(input: &str) -> Vec<TextSegment> {
    let mut segments = Vec::new();
    let mut last_end = 0;

    for caps in PAUSE_TAG_RE.captures_iter(input) {
        let Some(whole) = caps.get(0) else { continue };

        let before = input[last_end..whole.start()].trim();
        if !before.is_empty() {
            segments.push(TextSegment::Speech(before.to_string()));
        }

        let value: f64 = caps
            .get(1)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0.0);
        let is_seconds = caps
            .get(2)
            .map(|m| m.as_str().eq_ignore_ascii_case("s"))
            .unwrap_or(false);
        let ms = if is_seconds { value * 1000.0 } else { value };
        let ms = ms.round().clamp(0.0, MAX_PAUSE_MS as f64) as u32;
        if ms > 0 {
            segments.push(TextSegment::Pause(ms));
        }

        last_end = whole.end();
    }

    let tail = input[last_end..].trim();
    if !tail.is_empty() {
        segments.push(TextSegment::Speech(tail.to_string()));
    }

    segments
}

/// Gọi VieNeu-TTS và trả về bytes WAV đã chuẩn hóa header
async fn request_wav_bytes(
    server_url: &str,
    req: &TtsSynthesizeRequest,
) -> Result<Vec<u8>, String> {
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
    Ok(bytes)
}

pub async fn synthesize_to_file(
    server_url: &str,
    req: &TtsSynthesizeRequest,
    output_path: &Path,
) -> Result<f64, String> {
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Không tạo được thư mục cache âm thanh: {}", e))?;
    }

    let segments = split_pause_segments(&req.input);
    let has_pause = segments.iter().any(|s| matches!(s, TextSegment::Pause(_)));
    // Tag pause có số 0 / không hợp lệ bị bỏ khỏi segments, nhưng vẫn phải loại khỏi text gửi TTS
    let has_tag = PAUSE_TAG_RE.is_match(&req.input);

    if !has_pause && !has_tag {
        let bytes = request_wav_bytes(server_url, req).await?;
        fs::write(output_path, &bytes)
            .map_err(|e| format!("Lỗi lưu file WAV: {}", e))?;
        // Đọc thời lượng từ WAV bằng hound
        return read_wav_duration(output_path);
    }

    synthesize_with_pauses(server_url, req, &segments, output_path).await
}

/// Sinh audio từng đoạn đọc rồi chèn khoảng lặng giữa chúng, ghi thành 1 file WAV duy nhất
async fn synthesize_with_pauses(
    server_url: &str,
    req: &TtsSynthesizeRequest,
    segments: &[TextSegment],
    output_path: &Path,
) -> Result<f64, String> {
    enum Piece {
        Samples(Vec<i32>),
        Silence(u32),
    }

    let mut pieces: Vec<Piece> = Vec::new();
    let mut spec: Option<hound::WavSpec> = None;

    for segment in segments {
        match segment {
            TextSegment::Pause(ms) => pieces.push(Piece::Silence(*ms)),
            TextSegment::Speech(text) => {
                let mut part_req = req.clone();
                part_req.input = text.clone();
                let bytes = request_wav_bytes(server_url, &part_req).await?;

                let mut reader = hound::WavReader::new(std::io::Cursor::new(bytes))
                    .map_err(|e| format!("Không đọc được WAV của đoạn \"{}\": {}", text, e))?;
                let part_spec = reader.spec();
                if part_spec.sample_format != hound::SampleFormat::Int {
                    return Err("Chỉ hỗ trợ ghép tag pause với WAV PCM số nguyên".to_string());
                }
                match spec {
                    None => spec = Some(part_spec),
                    Some(s)
                        if s.sample_rate != part_spec.sample_rate
                            || s.channels != part_spec.channels
                            || s.bits_per_sample != part_spec.bits_per_sample =>
                    {
                        return Err("Các đoạn âm thanh có định dạng WAV khác nhau, không thể ghép".to_string());
                    }
                    Some(_) => {}
                }

                let samples = reader
                    .samples::<i32>()
                    .collect::<Result<Vec<i32>, _>>()
                    .map_err(|e| format!("Lỗi giải mã mẫu âm thanh: {}", e))?;
                pieces.push(Piece::Samples(samples));
            }
        }
    }

    // Câu chỉ có tag pause: tạo file im lặng với cấu hình mặc định
    let spec = spec.unwrap_or(hound::WavSpec {
        channels: 1,
        sample_rate: FALLBACK_SAMPLE_RATE,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    });
    let channels = spec.channels.max(1) as u64;

    let mut writer = hound::WavWriter::create(output_path, spec)
        .map_err(|e| format!("Không tạo được file WAV: {}", e))?;
    let mut total_samples: u64 = 0;

    for piece in pieces {
        match piece {
            Piece::Samples(samples) => {
                total_samples += samples.len() as u64;
                for s in samples {
                    writer
                        .write_sample(s)
                        .map_err(|e| format!("Lỗi ghi mẫu âm thanh: {}", e))?;
                }
            }
            Piece::Silence(ms) => {
                let frames = spec.sample_rate as u64 * ms as u64 / 1000;
                let count = frames * channels;
                total_samples += count;
                for _ in 0..count {
                    writer
                        .write_sample(0i32)
                        .map_err(|e| format!("Lỗi ghi khoảng lặng: {}", e))?;
                }
            }
        }
    }

    writer
        .finalize()
        .map_err(|e| format!("Lỗi hoàn tất file WAV: {}", e))?;

    let duration = total_samples as f64 / channels as f64 / spec.sample_rate as f64;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_without_tag_returns_single_speech() {
        assert_eq!(
            split_pause_segments("Xin chào các bạn."),
            vec![TextSegment::Speech("Xin chào các bạn.".to_string())]
        );
    }

    #[test]
    fn split_ms_seconds_and_default_unit() {
        let segs = split_pause_segments("A [pause:500ms] B [PAUSE: 1.5s] C [pause:250]");
        assert_eq!(
            segs,
            vec![
                TextSegment::Speech("A".to_string()),
                TextSegment::Pause(500),
                TextSegment::Speech("B".to_string()),
                TextSegment::Pause(1500),
                TextSegment::Speech("C".to_string()),
                TextSegment::Pause(250),
            ]
        );
    }

    #[test]
    fn split_clamps_large_and_drops_zero() {
        let segs = split_pause_segments("[pause:999s]Xong[pause:0ms]");
        assert_eq!(
            segs,
            vec![
                TextSegment::Pause(MAX_PAUSE_MS),
                TextSegment::Speech("Xong".to_string()),
            ]
        );
    }

    #[test]
    fn emotion_tags_are_left_untouched() {
        let segs = split_pause_segments("Anh ấy [thở dài] rồi đi.");
        assert_eq!(
            segs,
            vec![TextSegment::Speech("Anh ấy [thở dài] rồi đi.".to_string())]
        );
    }
}
