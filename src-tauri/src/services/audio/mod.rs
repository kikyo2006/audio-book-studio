use hound::{SampleFormat, WavReader, WavWriter};
use std::path::{Path, PathBuf};
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

mod bgm_item;
pub use bgm_item::trim_and_export_bgm_wav;
#[cfg(test)]
mod tests;

/// Sample rate của file khoảng lặng và nhạc nền chèn (khớp VieNeu-TTS v3 Turbo)
pub const SILENCE_SAMPLE_RATE: u32 = 48_000;
const BGM_ITEM_SAMPLE_RATE: u32 = 48_000;
/// Độ dài tối đa một dòng nhạc nền chèn (giây)
const MAX_BGM_ITEM_SECS: f64 = 3600.0;

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

/// Lấy độ dài file audio (giây). Ưu tiên đọc từ header (nhanh), không có thì giải mã cả file.
pub fn probe_audio_duration(path: &Path) -> Option<f64> {
    let from_header = (|| {
        let src = std::fs::File::open(path).ok()?;
        let mss = MediaSourceStream::new(Box::new(src), Default::default());
        let mut hint = Hint::new();
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
        }
        let probed = symphonia::default::get_probe()
            .format(&hint, mss, &Default::default(), &Default::default())
            .ok()?;
        let track = probed
            .format
            .tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)?;
        let frames = track.codec_params.n_frames?;
        let rate = track.codec_params.sample_rate?;
        if rate == 0 {
            return None;
        }
        Some(frames as f64 / rate as f64)
    })();

    from_header.or_else(|| {
        decode_audio_file(path)
            .ok()
            .filter(|(samples, sr)| !samples.is_empty() && *sr > 0)
            .map(|(samples, sr)| samples.len() as f64 / sr as f64)
    })
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

/// Thay đổi tốc độ phát (Speak Rate) của âm thanh PCM mono bằng thuật toán SOLA
/// (Synchronized Overlap-Add) - giữ nguyên vẹn 100% cao độ (Pitch Preservation).
/// - speed > 1.0: nói nhanh hơn (rút ngắn thời gian)
/// - speed < 1.0: nói chậm hơn (kéo dài thời gian)
pub fn time_stretch_sola(samples: &[i16], sample_rate: u32, speed: f32) -> Vec<i16> {
    if samples.is_empty() || (speed - 1.0).abs() < 0.02 || speed <= 0.3 || speed >= 3.0 {
        return samples.to_vec();
    }

    let win_size = ((sample_rate as f32 * 0.025).round() as usize).max(256);
    let hop_out = win_size / 2;
    let hop_in = ((hop_out as f32) * speed).round() as usize;
    let search_range = win_size / 2;

    if samples.len() < win_size + search_range + hop_in {
        return samples.to_vec();
    }

    let estimated_out_len = ((samples.len() as f32) / speed).round() as usize + win_size;
    let mut out: Vec<i16> = Vec::with_capacity(estimated_out_len);

    let init_len = win_size.min(samples.len());
    out.extend_from_slice(&samples[..init_len]);

    let mut in_pos = hop_in;
    let mut out_pos = hop_out;

    while in_pos + win_size + search_range <= samples.len() {
        let mut best_offset = 0usize;
        let mut max_corr = i64::MIN;

        let overlap_len = win_size - hop_out;
        let out_overlap_start = out_pos;

        if out_overlap_start + overlap_len > out.len() {
            break;
        }

        let mut delta = 0;
        while delta < search_range {
            let candidate_in = in_pos + delta;
            let mut corr: i64 = 0;
            let mut j = 0;
            while j < overlap_len {
                let s_out = out[out_overlap_start + j] as i64;
                let s_in = samples[candidate_in + j] as i64;
                corr += s_out * s_in;
                j += 2;
            }

            if corr > max_corr {
                max_corr = corr;
                best_offset = delta;
            }
            delta += 1;
        }

        let best_in = in_pos + best_offset;

        // Hòa trộn tuyến tính (Linear Crossfade) trên vùng overlap
        for j in 0..overlap_len {
            let fade_in = (j as f32) / (overlap_len as f32);
            let fade_out = 1.0 - fade_in;

            let mixed = (out[out_overlap_start + j] as f32 * fade_out)
                + (samples[best_in + j] as f32 * fade_in);
            out[out_overlap_start + j] = mixed.clamp(-32768.0, 32767.0).round() as i16;
        }

        // Nối tiếp phần non-overlapping của frame mới
        let non_overlap_start = best_in + overlap_len;
        let non_overlap_len = win_size - overlap_len;
        if non_overlap_start + non_overlap_len <= samples.len() {
            out.extend_from_slice(&samples[non_overlap_start..non_overlap_start + non_overlap_len]);
        }

        in_pos += hop_in;
        out_pos += hop_out;
    }

    if in_pos < samples.len() {
        out.extend_from_slice(&samples[in_pos..]);
    }

    out
}

