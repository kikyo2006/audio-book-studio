use std::fs;
use std::path::Path;
use crate::models::{EbookParsedData, ParsedChapter};

pub fn parse_txt(file_path: &str) -> Result<EbookParsedData, String> {
    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Không thể đọc file văn bản: {}", e))?;

    let filename = Path::new(file_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Tác phẩm chưa đặt tên");

    let lines: Vec<&str> = content.lines().collect();
    let mut chapters = Vec::new();
    let mut current_title = format!("Chương 1: Khởi đầu");
    let mut current_body = Vec::new();
    let mut chapter_idx = 1;

    for line in lines {
        let trimmed = line.trim();
        let is_chap_header = trimmed.starts_with("Chương ")
            || trimmed.starts_with("chuong ")
            || trimmed.starts_with("CHƯƠNG ")
            || trimmed.starts_with("Chapter ")
            || trimmed.starts_with("CHAPTER ")
            || trimmed.starts_with("Hồi ")
            || (trimmed.starts_with("# ") && trimmed.len() < 80);

        if is_chap_header && !current_body.is_empty() {
            chapters.push(ParsedChapter {
                index: chapter_idx,
                title: current_title.clone(),
                content: current_body.join("\n\n"),
            });
            chapter_idx += 1;
            current_title = trimmed.trim_start_matches('#').trim().to_string();
            current_body.clear();
        } else if is_chap_header && current_body.is_empty() {
            current_title = trimmed.trim_start_matches('#').trim().to_string();
        } else if !trimmed.is_empty() {
            current_body.push(trimmed);
        }
    }

    if !current_body.is_empty() {
        chapters.push(ParsedChapter {
            index: chapter_idx,
            title: current_title,
            content: current_body.join("\n\n"),
        });
    }

    if chapters.is_empty() {
        return Err("Nội dung file rỗng".to_string());
    }

    Ok(EbookParsedData {
        title: filename.to_string(),
        author: "Chưa rõ tác giả".to_string(),
        description: None,
        cover_base64: None,
        chapters,
    })
}
