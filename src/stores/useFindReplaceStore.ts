import { create } from "zustand";

interface FindReplaceState {
  isOpen: boolean;
  tab: "find" | "replace";
  searchQuery: string;
  matchCase: boolean;
  scrollToIndexCallback: ((index: number) => void) | null;

  openFind: () => void;
  openReplace: () => void;
  close: () => void;
  setSearchQuery: (query: string, matchCase: boolean) => void;
  registerScrollCallback: (cb: ((index: number) => void) | null) => void;
}

export const useFindReplaceStore = create<FindReplaceState>((set) => ({
  isOpen: false,
  tab: "find",
  searchQuery: "",
  matchCase: false,
  scrollToIndexCallback: null,

  openFind: () => set({ isOpen: true, tab: "find" }),
  openReplace: () => set({ isOpen: true, tab: "replace" }),
  close: () => set({ isOpen: false }),
  setSearchQuery: (searchQuery, matchCase) => set({ searchQuery, matchCase }),
  registerScrollCallback: (scrollToIndexCallback) =>
    set({ scrollToIndexCallback }),
}));
