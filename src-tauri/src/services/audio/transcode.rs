//! Chuyển WAV master sang MP3 / M4B bằng FFmpeg (sidecar đóng gói kèm app).

use std::path::{Path, PathBuf};
use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};

use base64::Engine;

use crate::models::Project;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutputFormat {
    Wav,
    Mp3,
    M4b,
}

impl OutputFormat {
    pub fn parse(value: Option<&str>) -> Self {
        match value.map(|v| v.trim().to_lowercase()).as_deref() {
            Some("mp3") => OutputFormat::Mp3,
            Some("m4b") => OutputFormat::M4b,
            _ => OutputFormat::Wav,
        }
    }

    pub fn extension(&self) -> &'static str {
        match self {
            OutputFormat::Wav => "wav",
            OutputFormat::Mp3 => "mp3",
            OutputFormat::M4b => "m4b",
        }
    }
}

#[derive(Debug, Clone)]
pub struct ChapterMark {
    pub title: String,
    pub start_ms: u64,
    pub end_ms: u64,
}

#[derive(Debug, Clone, Default)]
pub struct TrackMetadata {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub track: Option<u32>,
    pub cover: Option<PathBuf>,
    pub chapters: Vec<ChapterMark>,
}

fn ffmpeg_file_name() -> &'static str {
    if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" }
}

fn runs_ok(path: &Path) -> bool {
    let mut cmd = Command::new(path);
    cmd.arg("-version");
    hide_console(&mut cmd);
    cmd.output().map(|o| o.status.success()).unwrap_or(false)
}

#[cfg(windows)]
fn hide_console(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x0800_0000);
}

#[cfg(not(windows))]
fn hide_console(_cmd: &mut Command) {}

/// Tìm FFmpeg: ưu tiên bản sidecar nằm cạnh file chạy của app, sau đó biến môi trường
/// `FFMPEG_PATH`, cuối cùng là FFmpeg cài sẵn trong máy.
pub fn find_ffmpeg() -> Result<PathBuf, String> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join(ffmpeg_file_name()));
        }
    }
    if let Ok(custom) = std::env::var("FFMPEG_PATH") {
        if !custom.trim().is_empty() {
            candidates.push(PathBuf::from(custom));
        }
    }
    if !cfg!(windows) {
        candidates.push(PathBuf::from("/opt/homebrew/bin/ffmpeg"));
        candidates.push(PathBuf::from("/usr/local/bin/ffmpeg"));
        candidates.push(PathBuf::from("/usr/bin/ffmpeg"));
    }
    candidates.push(PathBuf::from(ffmpeg_file_name()));

    candidates
        .into_iter()
        .find(|p| (!p.is_absolute() || p.exists()) && runs_ok(p))
        .ok_or_else(|| {
            "Không tìm thấy FFmpeg. Vui lòng cài lại ứng dụng hoặc xuất định dạng WAV.".to_string()
        })
}

/// Thời lượng (ms) của một file WAV.
pub fn wav_duration_ms(path: &Path) -> Option<u64> {
    let reader = hound::WavReader::open(path).ok()?;
    let rate = reader.spec().sample_rate.max(1) as u64;
    Some(reader.duration() as u64 * 1000 / rate)
}

/// Chuẩn bị file ảnh bìa trong `dir`: ưu tiên `cover_path`, nếu không có thì giải mã `cover_base64`.
pub fn prepare_cover(project: &Project, dir: &Path) -> Option<PathBuf> {
    if let Some(p) = project.cover_path.as_ref() {
        let path = PathBuf::from(p);
        if path.is_file() {
            return Some(path);
        }
    }
    let raw = project.cover_base64.as_ref()?;
    let payload = raw.split_once("base64,").map(|(_, b)| b).unwrap_or(raw);
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload.trim())
        .ok()?;
    if bytes.is_empty() {
        return None;
    }
    let _ = std::fs::create_dir_all(dir);
    let path = dir.join(format!("cover_{}", uuid::Uuid::new_v4()));
    std::fs::write(&path, bytes).ok()?;
    Some(path)
}

