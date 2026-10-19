use std::fs::File;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;
use crate::models::{EbookParsedData, ParsedChapter};

pub fn parse_epub(file_path: &str) -> Result<EbookParsedData, String> {
    let file = File::open(file_path).map_err(|e| format!("Không thể mở file EPUB: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Lỗi giải nén ZIP EPUB: {}", e))?;

    // 1. Tìm đường dẫn file OPF trong META-INF/container.xml
    let mut opf_path = String::new();
    if let Ok(mut container) = archive.by_name("META-INF/container.xml") {
        let mut content = String::new();
        if container.read_to_string(&mut content).is_ok() {
            if let Some(pos) = content.find("full-path=\"") {
                let rest = &content[pos + 11..];
                if let Some(end) = rest.find('\"') {
                    opf_path = rest[..end].to_string();
                }
            }
        }
    }

    if opf_path.is_empty() {
        // Fallback: Quét tìm file .opf trong archive
        for i in 0..archive.len() {
            if let Ok(file) = archive.by_index(i) {
                if file.name().ends_with(".opf") {
                    opf_path = file.name().to_string();
                    break;
                }
            }
        }
    }

    if opf_path.is_empty() {
        return Err("Không tìm thấy metadata OPF trong file EPUB".to_string());
    }

    let opf_dir = Path::new(&opf_path)
        .parent()
        .map(|p| p.to_str().unwrap_or(""))
        .unwrap_or("")
        .to_string();

    // 2. Đọc nội dung OPF
    let mut opf_content = String::new();
    {
        let mut opf_file = archive
            .by_name(&opf_path)
            .map_err(|e| format!("Không đọc được file OPF: {}", e))?;
        opf_file
            .read_to_string(&mut opf_content)
            .map_err(|e| format!("Lỗi giải mã chuỗi OPF: {}", e))?;
    }

    // Trích xuất metadata
    let title = extract_xml_tag(&opf_content, "dc:title")
        .or_else(|| extract_xml_tag(&opf_content, "title"))
        .unwrap_or_else(|| {
            Path::new(file_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Tác phẩm chưa đặt tên")
                .to_string()
        });

    let author = extract_xml_tag(&opf_content, "dc:creator")
        .or_else(|| extract_xml_tag(&opf_content, "creator"))
        .unwrap_or_else(|| "Tác giả không xác định".to_string());

    let description = extract_xml_tag(&opf_content, "dc:description");

    // 3. Trích xuất Cover Image nếu có
    let mut cover_base64: Option<String> = None;
    let cover_href = find_cover_href(&opf_content);
    if let Some(rel_href) = cover_href {
        let full_cover_path = resolve_path(&opf_dir, &rel_href);
        if let Ok(mut cover_file) = archive.by_name(&full_cover_path) {
            let mut buf = Vec::new();
            if cover_file.read_to_end(&mut buf).is_ok() {
                let ext = Path::new(&full_cover_path)
                    .extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("jpeg");
                let mime = if ext == "png" { "image/png" } else { "image/jpeg" };
                let b64 = format!("data:{};base64,{}", mime, base64_encode(&buf));
                cover_base64 = Some(b64);
            }
        }
    }

    // 4. Trích xuất danh sách Spine và Manifest để lấy đúng thứ tự chương
    let manifest_items = extract_manifest_items(&opf_content);
    let spine_idrefs = extract_spine_idrefs(&opf_content);

    let mut chapters = Vec::new();
    let mut chapter_idx = 1;

    for idref in spine_idrefs {
        if let Some(href) = manifest_items.iter().find(|(id, _)| id == &idref).map(|(_, h)| h) {
            let full_html_path = resolve_path(&opf_dir, href);
            if let Ok(mut html_file) = archive.by_name(&full_html_path) {
                let mut html_content = String::new();
                if html_file.read_to_string(&mut html_content).is_ok() {
                    let (chap_title, clean_text) = clean_html_to_text(&html_content, chapter_idx);
                    if !clean_text.trim().is_empty() {
                        chapters.push(ParsedChapter {
                            index: chapter_idx,
                            title: chap_title,
                            content: clean_text,
                        });
                        chapter_idx += 1;
                    }
                }
            }
        }
    }

    if chapters.is_empty() {
        return Err("File EPUB không chứa nội dung chương dạng văn bản có thể đọc được".to_string());
    }

    Ok(EbookParsedData {
        title,
        author,
        description,
        cover_base64,
        chapters,
    })
}

fn extract_xml_tag(xml: &str, tag: &str) -> Option<String> {
    let open_tag = format!("<{}", tag);
    let close_tag = format!("</{}", tag);

    if let Some(start_idx) = xml.find(&open_tag) {
        let after_start = &xml[start_idx..];
        if let Some(tag_end_relative) = after_start.find('>') {
            let content_start = &after_start[tag_end_relative + 1..];
            if let Some(end_idx) = content_start.find(&close_tag) {
                let text = &content_start[..end_idx];
                return Some(decode_html_entities(text.trim()));
            }
        }
    }
    None
}

fn find_cover_href(opf: &str) -> Option<String> {
    // Check for <item id="cover" ... href="..."> or properties="cover-image"
    for line in opf.lines() {
        if line.contains("<item ") && (line.contains("cover") || line.contains("cover-image")) {
            if let Some(href_pos) = line.find("href=\"") {
                let rest = &line[href_pos + 6..];
                if let Some(end_pos) = rest.find('\"') {
                    return Some(rest[..end_pos].to_string());
                }
            }
        }
    }
    None
}

fn extract_manifest_items(opf: &str) -> Vec<(String, String)> {
    let mut items = Vec::new();
    for line in opf.lines() {
        if line.contains("<item ") && line.contains("id=\"") && line.contains("href=\"") {
            let id = extract_attr(line, "id");
            let href = extract_attr(line, "href");
            if let (Some(id), Some(href)) = (id, href) {
                items.push((id, href));
            }
        }
    }
    items
}

fn extract_spine_idrefs(opf: &str) -> Vec<String> {
    let mut idrefs = Vec::new();
    for line in opf.lines() {
        if line.contains("<itemref ") && line.contains("idref=\"") {
            if let Some(idref) = extract_attr(line, "idref") {
                idrefs.push(idref);
            }
        }
    }
    idrefs
}

fn extract_attr(line: &str, attr: &str) -> Option<String> {
    let pattern = format!("{}=\"", attr);
    if let Some(pos) = line.find(&pattern) {
        let rest = &line[pos + pattern.len()..];
        if let Some(end) = rest.find('\"') {
            return Some(rest[..end].to_string());
        }
    }
    None
}

fn resolve_path(base_dir: &str, file: &str) -> String {
    let clean_file = file.replace('\\', "/");
    if base_dir.is_empty() {
        clean_file
    } else {
        format!("{}/{}", base_dir.trim_end_matches('/'), clean_file.trim_start_matches('/'))
    }
}

fn clean_html_to_text(html: &str, default_idx: usize) -> (String, String) {
    // 1. Thử lấy tiêu đề từ <title>, <h1>, hoặc <h2>
    let title = extract_xml_tag(html, "title")
        .or_else(|| extract_xml_tag(html, "h1"))
        .or_else(|| extract_xml_tag(html, "h2"))
        .unwrap_or_else(|| format!("Chương {}", default_idx));

    // 2. Thay thế các tag block thành ngắt dòng
    let mut text = html
        .replace("<p>", "\n")
        .replace("</p>", "\n")
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
        .replace("<div>", "\n")
        .replace("</div>", "\n")
        .replace("</h1>", "\n")
        .replace("</h2>", "\n")
        .replace("</h3>", "\n");

    // 3. Xoá mọi thẻ HTML <...>
    let mut in_tag = false;
    let mut clean_chars = Vec::new();
    for ch in text.chars() {
        if ch == '<' {
            in_tag = true;
        } else if ch == '>' {
            in_tag = false;
        } else if !in_tag {
            clean_chars.push(ch);
        }
    }
    text = clean_chars.into_iter().collect();

    // 4. Giải mã các thực thể HTML
    text = decode_html_entities(&text);

    // 5. Chuẩn hoá dòng trống thừa
    let lines: Vec<&str> = text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();

    let clean_text = lines.join("\n\n");
    (title, clean_text)
}

fn decode_html_entities(s: &str) -> String {
    s.replace("&nbsp;", " ")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&#8212;", "—")
        .replace("&#8211;", "–")
        .replace("&#8220;", "“")
        .replace("&#8221;", "”")
        .replace("&#8216;", "‘")
        .replace("&#8217;", "’")
        .replace("&#8230;", "...")
}

fn base64_encode(data: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    let mut i = 0;
    while i < data.len() {
        let b0 = data[i] as u32;
        let b1 = if i + 1 < data.len() { data[i + 1] as u32 } else { 0 };
        let b2 = if i + 2 < data.len() { data[i + 2] as u32 } else { 0 };

        let triple = (b0 << 16) | (b1 << 8) | b2;

        result.push(CHARSET[((triple >> 18) & 63) as usize] as char);
        result.push(CHARSET[((triple >> 12) & 63) as usize] as char);

        if i + 1 < data.len() {
            result.push(CHARSET[((triple >> 6) & 63) as usize] as char);
        } else {
            result.push('=');
        }

        if i + 2 < data.len() {
            result.push(CHARSET[(triple & 63) as usize] as char);
        } else {
            result.push('=');
        }

        i += 3;
    }
    result
}
