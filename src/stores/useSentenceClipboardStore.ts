import { create } from "zustand";

// Holds the id of the sentence copied via Ctrl+C / context menu.
// Any sentence type (voice, silence, SFX, BGM, future types) is copied by id,
// the backend duplicates the whole row, so no per-type handling is needed here.
interface SentenceClipboardState {
  copiedSentenceId: string | null;
  setCopiedSentenceId: (id: string | null) => void;
}

export const useSentenceClipboardStore = create<SentenceClipboardState>((set) => ({
  copiedSentenceId: null,
  setCopiedSentenceId: (id) => set({ copiedSentenceId: id }),
}));
