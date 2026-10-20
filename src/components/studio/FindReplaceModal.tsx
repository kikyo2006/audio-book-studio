"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Search,
  Replace,
  ArrowDown,
  ArrowUp,
  ArrowRightLeft,
  Check,
  AlertCircle,
  HelpCircle,
  GripHorizontal,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFindReplaceStore } from "@/stores/useFindReplaceStore";
import { useConfirmStore } from "@/stores/useConfirmStore";
import {
  tauriUpdateSentenceText,
  tauriBatchUpdateSentencesText,
  tauriGetAllProjectSentences,
  tauriGetSentences,
} from "@/lib/tauri";
import type { SentenceItem } from "@/types";

export interface FindReplaceModalProps {
  isOpen: boolean;
  initialTab?: "find" | "replace";
  onClose: () => void;
  onScrollToSentence?: (index: number) => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  initialTab = "find",
  onClose,
  onScrollToSentence,
}) => {
  const {
    activeProject,
    chapters,
    activeChapter,
    sentences,
    selectedSentenceId,
    setActiveChapter,
    setSentences,
    setSelectedSentenceId,
    updateSentenceText,
    batchUpdateSentencesText,
  } = useProjectStore();

  const { askConfirm } = useConfirmStore();

  const { setSearchQuery, scrollToIndexCallback } = useFindReplaceStore();

  const [activeTab, setActiveTab] = useState<"find" | "replace">(initialTab);
  const [findWhat, setFindWhat] = useState("");
  const [replaceWith, setReplaceWith] = useState("");

  // Options
  const [searchScope, setSearchScope] = useState<"current" | "all">("current");
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [wrapAround, setWrapAround] = useState(true);
  const [backwardDirection, setBackwardDirection] = useState(false);
  const [searchMode, setSearchMode] = useState<"normal" | "regex">("normal");

  // Status
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "success" | "error">(
    "info"
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Draggable dialog position
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial tab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setStatusMessage(null);
      setSearchQuery(findWhat, matchCase);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setSearchQuery("", false);
    }
  }, [isOpen, initialTab, setSearchQuery]);

  // Sync search query changes to global store for highlight
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(findWhat, matchCase);
    }
  }, [findWhat, matchCase, isOpen, setSearchQuery]);

  // Set default initial position on screen (top-right)
  useEffect(() => {
    if (isOpen && position === null && typeof window !== "undefined") {
      const modalWidth = 460;
      const posX = Math.max(20, window.innerWidth - modalWidth - 40);
      const posY = 75;
      setPosition({ x: posX, y: posY });
    }
  }, [isOpen, position]);

  // Dragging handlers
  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - (position?.x || 0),
      y: e.clientY - (position?.y || 0),
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 420, e.clientX - dragStartRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 200, e.clientY - dragStartRef.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Helper: Escape Regex characters
  const escapeRegExp = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Helper: Compile Regex pattern
  const getMatcher = useCallback((): RegExp | null => {
    if (!findWhat) return null;
    try {
      let pattern = findWhat;
      if (searchMode === "normal") {
        pattern = escapeRegExp(findWhat);
        if (matchWholeWord) {
          pattern = `\\b${pattern}\\b`;
        }
      }
      return new RegExp(pattern, matchCase ? "g" : "gi");
    } catch {
      return null;
    }
  }, [findWhat, searchMode, matchWholeWord, matchCase]);

  // Core Search Engine: Find Next or Previous
  const handleFind = useCallback(
    async (direction: "next" | "prev" = backwardDirection ? "prev" : "next") => {
      if (!findWhat.trim()) {
        setStatusMessage("Vui lòng nhập từ khóa tìm kiếm.");
        setStatusType("error");
        return null;
      }

      const regex = getMatcher();
      if (!regex) {
        setStatusMessage("Biểu thức Regular Expression không hợp lệ.");
        setStatusType("error");
        return null;
      }

      if (searchScope === "current") {
        if (sentences.length === 0) {
          setStatusMessage("Chương hiện tại không có câu nào.");
          setStatusType("info");
          return null;
        }

        const currentIndex = sentences.findIndex((s) => s.id === selectedSentenceId);
        const total = sentences.length;
        let foundIndex = -1;

        if (direction === "next") {
          const start = currentIndex >= 0 ? currentIndex + 1 : 0;
          for (let i = start; i < total; i++) {
            regex.lastIndex = 0;
            if (regex.test(sentences[i].clean_text)) {
              foundIndex = i;
              break;
            }
          }
          if (foundIndex === -1 && wrapAround && start > 0) {
            for (let i = 0; i < start; i++) {
              regex.lastIndex = 0;
              if (regex.test(sentences[i].clean_text)) {
                foundIndex = i;
                break;
              }
            }
          }
        } else {
          const start = currentIndex >= 0 ? currentIndex - 1 : total - 1;
          for (let i = start; i >= 0; i--) {
            regex.lastIndex = 0;
            if (regex.test(sentences[i].clean_text)) {
              foundIndex = i;
              break;
            }
          }
          if (foundIndex === -1 && wrapAround && start < total - 1) {
            for (let i = total - 1; i > start; i--) {
              regex.lastIndex = 0;
              if (regex.test(sentences[i].clean_text)) {
                foundIndex = i;
                break;
              }
            }
          }
        }

        if (foundIndex !== -1) {
          const target = sentences[foundIndex];
          setSelectedSentenceId(target.id);
          if (onScrollToSentence) {
            onScrollToSentence(foundIndex);
          } else if (scrollToIndexCallback) {
            scrollToIndexCallback(foundIndex);
          }
          setStatusMessage(
            `Tìm thấy tại câu #${target.index} (câu thứ ${foundIndex + 1}/${total})`
          );
          setStatusType("success");
          return { index: foundIndex, sentence: target };
        } else {
          setStatusMessage(`Không tìm thấy kết quả phù hợp trong chương này: "${findWhat}"`);
          setStatusType("info");
          return null;
        }
      } else {
        // Tìm trên toàn bộ các chương của sách
        if (!activeProject) return null;
        setIsProcessing(true);
        try {
          const allSentences = await tauriGetAllProjectSentences(activeProject.id);
          if (allSentences.length === 0) {
            setStatusMessage("Cuốn sách chưa có câu nào.");
            setStatusType("info");
            return null;
          }

          const total = allSentences.length;
          const currentIndex = allSentences.findIndex((s) => s.id === selectedSentenceId);
          let foundIndex = -1;

          if (direction === "next") {
            const start = currentIndex >= 0 ? currentIndex + 1 : 0;
            for (let i = start; i < total; i++) {
              regex.lastIndex = 0;
              if (regex.test(allSentences[i].clean_text)) {
                foundIndex = i;
                break;
              }
            }
            if (foundIndex === -1 && wrapAround && start > 0) {
              for (let i = 0; i < start; i++) {
                regex.lastIndex = 0;
                if (regex.test(allSentences[i].clean_text)) {
                  foundIndex = i;
                  break;
                }
              }
            }
          } else {
            const start = currentIndex >= 0 ? currentIndex - 1 : total - 1;
            for (let i = start; i >= 0; i--) {
              regex.lastIndex = 0;
              if (regex.test(allSentences[i].clean_text)) {
                foundIndex = i;
                break;
              }
            }
            if (foundIndex === -1 && wrapAround && start < total - 1) {
              for (let i = total - 1; i > start; i--) {
                regex.lastIndex = 0;
                if (regex.test(allSentences[i].clean_text)) {
                  foundIndex = i;
                  break;
                }
              }
            }
          }

          if (foundIndex !== -1) {
            const target = allSentences[foundIndex];
            const targetChap = chapters.find((c) => c.id === target.chapter_id);
            const chapTitle =
              targetChap?.title?.trim() ||
              (targetChap ? `Chương ${targetChap.index}` : "Chương");

            if (target.chapter_id !== activeChapter?.id && targetChap) {
              setActiveChapter(targetChap);
              const newSentences = await tauriGetSentences(targetChap.id);
              setSentences(newSentences);
              setSelectedSentenceId(target.id);
              const localIndex = newSentences.findIndex((s) => s.id === target.id);
              if (localIndex >= 0) {
                if (onScrollToSentence) {
                  onScrollToSentence(localIndex);
                } else if (scrollToIndexCallback) {
                  scrollToIndexCallback(localIndex);
                }
              }
            } else {
              setSelectedSentenceId(target.id);
              const localIndex = sentences.findIndex((s) => s.id === target.id);
              if (localIndex >= 0) {
                if (onScrollToSentence) {
                  onScrollToSentence(localIndex);
                } else if (scrollToIndexCallback) {
                  scrollToIndexCallback(localIndex);
                }
              }
            }

            setStatusMessage(
              `Tìm thấy tại câu #${target.index} — ${chapTitle} (kết quả ${foundIndex + 1}/${total})`
            );
            setStatusType("success");
            return { index: foundIndex, sentence: target };
          } else {
            setStatusMessage(`Không tìm thấy kết quả phù hợp trên toàn bộ sách: "${findWhat}"`);
            setStatusType("info");
            return null;
          }
        } catch (err) {
          console.error("Lỗi tìm kiếm trên toàn bộ sách:", err);
          setStatusMessage("Đã xảy ra lỗi khi tìm kiếm trên toàn bộ sách.");
          setStatusType("error");
          return null;
        } finally {
          setIsProcessing(false);
        }
      }
    },
    [
      findWhat,
      backwardDirection,
      getMatcher,
      searchScope,
      sentences,
      selectedSentenceId,
      wrapAround,
      activeProject,
      activeChapter,
      chapters,
      setActiveChapter,
      setSentences,
      setSelectedSentenceId,
      onScrollToSentence,
      scrollToIndexCallback,
    ]
  );

  // Count / Find All
  const handleCount = useCallback(async () => {
    if (!findWhat.trim()) {
      setStatusMessage("Vui lòng nhập từ khóa tìm kiếm.");
      setStatusType("error");
      return;
    }

    const regex = getMatcher();
    if (!regex) {
      setStatusMessage("Biểu thức Regular Expression không hợp lệ.");
      setStatusType("error");
      return;
    }

    if (searchScope === "current") {
      let matchCount = 0;
      let sentenceCount = 0;

      sentences.forEach((s) => {
        regex.lastIndex = 0;
        const matches = s.clean_text.match(regex);
        if (matches && matches.length > 0) {
          matchCount += matches.length;
          sentenceCount += 1;
        }
      });

      if (matchCount > 0) {
        setStatusMessage(
          `Tìm thấy ${matchCount} lần xuất hiện trong ${sentenceCount} câu của chương này.`
        );
        setStatusType("success");
      } else {
        setStatusMessage(`Không tìm thấy kết quả phù hợp trong chương này cho: "${findWhat}"`);
        setStatusType("info");
      }
    } else {
      if (!activeProject) return;
      setIsProcessing(true);
      try {
        const allSentences = await tauriGetAllProjectSentences(activeProject.id);
        let matchCount = 0;
        let sentenceCount = 0;
        const matchingChapterIds = new Set<string>();

        for (const s of allSentences) {
          regex.lastIndex = 0;
          const matches = s.clean_text.match(regex);
          if (matches && matches.length > 0) {
            matchCount += matches.length;
            sentenceCount += 1;
            matchingChapterIds.add(s.chapter_id);
          }
        }

        if (matchCount > 0) {
          setStatusMessage(
            `Tìm thấy ${matchCount} lần xuất hiện trong ${sentenceCount} câu thuộc ${matchingChapterIds.size} chương trên toàn bộ sách.`
          );
          setStatusType("success");
        } else {
          setStatusMessage(
            `Không tìm thấy kết quả phù hợp nào trên toàn bộ sách cho: "${findWhat}"`
          );
          setStatusType("info");
        }
      } catch (err) {
        console.error("Lỗi đếm từ khóa trên toàn bộ sách:", err);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [findWhat, getMatcher, searchScope, sentences, activeProject]);

  // Replace Current Match
  const handleReplace = useCallback(async () => {
    if (!findWhat.trim()) {
      setStatusMessage("Vui lòng nhập từ khóa tìm kiếm.");
      setStatusType("error");
      return;
    }

    const regex = getMatcher();
    if (!regex) {
      setStatusMessage("Biểu thức Regular Expression không hợp lệ.");
      setStatusType("error");
      return;
    }

    const currentSentence = sentences.find((s) => s.id === selectedSentenceId);

    // If current sentence matches, replace in it
    if (currentSentence) {
      regex.lastIndex = 0;
      if (regex.test(currentSentence.clean_text)) {
        regex.lastIndex = 0;
        const newText = currentSentence.clean_text.replace(regex, replaceWith);
        updateSentenceText(currentSentence.id, newText);
        try {
          await tauriUpdateSentenceText(currentSentence.id, newText);
          setStatusMessage(`Đã thay thế tại câu #${currentSentence.index}.`);
          setStatusType("success");
        } catch (err) {
          console.error("Lỗi cập nhật câu sau khi replace:", err);
        }

        // Jump to next match after replacing
        await handleFind("next");
        return;
      }
    }

    // If current doesn't match, find the next one first
    const found = await handleFind("next");
    if (!found) {
      setStatusMessage("Không có mục nào để thay thế.");
      setStatusType("info");
    }
  }, [
    findWhat,
    replaceWith,
    getMatcher,
    sentences,
    selectedSentenceId,
    updateSentenceText,
    handleFind,
  ]);

  // Replace All (Trong chương hoặc Toàn bộ sách)
  const handleReplaceAll = useCallback(async () => {
    if (!findWhat.trim()) {
      setStatusMessage("Vui lòng nhập từ khóa tìm kiếm.");
      setStatusType("error");
      return;
    }

    const regex = getMatcher();
    if (!regex) {
      setStatusMessage("Biểu thức Regular Expression không hợp lệ.");
      setStatusType("error");
      return;
    }

    if (searchScope === "current") {
      setIsProcessing(true);
      setStatusMessage("Đang thực hiện thay thế tất cả trong chương...");
      setStatusType("info");

      try {
        const updates: Array<{ id: string; text: string }> = [];
        let totalReplacedOccurrences = 0;

        for (const s of sentences) {
          regex.lastIndex = 0;
          const matches = s.clean_text.match(regex);
          if (matches && matches.length > 0) {
            totalReplacedOccurrences += matches.length;
            regex.lastIndex = 0;
            const newText = s.clean_text.replace(regex, replaceWith);
            updates.push({ id: s.id, text: newText });
          }
        }

        if (updates.length === 0) {
          setStatusMessage(`Không tìm thấy kết quả nào để thay thế trong chương: "${findWhat}"`);
          setStatusType("info");
          setIsProcessing(false);
          return;
        }

        // Batch update SQLite in Rust
        await tauriBatchUpdateSentencesText(
          updates.map((u) => ({ sentenceId: u.id, text: u.text }))
        );

        // Batch update Zustand store state
        batchUpdateSentencesText(updates);

        setStatusMessage(
          `Thành công: Đã thay thế ${totalReplacedOccurrences} lần trong ${updates.length} câu của chương này!`
        );
        setStatusType("success");
      } catch (err) {
        console.error("Lỗi thay thế tất cả:", err);
        setStatusMessage(`Lỗi thay thế: ${err instanceof Error ? err.message : String(err)}`);
        setStatusType("error");
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Thay thế trên toàn bộ các chương của sách
      if (!activeProject) return;

      askConfirm({
        title: "Xác Nhận Thay Thế Toàn Bộ Sách",
        description: `Bạn có chắc muốn tìm và thay thế tất cả từ khóa "${findWhat}" thành "${replaceWith}" trên TOÀN BỘ CÁC CHƯƠNG của sách?\n\nThao tác này sẽ áp dụng trên tất cả các câu của toàn bộ dự án.`,
        confirmText: "Thay Thế Toàn Sách",
        isDestructive: true,
        onConfirm: async () => {
          setIsProcessing(true);
          setStatusMessage("Đang thực hiện thay thế trên toàn bộ sách...");
          setStatusType("info");

          try {
            const allSentences = await tauriGetAllProjectSentences(activeProject.id);
            const updates: Array<{ id: string; text: string }> = [];
            let totalReplacedOccurrences = 0;
            const affectedChapterIds = new Set<string>();

            for (const s of allSentences) {
              regex.lastIndex = 0;
              const matches = s.clean_text.match(regex);
              if (matches && matches.length > 0) {
                totalReplacedOccurrences += matches.length;
                regex.lastIndex = 0;
                const newText = s.clean_text.replace(regex, replaceWith);
                updates.push({ id: s.id, text: newText });
                affectedChapterIds.add(s.chapter_id);
              }
            }

            if (updates.length === 0) {
              setStatusMessage(`Không tìm thấy kết quả nào để thay thế trên toàn bộ sách: "${findWhat}"`);
              setStatusType("info");
              setIsProcessing(false);
              return;
            }

            // Ghi hàng loạt vào SQLite
            await tauriBatchUpdateSentencesText(
              updates.map((u) => ({ sentenceId: u.id, text: u.text }))
            );

            // Cập nhật lại câu cho chương hiện tại đang mở
            if (activeChapter) {
              const refreshed = await tauriGetSentences(activeChapter.id);
              setSentences(refreshed);
            }

            setStatusMessage(
              `Thành công: Đã thay thế ${totalReplacedOccurrences} lần trong ${updates.length} câu thuộc ${affectedChapterIds.size} chương trên toàn bộ sách!`
            );
            setStatusType("success");
          } catch (err) {
            console.error("Lỗi thay thế toàn bộ sách:", err);
            setStatusMessage(`Lỗi thay thế toàn sách: ${err instanceof Error ? err.message : String(err)}`);
            setStatusType("error");
          } finally {
            setIsProcessing(false);
          }
        },
      });
    }
  }, [
    findWhat,
    replaceWith,
    getMatcher,
    searchScope,
    sentences,
    activeChapter,
    activeProject,
    askConfirm,
    batchUpdateSentencesText,
    setSentences,
  ]);

  // Keyboard shortcut handlers inside dialog
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handleFind("prev");
      } else {
        handleFind("next");
      }
    }
  };

  // Swap findWhat & replaceWith
  const handleSwap = () => {
    const temp = findWhat;
    setFindWhat(replaceWith);
    setReplaceWith(temp);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        left: position ? `${position.x}px` : "auto",
        top: position ? `${position.y}px` : "75px",
        right: position ? "auto" : "32px",
        zIndex: 60,
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        boxShadow:
          "0 20px 45px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)",
      }}
      className="w-[470px] rounded-xl border flex flex-col overflow-hidden text-xs text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Title Bar (Draggable) */}
      <div
        onMouseDown={handleMouseDownHeader}
        className="px-3.5 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between cursor-move select-none"
      >
        <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs">
          <GripHorizontal className="w-3.5 h-3.5 text-zinc-500" />
          <span>{activeTab === "find" ? "Tìm kiếm (Find)" : "Thay thế (Replace)"}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Đóng (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/60 px-3 pt-2 gap-1">
        <button
          onClick={() => setActiveTab("find")}
          className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "find"
              ? "bg-[#18181b] text-indigo-400 border-t-2 border-indigo-500"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Tìm kiếm (Find)</span>
        </button>
        <button
          onClick={() => setActiveTab("replace")}
          className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "replace"
              ? "bg-[#18181b] text-indigo-400 border-t-2 border-indigo-500"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
          }`}
        >
          <Replace className="w-3.5 h-3.5" />
          <span>Thay thế (Replace)</span>
        </button>
      </div>

      {/* Dialog Body */}
      <div className="p-4 space-y-3.5">
        <div className="grid grid-cols-[1fr_125px] gap-3">
          {/* Left Form: Inputs & Options */}
          <div className="space-y-3">
            {/* Find what input */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-300 flex items-center justify-between">
                <span>Tìm gì (Find what):</span>
                {activeTab === "replace" && (
                  <button
                    onClick={handleSwap}
                    className="p-0.5 text-zinc-400 hover:text-indigo-400 transition-colors"
                    title="Đổi chiều Tìm & Thay thế"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                  </button>
                )}
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={findWhat}
                  onChange={(e) => setFindWhat(e.target.value)}
                  placeholder="Nhập nội dung cần tìm..."
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Replace with input (Replace tab only) */}
            {activeTab === "replace" && (
              <div className="space-y-1 animate-in fade-in duration-150">
                <label className="text-[11px] font-medium text-zinc-300">
                  Thay thế bằng (Replace with):
                </label>
                <input
                  type="text"
                  value={replaceWith}
                  onChange={(e) => setReplaceWith(e.target.value)}
                  placeholder="Nhập nội dung thay thế..."
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            )}

            {/* Checkbox Options */}
            <div className="space-y-2 pt-1 border-t border-zinc-800/80">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={matchCase}
                  onChange={(e) => setMatchCase(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-[11px]">Phân biệt hoa / thường (Match case)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={matchWholeWord}
                  onChange={(e) => setMatchWholeWord(e.target.checked)}
                  disabled={searchMode === "regex"}
                  className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                />
                <span className="text-[11px]">Khớp toàn bộ từ (Match whole word only)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={wrapAround}
                  onChange={(e) => setWrapAround(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-[11px]">Quay vòng từ đầu (Wrap around)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={backwardDirection}
                  onChange={(e) => setBackwardDirection(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-[11px]">Tìm ngược lên trên (Backward direction)</span>
              </label>
            </div>

            {/* Search Scope Group */}
            <div className="pt-2 border-t border-zinc-800/80">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Phạm vi (Scope)
              </span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="radio"
                    name="searchScope"
                    value="current"
                    checked={searchScope === "current"}
                    onChange={() => setSearchScope("current")}
                    className="text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-[11px]">Chương hiện tại</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="radio"
                    name="searchScope"
                    value="all"
                    checked={searchScope === "all"}
                    onChange={() => setSearchScope("all")}
                    className="text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-[11px]">Toàn bộ các chương (Toàn sách)</span>
                </label>
              </div>
            </div>

            {/* Search Mode Group */}
            <div className="pt-2 border-t border-zinc-800/80">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Chế độ tìm kiếm (Search Mode)
              </span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="radio"
                    name="searchMode"
                    value="normal"
                    checked={searchMode === "normal"}
                    onChange={() => setSearchMode("normal")}
                    className="text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-[11px]">Bình thường (Normal)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="radio"
                    name="searchMode"
                    value="regex"
                    checked={searchMode === "regex"}
                    onChange={() => setSearchMode("regex")}
                    className="text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-[11px]">Biểu thức (Regex)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-col gap-1.5 pt-4">
            <button
              onClick={() => handleFind("next")}
              className="w-full py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-indigo-600/20"
              title="Tìm tiếp theo (Enter)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Tìm sau (Next)</span>
            </button>

            <button
              onClick={() => handleFind("prev")}
              className="w-full py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700/80 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Tìm câu trước đó (Shift + Enter)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Tìm trước (Prev)</span>
            </button>

            <button
              onClick={handleCount}
              className="w-full py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700/80 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Đếm số lượng kết quả trùng khớp"
            >
              <span>Đếm (Count)</span>
            </button>

            {activeTab === "replace" && (
              <>
                <div className="my-1 border-t border-zinc-800" />
                <button
                  onClick={handleReplace}
                  disabled={isProcessing}
                  className="w-full py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-amber-600/20 disabled:opacity-50"
                  title="Thay thế câu hiện tại và nhảy tới câu tiếp"
                >
                  <Replace className="w-3.5 h-3.5" />
                  <span>Thay thế</span>
                </button>

                <button
                  onClick={handleReplaceAll}
                  disabled={isProcessing}
                  className="w-full py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50"
                  title={
                    searchScope === "all"
                      ? "Thay thế toàn bộ trong tất cả các chương của sách"
                      : "Thay thế toàn bộ trong chương này"
                  }
                >
                  <span>
                    {searchScope === "all"
                      ? "Thay thế toàn sách"
                      : "Thay thế tất cả"}
                  </span>
                </button>
              </>
            )}

            <div className="flex-1" />

            <button
              onClick={onClose}
              className="w-full py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs transition-colors cursor-pointer mt-1"
            >
              Đóng (Close)
            </button>
          </div>
        </div>

        {/* Status Message Footer */}
        {statusMessage && (
          <div
            className={`px-3 py-2 rounded-lg border text-[11px] flex items-center gap-2 animate-in fade-in duration-150 ${
              statusType === "success"
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                : statusType === "error"
                ? "bg-rose-950/40 border-rose-800/60 text-rose-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-300"
            }`}
          >
            {statusType === "success" ? (
              <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
            ) : statusType === "error" ? (
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
            ) : (
              <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
            )}
            <span className="line-clamp-2">{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
