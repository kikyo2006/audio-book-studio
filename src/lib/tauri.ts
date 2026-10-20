import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  CastingPreset,
  ChapterItem,
  EbookParsedData,
  ProjectMetadata,
  SentenceItem,
  TtsSentenceResult,
} from "@/types";

export const isTauriEnvironment = (): boolean => {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI__?: unknown }).__TAURI__
  );
};

export async function tauriSelectBookFile(): Promise<string | null> {
  if (!isTauriEnvironment()) {
    return null;
  }
  try {
    const selected = await open({
      multiple: false,
      directory: false,
      title: "Chọn tệp sách (EPUB, TXT, Markdown)",
      filters: [
        {
          name: "Tệp Sách Hỗ Trợ (*.epub, *.txt, *.md, *.markdown)",
          extensions: ["epub", "txt", "md", "markdown"],
        },
        {
          name: "Sách EPUB (*.epub)",
          extensions: ["epub"],
        },
        {
          name: "Văn bản thuần (*.txt)",
          extensions: ["txt"],
        },
        {
          name: "Tài liệu Markdown (*.md, *.markdown)",
          extensions: ["md", "markdown"],
        },
        {
          name: "Tất cả các tệp (*.*)",
          extensions: ["*"],
        },
      ],
    });

    if (typeof selected === "string") {
      return selected;
    }
    return null;
  } catch (err) {
    console.error("Lỗi khi mở hộp thoại chọn tệp:", err);
    return null;
  }
}

export async function tauriParseEbook(filePath: string): Promise<EbookParsedData> {
  if (!isTauriEnvironment()) {
    throw new Error("Tauri IPC chỉ khả dụng trong môi trường desktop app.");
  }
  return await invoke<EbookParsedData>("parse_ebook", { filePath });
}

export async function tauriImportProject(
  filePath: string,
  data: EbookParsedData
): Promise<ProjectMetadata> {
  if (!isTauriEnvironment()) {
    throw new Error("Tauri IPC chỉ khả dụng trong môi trường desktop app.");
  }
  return await invoke<ProjectMetadata>("import_ebook_to_project", {
    filePath,
    data,
  });
}

export async function tauriGetProjects(): Promise<ProjectMetadata[]> {
  try {
    return await invoke<ProjectMetadata[]>("get_projects");
  } catch (err) {
    console.error("Lỗi tauriGetProjects:", err);
    return [];
  }
}

export async function tauriGetChapters(projectId: string): Promise<ChapterItem[]> {
  try {
    return await invoke<ChapterItem[]>("get_chapters", { projectId });
  } catch (err) {
    console.warn("Lỗi tauriGetChapters:", err);
    return [];
  }
}

export async function tauriGetSentences(chapterId: string): Promise<SentenceItem[]> {
  try {
    return await invoke<SentenceItem[]>("get_sentences", { chapterId });
  } catch (err) {
    console.warn("Lỗi tauriGetSentences:", err);
    return [];
  }
}

export async function tauriUpdateSentenceText(
  sentenceId: string,
  text: string
): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("update_sentence_text", { sentenceId, text });
}

export async function tauriBatchUpdateSentencesText(
  updates: Array<{ sentenceId: string; text: string }>
): Promise<void> {
  if (!isTauriEnvironment() || updates.length === 0) return;
  await invoke("batch_update_sentences_text", {
    updates: updates.map((u) => ({
      sentence_id: u.sentenceId,
      text: u.text,
    })),
  });
}

