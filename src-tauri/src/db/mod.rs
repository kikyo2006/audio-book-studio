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
        let mut stmt = conn
            .prepare("SELECT id, title, author, description, source_file_path, source_format, cover_path, cover_base64, chapter_count, total_sentences, completed_sentences, total_duration, created_at, updated_at FROM projects ORDER BY updated_at DESC")
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
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            if let Ok(p) = r {
                list.push(p);
            }
        }
        Ok(list)
    }

    pub fn insert_chapters(&self, chapters: &[Chapter]) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for c in chapters {
            tx.execute(
                "INSERT OR REPLACE INTO chapters (
                    id, project_id, idx, title, raw_content, sentence_count, ready_sentence_count, total_duration
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8);",
                params![
                    c.id,
                    c.project_id,
                    c.index as i64,
                    c.title,
                    c.raw_content,
                    c.sentence_count as i64,
                    c.ready_sentence_count as i64,
                    c.total_duration
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
            .prepare("SELECT id, project_id, idx, title, raw_content, sentence_count, ready_sentence_count, total_duration FROM chapters WHERE project_id = ?1 ORDER BY idx ASC")
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
}

