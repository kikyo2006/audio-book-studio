use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::sync::OnceLock;
use regex::Regex;
use zip::ZipArchive;
use crate::models::{EbookParsedData, ParsedChapter};

static BLOCK_OPEN_RE: OnceLock<Regex> = OnceLock::new();
static BLOCK_CLOSE_RE: OnceLock<Regex> = OnceLock::new();
static BR_RE: OnceLock<Regex> = OnceLock::new();
static TAG_RE: OnceLock<Regex> = OnceLock::new();
static DEC_ENTITY_RE: OnceLock<Regex> = OnceLock::new();
static HEX_ENTITY_RE: OnceLock<Regex> = OnceLock::new();
static CHAPTER_MARKER_RE: OnceLock<Regex> = OnceLock::new();

fn get_block_open_re() -> &'static Regex {
    BLOCK_OPEN_RE.get_or_init(|| {
        Regex::new(r"(?i)<(p|div|section|article|header|footer|h[1-6]|li|blockquote|table|tr|caption|pre)(\s+[^>]*)?>").unwrap()
    })
}

fn get_block_close_re() -> &'static Regex {
    BLOCK_CLOSE_RE.get_or_init(|| {
        Regex::new(r"(?i)</(p|div|section|article|header|footer|h[1-6]|li|blockquote|table|tr|caption|pre)>").unwrap()
    })
}

fn get_br_re() -> &'static Regex {
    BR_RE.get_or_init(|| {
        Regex::new(r"(?i)<br\s*/?>").unwrap()
    })
}

fn get_tag_re() -> &'static Regex {
    TAG_RE.get_or_init(|| {
        Regex::new(r"<[^>]+>").unwrap()
    })
}

fn get_dec_entity_re() -> &'static Regex {
    DEC_ENTITY_RE.get_or_init(|| {
        Regex::new(r"&#([0-9]+);").unwrap()
    })
}

fn get_hex_entity_re() -> &'static Regex {
    HEX_ENTITY_RE.get_or_init(|| {
        Regex::new(r"(?i)&#x([0-9a-f]+);").unwrap()
    })
}

fn get_chapter_marker_re() -> &'static Regex {
    CHAPTER_MARKER_RE.get_or_init(|| {
        Regex::new(r"(?i)^(Chương\s+[0-9IVXLCDMivxlcdm]+.*|Chapter\s+[0-9IVXLCDMivxlcdm]+.*|Hồi\s+[0-9IVXLCDMivxlcdm]+.*|Phần\s+([0-9IVXLCDMivxlcdm]+|dẫn|kết|mở\s+đầu).*|Mở\s+đầu|Lời\s+mở\s+đầu|Lời\s+nói\s+đầu|Vĩ\s+thanh|Lời\s+kết)$").unwrap()
    })
}

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
                        let sub_chapters = split_into_smart_chapters(&clean_text, &chap_title, &mut chapter_idx);
                        chapters.extend(sub_chapters);
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
                let decoded = decode_html_entities(text.trim());
                let clean_title = get_tag_re().replace_all(&decoded, "").trim().to_string();
                if !clean_title.is_empty() {
                    return Some(clean_title);
                }
            }
        }
    }
    None
}