fn escape_ffmetadata(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        match ch {
            '=' | ';' | '#' | '\\' => {
                out.push('\\');
                out.push(ch);
            }
            '\n' | '\r' => out.push(' '),
            _ => out.push(ch),
        }
    }
    out
}

fn build_ffmetadata(meta: &TrackMetadata) -> String {
    let mut s = String::from(";FFMETADATA1\n");
    s.push_str(&format!("title={}\n", escape_ffmetadata(&meta.title)));
    s.push_str(&format!("artist={}\n", escape_ffmetadata(&meta.artist)));
    s.push_str(&format!("album={}\n", escape_ffmetadata(&meta.album)));
    for ch in &meta.chapters {
        s.push_str("[CHAPTER]\nTIMEBASE=1/1000\n");
        s.push_str(&format!("START={}\nEND={}\n", ch.start_ms, ch.end_ms.max(ch.start_ms + 1)));
        s.push_str(&format!("title={}\n", escape_ffmetadata(&ch.title)));
    }
    s
}

pub fn transcode_wav(
    wav: &Path,
    target: &Path,
    format: OutputFormat,
    meta: &TrackMetadata,
    on_progress: &dyn Fn(f32),
) -> Result<(), String> {
    if format == OutputFormat::Wav {
        return Ok(());
    }
    let ffmpeg = find_ffmpeg()?;

    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Không tạo được thư mục xuất: {}", e))?;
    }

    let cover = meta.cover.as_ref().filter(|c| c.is_file());
    let mut meta_file: Option<PathBuf> = None;

    let mut cmd = Command::new(&ffmpeg);
    cmd.args(["-hide_banner", "-loglevel", "error", "-nostats", "-progress", "pipe:1", "-y", "-i"])
        .arg(wav);

    match format {
        OutputFormat::Mp3 => {
            if let Some(c) = cover {
                cmd.arg("-i").arg(c);
                cmd.args(["-map", "0:a", "-map", "1:v", "-c:v", "mjpeg", "-pix_fmt", "yuvj420p"]);
                cmd.args([
                    "-metadata:s:v", "title=Album cover",
                    "-metadata:s:v", "comment=Cover (front)",
                ]);
            } else {
                cmd.args(["-map", "0:a"]);
            }
            cmd.args(["-c:a", "libmp3lame", "-b:a", "320k", "-id3v2_version", "3"]);
            cmd.arg("-metadata").arg(format!("title={}", meta.title));
            cmd.arg("-metadata").arg(format!("artist={}", meta.artist));
            cmd.arg("-metadata").arg(format!("album={}", meta.album));
            if let Some(t) = meta.track {
                cmd.arg("-metadata").arg(format!("track={}", t));
            }
            cmd.args(["-f", "mp3"]);
        }
        OutputFormat::M4b => {
            let mf = target.with_extension("ffmetadata.tmp");
            std::fs::write(&mf, build_ffmetadata(meta))
                .map_err(|e| format!("Không ghi được file metadata chương: {}", e))?;
            cmd.arg("-i").arg(&mf);
            meta_file = Some(mf);
            if let Some(c) = cover {
                cmd.arg("-i").arg(c);
                cmd.args(["-map", "0:a", "-map", "2:v", "-c:v", "mjpeg", "-pix_fmt", "yuvj420p"]);
                cmd.args(["-disposition:v:0", "attached_pic"]);
            } else {
                cmd.args(["-map", "0:a"]);
            }
            cmd.args(["-map_metadata", "1", "-map_chapters", "1"]);
            cmd.args(["-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-f", "ipod"]);
        }
        OutputFormat::Wav => unreachable!(),
    }

    cmd.arg(target);

    let total_ms = wav_duration_ms(wav).unwrap_or(0).max(1) as f64;
    let result = run_with_progress(cmd, &ffmpeg, total_ms, target, on_progress);

    if let Some(mf) = meta_file {
        let _ = std::fs::remove_file(mf);
    }
    result
}

