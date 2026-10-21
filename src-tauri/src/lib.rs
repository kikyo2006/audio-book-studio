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
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // Remember window size, position and maximized state between launches
        .plugin(tauri_plugin_window_state::Builder::default().build())
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

            // Dọn file BGM / chỉnh sửa audio không còn được tham chiếu
            commands::audio::cleanup_orphan_audio(&app_data_dir, &database);

            app.manage(Arc::new(database));

            // Set dynamic title bar window icon
            if let Some(icon) = app.default_window_icon() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(icon.clone());
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ebook::parse_ebook,
            commands::ebook::import_ebook_to_project,
            commands::project::get_projects,
            commands::project::get_chapters,
            commands::project::get_sentences,
            commands::project::get_all_project_sentences,
            commands::project::update_sentence_text,
            commands::tts::check_tts_connection,
            commands::tts::synthesize_sentence,
            commands::tts::regenerate_sentence,
            commands::audio::export_chapter_audio,
            commands::audio::export_book_audio,
            commands::audio::export_batch_chapters,
            commands::audio::read_audio_base64,
            commands::audio::cut_audio_region,
            commands::audio::import_bgm_file,
            commands::audio::shift_bgm_audio,
            commands::project::save_character,
            commands::project::get_project_characters,
            commands::project::delete_project_character,
            commands::project::assign_sentence_speaker,
            commands::project::batch_assign_dialogues,
            commands::project::batch_assign_narration,
            commands::project::batch_assign_dialogues_extended,
            commands::project::batch_assign_speaker_range,
            commands::project::split_sentences_to_chapter,
            commands::project::rename_chapter,
            commands::project::delete_chapter,
            commands::project::reorder_chapter,
            commands::project::toggle_chapter_enabled,
            commands::project::insert_empty_chapter,
            commands::project::merge_chapters,
            commands::project::add_silence_sentence,
            commands::project::insert_sfx_sentence,
            commands::project::insert_bgm_sentence,
            commands::project::update_silence_duration,
            commands::project::delete_sentence,
            commands::project::paste_sentence,
            commands::project::move_sentence,
            commands::project::batch_update_sentences_text,
            commands::project::insert_blank_sentences,
            commands::project::update_chapter_bgm,
            commands::project::update_project_cover,
            commands::project::reset_project_cover,
            commands::project::delete_project,
            commands::project::update_project_status,
            commands::project::get_casting_presets,
            commands::project::save_casting_preset,
            commands::project::delete_casting_preset,
            commands::project::get_project_role_settings,
            commands::project::save_project_role_settings
        ])
        .run(tauri::generate_context!())
        .expect("Lỗi khởi động ứng dụng Tauri");
}