/// Loại dòng trong kịch bản khi ghép audio
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ItemKind {
    /// Câu đọc bằng TTS (áp dụng Speak Rate)
    Speech,
    /// Khoảng lặng / hiệu ứng: không bao giờ time-stretch
    Effect,
    /// Dòng nhạc nền chèn: không time-stretch và BGM tổng bị tắt tiếng trong lúc dòng này chạy
    Music,
}

/// Xác định loại dòng từ chữ hiển thị của câu
pub fn item_kind_from_text(text: &str) -> ItemKind {
    if text.starts_with("[Nhạc nền:") {
        ItemKind::Music
    } else if text.starts_with("[Khoảng lặng") || text.starts_with("[Hiệu ứng:") {
        ItemKind::Effect
    } else {
        ItemKind::Speech
    }
}

fn item_kind_from_text_or_default(item_kinds: &[ItemKind], idx: usize) -> ItemKind {
    item_kinds.get(idx).copied().unwrap_or(ItemKind::Speech)
}

/// Hệ số nhân (0.0 - 1.0) của BGM tổng tại mẫu `idx` quanh một đoạn tắt tiếng [start, end),
/// có ramp `ramp` mẫu ở hai đầu để không bị nổ tiếng
fn span_gain(idx: usize, start: usize, end: usize, ramp: usize) -> f32 {
    if idx >= start && idx < end {
        return 0.0;
    }
    if ramp == 0 {
        return 1.0;
    }
    if idx < start && start - idx < ramp {
        return (start - idx) as f32 / ramp as f32;
    }
    if idx >= end && idx - end < ramp {
        return (idx - end) as f32 / ramp as f32;
    }
    1.0
}

pub fn concatenate_sentence_wavs(
    input_wav_items: &[(PathBuf, f32)],
    output_path: &Path,
    options: &AudioConcatenateOptions,
) -> Result<f64, String> {
    concatenate_sentence_wavs_with_bgm(input_wav_items, &[], output_path, options, None, 0.2)
}

