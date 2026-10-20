use uuid::Uuid;
use crate::models::Sentence;

const VIETNAMESE_ABBREVIATIONS: &[&str] = &[
    "tp.hcm", "tp.", "th.s", "ts.", "gs.", "pgs.", "mr.", "mrs.", "ms.", "dr.",
    "v.v.", "v.v", "vd.", "vs.", "bt.", "tt.", "vnd", "usd"
];

pub fn tokenize_chapter(chapter_id: &str, raw_text: &str) -> Vec<Sentence> {
    let mut sentences = Vec::new();
    let paragraphs = raw_text.split('\n');
    let mut sentence_idx = 1;

    for paragraph in paragraphs {
        let p_trimmed = paragraph.trim();
        if p_trimmed.is_empty() {
            continue;
        }

        let p_sentences = split_into_sentences(p_trimmed);
        for raw_sentence in p_sentences {
            let clean = normalize_sentence(&raw_sentence);
            if clean.is_empty() {
                continue;
            }

            let is_dialogue = clean.starts_with('—')
                || clean.starts_with('-')
                || clean.starts_with('"')
                || clean.starts_with('“');

            sentences.push(Sentence {
                id: Uuid::new_v4().to_string(),
                chapter_id: chapter_id.to_string(),
                index: sentence_idx,
                raw_text: raw_sentence,
                clean_text: clean,
                is_dialogue,
                speaker: None,
                audio_path: None,
                duration: None,
                status: "pending".to_string(),
                voice: None,
                temperature: None,
                speed: None,
                error_message: None,
            });
            sentence_idx += 1;
        }
    }

    sentences
}

fn split_into_sentences(paragraph: &str) -> Vec<String> {
    let mut results = Vec::new();
    let chars: Vec<char> = paragraph.chars().collect();
    let len = chars.len();
    let mut start = 0;
    let mut i = 0;

    while i < len {
        let c = chars[i];

        // Kiểm tra dấu câu kết thúc: . ! ? hoặc …
        if c == '.' || c == '!' || c == '?' || c == '…' {
            // 1. Kiểm tra dấu ba chấm ...
            if c == '.' && i + 1 < len && chars[i + 1] == '.' {
                while i < len && chars[i] == '.' {
                    i += 1;
                }
                // Nếu sau dấu ... là ký tự trắng, ngoặc kép hoặc hết chuỗi
                if i >= len || chars[i].is_whitespace() || chars[i] == '"' || chars[i] == '”' || chars[i] == '\'' {
                    if i < len && (chars[i] == '"' || chars[i] == '”' || chars[i] == '\'') {
                        i += 1;
                    }
                    let seg = paragraph[start..char_idx_to_byte_idx(paragraph, i)].trim();
                    if !seg.is_empty() {
                        if seg.chars().count() > 350 {
                            results.extend(split_long_sentence(seg));
                        } else {
                            results.push(seg.to_string());
                        }
                    }
                    start = char_idx_to_byte_idx(paragraph, i);
                }
                continue;
            }

            // 2. Dấu ba chấm unicode …
            if c == '…' {
                let mut end_char_idx = i + 1;
                if end_char_idx < len && (chars[end_char_idx] == '"' || chars[end_char_idx] == '”' || chars[end_char_idx] == '\'') {
                    end_char_idx += 1;
                }
                if end_char_idx >= len || chars[end_char_idx].is_whitespace() {
                    let seg = paragraph[start..char_idx_to_byte_idx(paragraph, end_char_idx)].trim();
                    if !seg.is_empty() {
                        if seg.chars().count() > 350 {
                            results.extend(split_long_sentence(seg));
                        } else {
                            results.push(seg.to_string());
                        }
                    }
                    start = char_idx_to_byte_idx(paragraph, end_char_idx);
                    i = end_char_idx;
                    continue;
                }
            }

            // 3. Kiểm tra chữ viết tắt (abbreviation) hoặc số thập phân (3.14)
            if c == '.' {
                // Số thập phân: trước là số và sau là số (3.14)
                if i > 0 && chars[i - 1].is_ascii_digit() && i + 1 < len && chars[i + 1].is_ascii_digit() {
                    i += 1;
                    continue;
                }

                // Kiểm tra từ đứng trước dấu chấm có nằm trong danh sách viết tắt không
                let current_token = get_prev_token(&chars, i);
                if is_abbreviation(&current_token) {
                    i += 1;
                    continue;
                }
            }

            // 4. Nếu sau dấu kết thúc là ngoặc kép đóng: " hoặc ” hoặc '
            let mut end_char_idx = i + 1;
            if end_char_idx < len && (chars[end_char_idx] == '"' || chars[end_char_idx] == '”' || chars[end_char_idx] == '\'') {
                end_char_idx += 1;
            }

            // Kiểm tra ký tự sau đó có phải khoảng trắng hoặc kết thúc chuỗi không
            if end_char_idx >= len || chars[end_char_idx].is_whitespace() {
                let seg = paragraph[start..char_idx_to_byte_idx(paragraph, end_char_idx)].trim();
                if !seg.is_empty() {
                    // Nếu câu quá dài (> 350 ký tự), chia nhỏ thêm tại dấu phân cách tự nhiên
                    if seg.chars().count() > 350 {
                        let sub_splits = split_long_sentence(seg);
                        results.extend(sub_splits);
                    } else {
                        results.push(seg.to_string());
                    }
                }
                start = char_idx_to_byte_idx(paragraph, end_char_idx);
                i = end_char_idx;
                continue;
            }
        }
        i += 1;
    }

    if start < paragraph.len() {
        let remaining = paragraph[start..].trim();
        if !remaining.is_empty() {
            if remaining.chars().count() > 350 {
                let sub_splits = split_long_sentence(remaining);
                results.extend(sub_splits);
            } else {
                results.push(remaining.to_string());
            }
        }
    }

    results
}

