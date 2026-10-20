pub mod epub_parser;
pub mod txt_parser;

use std::path::Path;
use crate::models::EbookParsedData;

pub fn parse_ebook_file(file_path: &str) -> Result<EbookParsedData, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File không tồn tại: {}", file_path));
    }

    let ext = path.extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "epub" => epub_parser::parse_epub(file_path),
        "txt" | "md" | "markdown" => txt_parser::parse_txt(file_path),
        "pdf" => {
            // Basic text extraction fallback for PDF or delegate
            Err("Định dạng PDF đang được phát triển, vui lòng sử dụng file .epub hoặc .txt".to_string())
        }
        _ => Err(format!("Định dạng file không được hỗ trợ: .{}. Hãy dùng .epub, .txt, .md hoặc .markdown", ext)),
    }
}
