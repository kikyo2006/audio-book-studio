//! Project export / import as a single `.bsproj` archive (a zip file).
//!
//! Layout:
//! - `manifest.json`: project, chapters, sentences, characters and role settings. Every absolute
//!   audio path is replaced by an archive-relative entry name so the file is portable.
//! - `audio/<sentence_id>.<ext>`: the audio of each sentence.
//! - `bgm/<n>_<file name>`: the chapter background music files.
//!
//! Import always creates a brand new project (fresh ids) so it never collides with a project
//! already on the machine, and rewrites all paths to the target machine's app data folders.

use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{self, BufReader, BufWriter, Read, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

use crate::db::Database;
use crate::models::{
    Chapter, CharacterProfile, Project, ProjectRoleSettings, Sentence,
};
use crate::services::tts::get_sentence_audio_cache_path;

pub const ARCHIVE_FORMAT: &str = "bookstudio-project";
pub const ARCHIVE_VERSION: u32 = 1;
const MANIFEST_NAME: &str = "manifest.json";
/// Even a huge book's manifest is a few MB; refuse anything absurd to avoid memory blowups
const MAX_MANIFEST_BYTES: u64 = 256 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ArchiveChapter {
    #[serde(flatten)]
    chapter: Chapter,
    /// Archive entry of the chapter BGM (`bgm_path` inside `chapter` is cleared)
    bgm_file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ArchiveSentence {
    #[serde(flatten)]
    sentence: Sentence,
    /// Archive entry of the sentence audio (`audio_path` inside `sentence` is cleared)
    audio_file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Manifest {
    format: String,
    version: u32,
    app_version: String,
    exported_at: String,
    project: Project,
    chapters: Vec<ArchiveChapter>,
    sentences: Vec<ArchiveSentence>,
    characters: Vec<CharacterProfile>,
    role_settings: Option<ProjectRoleSettings>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExportSummary {
    pub file_path: String,
    pub audio_count: usize,
    pub bgm_count: usize,
    /// Sentences whose audio file was missing on disk (exported without audio)
    pub missing_audio_count: usize,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportSummary {
    pub project: Project,
    pub audio_count: usize,
    pub bgm_count: usize,
    pub missing_audio_count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ArchiveProgress {
    /// "export" | "import"
    pub kind: String,
    pub current: usize,
    pub total: usize,
}

fn now_string() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

/// Keep only a safe file name (no directories, no reserved characters)
fn safe_file_name(name: &str) -> String {
    let base = Path::new(name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");
    let cleaned: String = base
        .chars()
        .map(|c| if c.is_control() || "<>:\"/\\|?*".contains(c) { '_' } else { c })
        .collect();
    if cleaned.trim().is_empty() { "file".to_string() } else { cleaned }
}

/// Lowercase alphanumeric extension of an archive entry, `wav` when missing or odd
fn safe_extension(entry_name: &str) -> String {
    Path::new(entry_name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .filter(|e| !e.is_empty() && e.len() <= 5 && e.chars().all(|c| c.is_ascii_alphanumeric()))
        .unwrap_or_else(|| "wav".to_string())
}

fn zip_err(e: zip::result::ZipError) -> String {
    format!("Lỗi file nén: {}", e)
}

/// Export a whole project (text, settings and every audio file) into `dest_path`.
pub fn export_project(
    db: &Database,
    project_id: &str,
    dest_path: &Path,
    mut on_progress: impl FnMut(usize, usize),
) -> Result<ExportSummary, String> {
    let project = db.get_project_by_id(project_id)?;
    let chapters = db.get_chapters(project_id)?;
    let sentences = db.get_all_project_sentences(project_id)?;
    let characters = db.get_characters(project_id)?;
    let role_settings = db.get_project_role_settings(project_id)?;

    // Files to pack: (archive entry name, source path on disk)
    let mut files: Vec<(String, PathBuf)> = Vec::new();
    let mut missing_audio_count = 0usize;
    let mut bgm_count = 0usize;

    let mut bgm_entries: HashMap<String, String> = HashMap::new();
    let mut archive_chapters = Vec::with_capacity(chapters.len());
    for mut chapter in chapters {
        let mut bgm_file = None;
        if let Some(path) = chapter.bgm_path.take() {
            let src = PathBuf::from(&path);
            if src.is_file() {
                let entry = match bgm_entries.get(&path) {
                    Some(e) => e.clone(),
                    None => {
                        let name = src
                            .file_name()
                            .and_then(|n| n.to_str())
                            .map(safe_file_name)
                            .unwrap_or_else(|| "bgm.wav".to_string());
                        bgm_count += 1;
                        let entry = format!("bgm/{}_{}", bgm_count, name);
                        bgm_entries.insert(path.clone(), entry.clone());
                        files.push((entry.clone(), src));
                        entry
                    }
                };
                bgm_file = Some(entry);
            }
        }
        archive_chapters.push(ArchiveChapter { chapter, bgm_file });
    }

    let mut audio_count = 0usize;
    let mut archive_sentences = Vec::with_capacity(sentences.len());
    for mut sentence in sentences {
        let mut audio_file = None;
        if let Some(path) = sentence.audio_path.take() {
            let src = PathBuf::from(&path);
            if src.is_file() {
                let ext = safe_extension(&path);
                let entry = format!("audio/{}.{}", sentence.id, ext);
                files.push((entry.clone(), src));
                audio_file = Some(entry);
                audio_count += 1;
            } else {
                missing_audio_count += 1;
            }
        }
        archive_sentences.push(ArchiveSentence { sentence, audio_file });
    }

    let manifest = Manifest {
        format: ARCHIVE_FORMAT.to_string(),
        version: ARCHIVE_VERSION,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        exported_at: now_string(),
        project,
        chapters: archive_chapters,
        sentences: archive_sentences,
        characters,
        role_settings,
    };
    let manifest_json = serde_json::to_vec(&manifest)
        .map_err(|e| format!("Không tạo được manifest: {}", e))?;

    // Write to a partial file first so a failed export never leaves a corrupt archive behind
    let partial = PathBuf::from(format!("{}.partial", dest_path.to_string_lossy()));
    let result = write_archive(&partial, &manifest_json, &files, &mut on_progress);
    if let Err(e) = result {
        let _ = fs::remove_file(&partial);
        return Err(e);
    }
    if dest_path.exists() {
        fs::remove_file(dest_path)
            .map_err(|e| format!("Không ghi đè được file đích: {}", e))?;
    }
    fs::rename(&partial, dest_path).map_err(|e| {
        let _ = fs::remove_file(&partial);
        format!("Không lưu được file xuất: {}", e)
    })?;

    let size_bytes = fs::metadata(dest_path).map(|m| m.len()).unwrap_or(0);
    Ok(ExportSummary {
        file_path: dest_path.to_string_lossy().to_string(),
        audio_count,
        bgm_count,
        missing_audio_count,
        size_bytes,
    })
}

fn write_archive(
    path: &Path,
    manifest_json: &[u8],
    files: &[(String, PathBuf)],
    on_progress: &mut impl FnMut(usize, usize),
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let file = File::create(path).map_err(|e| format!("Không tạo được file xuất: {}", e))?;
    let mut zip = ZipWriter::new(BufWriter::new(file));

    let text_options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .compression_level(Some(1))
        .large_file(true);
    zip.start_file(MANIFEST_NAME, text_options).map_err(zip_err)?;
    zip.write_all(manifest_json)
        .map_err(|e| format!("Lỗi ghi manifest: {}", e))?;

    let total = files.len();
    on_progress(0, total);
    for (i, (entry, src)) in files.iter().enumerate() {
        // Audio is already dense PCM/compressed media: fast deflate keeps export quick
        zip.start_file(entry.as_str(), text_options).map_err(zip_err)?;
        let mut reader = BufReader::new(
            File::open(src).map_err(|e| format!("Không mở được {}: {}", src.display(), e))?,
        );
        io::copy(&mut reader, &mut zip)
            .map_err(|e| format!("Lỗi ghi {}: {}", entry, e))?;
        on_progress(i + 1, total);
    }

    let mut inner = zip.finish().map_err(zip_err)?;
    inner.flush().map_err(|e| format!("Lỗi ghi file xuất: {}", e))?;
    Ok(())
}

/// Copy one archive entry to `dest` (parent folders are created).
fn extract_entry<R: Read + io::Seek>(
    archive: &mut ZipArchive<R>,
    entry_name: &str,
    dest: &Path,
) -> Result<(), String> {
    let mut entry = archive
        .by_name(entry_name)
        .map_err(|e| format!("Thiếu {} trong file dự án: {}", entry_name, e))?;
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Không tạo được thư mục: {}", e))?;
    }
    let mut out = BufWriter::new(
        File::create(dest).map_err(|e| format!("Không tạo được {}: {}", dest.display(), e))?,
    );
    io::copy(&mut entry, &mut out).map_err(|e| format!("Lỗi giải nén {}: {}", entry_name, e))?;
    out.flush().map_err(|e| format!("Lỗi ghi {}: {}", dest.display(), e))?;
    Ok(())
}

/// Import a `.bsproj` archive as a new project.
pub fn import_project(
    db: &Database,
    archive_path: &Path,
    app_data_dir: &Path,
    mut on_progress: impl FnMut(usize, usize),
) -> Result<ImportSummary, String> {
    let file = File::open(archive_path).map_err(|e| format!("Không mở được file dự án: {}", e))?;
    let mut archive = ZipArchive::new(BufReader::new(file))
        .map_err(|_| "File không phải là dự án BookStudio hợp lệ.".to_string())?;

    let manifest: Manifest = {
        let entry = archive
            .by_name(MANIFEST_NAME)
            .map_err(|_| "File không phải là dự án BookStudio hợp lệ (thiếu manifest).".to_string())?;
        if entry.size() > MAX_MANIFEST_BYTES {
            return Err("Manifest của file dự án quá lớn.".to_string());
        }
        serde_json::from_reader(entry)
            .map_err(|e| format!("Manifest của file dự án bị lỗi: {}", e))?
    };
    if manifest.format != ARCHIVE_FORMAT {
        return Err("File không phải là dự án BookStudio hợp lệ.".to_string());
    }
    if manifest.version > ARCHIVE_VERSION {
        return Err(format!(
            "File dự án được tạo bởi phiên bản mới hơn (v{}), vui lòng cập nhật BookStudio.",
            manifest.version
        ));
    }

    let new_project_id = Uuid::new_v4().to_string();
    let bgm_dir = app_data_dir.join("bgm");

    // Everything written to disk so far, removed again if the import fails midway
    let mut created_files: Vec<PathBuf> = Vec::new();
    let result = (|| -> Result<ImportSummary, String> {
        let total = manifest.sentences.iter().filter(|s| s.audio_file.is_some()).count()
            + manifest.chapters.iter().filter(|c| c.bgm_file.is_some()).count();
        let mut done = 0usize;
        on_progress(0, total);

        // 1. Chapter BGM into the shared BGM library (reuse an identical file when present)
        let mut bgm_targets: HashMap<String, String> = HashMap::new();
        let mut bgm_count = 0usize;
        let mut chapter_id_map: HashMap<String, String> = HashMap::new();
        let mut chapters = Vec::with_capacity(manifest.chapters.len());
        for ac in &manifest.chapters {
            let new_id = Uuid::new_v4().to_string();
            chapter_id_map.insert(ac.chapter.id.clone(), new_id.clone());

            let mut chapter = ac.chapter.clone();
            chapter.id = new_id;
            chapter.project_id = new_project_id.clone();
            chapter.bgm_path = None;

            if let Some(entry_name) = &ac.bgm_file {
                let target = match bgm_targets.get(entry_name) {
                    Some(t) => t.clone(),
                    None => {
                        let size = archive.by_name(entry_name).map(|e| e.size()).map_err(|e| {
                            format!("Thiếu {} trong file dự án: {}", entry_name, e)
                        })?;
                        let name = entry_name
                            .rsplit('/')
                            .next()
                            .map(safe_file_name)
                            .unwrap_or_else(|| "bgm.wav".to_string());
                        // Strip the "<n>_" prefix added at export time
                        let name = match name.split_once('_') {
                            Some((n, rest)) if n.chars().all(|c| c.is_ascii_digit()) && !rest.is_empty() => {
                                rest.to_string()
                            }
                            _ => name,
                        };
                        let (target, reuse) = pick_bgm_target(&bgm_dir, &name, size);
                        if !reuse {
                            extract_entry(&mut archive, entry_name, &target)?;
                            created_files.push(target.clone());
                        }
                        bgm_count += 1;
                        let t = target.to_string_lossy().to_string();
                        bgm_targets.insert(entry_name.clone(), t.clone());
                        t
                    }
                };
                chapter.bgm_path = Some(target);
                done += 1;
                on_progress(done, total);
            }
            chapters.push(chapter);
        }

        // 2. Sentence audio into the audio cache of the new project
        let mut audio_count = 0usize;
        let mut missing_audio_count = 0usize;
        let mut sentences = Vec::with_capacity(manifest.sentences.len());
        for asent in &manifest.sentences {
            let new_sentence_id = Uuid::new_v4().to_string();
            let mut sentence = asent.sentence.clone();
            sentence.id = new_sentence_id.clone();
            sentence.chapter_id = chapter_id_map
                .get(&asent.sentence.chapter_id)
                .cloned()
                .ok_or_else(|| "File dự án bị lỗi: câu thuộc chương không tồn tại.".to_string())?;
            sentence.audio_path = None;

            match &asent.audio_file {
                Some(entry_name) => {
                    let ext = safe_extension(entry_name);
                    let dest = get_sentence_audio_cache_path(app_data_dir, &new_project_id, &new_sentence_id)
                        .with_extension(ext);
                    extract_entry(&mut archive, entry_name, &dest)?;
                    created_files.push(dest.clone());
                    sentence.audio_path = Some(dest.to_string_lossy().to_string());
                    audio_count += 1;
                    done += 1;
                    on_progress(done, total);
                }
                None => {
                    if sentence.status == "ready" {
                        // Audio was missing at export time, so the sentence must be regenerated
                        sentence.status = "pending".to_string();
                        sentence.duration = None;
                        missing_audio_count += 1;
                    }
                }
            }
            sentences.push(sentence);
        }

        // 3. Characters and role settings
        let characters: Vec<CharacterProfile> = manifest
            .characters
            .iter()
            .cloned()
            .map(|mut c| {
                c.id = Uuid::new_v4().to_string();
                c.project_id = new_project_id.clone();
                c
            })
            .collect();
        let role_settings = manifest.role_settings.clone().map(|mut r| {
            // The preset belongs to the source machine and does not exist here
            r.preset_id = None;
            r
        });

        let mut project = manifest.project.clone();
        project.id = new_project_id.clone();
        project.chapter_count = chapters.len();
        if let Some(src) = &project.source_file_path {
            if !Path::new(src).exists() {
                project.source_file_path = None;
            }
        }
        let status = project.status.clone();
        let now = now_string();
        project.created_at = now.clone();
        project.updated_at = now;

        db.import_project_bundle(&project, &chapters, &sentences, &characters, role_settings.as_ref(), &status)?;

        let project = db.get_project_by_id(&new_project_id)?;
        Ok(ImportSummary { project, audio_count, bgm_count, missing_audio_count })
    })();

    if result.is_err() {
        for f in &created_files {
            let _ = fs::remove_file(f);
        }
        let _ = fs::remove_dir(app_data_dir.join("audio_cache").join(&new_project_id));
    }
    result
}

/// Choose where a BGM file lands in the library. Returns `(path, reuse_existing)`: a file with the
/// same name and size is reused, otherwise a free `name (n).ext` is picked.
fn pick_bgm_target(dir: &Path, file_name: &str, size: u64) -> (PathBuf, bool) {
    let p = Path::new(file_name);
    let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("bgm");
    let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("wav");

    let mut target = dir.join(format!("{}.{}", stem, ext));
    let mut counter = 2;
    while target.exists() {
        if fs::metadata(&target).map(|m| m.len()).unwrap_or(u64::MAX) == size {
            return (target, true);
        }
        target = dir.join(format!("{} ({}).{}", stem, counter, ext));
        counter += 1;
    }
    (target, false)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(tag: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("bs_archive_{}_{}", tag, Uuid::new_v4().simple()));
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn export_then_import_keeps_text_and_audio() {
        let src_dir = temp_dir("src");
        let dst_dir = temp_dir("dst");
        let src_db = Database::new(src_dir.join("a.db")).unwrap();
        let dst_db = Database::new(dst_dir.join("b.db")).unwrap();

        let now = "1".to_string();
        let project = Project {
            id: "p1".into(), title: "Sach".into(), author: "Tac gia".into(), description: None,
            source_file_path: None, source_format: Some("epub".into()), cover_path: None,
            cover_base64: Some("data:image/png;base64,AAAA".into()), chapter_count: 1,
            total_sentences: 0, completed_sentences: 0, total_duration: 0.0,
            created_at: now.clone(), updated_at: now, status: "active".into(),
        };
        src_db.insert_project(&project).unwrap();

        let bgm = src_dir.join("music.wav");
        fs::write(&bgm, b"BGMDATA").unwrap();
        let chapter = Chapter {
            id: "c1".into(), project_id: "p1".into(), index: 1, title: "Chuong 1".into(),
            raw_content: "noi dung".into(), sentence_count: 2, ready_sentence_count: 1,
            total_duration: 1.0, bgm_path: Some(bgm.to_string_lossy().to_string()),
            bgm_volume: Some(0.3), is_enabled: true,
        };
        src_db.insert_chapters(&[chapter]).unwrap();

        let audio = src_dir.join("s1.wav");
        fs::write(&audio, b"RIFFfakewav").unwrap();
        let mk = |id: &str, idx: usize, audio: Option<String>, status: &str| Sentence {
            id: id.into(), chapter_id: "c1".into(), index: idx, raw_text: "a".into(),
            clean_text: format!("cau {}", id), is_dialogue: false, speaker: None,
            audio_path: audio, duration: Some(1.0), status: status.into(),
            voice: Some("v".into()), temperature: Some(0.4), speed: Some(1.0), error_message: None,
        };
        src_db.insert_sentences(&[
            mk("s1", 1, Some(audio.to_string_lossy().to_string()), "ready"),
            // Marked ready but the file is gone: must come back as pending
            mk("s2", 2, Some(src_dir.join("gone.wav").to_string_lossy().to_string()), "ready"),
        ]).unwrap();

        let archive = src_dir.join("out.bsproj");
        let summary = export_project(&src_db, "p1", &archive, |_, _| {}).unwrap();
        assert_eq!(summary.audio_count, 1);
        assert_eq!(summary.bgm_count, 1);
        assert_eq!(summary.missing_audio_count, 1);

        let imported = import_project(&dst_db, &archive, &dst_dir, |_, _| {}).unwrap();
        assert_ne!(imported.project.id, "p1");
        assert_eq!(imported.project.title, "Sach");
        assert_eq!(imported.project.cover_base64.as_deref(), Some("data:image/png;base64,AAAA"));

        let chapters = dst_db.get_chapters(&imported.project.id).unwrap();
        assert_eq!(chapters.len(), 1);
        let bgm_path = chapters[0].bgm_path.clone().unwrap();
        assert!(bgm_path.starts_with(&dst_dir.join("bgm").to_string_lossy().to_string()));
        assert_eq!(fs::read(&bgm_path).unwrap(), b"BGMDATA");

        let sentences = dst_db.get_sentences(&chapters[0].id).unwrap();
        assert_eq!(sentences.len(), 2);
        let p = sentences[0].audio_path.clone().unwrap();
        assert!(p.starts_with(&dst_dir.to_string_lossy().to_string()));
        assert_eq!(fs::read(&p).unwrap(), b"RIFFfakewav");
        assert_eq!(sentences[1].status, "pending");
        assert!(sentences[1].audio_path.is_none());

        let _ = fs::remove_dir_all(&src_dir);
        let _ = fs::remove_dir_all(&dst_dir);
    }

    #[test]
    fn import_rejects_non_archive() {
        let dir = temp_dir("bad");
        let db = Database::new(dir.join("x.db")).unwrap();
        let bogus = dir.join("bogus.bsproj");
        fs::write(&bogus, b"not a zip").unwrap();
        assert!(import_project(&db, &bogus, &dir, |_, _| {}).is_err());
        let _ = fs::remove_dir_all(&dir);
    }
}
