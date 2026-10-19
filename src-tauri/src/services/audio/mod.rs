use hound::{SampleFormat, WavReader, WavWriter};
use std::path::{Path, PathBuf};

pub struct AudioConcatenateOptions {
    pub sentence_pause_ms: u32,
    pub paragraph_pause_ms: u32,
    pub sample_rate: u32,
    pub channels: u16,
    pub bits_per_sample: u16,
}

impl Default for AudioConcatenateOptions {
    fn default() -> Self {
        Self {
            sentence_pause_ms: 350,
            paragraph_pause_ms: 750,
            sample_rate: 48000,
            channels: 1,
            bits_per_sample: 16,
        }
    }
}

pub fn concatenate_sentence_wavs(
    input_wav_paths: &[PathBuf],
    output_path: &Path,
    options: &AudioConcatenateOptions,
) -> Result<f64, String> {
    if input_wav_paths.is_empty() {
        return Err("Danh sách file âm thanh trống".to_string());
    }

    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Không tạo được thư mục xuất: {}", e))?;
    }

    // Xác định spec từ file đầu tiên hoặc dùng default spec
    let first_reader = WavReader::open(&input_wav_paths[0])
        .map_err(|e| format!("Không đọc được file WAV đầu tiên: {}", e))?;
    let target_spec = first_reader.spec();

    let mut writer = WavWriter::create(output_path, target_spec)
        .map_err(|e| format!("Không tạo được file WAV đầu ra: {}", e))?;

    let pause_samples =
        (target_spec.sample_rate as f32 * (options.sentence_pause_ms as f32 / 1000.0)) as usize;

    let mut total_samples_written: u64 = 0;

    for (idx, path) in input_wav_paths.iter().enumerate() {
        if !path.exists() {
            continue;
        }

        let mut reader = match WavReader::open(path) {
            Ok(r) => r,
            Err(_) => continue,
        };

        match target_spec.sample_format {
            SampleFormat::Int => {
                for sample in reader.samples::<i16>() {
                    if let Ok(s) = sample {
                        writer.write_sample(s).map_err(|e| e.to_string())?;
                        total_samples_written += 1;
                    }
                }
            }
            SampleFormat::Float => {
                for sample in reader.samples::<f32>() {
                    if let Ok(s) = sample {
                        writer.write_sample(s).map_err(|e| e.to_string())?;
                        total_samples_written += 1;
                    }
                }
            }
        }

        // Chèn khoảng lặng giữa các câu (trừ câu cuối cùng)
        if idx + 1 < input_wav_paths.len() {
            for _ in 0..pause_samples {
                match target_spec.sample_format {
                    SampleFormat::Int => {
                        writer.write_sample(0i16).map_err(|e| e.to_string())?;
                    }
                    SampleFormat::Float => {
                        writer.write_sample(0.0f32).map_err(|e| e.to_string())?;
                    }
                }
                total_samples_written += 1;
            }
        }
    }

    writer.finalize().map_err(|e| format!("Lỗi hoàn tất ghi WAV: {}", e))?;

    let duration_seconds =
        total_samples_written as f64 / (target_spec.sample_rate as f64 * target_spec.channels as f64);
    Ok(duration_seconds)
}