/// Chạy FFmpeg đã dựng sẵn lệnh, đọc `-progress` để báo % (0..1) theo `total_ms`.
/// Nếu lỗi sẽ xóa `target` dở dang và trả về vài dòng cuối của stderr.
fn run_with_progress(
    mut cmd: Command,
    ffmpeg: &Path,
    total_ms: f64,
    target: &Path,
    on_progress: &dyn Fn(f32),
) -> Result<(), String> {
    hide_console(&mut cmd);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Không chạy được FFmpeg ({}): {}", ffmpeg.display(), e))?;
    let stderr_pipe = child.stderr.take();
    let stderr_thread = std::thread::spawn(move || {
        let mut buf = String::new();
        if let Some(mut s) = stderr_pipe {
            let _ = s.read_to_string(&mut buf);
        }
        buf
    });
    if let Some(out) = child.stdout.take() {
        for line in BufReader::new(out).lines().map_while(Result::ok) {
            // out_time_us / out_time_ms đều tính bằng micro giây
            if let Some(v) = line
                .strip_prefix("out_time_us=")
                .or_else(|| line.strip_prefix("out_time_ms="))
            {
                if let Ok(us) = v.trim().parse::<i64>() {
                    on_progress(((us.max(0) as f64 / 1000.0) / total_ms).clamp(0.0, 1.0) as f32);
                }
            }
        }
    }
    let status = child.wait().map_err(|e| format!("Lỗi chờ FFmpeg: {}", e))?;
    let stderr = stderr_thread.join().unwrap_or_default();

    if !status.success() {
        let _ = std::fs::remove_file(target);
        let tail: Vec<&str> = stderr.lines().rev().take(5).collect();
        let tail: Vec<&str> = tail.into_iter().rev().collect();
        return Err(format!("FFmpeg chuyển đổi thất bại: {}", tail.join(" | ")));
    }
    Ok(())
}

/// Chọn encoder H.264 có trong bản FFmpeg đang dùng: libx264 (bản GPL) rồi libopenh264 (bản LGPL).
fn pick_h264_encoder(ffmpeg: &Path) -> Result<&'static str, String> {
    let mut cmd = Command::new(ffmpeg);
    cmd.args(["-hide_banner", "-encoders"]);
    hide_console(&mut cmd);
    let out = cmd
        .output()
        .map_err(|e| format!("Không chạy được FFmpeg ({}): {}", ffmpeg.display(), e))?;
    let list = String::from_utf8_lossy(&out.stdout);
    ["libx264", "libopenh264"]
        .into_iter()
        .find(|name| list.lines().any(|l| l.split_whitespace().nth(1) == Some(*name)))
        .ok_or_else(|| "Bản FFmpeg này không có encoder H.264 (libx264 / libopenh264).".to_string())
}

/// Băng chữ chạy ngang khung video (ảnh PNG trong suốt do frontend dựng sẵn).
pub struct VideoMarquee {
    pub strip: PathBuf,
    /// Toạ độ y của mép trên băng chữ trên khung hình
    pub top: i32,
    /// true: chạy từ phải sang trái; false: từ trái sang phải
    pub rtl: bool,
    /// Tốc độ chạy (pixel / giây)
    pub speed_px_s: f32,
}

