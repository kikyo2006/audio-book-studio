pub mod commands;
pub mod db;
pub mod models;
pub mod services;

use std::fs;
use std::sync::Arc;
use tauri::Manager;

use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("./data"));

            if !app_data_dir.exists() {
                let _ = fs::create_dir_all(&app_data_dir);
            }

            let db_path = app_data_dir.join("bookstudio.db");
            let database = Database::new(db_path)
                .map_err(|e| Box::<dyn std::error::Error>::from(e))?;

            app.manage(Arc::new(database));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ebook::parse_ebook,
            commands::ebook::import_ebook_to_project,
            commands::project::get_projects,
            commands::project::get_chapters,
            commands::project::get_sentences,
            commands::project::update_sentence_text,
            commands::tts::check_tts_connection,
            commands::tts::synthesize_sentence,
            commands::tts::regenerate_sentence,
            commands::audio::export_chapter_audio,
            commands::audio::read_audio_base64,
            commands::project::save_character,
            commands::project::get_project_characters,
            commands::project::delete_project_character,
            commands::project::assign_sentence_speaker,
            commands::project::batch_assign_dialogues
        ])
        .run(tauri::generate_context!())
        .expect("Lỗi khởi động ứng dụng Tauri");
}