/// Chia nhỏ câu dài (> 350 ký tự) tại các điểm ngắt tự nhiên (;, :, ,)
fn split_long_sentence(text: &str) -> Vec<String> {
    if text.chars().count() <= 350 {
        return vec![text.to_string()];
    }

    // Tách ưu tiên theo dấu chấm phẩy hoặc hai chấm nếu có
    let delimiter = if text.contains("; ") {
        "; "
    } else if text.contains(": ") {
        ": "
    } else if text.contains(", ") {
        ", "
    } else {
        return vec![text.to_string()];
    };

    let splits: Vec<&str> = text.split(delimiter).collect();
    if splits.len() <= 1 {
        return vec![text.to_string()];
    }

    let mut parts = Vec::new();
    let mut current = String::new();

    for (idx, part) in splits.iter().enumerate() {
        if !current.is_empty() {
            current.push_str(delimiter);
        }
        current.push_str(part.trim());

        let count = current.chars().count();
        let is_last = idx == splits.len() - 1;

        // Nếu đã đủ độ dài (>= 180 ký tự) hoặc là đoạn cuối
        if count >= 180 || is_last {
            let trimmed = current.trim();
            if !trimmed.is_empty() {
                parts.push(trimmed.to_string());
            }
            current.clear();
        }
    }

    if !current.trim().is_empty() {
        parts.push(current.trim().to_string());
    }

    if parts.is_empty() {
        vec![text.to_string()]
    } else {
        parts
    }
}

fn get_prev_token(chars: &[char], dot_idx: usize) -> String {
    let mut start = dot_idx;
    while start > 0 && !chars[start - 1].is_whitespace() {
        start -= 1;
    }
    chars[start..=dot_idx].iter().collect()
}

fn is_abbreviation(token: &str) -> bool {
    let lower = token.trim().to_lowercase();
    VIETNAMESE_ABBREVIATIONS.iter().any(|&abbr| lower == abbr || lower.ends_with(abbr))
}

fn char_idx_to_byte_idx(s: &str, char_idx: usize) -> usize {
    s.char_indices()
        .nth(char_idx)
        .map(|(byte_offset, _)| byte_offset)
        .unwrap_or(s.len())
}

pub fn normalize_sentence(s: &str) -> String {
    let mut text = s.trim().to_string();

    // Chuẩn hoá ngoặc kép và gạch đầu dòng
    text = text
        .replace('“', "\"")
        .replace('”', "\"")
        .replace('‘', "'")
        .replace('’', "'")
        .replace('–', "—");

    // Nếu bắt đầu bằng gạch ngang mà không có khoảng cách
    if text.starts_with("—") && !text.starts_with("— ") {
        text = format!("— {}", &text[1..]);
    } else if text.starts_with("- ") {
        text = format!("— {}", &text[2..]);
    }

    text
}
