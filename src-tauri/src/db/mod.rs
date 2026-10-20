use rusqlite::{params, Connection};
use std::path::Path;
use std::sync::Mutex;
use crate::models::{Chapter, Project, Sentence};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(|e| format!("Lỗi kết nối SQLite: {}", e))?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                description TEXT,
                source_file_path TEXT,
                source_format TEXT,
                cover_path TEXT,
                cover_base64 TEXT,
                chapter_count INTEGER DEFAULT 0,
                total_sentences INTEGER DEFAULT 0,
                completed_sentences INTEGER DEFAULT 0,
                total_duration REAL DEFAULT 0.0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
            [],
        )
        .map_err(|e| format!("Lỗi tạo bảng projects: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS chapters (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                idx INTEGER NOT NULL,
                title TEXT NOT NULL,
                raw_content TEXT NOT NULL,
                sentence_count INTEGER DEFAULT 0,
                ready_sentence_count INTEGER DEFAULT 0,
                total_duration REAL DEFAULT 0.0,
                bgm_path TEXT,
                bgm_volume REAL DEFAULT 0.2,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            );",
            [],
        )
        .map_err(|e| format!("Lỗi tạo bảng chapters: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS sentences (
                id TEXT PRIMARY KEY,
                chapter_id TEXT NOT NULL,
                idx INTEGER NOT NULL,
                raw_text TEXT NOT NULL,
                clean_text TEXT NOT NULL,
                is_dialogue INTEGER DEFAULT 0,
                speaker TEXT,
                audio_path TEXT,
                duration REAL,
                status TEXT DEFAULT 'pending',
                voice TEXT,
                temperature REAL,
                speed REAL,
                error_message TEXT,
                FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
            );",
            [],
        )
        .map_err(|e| format!("Lỗi tạo bảng sentences: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                voice TEXT NOT NULL,
                speed REAL NOT NULL,
                temperature REAL NOT NULL,
                color TEXT NOT NULL,
                is_narrator INTEGER DEFAULT 0,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            );",
            [],
        )
        .map_err(|e| format!("Lỗi tạo bảng characters: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS casting_presets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                narrator_voice TEXT NOT NULL,
                narrator_speed REAL NOT NULL DEFAULT 1.0,
                narrator_temperature REAL NOT NULL DEFAULT 0.45,
                dialogue_voice TEXT NOT NULL,
                dialogue_speed REAL NOT NULL DEFAULT 1.0,
                dialogue_temperature REAL NOT NULL DEFAULT 0.45,
                characters_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
            [],
        )
        .map_err(|e| format!("Lỗi tạo bảng casting_presets: {}", e))?;

        let _ = conn.execute("ALTER TABLE chapters ADD COLUMN bgm_path TEXT;", []);
        let _ = conn.execute("ALTER TABLE chapters ADD COLUMN bgm_volume REAL DEFAULT 0.2;", []);
        // Migration: thêm cột status cho projects (ignore nếu đã tồn tại)
        let _ = conn.execute("ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active';", []);

        Ok(())
    }

    pub fn insert_project(&self, p: &Project) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO projects (
                id, title, author, description, source_file_path, source_format,
                cover_path, cover_base64, chapter_count, total_sentences, completed_sentences,
                total_duration, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14);",
            params![
                p.id,
                p.title,
                p.author,
                p.description,
                p.source_file_path,
                p.source_format,
                p.cover_path,
                p.cover_base64,
                p.chapter_count as i64,
                p.total_sentences as i64,
                p.completed_sentences as i64,
                p.total_duration,
                p.created_at,
                p.updated_at
            ],
        )
        .map_err(|e| format!("Lỗi lưu project: {}", e))?;
        Ok(())
    }

    pub fn get_all_projects(&self) -> Result<Vec<Project>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        // completed_sentences dùng subquery realtime thay vì đọc cột cached (có thể stale)
        let mut stmt = conn
            .prepare("SELECT id, title, author, description, source_file_path, source_format, cover_path, cover_base64, chapter_count, total_sentences, \
                (SELECT COUNT(*) FROM sentences s JOIN chapters c ON s.chapter_id = c.id WHERE c.project_id = projects.id AND s.status = 'ready') AS completed_sentences, \
                total_duration, created_at, updated_at, COALESCE(status, 'active') as status FROM projects ORDER BY updated_at DESC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    author: row.get(2)?,
                    description: row.get(3)?,
                    source_file_path: row.get(4)?,
                    source_format: row.get(5)?,
                    cover_path: row.get(6)?,
                    cover_base64: row.get(7)?,
                    chapter_count: row.get::<_, i64>(8)? as usize,
                    total_sentences: row.get::<_, i64>(9)? as usize,
                    completed_sentences: row.get::<_, i64>(10)? as usize,
                    total_duration: row.get(11)?,
                    created_at: row.get(12)?,
                    updated_at: row.get(13)?,
                    status: row.get::<_, String>(14).unwrap_or_else(|_| "active".to_string()),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            match r {
                Ok(p) => list.push(p),
                Err(e) => eprintln!("⚠️ Lỗi parse project row từ SQLite: {}", e),
            }
        }
        Ok(list)
    }

    pub fn update_project_status(&self, project_id: &str, status: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE projects SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![status, project_id],
        )
        .map_err(|e| format!("Lỗi cập nhật status dự án: {}", e))?;
        Ok(())
    }

    pub fn insert_chapters(&self, chapters: &[Chapter]) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for c in chapters {
            tx.execute(
                "INSERT OR REPLACE INTO chapters (
                    id, project_id, idx, title, raw_content, sentence_count, ready_sentence_count, total_duration, bgm_path, bgm_volume
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10);",
                params![
                    c.id,
                    c.project_id,
                    c.index as i64,
                    c.title,
                    c.raw_content,
                    c.sentence_count as i64,
                    c.ready_sentence_count as i64,
                    c.total_duration,
                    c.bgm_path,
                    c.bgm_volume.unwrap_or(0.2)
                ],
            )
            .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_chapters(&self, project_id: &str) -> Result<Vec<Chapter>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, project_id, idx, title, raw_content, sentence_count, ready_sentence_count, total_duration, bgm_path, bgm_volume FROM chapters WHERE project_id = ?1 ORDER BY idx ASC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![project_id], |row| {
                Ok(Chapter {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    index: row.get::<_, i64>(2)? as usize,
                    title: row.get(3)?,
                    raw_content: row.get(4)?,
                    sentence_count: row.get::<_, i64>(5)? as usize,
                    ready_sentence_count: row.get::<_, i64>(6)? as usize,
                    total_duration: row.get(7)?,
                    bgm_path: row.get(8).unwrap_or(None),
                    bgm_volume: row.get(9).unwrap_or(Some(0.2)),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            if let Ok(c) = r {
                list.push(c);
            }
        }
        Ok(list)
    }

    pub fn insert_sentences(&self, sentences: &[Sentence]) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for s in sentences {
            tx.execute(
                "INSERT OR REPLACE INTO sentences (
                    id, chapter_id, idx, raw_text, clean_text, is_dialogue, speaker,
                    audio_path, duration, status, voice, temperature, speed, error_message
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14);",
                params![
                    s.id,
                    s.chapter_id,
                    s.index as i64,
                    s.raw_text,
                    s.clean_text,
                    if s.is_dialogue { 1 } else { 0 },
                    s.speaker,
                    s.audio_path,
                    s.duration,
                    s.status,
                    s.voice,
                    s.temperature,
                    s.speed,
                    s.error_message
                ],
            )
            .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_sentences(&self, chapter_id: &str) -> Result<Vec<Sentence>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, chapter_id, idx, raw_text, clean_text, is_dialogue, speaker, audio_path, duration, status, voice, temperature, speed, error_message FROM sentences WHERE chapter_id = ?1 ORDER BY idx ASC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![chapter_id], |row| {
                Ok(Sentence {
                    id: row.get(0)?,
                    chapter_id: row.get(1)?,
                    index: row.get::<_, i64>(2)? as usize,
                    raw_text: row.get(3)?,
                    clean_text: row.get(4)?,
                    is_dialogue: row.get::<_, i64>(5)? != 0,
                    speaker: row.get(6)?,
                    audio_path: row.get(7)?,
                    duration: row.get(8)?,
                    status: row.get(9)?,
                    voice: row.get(10)?,
                    temperature: row.get(11)?,
                    speed: row.get(12)?,
                    error_message: row.get(13)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            if let Ok(s) = r {
                list.push(s);
            }
        }
        Ok(list)
    }

    pub fn update_sentence_text(&self, sentence_id: &str, clean_text: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE sentences SET clean_text = ?1, status = 'pending' WHERE id = ?2;",
            params![clean_text, sentence_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn batch_update_sentences_text(&self, updates: &[(String, String)]) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        {
            let mut stmt = tx
                .prepare("UPDATE sentences SET clean_text = ?1, status = 'pending' WHERE id = ?2;")
                .map_err(|e| e.to_string())?;
            for (sentence_id, clean_text) in updates {
                stmt.execute(params![clean_text, sentence_id])
                    .map_err(|e| e.to_string())?;
            }
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_sentence_audio(
        &self,
        sentence_id: &str,
        audio_path: &str,
        duration: f64,
        voice: Option<&str>,
        temperature: Option<f32>,
        speed: Option<f32>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE sentences SET audio_path = ?1, duration = ?2, status = 'ready', voice = ?3, temperature = ?4, speed = ?5, error_message = NULL WHERE id = ?6;",
            params![audio_path, duration, voice, temperature, speed, sentence_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_sentence_error(&self, sentence_id: &str, err: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE sentences SET status = 'error', error_message = ?1 WHERE id = ?2;",
            params![err, sentence_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn insert_character(&self, ch: &crate::models::CharacterProfile) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO characters (id, project_id, name, voice, speed, temperature, color, is_narrator)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8);",
            params![
                ch.id,
                ch.project_id,
                ch.name,
                ch.voice,
                ch.speed,
                ch.temperature,
                ch.color,
                if ch.is_narrator { 1 } else { 0 }
            ],
        )
        .map_err(|e| format!("Lỗi lưu nhân vật: {}", e))?;
        Ok(())
    }

    pub fn get_characters(&self, project_id: &str) -> Result<Vec<crate::models::CharacterProfile>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, project_id, name, voice, speed, temperature, color, is_narrator FROM characters WHERE project_id = ?1 ORDER BY is_narrator DESC, name ASC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![project_id], |row| {
                Ok(crate::models::CharacterProfile {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    voice: row.get(3)?,
                    speed: row.get(4)?,
                    temperature: row.get(5)?,
                    color: row.get(6)?,
                    is_narrator: row.get::<_, i64>(7)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            if let Ok(c) = r {
                list.push(c);
            }
        }
        Ok(list)
    }

    pub fn delete_character(&self, character_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM characters WHERE id = ?1;", params![character_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn insert_or_update_preset(&self, preset: &crate::models::CastingPreset) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let chars_json = serde_json::to_string(&preset.characters).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "INSERT OR REPLACE INTO casting_presets (
                id, name, description, narrator_voice, narrator_speed, narrator_temperature,
                dialogue_voice, dialogue_speed, dialogue_temperature, characters_json,
                created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12);",
            params![
                preset.id,
                preset.name,
                preset.description,
                preset.narrator.voice,
                preset.narrator.speed,
                preset.narrator.temperature,
                preset.dialogue.voice,
                preset.dialogue.speed,
                preset.dialogue.temperature,
                chars_json,
                preset.created_at,
                preset.updated_at
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_all_presets(&self) -> Result<Vec<crate::models::CastingPreset>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, name, description, narrator_voice, narrator_speed, narrator_temperature,
                        dialogue_voice, dialogue_speed, dialogue_temperature, characters_json,
                        created_at, updated_at
                 FROM casting_presets ORDER BY updated_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                let chars_json: String = row.get(9)?;
                let characters: Vec<crate::models::PresetCharacter> =
                    serde_json::from_str(&chars_json).unwrap_or_default();
                Ok(crate::models::CastingPreset {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    narrator: crate::models::RoleVoiceSetting {
                        voice: row.get(3)?,
                        speed: row.get(4)?,
                        temperature: row.get(5)?,
                    },
                    dialogue: crate::models::RoleVoiceSetting {
                        voice: row.get(6)?,
                        speed: row.get(7)?,
                        temperature: row.get(8)?,
                    },
                    characters,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            match r {
                Ok(p) => list.push(p),
                Err(e) => eprintln!("⚠️ Lỗi parse project row từ SQLite: {}", e),
            }
        }
        Ok(list)
    }

    pub fn delete_preset(&self, preset_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM casting_presets WHERE id = ?1;", params![preset_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }


    pub fn assign_sentence_speaker(
        &self,
        sentence_id: &str,
        speaker: &str,
        voice: &str,
        speed: f32,
        temperature: f32,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE sentences SET speaker = ?1, voice = ?2, speed = ?3, temperature = ?4 WHERE id = ?5;",
            params![speaker, voice, speed, temperature, sentence_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn batch_assign_dialogues(
        &self,
        chapter_id: &str,
        speaker: &str,
        voice: &str,
        speed: f32,
        temperature: f32,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE sentences SET speaker = ?1, voice = ?2, speed = ?3, temperature = ?4 WHERE chapter_id = ?5 AND is_dialogue = 1;",
            params![speaker, voice, speed, temperature, chapter_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn batch_assign_narration(
        &self,
        chapter_id: &str,
        voice: &str,
        speed: f32,
        temperature: f32,
        apply_all_chapters: bool,
        project_id: Option<&str>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        if apply_all_chapters && project_id.is_some() {
            let pid = project_id.unwrap();
            conn.execute(
                "UPDATE sentences SET speaker = '', voice = ?1, speed = ?2, temperature = ?3 
                 WHERE chapter_id IN (SELECT id FROM chapters WHERE project_id = ?4) 
                   AND is_dialogue = 0 
                   AND NOT (clean_text LIKE '[Khoảng lặng%');",
                params![voice, speed, temperature, pid],
            )
            .map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "UPDATE sentences SET speaker = '', voice = ?1, speed = ?2, temperature = ?3 
                 WHERE chapter_id = ?4 
                   AND is_dialogue = 0 
                   AND NOT (clean_text LIKE '[Khoảng lặng%');",
                params![voice, speed, temperature, chapter_id],
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn batch_assign_dialogues_extended(
        &self,
        chapter_id: &str,
        speaker: &str,
        voice: &str,
        speed: f32,
        temperature: f32,
        only_unassigned: bool,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        if only_unassigned {
            conn.execute(
                "UPDATE sentences SET speaker = ?1, voice = ?2, speed = ?3, temperature = ?4 
                 WHERE chapter_id = ?5 
                   AND is_dialogue = 1 
                   AND (speaker IS NULL OR speaker = '' OR speaker = 'Hội Thoại');",
                params![speaker, voice, speed, temperature, chapter_id],
            )
            .map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "UPDATE sentences SET speaker = ?1, voice = ?2, speed = ?3, temperature = ?4 
                 WHERE chapter_id = ?5 AND is_dialogue = 1;",
                params![speaker, voice, speed, temperature, chapter_id],
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn batch_assign_speaker_range(
        &self,
        chapter_id: &str,
        from_index: usize,
        to_index: usize,
        target_mode: &str, // "dialogue_only" | "narration_only" | "all"
        speaker: &str,
        voice: &str,
        speed: f32,
        temperature: f32,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let min_idx = from_index.min(to_index) as i64;
        let max_idx = from_index.max(to_index) as i64;

        match target_mode {
            "dialogue_only" => {
                conn.execute(
                    "UPDATE sentences SET speaker = ?1, voice = ?2, speed = ?3, temperature = ?4 
                     WHERE chapter_id = ?5 AND idx >= ?6 AND idx <= ?7 AND is_dialogue = 1;",
                    params![speaker, voice, speed, temperature, chapter_id, min_idx, max_idx],
                )
                .map_err(|e| e.to_string())?;
            }
            "narration_only" => {
                conn.execute(
                    "UPDATE sentences SET speaker = ?1, voice = ?2, speed = ?3, temperature = ?4 
                     WHERE chapter_id = ?5 AND idx >= ?6 AND idx <= ?7 AND is_dialogue = 0 AND NOT (clean_text LIKE '[Khoảng lặng%');",
                    params![speaker, voice, speed, temperature, chapter_id, min_idx, max_idx],
                )
                .map_err(|e| e.to_string())?;
            }
            _ => {
                conn.execute(
                    "UPDATE sentences SET speaker = ?1, voice = ?2, speed = ?3, temperature = ?4 
                     WHERE chapter_id = ?5 AND idx >= ?6 AND idx <= ?7 AND NOT (clean_text LIKE '[Khoảng lặng%');",
                    params![speaker, voice, speed, temperature, chapter_id, min_idx, max_idx],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    pub fn rename_chapter(&self, chapter_id: &str, new_title: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE chapters SET title = ?1 WHERE id = ?2;",
            params![new_title.trim(), chapter_id],
        )
        .map_err(|e| format!("Lỗi đổi tên chương: {}", e))?;
        Ok(())
    }

    pub fn delete_chapter(
        &self,
        chapter_id: &str,
        return_sentences_to_chapter_id: Option<&str>,
    ) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        // 1. Lấy project_id
        let project_id: String = tx
            .query_row(
                "SELECT project_id FROM chapters WHERE id = ?1;",
                params![chapter_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Không tìm thấy chương cần xóa: {}", e))?;

        // 2. Xử lý các câu của chương bị xóa
        if let Some(target_id) = return_sentences_to_chapter_id {
            if !target_id.trim().is_empty() && target_id != chapter_id {
                // Chuyển toàn bộ câu sang target_id
                tx.execute(
                    "UPDATE sentences SET chapter_id = ?1 WHERE chapter_id = ?2;",
                    params![target_id, chapter_id],
                )
                .map_err(|e| format!("Lỗi hoàn trả câu: {}", e))?;

                // Đánh số lại idx cho target_id
                let ids: Vec<String> = {
                    let mut stmt = tx
                        .prepare("SELECT id FROM sentences WHERE chapter_id = ?1 ORDER BY idx ASC")
                        .map_err(|e| e.to_string())?;
                    stmt.query_map(params![target_id], |row| row.get(0))
                        .map_err(|e| e.to_string())?
                        .filter_map(|r| r.ok())
                        .collect()
                };

                for (i, id) in ids.iter().enumerate() {
                    tx.execute(
                        "UPDATE sentences SET idx = ?1 WHERE id = ?2;",
                        params![(i + 1) as i64, id],
                    )
                    .map_err(|e| e.to_string())?;
                }

                // Cập nhật thống kê target_id
                tx.execute(
                    "UPDATE chapters SET
                        sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1),
                        ready_sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1 AND status = 'ready'),
                        total_duration = (SELECT COALESCE(SUM(duration), 0.0) FROM sentences WHERE chapter_id = ?1)
                     WHERE id = ?1;",
                    params![target_id],
                )
                .map_err(|e| e.to_string())?;
            } else {
                tx.execute("DELETE FROM sentences WHERE chapter_id = ?1;", params![chapter_id])
                    .map_err(|e| e.to_string())?;
            }
        } else {
            tx.execute("DELETE FROM sentences WHERE chapter_id = ?1;", params![chapter_id])
                .map_err(|e| e.to_string())?;
        }

        // 3. Xóa chương
        tx.execute("DELETE FROM chapters WHERE id = ?1;", params![chapter_id])
            .map_err(|e| e.to_string())?;

        // 4. Đánh số lại idx cho tất cả các chương còn lại của project
        let chap_ids: Vec<String> = {
            let mut stmt = tx
                .prepare("SELECT id FROM chapters WHERE project_id = ?1 ORDER BY idx ASC")
                .map_err(|e| e.to_string())?;
            stmt.query_map(params![project_id], |row| row.get(0))
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect()
        };

        for (i, cid) in chap_ids.iter().enumerate() {
            tx.execute(
                "UPDATE chapters SET idx = ?1 WHERE id = ?2;",
                params![(i + 1) as i64, cid],
            )
            .map_err(|e| e.to_string())?;
        }

        // 5. Cập nhật chapter_count trong projects
        tx.execute(
            "UPDATE projects SET chapter_count = (SELECT COUNT(*) FROM chapters WHERE project_id = ?1) WHERE id = ?1;",
            params![project_id],
        )
        .map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn reorder_chapter(&self, chapter_id: &str, direction: &str) -> Result<Vec<Chapter>, String> {
        let project_id = {
            let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
            let tx = conn.transaction().map_err(|e| e.to_string())?;

            let (proj_id, _current_idx): (String, i64) = tx
                .query_row(
                    "SELECT project_id, idx FROM chapters WHERE id = ?1;",
                    params![chapter_id],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .map_err(|e| format!("Không tìm thấy chương: {}", e))?;

            let mut chapters_idx: Vec<(String, i64)> = {
                let mut stmt = tx
                    .prepare("SELECT id, idx FROM chapters WHERE project_id = ?1 ORDER BY idx ASC")
                    .map_err(|e| e.to_string())?;
                stmt.query_map(params![proj_id], |row| Ok((row.get(0)?, row.get(1)?)))
                    .map_err(|e| e.to_string())?
                    .filter_map(|r| r.ok())
                    .collect()
            };

            let cur_pos = chapters_idx.iter().position(|(id, _)| id == chapter_id);
            if let Some(pos) = cur_pos {
                match direction {
                    "up" => {
                        if pos > 0 {
                            chapters_idx.swap(pos, pos - 1);
                        }
                    }
                    "down" => {
                        if pos + 1 < chapters_idx.len() {
                            chapters_idx.swap(pos, pos + 1);
                        }
                    }
                    "bottom" => {
                        let item = chapters_idx.remove(pos);
                        chapters_idx.push(item);
                    }
                    _ => {}
                }

                for (i, (cid, _)) in chapters_idx.iter().enumerate() {
                    tx.execute(
                        "UPDATE chapters SET idx = ?1 WHERE id = ?2;",
                        params![(i + 1) as i64, cid],
                    )
                    .map_err(|e| e.to_string())?;
                }
            }

            tx.commit().map_err(|e| e.to_string())?;
            proj_id
        };

        self.get_chapters(&project_id)
    }

    pub fn split_sentences_to_chapter(
        &self,
        project_id: &str,
        source_chapter_id: &str,
        new_title: &str,
        from_idx: usize,
        to_idx: usize,
        place_before: bool,
    ) -> Result<Chapter, String> {
        if from_idx > to_idx {
            return Err("Chỉ số câu bắt đầu không được lớn hơn chỉ số kết thúc.".to_string());
        }

        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        // 1. Kiểm tra source_chapter có tồn tại không và lấy idx hiện tại
        let source_idx: i64 = tx
            .query_row(
                "SELECT idx FROM chapters WHERE id = ?1 AND project_id = ?2;",
                params![source_chapter_id, project_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Không tìm thấy chương nguồn: {}", e))?;

        let new_chapter_id = uuid::Uuid::new_v4().to_string();

        // 2. Định vị thứ tự (idx) cho chương mới và chương nguồn
        // Nếu place_before = true: Chương mới nằm trước (nhận source_idx), chương nguồn dời xuống dưới.
        // Nếu place_before = false: Chương mới nằm sau (nhận source_idx + 1).
        let new_idx = if place_before {
            tx.execute(
                "UPDATE chapters SET idx = idx + 1 WHERE project_id = ?1 AND idx >= ?2;",
                params![project_id, source_idx],
            )
            .map_err(|e| format!("Lỗi cập nhật thứ tự chương: {}", e))?;
            source_idx
        } else {
            tx.execute(
                "UPDATE chapters SET idx = idx + 1 WHERE project_id = ?1 AND idx > ?2;",
                params![project_id, source_idx],
            )
            .map_err(|e| format!("Lỗi cập nhật thứ tự chương: {}", e))?;
            source_idx + 1
        };

        let title_to_use = if new_title.trim().is_empty() {
            format!("Chương {}", new_idx)
        } else {
            new_title.trim().to_string()
        };

        // 3. Tạo chương mới
        tx.execute(
            "INSERT INTO chapters (id, project_id, idx, title, raw_content, sentence_count, ready_sentence_count, total_duration)
             VALUES (?1, ?2, ?3, ?4, '', 0, 0, 0.0);",
            params![new_chapter_id, project_id, new_idx, title_to_use],
        )
        .map_err(|e| format!("Lỗi tạo chương mới: {}", e))?;

        // 4. Chuyển các câu từ from_idx đến to_idx sang new_chapter_id
        tx.execute(
            "UPDATE sentences SET chapter_id = ?1 WHERE chapter_id = ?2 AND idx >= ?3 AND idx <= ?4;",
            params![new_chapter_id, source_chapter_id, from_idx as i64, to_idx as i64],
        )
        .map_err(|e| format!("Lỗi chuyển các câu sang chương mới: {}", e))?;

        // 5. Đánh số lại idx (1..N) cho các câu thuộc chương mới
        {
            let mut stmt = tx
                .prepare("SELECT id FROM sentences WHERE chapter_id = ?1 ORDER BY idx ASC")
                .map_err(|e| e.to_string())?;
            let ids: Vec<String> = stmt
                .query_map(params![new_chapter_id], |row| row.get(0))
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            if ids.is_empty() {
                return Err("Không có câu nào được chọn trong phạm vi này.".to_string());
            }

            for (i, id) in ids.iter().enumerate() {
                tx.execute(
                    "UPDATE sentences SET idx = ?1 WHERE id = ?2;",
                    params![(i + 1) as i64, id],
                )
                .map_err(|e| e.to_string())?;
            }
        }

        // 6. Đánh số lại idx (1..M) cho các câu còn lại thuộc chương nguồn
        {
            let mut stmt = tx
                .prepare("SELECT id FROM sentences WHERE chapter_id = ?1 ORDER BY idx ASC")
                .map_err(|e| e.to_string())?;
            let ids: Vec<String> = stmt
                .query_map(params![source_chapter_id], |row| row.get(0))
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            for (i, id) in ids.iter().enumerate() {
                tx.execute(
                    "UPDATE sentences SET idx = ?1 WHERE id = ?2;",
                    params![(i + 1) as i64, id],
                )
                .map_err(|e| e.to_string())?;
            }
        }

        // 7. Cập nhật thống kê câu cho chương mới
        tx.execute(
            "UPDATE chapters SET
                sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1),
                ready_sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1 AND status = 'ready'),
                total_duration = (SELECT COALESCE(SUM(duration), 0.0) FROM sentences WHERE chapter_id = ?1)
             WHERE id = ?1;",
            params![new_chapter_id],
        )
        .map_err(|e| e.to_string())?;

        // 8. Cập nhật thống kê câu cho chương nguồn
        tx.execute(
            "UPDATE chapters SET
                sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1),
                ready_sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1 AND status = 'ready'),
                total_duration = (SELECT COALESCE(SUM(duration), 0.0) FROM sentences WHERE chapter_id = ?1)
             WHERE id = ?1;",
            params![source_chapter_id],
        )
        .map_err(|e| e.to_string())?;

        // 9. Cập nhật chapter_count trong bảng projects
        tx.execute(
            "UPDATE projects SET
                chapter_count = (SELECT COUNT(*) FROM chapters WHERE project_id = ?1)
             WHERE id = ?1;",
            params![project_id],
        )
        .map_err(|e| e.to_string())?;

        // 10. Lấy thông tin Chapter mới trả về
        let new_chapter = tx
            .query_row(
                "SELECT id, project_id, idx, title, raw_content, sentence_count, ready_sentence_count, total_duration, bgm_path, bgm_volume
                 FROM chapters WHERE id = ?1;",
                params![new_chapter_id],
                |row| {
                    Ok(Chapter {
                        id: row.get(0)?,
                        project_id: row.get(1)?,
                        index: row.get::<_, i64>(2)? as usize,
                        title: row.get(3)?,
                        raw_content: row.get(4)?,
                        sentence_count: row.get::<_, i64>(5)? as usize,
                        ready_sentence_count: row.get::<_, i64>(6)? as usize,
                        total_duration: row.get(7)?,
                        bgm_path: row.get(8).unwrap_or(None),
                        bgm_volume: row.get(9).unwrap_or(Some(0.2)),
                    })
                },
            )
            .map_err(|e| format!("Lỗi truy vấn chương mới vừa tạo: {}", e))?;

        tx.commit().map_err(|e| e.to_string())?;

        Ok(new_chapter)
    }

    pub fn insert_silence_sentence(
        &self,
        chapter_id: &str,
        target_sentence_id: &str,
        position: &str,
        duration_secs: f64,
        audio_file_path: &str,
    ) -> Result<Sentence, String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        // 1. Lấy idx hiện tại của target_sentence
        let target_idx: i64 = tx
            .query_row(
                "SELECT idx FROM sentences WHERE id = ?1 AND chapter_id = ?2;",
                params![target_sentence_id, chapter_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Không tìm thấy câu đích: {}", e))?;

        let (new_idx, shift_from) = if position == "above" {
            (target_idx, target_idx)
        } else {
            (target_idx + 1, target_idx + 1)
        };

        // 2. Dời các câu từ shift_from trở đi thêm 1 đơn vị
        tx.execute(
            "UPDATE sentences SET idx = idx + 1 WHERE chapter_id = ?1 AND idx >= ?2;",
            params![chapter_id, shift_from],
        )
        .map_err(|e| format!("Lỗi cập nhật chỉ mục câu: {}", e))?;

        // 3. Tạo câu khoảng lặng mới
        let new_id = uuid::Uuid::new_v4().to_string();
        let display_text = format!("[Khoảng lặng {:.1}s]", duration_secs);

        tx.execute(
            "INSERT INTO sentences (
                id, chapter_id, idx, raw_text, clean_text, is_dialogue, speaker,
                audio_path, duration, status, voice, temperature, speed, error_message
            ) VALUES (?1, ?2, ?3, ?4, ?5, 0, NULL, ?6, ?7, 'ready', NULL, NULL, NULL, NULL);",
            params![
                new_id,
                chapter_id,
                new_idx,
                display_text,
                display_text,
                audio_file_path,
                duration_secs,
            ],
        )
        .map_err(|e| format!("Lỗi chèn câu khoảng lặng: {}", e))?;

        // 4. Cập nhật thống kê chapter
        tx.execute(
            "UPDATE chapters SET
                sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1),
                ready_sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1 AND status = 'ready'),
                total_duration = (SELECT COALESCE(SUM(duration), 0.0) FROM sentences WHERE chapter_id = ?1)
             WHERE id = ?1;",
            params![chapter_id],
        )
        .map_err(|e| e.to_string())?;

        // 5. Cập nhật thống kê project
        let project_id: String = tx
            .query_row(
                "SELECT project_id FROM chapters WHERE id = ?1;",
                params![chapter_id],
                |row| row.get(0),
            )
            .unwrap_or_default();

        if !project_id.is_empty() {
            tx.execute(
                "UPDATE projects SET
                    total_sentences = (SELECT COUNT(*) FROM sentences JOIN chapters ON sentences.chapter_id = chapters.id WHERE chapters.project_id = ?1),
                    completed_sentences = (SELECT COUNT(*) FROM sentences JOIN chapters ON sentences.chapter_id = chapters.id WHERE chapters.project_id = ?1 AND sentences.status = 'ready'),
                    total_duration = (SELECT COALESCE(SUM(duration), 0.0) FROM sentences JOIN chapters ON sentences.chapter_id = chapters.id WHERE chapters.project_id = ?1)
                 WHERE id = ?1;",
                params![project_id],
            )
            .map_err(|e| e.to_string())?;
        }

        let new_sentence = Sentence {
            id: new_id,
            chapter_id: chapter_id.to_string(),
            index: new_idx as usize,
            raw_text: display_text.clone(),
            clean_text: display_text,
            is_dialogue: false,
            speaker: None,
            audio_path: Some(audio_file_path.to_string()),
            duration: Some(duration_secs),
            status: "ready".to_string(),
            voice: None,
            temperature: None,
            speed: None,
            error_message: None,
        };

        tx.commit().map_err(|e| e.to_string())?;
        Ok(new_sentence)
    }

    pub fn insert_blank_sentences(
        &self,
        chapter_id: &str,
        target_sentence_id: Option<&str>,
        target_index: Option<usize>,
        position: &str,
        count: usize,
    ) -> Result<Vec<Sentence>, String> {
        if count == 0 {
            return Ok(Vec::new());
        }

        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        // 1. Xác định target_idx
        let target_idx: i64 = if let Some(sid) = target_sentence_id {
            if !sid.trim().is_empty() {
                tx.query_row(
                    "SELECT idx FROM sentences WHERE id = ?1 AND chapter_id = ?2;",
                    params![sid, chapter_id],
                    |row| row.get(0),
                )
                .unwrap_or(target_index.unwrap_or(1) as i64)
            } else {
                target_index.unwrap_or(1) as i64
            }
        } else {
            target_index.unwrap_or(1) as i64
        };

        // 2. Vị trí bắt đầu chèn (1-based)
        let start_idx = if position == "above" || position == "before" {
            target_idx.max(1)
        } else {
            target_idx + 1
        };

        // 3. Dời các câu từ start_idx trở đi thêm `count` đơn vị
        tx.execute(
            "UPDATE sentences SET idx = idx + ?1 WHERE chapter_id = ?2 AND idx >= ?3;",
            params![count as i64, chapter_id, start_idx],
        )
        .map_err(|e| format!("Lỗi cập nhật chỉ mục câu: {}", e))?;

        // 4. Chèn `count` câu mới
        let mut created_sentences = Vec::with_capacity(count);
        {
            let mut stmt = tx
                .prepare(
                    "INSERT INTO sentences (
                        id, chapter_id, idx, raw_text, clean_text, is_dialogue, speaker,
                        audio_path, duration, status, voice, temperature, speed, error_message
                    ) VALUES (?1, ?2, ?3, '', '', 0, NULL, NULL, 0, 'pending', NULL, NULL, NULL, NULL);",
                )
                .map_err(|e| e.to_string())?;

            for i in 0..count {
                let new_id = uuid::Uuid::new_v4().to_string();
                let current_idx = start_idx + (i as i64);

                stmt.execute(params![new_id, chapter_id, current_idx])
                    .map_err(|e| format!("Lỗi chèn câu trống: {}", e))?;

                created_sentences.push(Sentence {
                    id: new_id,
                    chapter_id: chapter_id.to_string(),
                    index: current_idx as usize,
                    raw_text: String::new(),
                    clean_text: String::new(),
                    is_dialogue: false,
                    speaker: None,
                    audio_path: None,
                    duration: Some(0.0),
                    status: "pending".to_string(),
                    voice: None,
                    temperature: None,
                    speed: None,
                    error_message: None,
                });
            }
        }

        // 5. Cập nhật thống kê chapter
        tx.execute(
            "UPDATE chapters SET
                sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1)
             WHERE id = ?1;",
            params![chapter_id],
        )
        .map_err(|e| e.to_string())?;

        // 6. Cập nhật thống kê project
        let project_id: String = tx
            .query_row(
                "SELECT project_id FROM chapters WHERE id = ?1;",
                params![chapter_id],
                |row| row.get(0),
            )
            .unwrap_or_default();

        if !project_id.is_empty() {
            tx.execute(
                "UPDATE projects SET
                    total_sentences = (SELECT COUNT(*) FROM sentences JOIN chapters ON sentences.chapter_id = chapters.id WHERE chapters.project_id = ?1)
                 WHERE id = ?1;",
                params![project_id],
            )
            .map_err(|e| e.to_string())?;
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(created_sentences)
    }

    pub fn update_silence_duration(
        &self,
        sentence_id: &str,
        duration_secs: f64,
    ) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let chapter_id: String = tx
            .query_row(
                "SELECT chapter_id FROM sentences WHERE id = ?1;",
                params![sentence_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Không tìm thấy câu: {}", e))?;

        let display_text = format!("[Khoảng lặng {:.1}s]", duration_secs);

        tx.execute(
            "UPDATE sentences SET duration = ?1, raw_text = ?2, clean_text = ?2, status = 'ready' WHERE id = ?3;",
            params![duration_secs, display_text, sentence_id],
        )
        .map_err(|e| format!("Lỗi cập nhật khoảng lặng: {}", e))?;

        // Cập nhật chapter total_duration
        tx.execute(
            "UPDATE chapters SET
                total_duration = (SELECT COALESCE(SUM(duration), 0.0) FROM sentences WHERE chapter_id = ?1)
             WHERE id = ?1;",
            params![chapter_id],
        )
        .map_err(|e| e.to_string())?;

        // Cập nhật project total_duration
        let project_id: String = tx
            .query_row(
                "SELECT project_id FROM chapters WHERE id = ?1;",
                params![chapter_id],
                |row| row.get(0),
            )
            .unwrap_or_default();

        if !project_id.is_empty() {
            tx.execute(
                "UPDATE projects SET
                    total_duration = (SELECT COALESCE(SUM(duration), 0.0) FROM sentences JOIN chapters ON sentences.chapter_id = chapters.id WHERE chapters.project_id = ?1)
                 WHERE id = ?1;",
                params![project_id],
            )
            .map_err(|e| e.to_string())?;
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_sentence(&self, sentence_id: &str) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let chapter_id: String = tx
            .query_row(
                "SELECT chapter_id FROM sentences WHERE id = ?1;",
                params![sentence_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Không tìm thấy câu: {}", e))?;

        tx.execute("DELETE FROM sentences WHERE id = ?1;", params![sentence_id])
            .map_err(|e| format!("Lỗi xóa câu: {}", e))?;

        // Đánh số lại idx (1..N) cho chapter
        let ids: Vec<String> = {
            let mut stmt = tx
                .prepare("SELECT id FROM sentences WHERE chapter_id = ?1 ORDER BY idx ASC")
                .map_err(|e| e.to_string())?;
            stmt.query_map(params![chapter_id], |row| row.get(0))
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect()
        };

        for (i, id) in ids.iter().enumerate() {
            tx.execute(
                "UPDATE sentences SET idx = ?1 WHERE id = ?2;",
                params![(i + 1) as i64, id],
            )
            .map_err(|e| e.to_string())?;
        }

        // Cập nhật chapter
        tx.execute(
            "UPDATE chapters SET
                sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1),
                ready_sentence_count = (SELECT COUNT(*) FROM sentences WHERE chapter_id = ?1 AND status = 'ready'),
                total_duration = (SELECT COALESCE(SUM(duration), 0.0) FROM sentences WHERE chapter_id = ?1)
             WHERE id = ?1;",
            params![chapter_id],
        )
        .map_err(|e| e.to_string())?;

        // Cập nhật project
        let project_id: String = tx
            .query_row(
                "SELECT project_id FROM chapters WHERE id = ?1;",
                params![chapter_id],
                |row| row.get(0),
            )
            .unwrap_or_default();

        if !project_id.is_empty() {
            tx.execute(
                "UPDATE projects SET
                    total_sentences = (SELECT COUNT(*) FROM sentences JOIN chapters ON sentences.chapter_id = chapters.id WHERE chapters.project_id = ?1),
                    completed_sentences = (SELECT COUNT(*) FROM sentences JOIN chapters ON sentences.chapter_id = chapters.id WHERE chapters.project_id = ?1 AND sentences.status = 'ready'),
                    total_duration = (SELECT COALESCE(SUM(duration), 0.0) FROM sentences JOIN chapters ON sentences.chapter_id = chapters.id WHERE chapters.project_id = ?1)
                 WHERE id = ?1;",
                params![project_id],
            )
            .map_err(|e| e.to_string())?;
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_chapter_bgm(
        &self,
        chapter_id: &str,
        bgm_path: Option<String>,
        bgm_volume: Option<f64>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE chapters SET bgm_path = ?1, bgm_volume = ?2 WHERE id = ?3;",
            params![bgm_path, bgm_volume.unwrap_or(0.2), chapter_id],
        )
        .map_err(|e| format!("Lỗi cập nhật BGM chương: {}", e))?;
        Ok(())
    }

    pub fn get_chapter_by_id(&self, chapter_id: &str) -> Result<Option<Chapter>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, project_id, idx, title, raw_content, sentence_count, ready_sentence_count, total_duration, bgm_path, bgm_volume FROM chapters WHERE id = ?1;")
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query_map(params![chapter_id], |row| {
                Ok(Chapter {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    index: row.get::<_, i64>(2)? as usize,
                    title: row.get(3)?,
                    raw_content: row.get(4)?,
                    sentence_count: row.get::<_, i64>(5)? as usize,
                    ready_sentence_count: row.get::<_, i64>(6)? as usize,
                    total_duration: row.get(7)?,
                    bgm_path: row.get(8).unwrap_or(None),
                    bgm_volume: row.get(9).unwrap_or(Some(0.2)),
                })
            })
            .map_err(|e| e.to_string())?;

        if let Some(res) = rows.next() {
            res.map(Some).map_err(|e| e.to_string())
        } else {
            Ok(None)
        }
    }

    pub fn update_project_cover(&self, project_id: &str, cover_base64: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE projects SET cover_base64 = ?1, updated_at = datetime('now') WHERE id = ?2;",
            params![cover_base64, project_id],
        )
        .map_err(|e| format!("Lỗi cập nhật ảnh bìa project: {}", e))?;
        Ok(())
    }

    pub fn delete_project(&self, project_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM projects WHERE id = ?1;", params![project_id])
            .map_err(|e| format!("Lỗi xóa project: {}", e))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_real_db_projects() {
        let appdata = std::env::var("APPDATA").unwrap();
        let db_path = std::path::PathBuf::from(appdata)
            .join("com.bookstudio.app")
            .join("bookstudio.db");
        if db_path.exists() {
            let db = Database::new(&db_path).unwrap();
            let projs = db.get_all_projects().unwrap();
            println!("TOTAL REAL PROJECTS LOADED: {}", projs.len());
            for p in &projs {
                println!("Project: id={}, title={}, sentences={}, status={}", p.id, p.title, p.total_sentences, p.status);
            }
            assert!(!projs.is_empty(), "Should load projects from real db");
        }
    }
}