export async function tauriCheckTtsConnection(serverUrl: string): Promise<boolean> {
  const normalizedUrl = serverUrl.replace("localhost", "127.0.0.1").replace(/\/$/, "");
  if (!isTauriEnvironment()) {
    try {
      const res = await fetch(`${normalizedUrl}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  return await invoke<boolean>("check_tts_connection", { serverUrl: normalizedUrl });
}

export async function tauriSynthesizeSentence(params: {
  sentenceId: string;
  projectId: string;
  text: string;
  voice: string;
  speed: number;
  temperature?: number;
  serverUrl: string;
}): Promise<TtsSentenceResult> {
  if (!isTauriEnvironment()) {
    throw new Error("TTS chỉ có thể chạy thông qua backend Tauri");
  }
  return await invoke<TtsSentenceResult>("synthesize_sentence", params);
}

export async function tauriRegenerateSentence(params: {
  sentenceId: string;
  projectId: string;
  text: string;
  voice: string;
  speed: number;
  temperature?: number;
  serverUrl: string;
}): Promise<TtsSentenceResult> {
  if (!isTauriEnvironment()) {
    throw new Error("Tái tạo âm thanh chỉ có thể chạy qua backend Tauri");
  }
  return await invoke<TtsSentenceResult>("regenerate_sentence", params);
}

export async function tauriExportChapterAudio(params: {
  projectId: string;
  chapterId: string;
  outputPath: string;
  sentencePauseMs: number;
  paragraphPauseMs: number;
  mixBgm?: boolean;
  bgmVolume?: number;
}): Promise<number> {
  if (!isTauriEnvironment()) {
    throw new Error("Xuất audio cần backend Tauri");
  }
  return await invoke<number>("export_chapter_audio", {
    projectId: params.projectId,
    chapterId: params.chapterId,
    outputPath: params.outputPath,
    sentencePauseMs: params.sentencePauseMs,
    paragraphPauseMs: params.paragraphPauseMs,
    mixBgm: params.mixBgm ?? false,
    bgmVolume: params.bgmVolume ?? null,
  });
}

export async function tauriReadAudioBase64(filePath: string): Promise<string> {
  if (!isTauriEnvironment()) {
    throw new Error("Đọc audio base64 cần backend Tauri");
  }
  return await invoke<string>("read_audio_base64", { filePath });
}

export async function tauriSaveCharacter(
  character: import("@/types").CharacterProfile
): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("save_character", { character });
}

export async function tauriGetProjectCharacters(
  projectId: string
): Promise<import("@/types").CharacterProfile[]> {
  if (!isTauriEnvironment()) return [];
  return await invoke<import("@/types").CharacterProfile[]>("get_project_characters", {
    projectId,
  });
}

export async function tauriDeleteCharacter(characterId: string): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("delete_project_character", { characterId });
}

export async function tauriAssignSentenceSpeaker(params: {
  sentenceId: string;
  speaker: string;
  voice: string;
  speed: number;
  temperature: number;
}): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("assign_sentence_speaker", params);
}

export async function tauriBatchAssignDialogues(params: {
  chapterId: string;
  speaker: string;
  voice: string;
  speed: number;
  temperature: number;
}): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("batch_assign_dialogues", params);
}

export async function tauriBatchAssignNarration(params: {
  chapterId: string;
  voice: string;
  speed: number;
  temperature: number;
  applyAllChapters?: boolean;
  projectId?: string;
}): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("batch_assign_narration", {
    chapterId: params.chapterId,
    voice: params.voice,
    speed: params.speed,
    temperature: params.temperature,
    applyAllChapters: params.applyAllChapters ?? false,
    projectId: params.projectId,
  });
}

export async function tauriBatchAssignDialoguesExtended(params: {
  chapterId: string;
  speaker: string;
  voice: string;
  speed: number;
  temperature: number;
  onlyUnassigned?: boolean;
}): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("batch_assign_dialogues_extended", {
    chapterId: params.chapterId,
    speaker: params.speaker,
    voice: params.voice,
    speed: params.speed,
    temperature: params.temperature,
    onlyUnassigned: params.onlyUnassigned ?? false,
  });
}

export async function tauriBatchAssignSpeakerRange(params: {
  chapterId: string;
  fromIndex: number;
  toIndex: number;
  targetMode: "dialogue_only" | "narration_only" | "all";
  speaker: string;
  voice: string;
  speed: number;
  temperature: number;
}): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("batch_assign_speaker_range", params);
}

export async function tauriSplitSentencesToChapter(params: {
  projectId: string;
  sourceChapterId: string;
  newTitle: string;
  fromIndex: number;
  toIndex: number;
  placeBefore?: boolean;
}): Promise<ChapterItem> {
  if (!isTauriEnvironment()) {
    throw new Error("Tách chương chỉ khả dụng trên desktop app.");
  }
  return await invoke<ChapterItem>("split_sentences_to_chapter", {
    projectId: params.projectId,
    sourceChapterId: params.sourceChapterId,
    newTitle: params.newTitle,
    fromIdx: params.fromIndex,
    toIdx: params.toIndex,
    placeBefore: params.placeBefore ?? true,
  });
}

export async function tauriRenameChapter(
  chapterId: string,
  newTitle: string
): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("rename_chapter", { chapterId, newTitle });
}

export async function tauriDeleteChapter(
  chapterId: string,
  returnSentencesToChapterId?: string
): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("delete_chapter", {
    chapterId,
    returnSentencesToChapterId: returnSentencesToChapterId || null,
  });
}

export async function tauriReorderChapter(
  chapterId: string,
  direction: "up" | "down" | "bottom"
): Promise<ChapterItem[]> {
  if (!isTauriEnvironment()) return [];
  return await invoke<ChapterItem[]>("reorder_chapter", {
    chapterId,
    direction,
  });
}

export async function tauriAddSilenceSentence(params: {
  projectId: string;
  chapterId: string;
  targetSentenceId: string;
  position: "above" | "below";
  durationSecs: number;
}): Promise<SentenceItem> {
  if (!isTauriEnvironment()) {
    throw new Error("Thêm khoảng lặng chỉ khả dụng trên desktop app.");
  }
  return await invoke<SentenceItem>("add_silence_sentence", {
    projectId: params.projectId,
    chapterId: params.chapterId,
    targetSentenceId: params.targetSentenceId,
    position: params.position,
    durationSecs: params.durationSecs,
  });
}

export async function tauriUpdateSilenceDuration(params: {
  projectId: string;
  sentenceId: string;
  durationSecs: number;
}): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("update_silence_duration", {
    projectId: params.projectId,
    sentenceId: params.sentenceId,
    durationSecs: params.durationSecs,
  });
}

export async function tauriDeleteSentence(sentenceId: string): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("delete_sentence", { sentenceId });
}

export async function tauriInsertBlankSentences(params: {
  chapterId: string;
  targetSentenceId?: string;
  targetIndex?: number;
  position: "above" | "below" | "before" | "after";
  count: number;
}): Promise<SentenceItem[]> {
  if (!isTauriEnvironment()) return [];
  return await invoke<SentenceItem[]>("insert_blank_sentences", {
    chapterId: params.chapterId,
    targetSentenceId: params.targetSentenceId || null,
    targetIndex: params.targetIndex || null,
    position: params.position,
    count: params.count,
  });
}

export async function tauriSelectBgmFile(): Promise<string | null> {
  if (!isTauriEnvironment()) {
    return null;
  }
  try {
    const selected = await open({
      multiple: false,
      directory: false,
      title: "Chọn tệp nhạc nền BGM (MP3, WAV, FLAC, OGG, M4A, AAC)",
      filters: [
        {
          name: "Tệp Nhạc Nền (*.mp3, *.wav, *.flac, *.ogg, *.m4a, *.aac)",
          extensions: ["mp3", "wav", "flac", "ogg", "m4a", "aac"],
        },
        {
          name: "MP3 Audio (*.mp3)",
          extensions: ["mp3"],
        },
        {
          name: "WAV Audio (*.wav)",
          extensions: ["wav"],
        },
        {
          name: "FLAC Audio (*.flac)",
          extensions: ["flac"],
        },
        {
          name: "Tất cả các tệp (*.*)",
          extensions: ["*"],
        },
      ],
    });

    if (typeof selected === "string") {
      return selected;
    }
    return null;
  } catch (err) {
    console.error("Lỗi khi mở hộp thoại chọn tệp BGM:", err);
    return null;
  }
}

export async function tauriUpdateChapterBgm(params: {
  chapterId: string;
  bgmPath: string | null;
  bgmVolume?: number | null;
}): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("update_chapter_bgm", {
    chapterId: params.chapterId,
    bgmPath: params.bgmPath,
    bgmVolume: params.bgmVolume ?? 0.2,
  });
}

export async function tauriDeleteProject(projectId: string): Promise<void> {
  await invoke("delete_project", { projectId });
}

export async function tauriUpdateProjectCover(
  projectId: string,
  coverBase64: string
): Promise<void> {
  await invoke("update_project_cover", { projectId, coverBase64 });
}

export async function tauriResetProjectCover(
  projectId: string
): Promise<string | null> {
  if (!isTauriEnvironment()) return null;
  return await invoke<string | null>("reset_project_cover", { projectId });
}

export async function tauriUpdateProjectStatus(
  projectId: string,
  status: "active" | "completed" | "dropped"
): Promise<void> {
  await invoke("update_project_status", { projectId, status });
}

export async function tauriGetCastingPresets(): Promise<CastingPreset[]> {
  if (!isTauriEnvironment()) {
    try {
      const stored = localStorage.getItem("bookstudio_casting_presets");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  return await invoke<CastingPreset[]>("get_casting_presets");
}

export async function tauriSaveCastingPreset(preset: CastingPreset): Promise<void> {
  if (!isTauriEnvironment()) {
    try {
      const stored = localStorage.getItem("bookstudio_casting_presets");
      const list: CastingPreset[] = stored ? JSON.parse(stored) : [];
      const updated = [...list.filter((p) => p.id !== preset.id), preset];
      localStorage.setItem("bookstudio_casting_presets", JSON.stringify(updated));
    } catch (err) {
      console.warn("Lưu preset vào localStorage lỗi:", err);
    }
    return;
  }
  await invoke("save_casting_preset", { preset });
}

export async function tauriDeleteCastingPreset(presetId: string): Promise<void> {
  if (!isTauriEnvironment()) {
    try {
      const stored = localStorage.getItem("bookstudio_casting_presets");
      if (stored) {
        const list: CastingPreset[] = JSON.parse(stored);
        const filtered = list.filter((p) => p.id !== presetId);
        localStorage.setItem("bookstudio_casting_presets", JSON.stringify(filtered));
      }
    } catch (err) {
      console.warn("Xóa preset từ localStorage lỗi:", err);
    }
    return;
  }
  await invoke("delete_casting_preset", { presetId });
}






