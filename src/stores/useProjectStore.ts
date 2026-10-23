import { create } from "zustand";
import type {
  ChapterItem,
  CharacterProfile,
  ProjectMetadata,
  SentenceItem,
  SentenceStatus,
} from "@/types";

interface ProjectState {
  projects: ProjectMetadata[];
  activeProject: ProjectMetadata | null;
  chapters: ChapterItem[];
  activeChapter: ChapterItem | null;
  sentences: SentenceItem[];
  characters: CharacterProfile[];
  selectedSentenceId: string | null;
  playingSentenceId: string | null;
  isPlaying: boolean;
  isBatchGenerating: boolean;
  batchProgress: { current: number; total: number };
  sentenceProgress: Record<string, { current: number; total: number }>;

  setProjects: (projects: ProjectMetadata[]) => void;
  setActiveProject: (project: ProjectMetadata | null) => void;
  setChapters: (chapters: ChapterItem[]) => void;
  setActiveChapter: (chapter: ChapterItem | null) => void;
  setSentences: (sentences: SentenceItem[]) => void;
  setCharacters: (characters: CharacterProfile[]) => void;
  addCharacter: (character: CharacterProfile) => void;
  removeCharacter: (characterId: string) => void;
  setSelectedSentenceId: (id: string | null) => void;
  setPlayingSentenceId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsBatchGenerating: (generating: boolean) => void;
  setBatchProgress: (progress: { current: number; total: number }) => void;
  setSentenceProgress: (sentenceId: string, progress: { current: number; total: number } | null) => void;

