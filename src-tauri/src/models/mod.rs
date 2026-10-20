use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub title: String,
    pub author: String,
    pub description: Option<String>,
    pub source_file_path: Option<String>,
    pub source_format: Option<String>,
    pub cover_path: Option<String>,
    pub cover_base64: Option<String>,
    pub chapter_count: usize,
    pub total_sentences: usize,
    pub completed_sentences: usize,
    pub total_duration: f64,
    pub created_at: String,
    pub updated_at: String,
    /// 'active' | 'completed' | 'dropped'
    pub status: String,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chapter {
    pub id: String,
    pub project_id: String,
    pub index: usize,
    pub title: String,
    pub raw_content: String,
    pub sentence_count: usize,
    pub ready_sentence_count: usize,
    pub total_duration: f64,
    pub bgm_path: Option<String>,
    pub bgm_volume: Option<f64>,
    #[serde(default = "default_true")]
    pub is_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergeChaptersResult {
    pub chapters: Vec<Chapter>,
    pub merged_chapter_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sentence {
    pub id: String,
    pub chapter_id: String,
    pub index: usize,
    pub raw_text: String,
    pub clean_text: String,
    pub is_dialogue: bool,
    pub speaker: Option<String>,
    pub audio_path: Option<String>,
    pub duration: Option<f64>,
    pub status: String, // 'pending' | 'generating' | 'ready' | 'error'
    pub voice: Option<String>,
    pub temperature: Option<f32>,
    pub speed: Option<f32>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EbookParsedData {
    pub title: String,
    pub author: String,
    pub description: Option<String>,
    pub cover_base64: Option<String>,
    pub chapters: Vec<ParsedChapter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedChapter {
    pub index: usize,
    pub title: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterProfile {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub voice: String,
    pub speed: f32,
    pub temperature: f32,
    pub color: String,
    pub is_narrator: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleVoiceSetting {
    pub voice: String,
    pub speed: f32,
    pub temperature: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetCharacter {
    pub id: String,
    pub name: String,
    pub voice: String,
    pub speed: f32,
    pub temperature: f32,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CastingPreset {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub narrator: RoleVoiceSetting,
    pub dialogue: RoleVoiceSetting,
    pub characters: Vec<PresetCharacter>,
    pub created_at: String,
    pub updated_at: String,
}


