use hound::{SampleFormat, WavReader, WavWriter};
use std::path::{Path, PathBuf};
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

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

/// Giải mã file audio bất kỳ (MP3, WAV, FLAC, OGG, M4A) thành chuỗi mẫu mono f32 (-1.0 -> 1.0)
pub fn decode_audio_file(path: &Path) -> Result<(Vec<f32>, u32), String> {
    let src = std::fs::File::open(path)
        .map_err(|e| format!("Không thể mở file audio ({}): {}", path.display(), e))?;
    let mss = MediaSourceStream::new(Box::new(src), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }
    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .map_err(|e| format!("Không nhận dạng được định dạng audio ({}): {}", path.display(), e))?;

    let mut format = probed.format;
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| "Không tìm thấy track âm thanh hợp lệ".to_string())?;

    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);

    let dec_opts: DecoderOptions = Default::default();
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &dec_opts)
        .map_err(|e| format!("Không khởi tạo được bộ giải mã: {}", e))?;

    let mut samples: Vec<f32> = Vec::new();

    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(Error::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(Error::ResetRequired) => break,
            Err(_) => break,
        };

        if packet.track_id() != track_id {
            continue;
        }

        if let Ok(decoded) = decoder.decode(&packet) {
            match decoded {
                AudioBufferRef::F32(buf) => {
                    let planes = buf.planes();
                    let num_frames = buf.frames();
                    let num_ch = planes.planes().len().max(1);
                    for frame in 0..num_frames {
                        let mut sum = 0.0f32;
                        for ch in 0..num_ch {
                            sum += planes.planes()[ch][frame];
                        }
                        samples.push(sum / num_ch as f32);
                    }
                }
                AudioBufferRef::S16(buf) => {
                    let planes = buf.planes();
                    let num_frames = buf.frames();
                    let num_ch = planes.planes().len().max(1);
                    for frame in 0..num_frames {
                        let mut sum = 0.0f32;
                        for ch in 0..num_ch {
                            sum += planes.planes()[ch][frame] as f32 / 32768.0;
                        }
                        samples.push(sum / num_ch as f32);
                    }
                }
                AudioBufferRef::U8(buf) => {
                    let planes = buf.planes();
                    let num_frames = buf.frames();
                    let num_ch = planes.planes().len().max(1);
                    for frame in 0..num_frames {
                        let mut sum = 0.0f32;
                        for ch in 0..num_ch {
                            sum += (planes.planes()[ch][frame] as f32 - 128.0) / 128.0;
                        }
                        samples.push(sum / num_ch as f32);
                    }
                }
                AudioBufferRef::S24(buf) => {
                    let planes = buf.planes();
                    let num_frames = buf.frames();
                    let num_ch = planes.planes().len().max(1);
                    for frame in 0..num_frames {
                        let mut sum = 0.0f32;
                        for ch in 0..num_ch {
                            sum += planes.planes()[ch][frame].0 as f32 / 8388608.0;
                        }
                        samples.push(sum / num_ch as f32);
                    }
                }
                AudioBufferRef::S32(buf) => {
                    let planes = buf.planes();
                    let num_frames = buf.frames();
                    let num_ch = planes.planes().len().max(1);
                    for frame in 0..num_frames {
                        let mut sum = 0.0f32;
                        for ch in 0..num_ch {
                            sum += planes.planes()[ch][frame] as f32 / 2147483648.0;
                        }
                        samples.push(sum / num_ch as f32);
                    }
                }
                AudioBufferRef::F64(buf) => {
                    let planes = buf.planes();
                    let num_frames = buf.frames();
                    let num_ch = planes.planes().len().max(1);
                    for frame in 0..num_frames {
                        let mut sum = 0.0f32;
                        for ch in 0..num_ch {
                            sum += planes.planes()[ch][frame] as f32;
                        }
                        samples.push(sum / num_ch as f32);
                    }
                }
                _ => {}
            }
        }
    }

    Ok((samples, sample_rate))
}

/// Chuyển đổi sample rate bằng nội suy tuyến tính (Linear interpolation)
pub fn resample_linear(input: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    if from_rate == to_rate || input.is_empty() {
        return input.to_vec();
    }
    let ratio = from_rate as f64 / to_rate as f64;
    let target_len = (input.len() as f64 / ratio).round() as usize;
    let mut output = Vec::with_capacity(target_len);
    for i in 0..target_len {
        let src_idx = i as f64 * ratio;
        let idx0 = src_idx.floor() as usize;
        let idx1 = (idx0 + 1).min(input.len().saturating_sub(1));
        let frac = (src_idx - idx0 as f64) as f32;
        let s0 = input.get(idx0).copied().unwrap_or(0.0);
        let s1 = input.get(idx1).copied().unwrap_or(0.0);
        output.push(s0 + frac * (s1 - s0));
    }
    output
}

pub fn concatenate_sentence_wavs(
    input_wav_paths: &[PathBuf],
    output_path: &Path,
    options: &AudioConcatenateOptions,
) -> Result<f64, String> {
    concatenate_sentence_wavs_with_bgm(input_wav_paths, output_path, options, None, 0.2)
}

