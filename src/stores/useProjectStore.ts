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

  updateSentenceStatus: (id: string, status: SentenceStatus, error?: string) => void;
  updateSentenceAudio: (id: string, audioPath: string, duration: number) => void;
  updateSentenceText: (id: string, text: string) => void;
  assignSpeakerToSentence: (sentenceId: string, char: CharacterProfile) => void;
  batchAssignDialoguesToSpeaker: (char: CharacterProfile) => void;
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

  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setChapters: (chapters) => set({ chapters }),
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

  updateSentenceAudio: (id, audioPath, duration) =>
    set((state) => ({
      sentences: state.sentences.map((s) =>
        s.id === id
          ? {
              ...s,
              audio_path: audioPath,
              duration,
              status: "ready",
              error_message: undefined,
            }
          : s
      ),
    })),

  updateSentenceText: (id, text) =>
    set((state) => ({
      sentences: state.sentences.map((s) =>
        s.id === id ? { ...s, clean_text: text, status: "pending" } : s
      ),
    })),

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
}));