fn find_cover_href(opf: &str) -> Option<String> {
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

pub fn clean_html_to_text(html: &str, default_idx: usize) -> (String, String) {
    // 1. Lấy tiêu đề từ <title>, <h1>, hoặc <h2>
    let title = extract_xml_tag(html, "title")
        .filter(|t| !t.trim().is_empty())
        .or_else(|| extract_xml_tag(html, "h1"))
        .or_else(|| extract_xml_tag(html, "h2"))
        .unwrap_or_else(|| format!("Chương {}", default_idx));

    // 2. Chuyển đổi các thẻ block HTML thành ký tự xuống dòng bằng Regex
    let with_block_breaks = get_block_open_re().replace_all(html, "\n\n");
    let with_block_ends = get_block_close_re().replace_all(&with_block_breaks, "\n");
    let with_brs = get_br_re().replace_all(&with_block_ends, "\n");

    // 3. Xóa mọi thẻ HTML inline còn sót lại
    let text_no_tags = get_tag_re().replace_all(&with_brs, "");

    // 4. Giải mã toàn bộ HTML entities
    let decoded = decode_html_entities(&text_no_tags);

    // 5. Chuẩn hóa dòng trống thừa
    let lines: Vec<&str> = decoded
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();

    let clean_text = lines.join("\n\n");
    (title, clean_text)
}

fn decode_html_entities(s: &str) -> String {
    let mut text = s
        .replace("&nbsp;", " ")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&mdash;", "—")
        .replace("&ndash;", "–")
        .replace("&ldquo;", "“")
        .replace("&rdquo;", "”")
        .replace("&lsquo;", "‘")
        .replace("&rsquo;", "’")
        .replace("&hellip;", "...")
        .replace("&#8212;", "—")
        .replace("&#8211;", "–")
        .replace("&#8220;", "“")
        .replace("&#8221;", "”")
        .replace("&#8216;", "‘")
        .replace("&#8217;", "’")
        .replace("&#8230;", "...");

    // Giải mã &#...; dạng số thập phân
    text = get_dec_entity_re()
        .replace_all(&text, |caps: &regex::Captures| {
            if let Ok(code) = caps[1].parse::<u32>() {
                if let Some(ch) = char::from_u32(code) {
                    return ch.to_string();
                }
            }
            caps[0].to_string()
        })
        .to_string();

    // Giải mã &#x...; dạng số thập lục phân
    text = get_hex_entity_re()
        .replace_all(&text, |caps: &regex::Captures| {
            if let Ok(code) = u32::from_str_radix(&caps[1], 16) {
                if let Some(ch) = char::from_u32(code) {
                    return ch.to_string();
                }
            }
            caps[0].to_string()
        })
        .to_string();

    text
}

/// Tự động tách một khối văn bản lớn thành nhiều chương nếu phát hiện các marker chương (Chương X, Chapter X...)
fn split_into_smart_chapters(
    raw_content: &str,
    fallback_title: &str,
    chapter_idx_counter: &mut usize,
) -> Vec<ParsedChapter> {
    let lines: Vec<&str> = raw_content.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    if lines.is_empty() {
        return Vec::new();
    }

    let marker_re = get_chapter_marker_re();

    // Tìm tất cả các dòng là tiêu đề chương
    let mut markers: Vec<usize> = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        if marker_re.is_match(line) {
            markers.push(i);
        }
    }

    // Nếu không có marker hoặc chỉ có 1 marker ở ngay đầu -> giữ nguyên là 1 chương
    if markers.len() < 2 {
        let title = if fallback_title.trim().is_empty() {
            format!("Chương {}", *chapter_idx_counter)
        } else {
            fallback_title.to_string()
        };
        let chap = ParsedChapter {
            index: *chapter_idx_counter,
            title,
            content: raw_content.to_string(),
        };
        *chapter_idx_counter += 1;
        return vec![chap];
    }

    let mut result = Vec::new();

    // 1. Xử lý đoạn văn bản trước marker đầu tiên (nếu có, ví dụ Lời tựa, Giới thiệu)
    if markers[0] > 0 {
        let intro_content = lines[0..markers[0]].join("\n\n");
        if !intro_content.trim().is_empty() {
            let intro_title = if fallback_title.to_lowercase().contains("cover") {
                "Giới thiệu".to_string()
            } else if fallback_title.trim().is_empty() {
                "Phần mở đầu".to_string()
            } else {
                fallback_title.to_string()
            };

            result.push(ParsedChapter {
                index: *chapter_idx_counter,
                title: intro_title,
                content: intro_content,
            });
            *chapter_idx_counter += 1;
        }
    }

    // 2. Tách từng chương theo các marker
    for i in 0..markers.len() {
        let start_line = markers[i];
        let end_line = if i + 1 < markers.len() {
            markers[i + 1]
        } else {
            lines.len()
        };

        let raw_marker = lines[start_line];
        let mut chapter_title = raw_marker.to_string();
        let content_start;

        // Nếu dòng kế tiếp là phụ đề chương ngắn (ví dụ: Chương 1 \n Cưỡng hiếp cả thành phố)
        if start_line + 1 < end_line {
            let next_line = lines[start_line + 1];
            if !marker_re.is_match(next_line) && next_line.chars().count() <= 60 && !next_line.ends_with('.') {
                chapter_title = format!("{} - {}", raw_marker, next_line);
                content_start = start_line + 2;
            } else {
                content_start = start_line + 1;
            }
        } else {
            content_start = start_line + 1;
        }

        let chapter_content = lines[content_start..end_line].join("\n\n");
        if !chapter_content.trim().is_empty() {
            result.push(ParsedChapter {
                index: *chapter_idx_counter,
                title: chapter_title,
                content: chapter_content,
            });
            *chapter_idx_counter += 1;
        }
    }

    if result.is_empty() {
        let chap = ParsedChapter {
            index: *chapter_idx_counter,
            title: fallback_title.to_string(),
            content: raw_content.to_string(),
        };
        *chapter_idx_counter += 1;
        vec![chap]
    } else {
        result
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tokenizer::tokenize_chapter;

    #[test]
    fn test_parse_de_thi_dam_mau() {
        let epub_path = r"C:\Users\yudev\Downloads\Đề thi đẫm máu.epub";
        if !std::path::Path::new(epub_path).exists() {
            return;
        }
        let parsed = parse_epub(epub_path).expect("Parse thất bại");
        println!("Title: {}", parsed.title);
        println!("Chapters count: {}", parsed.chapters.len());
        for c in parsed.chapters.iter().take(5) {
            println!("  [Chapter {}] {}", c.index, c.title);
            println!("    Length: {} chars", c.content.len());
            let first_line = c.content.lines().next().unwrap_or("");
            println!("    Preview: {}", &first_line[..first_line.len().min(80)]);
        }

        // Kiểm tra riêng Chapter 3 (Phần dẫn - Quái vật)
        let chap3 = &parsed.chapters[2];
        let sentences = tokenize_chapter("c3", &chap3.content);
        println!("\n=== Chapter 3 sentences around Đỗ Ninh ===");
        for s in sentences.iter() {
            if s.raw_text.contains("khước từ việc") || s.raw_text.contains("Nào, cùng ăn nhé") || s.raw_text.contains("bát mì") {
                println!("  [{}] {}", s.index, s.raw_text);
            }
        }
    }
}