/// Ghép ảnh tĩnh + audio WAV thành video MP4 (H.264 + AAC) để upload YouTube.
/// Có `marquee` thì thêm băng chữ chạy ngang (khung hình 20 fps cho mượt, không có thì 2 fps).
pub fn render_video(
    image: &Path,
    wav: &Path,
    target: &Path,
    marquee: Option<&VideoMarquee>,
    on_progress: &dyn Fn(f32),
) -> Result<(), String> {
    let ffmpeg = find_ffmpeg()?;
    let encoder = pick_h264_encoder(&ffmpeg)?;

    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Không tạo được thư mục xuất: {}", e))?;
    }

    let mut cmd = Command::new(&ffmpeg);
    cmd.args(["-hide_banner", "-loglevel", "error", "-nostats", "-progress", "pipe:1", "-y"]);
    let fps = if marquee.is_some() { "20" } else { "2" };
    cmd.args(["-loop", "1", "-framerate", fps, "-i"]).arg(image);
    cmd.arg("-i").arg(wav);
    if let Some(m) = marquee {
        cmd.args(["-loop", "1", "-framerate", fps, "-i"]).arg(&m.strip);
        let speed = m.speed_px_s.clamp(10.0, 1000.0);
        let x = if m.rtl {
            format!("W-mod(t*{speed},W+w)")
        } else {
            format!("mod(t*{speed},W+w)-w")
        };
        cmd.args(["-filter_complex"]).arg(format!(
            "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2[bg];[bg][2:v]overlay=x='{x}':y={}:shortest=1,format=yuv420p[v]",
            m.top
        ));
        cmd.args(["-map", "[v]", "-map", "1:a"]);
    } else {
        cmd.args(["-map", "0:v", "-map", "1:a"]);
        cmd.args(["-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p"]);
    }
    if encoder == "libx264" {
        cmd.args(["-c:v", "libx264", "-tune", "stillimage", "-preset", "veryfast", "-crf", "23"]);
    } else {
        cmd.args(["-c:v", "libopenh264", "-b:v", "800k"]);
    }
    cmd.args(["-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart"]);
    cmd.arg(target);

    let total_ms = wav_duration_ms(wav).unwrap_or(0).max(1) as f64;
    run_with_progress(cmd, &ffmpeg, total_ms, target, on_progress)
}

