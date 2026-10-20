use std::path::Path;

use super::{decode_audio_file, resample_linear, BGM_ITEM_SAMPLE_RATE, MAX_BGM_ITEM_SECS};

/// Cắt một đoạn nhạc nền từ file bất kỳ trên máy rồi tạo file WAV 48kHz mono cho dòng "Nhạc nền".
/// - `start_secs` / `cut_secs`: đoạn lấy từ file nguồn (`cut_secs <= 0` nghĩa là lấy đến hết file)
/// - `target_secs`: độ dài dòng nhạc nền; lớn hơn đoạn cắt thì lặp lại (crossfade ngắn) cho đủ, nhỏ hơn thì cắt bớt
/// - `fade_in_secs` / `fade_out_secs`: fade ở hai đầu; `volume`: hệ số âm lượng (1.0 = 100%)
/// Trả về độ dài thực tế (giây).
pub fn trim_and_export_bgm_wav(
    source_path: &Path,
    output_path: &Path,
    start_secs: f64,
    cut_secs: f64,
    target_secs: f64,
    fade_in_secs: f64,
    fade_out_secs: f64,
    volume: f32,
) -> Result<f64, String> {
    if let Some(parent) = output_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if !source_path.exists() {
        return Err(format!("Không tìm thấy file nhạc nền: {}", source_path.display()));
    }

    let (samples, sr) = decode_audio_file(source_path)?;
    if samples.is_empty() || sr == 0 {
        return Err("File nhạc nền không chứa dữ liệu âm thanh hợp lệ.".to_string());
    }

    let start_frame = (start_secs.max(0.0) * sr as f64).round() as usize;
    if start_frame >= samples.len() {
        return Err(format!(
            "Thời điểm bắt đầu ({:.2}s) vượt quá độ dài file nhạc ({:.2}s).",
            start_secs,
            samples.len() as f64 / sr as f64
        ));
    }
    let end_frame = if cut_secs > 0.0 {
        (start_frame + (cut_secs * sr as f64).round() as usize).min(samples.len())
    } else {
        samples.len()
    };
    let sliced = &samples[start_frame..end_frame];
    if sliced.is_empty() {
        return Err("Đoạn nhạc cắt bị rỗng.".to_string());
    }

    let slice = resample_linear(sliced, sr, BGM_ITEM_SAMPLE_RATE);
    if slice.is_empty() {
        return Err("Không resample được đoạn nhạc nền.".to_string());
    }

    let target_secs = if target_secs > 0.0 {
        target_secs.min(MAX_BGM_ITEM_SECS)
    } else {
        slice.len() as f64 / BGM_ITEM_SAMPLE_RATE as f64
    };
    let target_len = (target_secs * BGM_ITEM_SAMPLE_RATE as f64).round() as usize;
    if target_len == 0 {
        return Err("Độ dài nhạc nền phải lớn hơn 0.".to_string());
    }

    // Lặp đoạn cắt cho đủ độ dài, crossfade ngắn ở chỗ nối để không bị click
    let crossfade = ((BGM_ITEM_SAMPLE_RATE as f32 * 0.05) as usize).min(slice.len() / 2);
    let mut out: Vec<f32> = Vec::with_capacity(target_len + slice.len());
    while out.len() < target_len {
        if out.is_empty() || crossfade == 0 {
            out.extend_from_slice(&slice);
        } else {
            let base = out.len() - crossfade;
            for i in 0..crossfade {
                let t = (i + 1) as f32 / (crossfade + 1) as f32;
                out[base + i] = out[base + i] * (1.0 - t) + slice[i] * t;
            }
            out.extend_from_slice(&slice[crossfade..]);
        }
    }
    out.truncate(target_len);

    // Fade in / out (tối thiểu 5ms chống click) và volume
    let min_fade = (BGM_ITEM_SAMPLE_RATE as f32 * 0.005) as usize;
    let fade_in = ((fade_in_secs.max(0.0) * BGM_ITEM_SAMPLE_RATE as f64) as usize)
        .max(min_fade)
        .min(target_len / 2);
    let fade_out = ((fade_out_secs.max(0.0) * BGM_ITEM_SAMPLE_RATE as f64) as usize)
        .max(min_fade)
        .min(target_len / 2);
    let gain = volume.clamp(0.0, 4.0);

    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: BGM_ITEM_SAMPLE_RATE,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::create(output_path, spec)
        .map_err(|e| format!("Lỗi tạo file WAV nhạc nền: {}", e))?;

    for (i, &s) in out.iter().enumerate() {
        let mut f = 1.0f32;
        if fade_in > 0 && i < fade_in {
            f = f.min(i as f32 / fade_in as f32);
        }
        let remaining = target_len - 1 - i;
        if fade_out > 0 && remaining < fade_out {
            f = f.min(remaining as f32 / fade_out as f32);
        }
        let v = (s * gain * f).clamp(-1.0, 1.0);
        writer
            .write_sample((v * 32767.0).round() as i16)
            .map_err(|e| e.to_string())?;
    }
    writer
        .finalize()
        .map_err(|e| format!("Lỗi hoàn tất file WAV nhạc nền: {}", e))?;

    Ok(target_len as f64 / BGM_ITEM_SAMPLE_RATE as f64)
}
