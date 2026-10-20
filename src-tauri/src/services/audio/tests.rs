use super::*;
use std::path::{Path, PathBuf};

fn temp_wav(name: &str) -> PathBuf {
    std::env::temp_dir().join(format!("bookstudio_test_{}_{}.wav", name, uuid::Uuid::new_v4()))
}

fn write_wav(path: &Path, sample_rate: u32, samples: &[i16]) {
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };
    let mut w = WavWriter::create(path, spec).expect("tạo wav test");
    for &s in samples {
        w.write_sample(s).expect("ghi wav test");
    }
    w.finalize().expect("đóng wav test");
}

fn read_all(path: &Path) -> (hound::WavSpec, Vec<i16>) {
    let mut r = WavReader::open(path).expect("đọc wav test");
    let spec = r.spec();
    let samples = r.samples::<i16>().map(|s| s.unwrap_or(0)).collect();
    (spec, samples)
}

#[test]
fn item_kind_detects_markers() {
    assert_eq!(item_kind_from_text("Xin chào"), ItemKind::Speech);
    assert_eq!(item_kind_from_text("[Khoảng lặng 45.0s]"), ItemKind::Effect);
    assert_eq!(item_kind_from_text("[Hiệu ứng: Mưa (3.0s)]"), ItemKind::Effect);
    assert_eq!(item_kind_from_text("[Nhạc nền: Piano (45.0s)]"), ItemKind::Music);
}

#[test]
fn span_gain_ramps_and_mutes() {
    // đoạn tắt [100, 200), ramp 10 mẫu
    assert_eq!(span_gain(50, 100, 200, 10), 1.0);
    assert!((span_gain(95, 100, 200, 10) - 0.5).abs() < 1e-6);
    assert_eq!(span_gain(100, 100, 200, 10), 0.0);
    assert_eq!(span_gain(199, 100, 200, 10), 0.0);
    assert!((span_gain(205, 100, 200, 10) - 0.5).abs() < 1e-6);
    assert_eq!(span_gain(210, 100, 200, 10), 1.0);
}

#[test]
fn concat_resamples_24k_effect_to_voice_rate() {
    let voice = temp_wav("voice48");
    let silence = temp_wav("silence24");
    let out = temp_wav("out");
    write_wav(&voice, 48_000, &vec![1000i16; 48_000]); // 1s @48k
    write_wav(&silence, 24_000, &vec![0i16; 24_000]); // 1s @24k

    let opts = AudioConcatenateOptions {
        sentence_pause_ms: 0,
        ..Default::default()
    };
    let items = vec![(voice.clone(), 1.0f32), (silence.clone(), 1.0f32)];
    let kinds = [ItemKind::Speech, ItemKind::Effect];
    let dur = concatenate_sentence_wavs_with_bgm(&items, &kinds, &out, &opts, None, 0.2)
        .expect("ghép wav");

    // Khoảng lặng 1s @24k phải ra 1s, tổng 2s (trước khi sửa chỉ ra 1.5s)
    assert!((dur - 2.0).abs() < 0.01, "tổng thời lượng = {}", dur);
    let (spec, samples) = read_all(&out);
    assert_eq!(spec.sample_rate, 48_000);
    assert!((samples.len() as f64 - 96_000.0).abs() < 100.0);

    for p in [voice, silence, out] {
        let _ = std::fs::remove_file(p);
    }
}

#[test]
fn music_item_mutes_chapter_bgm_and_restores_set_volume() {
    let sr = 48_000usize;
    let speech_a = temp_wav("sa");
    let music = temp_wav("m");
    let speech_b = temp_wav("sb");
    let bgm = temp_wav("bgm");
    let out = temp_wav("mix");

    write_wav(&speech_a, sr as u32, &vec![0i16; sr * 4]); // 0-4s
    write_wav(&music, sr as u32, &vec![0i16; sr * 2]); // 4-6s (tắt BGM tổng)
    write_wav(&speech_b, sr as u32, &vec![0i16; sr * 8]); // 6-14s
    write_wav(&bgm, sr as u32, &vec![16384i16; sr]); // hằng 0.5, lặp lại

    let opts = AudioConcatenateOptions {
        sentence_pause_ms: 0,
        ..Default::default()
    };
    let items = vec![
        (speech_a.clone(), 1.0f32),
        (music.clone(), 1.0f32),
        (speech_b.clone(), 1.0f32),
    ];
    let kinds = [ItemKind::Speech, ItemKind::Music, ItemKind::Speech];
    concatenate_sentence_wavs_with_bgm(&items, &kinds, &out, &opts, Some(&bgm), 0.2)
        .expect("ghép có BGM");

    let (_, samples) = read_all(&out);
    let at = |sec: f64| samples[(sec * sr as f64) as usize];
    let expected = (0.5f32 * 0.2 * 32767.0) as i16; // mức BGM tổng đã đặt (20%)

    assert!((at(1.0) - expected).abs() <= 2, "trước đoạn nhạc: {}", at(1.0));
    assert_eq!(at(5.0), 0, "trong đoạn nhạc phải im");
    assert!(
        (at(8.0) - expected).abs() <= 2,
        "sau đoạn nhạc phải về đúng mức đã đặt: {}",
        at(8.0)
    );

    for p in [speech_a, music, speech_b, bgm, out] {
        let _ = std::fs::remove_file(p);
    }
}

#[test]
fn bgm_item_loops_to_target_length_with_fades() {
    let src = temp_wav("src");
    let out = temp_wav("bgmitem");
    write_wav(&src, 44_100, &vec![20000i16; 44_100 * 2]); // 2s

    let dur = trim_and_export_bgm_wav(&src, &out, 0.0, 2.0, 5.0, 1.0, 1.0, 1.0)
        .expect("tạo nhạc nền chèn");
    assert!((dur - 5.0).abs() < 0.01, "độ dài = {}", dur);

    let (spec, samples) = read_all(&out);
    assert_eq!(spec.sample_rate, 48_000);
    assert_eq!(samples.len(), 240_000);
    assert!(samples[0].abs() < 50, "đầu phải fade in");
    assert!(samples[samples.len() - 1].abs() < 50, "cuối phải fade out");
    assert!(samples[120_000] > 15_000, "giữa phải đủ to");

    for p in [src, out] {
        let _ = std::fs::remove_file(p);
    }
}