  updateSentenceStatus: (id: string, status: SentenceStatus, error?: string) => void;
  updateSentenceAudio: (id: string, audioPath: string, duration: number, voice?: string) => void;
  clearSentenceAudio: (id: string) => void;
  updateSentenceText: (id: string, text: string) => void;
  batchUpdateSentencesText: (updates: Array<{ id: string; text: string }>) => void;
  assignSpeakerToSentence: (sentenceId: string, char: CharacterProfile) => void;
  batchAssignDialoguesToSpeaker: (char: CharacterProfile) => void;
  updateChapterBgm: (chapterId: string, bgmPath: string | null, bgmVolume?: number) => void;
  toggleChapterEnabled: (chapterId: string, isEnabled: boolean) => void;
  removeProject: (projectId: string) => void;
  updateProjectCover: (projectId: string, coverBase64: string) => void;
  updateProjectStatus: (projectId: string, status: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProject: null,
  chapters: [],
  activeChapter: null,
  sentences: [],
  characters: [],
  selectedSentenceId: null,
  playingSentenceId: null,
  isPlaying: false,
  isBatchGenerating: false,
  batchProgress: { current: 0, total: 0 },
  sentenceProgress: {},

  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setSentenceProgress: (sentenceId, progress) =>
    set((state) => {
      if (!progress) {
        if (!state.sentenceProgress[sentenceId]) return state;
        const next = { ...state.sentenceProgress };
        delete next[sentenceId];
        return { sentenceProgress: next };
      }
      return {
        sentenceProgress: {
          ...state.sentenceProgress,
          [sentenceId]: progress,
        },
      };
    }),
  setChapters: (chapters) =>
    set((state) => {
      const enabledChapters = chapters.filter((c) => c.is_enabled !== false);
      const totalSentences = enabledChapters.reduce(
        (sum, c) => sum + (c.sentence_count || 0),
        0
      );
      const completedSentences = enabledChapters.reduce(
        (sum, c) => sum + (c.ready_sentence_count || 0),
        0
      );
      const totalDuration = enabledChapters.reduce(
        (sum, c) => sum + (c.total_duration || 0),
        0
      );
      const nextActiveProject = state.activeProject
        ? {
            ...state.activeProject,
            chapter_count: chapters.length,
            total_sentences: totalSentences,
            completed_sentences: completedSentences,
            total_duration: totalDuration,
          }
        : null;

      return {
        chapters,
        activeProject: nextActiveProject,
      };
    }),
  setActiveChapter: (activeChapter) => set({ activeChapter }),
  setSentences: (sentences) => set({ sentences }),
  setCharacters: (characters) => set({ characters }),
  addCharacter: (character) =>
    set((state) => ({
      characters: [
        ...state.characters.filter((c) => c.id !== character.id),
        character,
      ],
    })),
  removeCharacter: (characterId) =>
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== characterId),
    })),
  setSelectedSentenceId: (selectedSentenceId) => set({ selectedSentenceId }),
  setPlayingSentenceId: (playingSentenceId) => set({ playingSentenceId }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsBatchGenerating: (isBatchGenerating) => set({ isBatchGenerating }),
  setBatchProgress: (batchProgress) => set({ batchProgress }),

  updateSentenceStatus: (id, status, error) =>
    set((state) => ({
      sentences: state.sentences.map((s) =>
        s.id === id ? { ...s, status, error_message: error } : s
      ),
    })),

  updateSentenceAudio: (id, audioPath, duration, voice) =>
    set((state) => {
      const nextSentences = state.sentences.map((s) =>
        s.id === id
          ? {
              ...s,
              audio_path: audioPath,
              duration,
              voice: voice || s.voice,
              status: "ready" as const,
              error_message: undefined,
              updated_at: new Date().toISOString(),
            }
          : s
      );
      const readySentences = nextSentences.filter((s) => s.status === "ready");
      const readyCount = readySentences.length;
      const chapterDuration = readySentences.reduce((sum, s) => sum + (s.duration || 0), 0);

      const nextChapters = state.chapters.map((c) =>
        c.id === state.activeChapter?.id
          ? { ...c, ready_sentence_count: readyCount, total_duration: chapterDuration }
          : c
      );
      const nextActiveChapter = state.activeChapter
        ? { ...state.activeChapter, ready_sentence_count: readyCount, total_duration: chapterDuration }
        : null;

      const nextActiveProject = state.activeProject
        ? {
            ...state.activeProject,
            total_duration: nextChapters.reduce((sum, c) => sum + (c.total_duration || 0), 0),
          }
        : null;

      return {
        sentences: nextSentences,
        chapters: nextChapters,
        activeChapter: nextActiveChapter,
        activeProject: nextActiveProject,
      };
    }),

  clearSentenceAudio: (id) =>
    set((state) => {
      const nextSentences = state.sentences.map((s) =>
        s.id === id
          ? {
              ...s,
              audio_path: undefined,
              duration: 0,
              status: "generating" as const,
              error_message: undefined,
              updated_at: new Date().toISOString(),
            }
          : s
      );
      const readySentences = nextSentences.filter((s) => s.status === "ready");
      const readyCount = readySentences.length;
      const chapterDuration = readySentences.reduce((sum, s) => sum + (s.duration || 0), 0);

      const nextChapters = state.chapters.map((c) =>
        c.id === state.activeChapter?.id
          ? { ...c, ready_sentence_count: readyCount, total_duration: chapterDuration }
          : c
      );
      const nextActiveChapter = state.activeChapter
        ? { ...state.activeChapter, ready_sentence_count: readyCount, total_duration: chapterDuration }
        : null;

      const nextActiveProject = state.activeProject
        ? {
            ...state.activeProject,
            total_duration: nextChapters.reduce((sum, c) => sum + (c.total_duration || 0), 0),
          }
        : null;

      return {
        sentences: nextSentences,
        chapters: nextChapters,
        activeChapter: nextActiveChapter,
        activeProject: nextActiveProject,
      };
    }),

  updateSentenceText: (id, text) =>
    set((state) => ({
      sentences: state.sentences.map((s) =>
        s.id === id ? { ...s, clean_text: text, status: "pending" } : s
      ),
    })),

  batchUpdateSentencesText: (updates) =>
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.text]));
      return {
        sentences: state.sentences.map((s) => {
          const newText = updateMap.get(s.id);
          if (newText !== undefined) {
            return { ...s, clean_text: newText, status: "pending" as const };
          }
          return s;
        }),
      };
    }),

  assignSpeakerToSentence: (sentenceId, char) =>
    set((state) => ({
      sentences: state.sentences.map((s) =>
        s.id === sentenceId
          ? {
              ...s,
              speaker: char.name,
              voice: char.voice,
              speed: char.speed,
              temperature: char.temperature,
              status: "pending", // mark pending so it will re-synthesize with character's voice
            }
          : s
      ),
    })),

  batchAssignDialoguesToSpeaker: (char) =>
    set((state) => ({
      sentences: state.sentences.map((s) =>
        s.is_dialogue
          ? {
              ...s,
              speaker: char.name,
              voice: char.voice,
              speed: char.speed,
              temperature: char.temperature,
              status: "pending",
            }
          : s
      ),
    })),

  updateChapterBgm: (chapterId, bgmPath, bgmVolume) =>
    set((state) => {
      const updatedChapters = state.chapters.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              bgm_path: bgmPath,
              bgm_volume: bgmVolume !== undefined ? bgmVolume : c.bgm_volume,
            }
          : c
      );
      const updatedActiveChapter =
        state.activeChapter?.id === chapterId
          ? {
              ...state.activeChapter,
              bgm_path: bgmPath,
              bgm_volume:
                bgmVolume !== undefined
                  ? bgmVolume
                  : state.activeChapter.bgm_volume,
            }
          : state.activeChapter;

      return {
        chapters: updatedChapters,
        activeChapter: updatedActiveChapter,
      };
    }),

  toggleChapterEnabled: (chapterId, isEnabled) =>
    set((state) => {
      const nextChapters = state.chapters.map((c) =>
        c.id === chapterId ? { ...c, is_enabled: isEnabled } : c
      );
      const nextActiveChapter =
        state.activeChapter?.id === chapterId
          ? { ...state.activeChapter, is_enabled: isEnabled }
          : state.activeChapter;

      const enabledChapters = nextChapters.filter((c) => c.is_enabled !== false);
      const totalSentences = enabledChapters.reduce(
        (sum, c) => sum + (c.sentence_count || 0),
        0
      );
      const completedSentences = enabledChapters.reduce(
        (sum, c) => sum + (c.ready_sentence_count || 0),
        0
      );
      const totalDuration = enabledChapters.reduce(
        (sum, c) => sum + (c.total_duration || 0),
        0
      );

      const nextActiveProject = state.activeProject
        ? {
            ...state.activeProject,
            total_sentences: totalSentences,
            completed_sentences: completedSentences,
            total_duration: totalDuration,
          }
        : null;

      return {
        chapters: nextChapters,
        activeChapter: nextActiveChapter,
        activeProject: nextActiveProject,
      };
    }),

  updateProjectCover: (projectId, coverBase64) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, cover_base64: coverBase64 } : p
      ),
      activeProject:
        state.activeProject?.id === projectId
          ? { ...state.activeProject, cover_base64: coverBase64 }
          : state.activeProject,
    })),

  updateProjectStatus: (projectId, status) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, status } : p
      ),
    })),

  removeProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      activeProject:
        state.activeProject?.id === projectId ? null : state.activeProject,
      chapters: state.activeProject?.id === projectId ? [] : state.chapters,
      activeChapter:
        state.activeProject?.id === projectId ? null : state.activeChapter,
      sentences: state.activeProject?.id === projectId ? [] : state.sentences,
      characters: state.activeProject?.id === projectId ? [] : state.characters,
    })),
}));
