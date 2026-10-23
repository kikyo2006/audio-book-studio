export type SentenceStatus = 'pending' | 'generating' | 'ready' | 'error';

export interface SentenceItem {
  id: string;
  chapter_id: string;
  index: number;
  raw_text: string;
  clean_text: string;
  is_dialogue: boolean;
  speaker?: string;
  audio_path?: string;
  duration?: number;
  status: SentenceStatus;
  voice?: string;
  temperature?: number;
  speed?: number;
  error_message?: string;
}

export interface ParsedChapter {
  index: number;
  title: string;
  content: string;
}

export interface EbookParsedData {
  title: string;
  author: string;
  description?: string;
  cover_base64?: string;
  chapters: ParsedChapter[];
}

export interface TtsSentenceResult {
  sentence_id: string;
  audio_path: string;
  duration: number;
}

export interface TtsSentenceProgress {
  sentenceId: string;
  current: number;
  total: number;
}

export interface ChapterItem {
  id: string;
  project_id: string;
  index: number;
  title: string;
  raw_content: string;
  sentence_count: number;
  ready_sentence_count: number;
  total_duration: number;
  sentences?: SentenceItem[];
  bgm_path?: string | null;
  bgm_volume?: number | null;
  is_enabled?: boolean;
}

export interface ProjectMetadata {
  id: string;
  title: string;
  author: string;
  description?: string;
  source_file_path?: string;
  source_format?: 'epub' | 'pdf' | 'mobi' | 'txt';
  cover_path?: string;
  cover_base64?: string;
  chapter_count: number;
  total_sentences: number;
  completed_sentences: number;
  total_duration: number;
  created_at: string;
  updated_at: string;
  /** 'active' | 'completed' | 'dropped' */
  status: string;
}

export interface VoicePreset {
  id: string;
  name: string;
  gender: 'female' | 'male';
  locale: string;
  description: string;
  recommended_speed: number;
  recommended_temp: number;
}

export interface TtsConfig {
  server_url: string;
  model: string;
  voice: string;
  speed: number;
  temperature: number;
  response_format: 'wav' | 'mp3';
}

export interface TtsProgressPayload {
  sentence_id: string;
  chapter_id: string;
  current_index: number;
  total_count: number;
  status: SentenceStatus;
  audio_path?: string;
  duration?: number;
  error?: string;
}

export type ExportScope = 'chapter' | 'all_merged' | 'all_batch';

export interface BatchExportResult {
  exported_count: number;
  total_chapters: number;
  output_dir: string;
}

export interface AudioExportConfig {
  project_id: string;
  chapter_id?: string; // If undefined, export entire book
  format: 'wav' | 'mp3' | 'm4b';
  sentence_pause_ms: number;
  paragraph_pause_ms: number;
  chapter_pause_ms?: number;
  output_path: string;
  bitrate?: number; // e.g. 320 for MP3
  include_metadata: boolean;
  title?: string;
  author?: string;
  narrator?: string;
  cover_path?: string;
}

export interface ExportProgressPayload {
  percentage: number;
  status: 'assembling' | 'converting' | 'tagging' | 'completed' | 'error';
  message: string;
  output_path?: string;
}

export interface CharacterProfile {
  id: string;
  project_id: string;
  name: string;
  voice: string;
  speed: number;
  temperature: number;
  color: string;
  is_narrator?: boolean;
}

export interface RoleVoiceSetting {
  voice: string;
  speed: number;
  temperature: number;
}

// Thiết lập vai hệ thống của dự án (lưu trong DB)
export interface ProjectRoleSettings {
  narrator: RoleVoiceSetting;
  dialogue: RoleVoiceSetting;
  preset_id?: string | null;
}

export interface PresetCharacter {
  id: string;
  name: string;
  voice: string;
  speed: number;
  temperature: number;
  color: string;
}

export interface CastingPreset {
  id: string;
  name: string;
  description?: string | null;
  narrator: RoleVoiceSetting;
  dialogue: RoleVoiceSetting;
  characters: PresetCharacter[];
  created_at: string;
  updated_at: string;
}

export interface MergeChaptersResult {
  chapters: ChapterItem[];
  merged_chapter_id: string;
}