pub fn concatenate_sentence_wavs_with_bgm(
    input_wav_paths: &[PathBuf],
    output_path: &Path,
    options: &AudioConcatenateOptions,
    bgm_path: Option<&Path>,
    bgm_volume: f32,
) -> Result<f64, String> {
    if input_wav_paths.is_empty() {
        return Err("Danh sách file âm thanh trống".to_string());
    }

    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Không tạo được thư mục xuất: {}", e))?;
    }

    // Xác định spec từ file đầu tiên hoặc dùng default spec
    let _ = crate::services::tts::sanitize_wav_file(&input_wav_paths[0]);
    let first_reader = WavReader::open(&input_wav_paths[0])
        .map_err(|e| format!("Không đọc được file WAV đầu tiên: {}", e))?;
    let target_spec = first_reader.spec();

    let pause_samples =
        (target_spec.sample_rate as f32 * (options.sentence_pause_ms as f32 / 1000.0)) as usize;

    let mut voice_samples: Vec<i16> = Vec::new();

    for (idx, path) in input_wav_paths.iter().enumerate() {
        if !path.exists() {
            continue;
        }

        let _ = crate::services::tts::sanitize_wav_file(path);

        let mut reader = match WavReader::open(path) {
            Ok(r) => r,
            Err(_) => continue,
        };

        match target_spec.sample_format {
            SampleFormat::Int => {
                for sample in reader.samples::<i16>() {
                    if let Ok(s) = sample {
                        voice_samples.push(s);
                    }
                }
            }
            SampleFormat::Float => {
                for sample in reader.samples::<f32>() {
                    if let Ok(s) = sample {
                        let clamped = (s.clamp(-1.0, 1.0) * 32767.0).round() as i16;
                        voice_samples.push(clamped);
                    }
                }
            }
        }

        // Chèn khoảng lặng giữa các câu (trừ câu cuối cùng)
        if idx + 1 < input_wav_paths.len() {
            for _ in 0..pause_samples {
                voice_samples.push(0i16);
            }
        }
    }

    if voice_samples.is_empty() {
        return Err("Không có dữ liệu âm thanh để ghép nối".to_string());
    }

    // Đọc và chuẩn bị BGM nếu có
    let mut bgm_resampled: Option<Vec<f32>> = None;
    if let Some(bgm_file) = bgm_path {
        if bgm_file.exists() {
            if let Ok((raw_bgm, bgm_sr)) = decode_audio_file(bgm_file) {
                if !raw_bgm.is_empty() {
                    let resampled = resample_linear(&raw_bgm, bgm_sr, target_spec.sample_rate);
                    bgm_resampled = Some(resampled);
                }
            }
        }
    }

    let out_spec = hound::WavSpec {
        channels: target_spec.channels,
        sample_rate: target_spec.sample_rate,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };

    let mut writer = WavWriter::create(output_path, out_spec)
        .map_err(|e| format!("Không tạo được file WAV đầu ra: {}", e))?;

    let total_frames = voice_samples.len();
    let fade_samples = (target_spec.sample_rate as f32 * 2.5) as usize; // Fade out 2.5s ở cuối chương
    let fade_start = total_frames.saturating_sub(fade_samples);

    if let Some(bgm_data) = bgm_resampled {
        let bgm_len = bgm_data.len();
        for (idx, &v_int) in voice_samples.iter().enumerate() {
            let v_float = v_int as f32 / 32768.0;
            let raw_b = if bgm_len > 0 { bgm_data[idx % bgm_len] } else { 0.0 };

            // Tính fade out nếu ở cuối chương
            let fade_factor = if idx >= fade_start && fade_samples > 0 {
                (total_frames - idx) as f32 / fade_samples as f32
            } else {
                1.0f32
            };

            let b_float = raw_b * bgm_volume * fade_factor;
            let mixed_float = (v_float + b_float).clamp(-1.0, 1.0);
            let mixed_int = (mixed_float * 32767.0).round() as i16;

            writer.write_sample(mixed_int).map_err(|e| e.to_string())?;
        }
    } else {
        // Xuất chỉ giọng đọc thuần
        for &sample in &voice_samples {
            writer.write_sample(sample).map_err(|e| e.to_string())?;
        }
    }

    writer.finalize().map_err(|e| format!("Lỗi hoàn tất ghi WAV: {}", e))?;

    let duration_seconds =
        total_frames as f64 / (target_spec.sample_rate as f64 * target_spec.channels.max(1) as f64);
    Ok(duration_seconds)
}

pub fn generate_silence_wav(output_path: &Path, duration_secs: f64) -> Result<(), String> {
    if let Some(parent) = output_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: 24000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::create(output_path, spec)
        .map_err(|e| format!("Lỗi tạo file silence WAV: {}", e))?;
    let total_samples = (24000.0 * duration_secs.max(0.1)) as usize;
    for _ in 0..total_samples {
        writer.write_sample(0i16).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| format!("Lỗi hoàn tất file silence WAV: {}", e))?;
    Ok(())
}