/// `item_kinds[i]` là loại của `input_wav_items[i]` (thiếu thì coi là `Speech`).
/// Mọi file đầu vào được resample về sample rate của file đầu tiên trước khi nối.
pub fn concatenate_sentence_wavs_with_bgm(
    input_wav_items: &[(PathBuf, f32)],
    item_kinds: &[ItemKind],
    output_path: &Path,
    options: &AudioConcatenateOptions,
    bgm_path: Option<&Path>,
    bgm_volume: f32,
) -> Result<f64, String> {
    if input_wav_items.is_empty() {
        return Err("Danh sách file âm thanh trống".to_string());
    }

    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Không tạo được thư mục xuất: {}", e))?;
    }

    // Xác định spec từ file đầu tiên hoặc dùng default spec
    let _ = crate::services::tts::sanitize_wav_file(&input_wav_items[0].0);
    let first_reader = WavReader::open(&input_wav_items[0].0)
        .map_err(|e| format!("Không đọc được file WAV đầu tiên: {}", e))?;
    let target_spec = first_reader.spec();

    let pause_samples =
        (target_spec.sample_rate as f32 * (options.sentence_pause_ms as f32 / 1000.0)) as usize;

    let mut voice_samples: Vec<i16> = Vec::new();
    // Các đoạn [start, end) (tính theo mẫu) mà BGM tổng phải tắt tiếng (dòng nhạc nền chèn)
    let mut music_spans: Vec<(usize, usize)> = Vec::new();

    for (idx, (path, speed)) in input_wav_items.iter().enumerate() {
        if !path.exists() {
            continue;
        }

        let _ = crate::services::tts::sanitize_wav_file(path);

        let mut reader = match WavReader::open(path) {
            Ok(r) => r,
            Err(_) => continue,
        };
        let file_sample_rate = reader.spec().sample_rate;

        let mut sentence_samples = Vec::new();

        match target_spec.sample_format {
            SampleFormat::Int => {
                for sample in reader.samples::<i16>() {
                    if let Ok(s) = sample {
                        sentence_samples.push(s);
                    }
                }
            }
            SampleFormat::Float => {
                for sample in reader.samples::<f32>() {
                    if let Ok(s) = sample {
                        let clamped = (s.clamp(-1.0, 1.0) * 32767.0).round() as i16;
                        sentence_samples.push(clamped);
                    }
                }
            }
        }

        // Khoảng lặng / hiệu ứng thường 24kHz trong khi giọng đọc 48kHz: resample về cùng sample rate,
        // nếu không đoạn này bị ngắn đi và cao lên (VD: khoảng lặng 45s chỉ còn 22.5s)
        if file_sample_rate != target_spec.sample_rate && file_sample_rate > 0 && !sentence_samples.is_empty() {
            let as_float: Vec<f32> = sentence_samples.iter().map(|&s| s as f32 / 32768.0).collect();
            let resampled = resample_linear(&as_float, file_sample_rate, target_spec.sample_rate);
            sentence_samples = resampled
                .iter()
                .map(|&s| (s.clamp(-1.0, 1.0) * 32767.0).round() as i16)
                .collect();
        }

        let kind = item_kind_from_text_or_default(item_kinds, idx);

        // Áp dụng Speak Rate (SOLA time-stretch) chỉ cho câu đọc TTS, không đụng khoảng lặng / hiệu ứng / nhạc
        let rate = *speed;
        let stretched = if kind == ItemKind::Speech
            && (rate - 1.0).abs() >= 0.02
            && rate >= 0.3
            && rate <= 3.0
        {
            time_stretch_sola(&sentence_samples, target_spec.sample_rate, rate)
        } else {
            sentence_samples
        };

        let span_start = voice_samples.len();
        voice_samples.extend(stretched);
        if kind == ItemKind::Music {
            music_spans.push((span_start, voice_samples.len()));
        }

        // Chèn khoảng lặng giữa các câu (trừ câu cuối cùng)
        if idx + 1 < input_wav_items.len() {
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
        // Ramp 0.2s ở hai đầu đoạn nhạc nền chèn để BGM tổng tắt / bật lại êm
        let duck_ramp = (target_spec.sample_rate as f32 * 0.2) as usize;
        let mut span_ptr = 0usize;

        for (idx, &v_int) in voice_samples.iter().enumerate() {
            let v_float = v_int as f32 / 32768.0;
            let raw_b = if bgm_len > 0 { bgm_data[idx % bgm_len] } else { 0.0 };

            // Tính fade out nếu ở cuối chương
            let fade_factor = if idx >= fade_start && fade_samples > 0 {
                (total_frames - idx) as f32 / fade_samples as f32
            } else {
                1.0f32
            };

            // Bỏ qua các đoạn nhạc nền đã đi qua hẳn (kể cả ramp)
            while span_ptr < music_spans.len() && idx >= music_spans[span_ptr].1 + duck_ramp {
                span_ptr += 1;
            }
            // Hai đoạn liền kề có thể chồng ramp nên lấy hệ số nhỏ nhất của đoạn hiện tại và đoạn kế
            let mut duck_factor = 1.0f32;
            for &(s, e) in music_spans.iter().skip(span_ptr).take(2) {
                duck_factor = duck_factor.min(span_gain(idx, s, e, duck_ramp));
            }

            // bgm_volume là mức người dùng đặt (VD 0.15 = 15%), duck_factor chỉ tắt tạm rồi trở về đúng mức đó
            let b_float = raw_b * bgm_volume * fade_factor * duck_factor;
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

/// Xóa đoạn [start_secs, end_secs) khỏi file audio và ghi phần còn lại ra WAV mono 16-bit mới.
/// Trả về độ dài mới (giây).
pub fn remove_region_to_wav(
    source_path: &Path,
    output_path: &Path,
    start_secs: f64,
    end_secs: f64,
) -> Result<f64, String> {
    let (samples, sr) = decode_audio_file(source_path)?;
    if samples.is_empty() || sr == 0 {
        return Err("File audio không chứa dữ liệu hợp lệ.".to_string());
    }
    let total = samples.len();
    let start = ((start_secs.max(0.0) * sr as f64).round() as usize).min(total);
    let end = ((end_secs.max(0.0) * sr as f64).round() as usize).min(total);
    if end <= start {
        return Err("Vùng chọn không hợp lệ.".to_string());
    }
    if end - start >= total {
        return Err("Không thể cắt toàn bộ file audio, hãy dùng nút xóa/gỡ thay thế.".to_string());
    }

    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: sr,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::create(output_path, spec)
        .map_err(|e| format!("Lỗi tạo file WAV: {}", e))?;
    let mut written = 0usize;
    for &v in samples[..start].iter().chain(samples[end..].iter()) {
        let q = (v.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
        writer.write_sample(q).map_err(|e| e.to_string())?;
        written += 1;
    }
    writer.finalize().map_err(|e| format!("Lỗi hoàn tất file WAV: {}", e))?;
    Ok(written as f64 / sr as f64)
}

/// Dời toàn bộ audio theo `offset_secs`: dương = chèn khoảng lặng ở đầu, âm = bỏ bớt phần đầu.
/// Ghi ra WAV mono 16-bit mới, trả về độ dài mới (giây).
pub fn shift_audio_to_wav(
    source_path: &Path,
    output_path: &Path,
    offset_secs: f64,
) -> Result<f64, String> {
    let (samples, sr) = decode_audio_file(source_path)?;
    if samples.is_empty() || sr == 0 {
        return Err("File audio không chứa dữ liệu hợp lệ.".to_string());
    }
    let shift_frames = (offset_secs.abs() * sr as f64).round() as usize;
    if shift_frames == 0 {
        return Err("Độ dời quá nhỏ.".to_string());
    }
    if offset_secs < 0.0 && shift_frames >= samples.len() {
        return Err("Dời quá xa, sẽ mất toàn bộ audio.".to_string());
    }

    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: sr,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::create(output_path, spec)
        .map_err(|e| format!("Lỗi tạo file WAV: {}", e))?;
    let mut written = 0usize;
    let body: &[f32] = if offset_secs < 0.0 { &samples[shift_frames..] } else { &samples };
    if offset_secs > 0.0 {
        for _ in 0..shift_frames {
            writer.write_sample(0i16).map_err(|e| e.to_string())?;
            written += 1;
        }
    }
    for &v in body {
        let q = (v.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
        writer.write_sample(q).map_err(|e| e.to_string())?;
        written += 1;
    }
    writer.finalize().map_err(|e| format!("Lỗi hoàn tất file WAV: {}", e))?;
    Ok(written as f64 / sr as f64)
}

pub fn generate_silence_wav(output_path: &Path, duration_secs: f64) -> Result<(), String> {
    if let Some(parent) = output_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    // 48kHz để khớp giọng đọc VieNeu-TTS v3 Turbo (khi ghép vẫn resample nếu lệch)
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: SILENCE_SAMPLE_RATE,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::create(output_path, spec)
        .map_err(|e| format!("Lỗi tạo file silence WAV: {}", e))?;
    let total_samples = (SILENCE_SAMPLE_RATE as f64 * duration_secs.max(0.1)) as usize;
    for _ in 0..total_samples {
        writer.write_sample(0i16).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| format!("Lỗi hoàn tất file silence WAV: {}", e))?;
    Ok(())
}

/// Nối nhiều file WAV độc lập thành 1 file WAV duy nhất, với khoảng lặng `pause_ms` giữa các file
pub fn concatenate_wav_files(
    wav_paths: &[PathBuf],
    output_path: &Path,
    pause_ms: u32,
) -> Result<f64, String> {
    if wav_paths.is_empty() {
        return Err("Không có file âm thanh nào để ghép nối.".to_string());
    }

    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Không tạo được thư mục xuất: {}", e))?;
    }

    // Xác định spec từ file hợp lệ đầu tiên
    let first_valid = wav_paths
        .iter()
        .find(|p| p.exists())
        .ok_or_else(|| "Không tìm thấy file âm thanh nào tồn tại trên đĩa.".to_string())?;

    let first_reader = WavReader::open(first_valid)
        .map_err(|e| format!("Không đọc được file WAV đầu tiên ({}): {}", first_valid.display(), e))?;
    let target_spec = first_reader.spec();

    let pause_samples =
        (target_spec.sample_rate as f32 * (pause_ms as f32 / 1000.0)) as usize;

    let mut writer = WavWriter::create(output_path, target_spec)
        .map_err(|e| format!("Không tạo được file WAV đích: {}", e))?;

    let mut total_samples_written = 0usize;

    for (idx, path) in wav_paths.iter().enumerate() {
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
                        let clamped = (s.clamp(-1.0, 1.0) * 32767.0).round() as i16;
                        writer.write_sample(clamped).map_err(|e| e.to_string())?;
                        total_samples_written += 1;
                    }
                }
            }
        }

        // Chèn khoảng lặng giữa các file WAV (trừ file cuối)
        if idx + 1 < wav_paths.len() {
            for _ in 0..pause_samples {
                writer.write_sample(0i16).map_err(|e| e.to_string())?;
                total_samples_written += 1;
            }
        }
    }

    writer.finalize().map_err(|e| format!("Lỗi hoàn tất file WAV: {}", e))?;

    let duration_seconds = total_samples_written as f64
        / (target_spec.sample_rate as f64 * target_spec.channels.max(1) as f64);
    Ok(duration_seconds)
}

