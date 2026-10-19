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

pub async fn check_tts_health(server_url: &str) -> bool {
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_millis(1500))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };

    let base = server_url.trim_end_matches('/');
    let url = format!("{}/v1/models", base);
    match client.get(&url).send().await {
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

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let base = server_url.trim_end_matches('/');
    let endpoint = format!("{}/v1/audio/speech", base);

    let res = client
        .post(&endpoint)
        .json(req)
        .send()
        .await
        .map_err(|e| format!("Lỗi kết nối tới VieNeu-TTS ({}): {}", endpoint, e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_else(|_| "Lỗi không xác định".into());
        return Err(format!("VieNeu-TTS trả về lỗi HTTP: {}", err_text));
    }

    let bytes = res
        .bytes()
        .await
        .map_err(|e| format!("Lỗi đọc stream âm thanh: {}", e))?;

    fs::write(output_path, &bytes)
        .map_err(|e| format!("Lỗi lưu file WAV: {}", e))?;

    // Đọc thời lượng từ WAV bằng hound
    let duration = read_wav_duration(output_path)?;
    Ok(duration)
}

pub fn read_wav_duration(path: &Path) -> Result<f64, String> {
    let reader = WavReader::open(path)
        .map_err(|e| format!("Không đọc được file WAV: {}", e))?;
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
