import { invoke } from "@tauri-apps/api/core";
import type {
  ChapterItem,
  EbookParsedData,
  ProjectMetadata,
  SentenceItem,
  TtsSentenceResult,
} from "@/types";

export const isTauriEnvironment = (): boolean => {
  return typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
};

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
  if (!isTauriEnvironment()) {
    return [];
  }
  return await invoke<ProjectMetadata[]>("get_projects");
}

export async function tauriGetChapters(projectId: string): Promise<ChapterItem[]> {
  if (!isTauriEnvironment()) {
    return [];
  }
  return await invoke<ChapterItem[]>("get_chapters", { projectId });
}

export async function tauriGetSentences(chapterId: string): Promise<SentenceItem[]> {
  if (!isTauriEnvironment()) {
    return [];
  }
  return await invoke<SentenceItem[]>("get_sentences", { chapterId });
}

export async function tauriUpdateSentenceText(
  sentenceId: string,
  text: string
): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("update_sentence_text", { sentenceId, text });
}

export async function tauriCheckTtsConnection(serverUrl: string): Promise<boolean> {
  if (!isTauriEnvironment()) {
    try {
      const res = await fetch(`${serverUrl.replace(/\/$/, "")}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(1500),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  return await invoke<boolean>("check_tts_connection", { serverUrl });
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
}): Promise<number> {
  if (!isTauriEnvironment()) {
    throw new Error("Xuất audio cần backend Tauri");
  }
  return await invoke<number>("export_chapter_audio", params);
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