/// Cắt một đoạn âm thanh SFX (từ start_secs với thời lượng duration_secs),
/// resample về 24,000Hz PCM 16-bit Mono, thêm micro fade chống click và xuất ra file WAV.
pub fn trim_and_export_sfx_wav(
    source_path: &Path,
    output_path: &Path,
    start_secs: f64,
    duration_secs: f64,
) -> Result<f64, String> {
    if let Some(parent) = output_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    if !source_path.exists() {
        return Err(format!("Không tìm thấy file SFX gốc: {}", source_path.display()));
    }

    let (samples, sr) = decode_audio_file(source_path)?;
    if samples.is_empty() {
        return Err("File SFX không chứa dữ liệu âm thanh hợp lệ.".to_string());
    }

    let total_src_samples = samples.len();
    let start_frame = ((start_secs.max(0.0)) * sr as f64).round() as usize;
    if start_frame >= total_src_samples {
        return Err(format!(
            "Thời điểm bắt đầu ({:.2}s) vượt quá độ dài file audio ({:.2}s).",
            start_secs,
            total_src_samples as f64 / sr as f64
        ));
    }

    let end_frame = if duration_secs > 0.0 {
        (start_frame + (duration_secs * sr as f64).round() as usize).min(total_src_samples)
    } else {
        total_src_samples
    };

    let sliced = &samples[start_frame..end_frame];
    if sliced.is_empty() {
        return Err("Đoạn âm thanh cắt bị rỗng.".to_string());
    }

    // Chuẩn hóa Sample Rate về 24,000Hz (chuẩn TTS của BookStudio)
    let target_sr = 24000u32;
    let mut resampled = resample_linear(sliced, sr, target_sr);

    // Áp dụng Micro Fade-in & Fade-out 5ms để triệt tiêu tiếng "pop/click"
    let fade_samples = ((target_sr as f32) * 0.005).round() as usize;
    let fade_len = fade_samples.min(resampled.len() / 2);
    if fade_len > 0 {
        for i in 0..fade_len {
            let factor = i as f32 / fade_len as f32;
            resampled[i] *= factor;
            let end_idx = resampled.len() - 1 - i;
            resampled[end_idx] *= factor;
        }
    }

    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: target_sr,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = hound::WavWriter::create(output_path, spec)
        .map_err(|e| format!("Lỗi tạo file WAV SFX: {}", e))?;

    for &s in &resampled {
        let clamped = (s.clamp(-1.0, 1.0) * 32767.0).round() as i16;
        writer.write_sample(clamped).map_err(|e| e.to_string())?;
    }

    writer
        .finalize()
        .map_err(|e| format!("Lỗi hoàn tất ghi file WAV SFX: {}", e))?;

    let actual_duration = resampled.len() as f64 / target_sr as f64;
    Ok(actual_duration)
}