/// Hoàn tất xuất: nếu định dạng khác WAV thì chuyển từ `wav` (file tạm) sang `target`, sau đó xóa file tạm.
pub fn finalize_export(
    duration: Result<f64, String>,
    wav: &Path,
    target: &Path,
    format: OutputFormat,
    meta: &TrackMetadata,
    on_progress: &dyn Fn(f32),
) -> Result<f64, String> {
    if format == OutputFormat::Wav {
        return duration;
    }
    let result = duration.and_then(|d| transcode_wav(wav, target, format, meta, on_progress).map(|_| d));
    let _ = std::fs::remove_file(wav);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bundled_ffmpeg() -> Option<PathBuf> {
        let name = if cfg!(target_arch = "aarch64") {
            "ffmpeg-aarch64-apple-darwin"
        } else {
            "ffmpeg-x86_64-apple-darwin"
        };
        let p = Path::new(env!("CARGO_MANIFEST_DIR")).join("binaries").join(name);
        (cfg!(target_os = "macos") && p.is_file()).then_some(p)
    }

    #[test]
    fn transcode_mp3_and_m4b_with_chapters() {
        let Some(ff) = bundled_ffmpeg() else { return };
        unsafe { std::env::set_var("FFMPEG_PATH", &ff) };

        let dir = std::env::temp_dir().join(format!("transcode_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let wav = dir.join("in.wav");
        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 24000,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        let mut w = hound::WavWriter::create(&wav, spec).unwrap();
        for i in 0..48000 {
            w.write_sample(((i as f32 * 0.05).sin() * 8000.0) as i16).unwrap();
        }
        w.finalize().unwrap();

        let meta = TrackMetadata {
            title: "Tiêu đề; thử = nghiệm".into(),
            artist: "Tác giả".into(),
            album: "Sách".into(),
            track: Some(1),
            cover: None,
            chapters: vec![
                ChapterMark { title: "Chương 1".into(), start_ms: 0, end_ms: 1000 },
                ChapterMark { title: "Chương 2".into(), start_ms: 1000, end_ms: 2000 },
            ],
        };

        let mp3 = dir.join("out.mp3");
        transcode_wav(&wav, &mp3, OutputFormat::Mp3, &meta, &|_| {}).unwrap();
        assert!(std::fs::metadata(&mp3).unwrap().len() > 1000);

        let m4b = dir.join("out.m4b");
        transcode_wav(&wav, &m4b, OutputFormat::M4b, &meta, &|_| {}).unwrap();
        let out = Command::new(&ff)
            .args(["-hide_banner", "-i"])
            .arg(&m4b)
            .output()
            .unwrap();
        let info = String::from_utf8_lossy(&out.stderr);
        assert!(info.contains("Chapter #0:0") && info.contains("Chapter #0:1"), "{}", info);
        assert!(info.contains("Chương 2"), "{}", info);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn render_video_has_h264_and_aac() {
        let Some(ff) = bundled_ffmpeg() else { return };
        unsafe { std::env::set_var("FFMPEG_PATH", &ff) };

        let dir = std::env::temp_dir().join(format!("video_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();

        let wav = dir.join("in.wav");
        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 24000,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        let mut w = hound::WavWriter::create(&wav, spec).unwrap();
        for i in 0..72000 {
            w.write_sample(((i as f32 * 0.05).sin() * 8000.0) as i16).unwrap();
        }
        w.finalize().unwrap();

        let img = dir.join("thumb.jpg");
        let made = Command::new(&ff)
            .args(["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=red:s=1280x720", "-frames:v", "1"])
            .arg(&img)
            .status()
            .unwrap();
        assert!(made.success());

        let mp4 = dir.join("out.mp4");
        let progress = std::sync::Mutex::new(Vec::<f32>::new());
        render_video(&img, &wav, &mp4, None, &|f| progress.lock().unwrap().push(f)).unwrap();
        assert!(!progress.lock().unwrap().is_empty());

        let out = Command::new(&ff).args(["-hide_banner", "-i"]).arg(&mp4).output().unwrap();
        let info = String::from_utf8_lossy(&out.stderr);
        assert!(info.contains("Video: h264"), "{}", info);
        assert!(info.contains("Audio: aac"), "{}", info);
        assert!(info.contains("Duration: 00:00:03"), "{}", info);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn render_video_with_scrolling_marquee_moves() {
        let Some(ff) = bundled_ffmpeg() else { return };
        unsafe { std::env::set_var("FFMPEG_PATH", &ff) };

        let dir = std::env::temp_dir().join(format!("marquee_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();

        let wav = dir.join("in.wav");
        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 24000,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        let mut w = hound::WavWriter::create(&wav, spec).unwrap();
        for i in 0..96000 {
            w.write_sample(((i as f32 * 0.05).sin() * 8000.0) as i16).unwrap();
        }
        w.finalize().unwrap();

        let run = |args: &[&str]| {
            let st = Command::new(&ff)
                .args(["-hide_banner", "-loglevel", "error", "-y"])
                .args(args)
                .status()
                .unwrap();
            assert!(st.success());
        };
        let img = dir.join("bg.jpg");
        run(&["-f", "lavfi", "-i", "color=c=black:s=1280x720", "-frames:v", "1", img.to_str().unwrap()]);
        let strip = dir.join("strip.png");
        run(&["-f", "lavfi", "-i", "color=c=white:s=300x40", "-frames:v", "1", strip.to_str().unwrap()]);

        for rtl in [true, false] {
            let mp4 = dir.join(format!("out_{}.mp4", rtl));
            let m = VideoMarquee { strip: strip.clone(), top: 600, rtl, speed_px_s: 200.0 };
            render_video(&img, &wav, &mp4, Some(&m), &|_| {}).unwrap();

            // Hai khung hình ở hai thời điểm khác nhau phải khác nhau (băng chữ đã dịch chuyển)
            let f1 = dir.join(format!("f1_{}.png", rtl));
            let f2 = dir.join(format!("f2_{}.png", rtl));
            for (t, f) in [("1", &f1), ("2", &f2)] {
                run(&["-ss", t, "-i", mp4.to_str().unwrap(), "-frames:v", "1", f.to_str().unwrap()]);
            }
            assert_ne!(std::fs::read(&f1).unwrap(), std::fs::read(&f2).unwrap(), "marquee không chuyển động (rtl={})", rtl);
        }

        let _ = std::fs::remove_dir_all(&dir);
    }
}
