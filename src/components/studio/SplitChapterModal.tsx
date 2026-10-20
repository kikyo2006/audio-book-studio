"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Layers,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import {
  tauriGetChapters,
  tauriGetSentences,
  tauriSplitSentencesToChapter,
} from "@/lib/tauri";

interface SplitChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SplitChapterModal: React.FC<SplitChapterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeProject,
    activeChapter,
    sentences,
    selectedSentenceId,
    setChapters,
    setSentences,
    setSelectedSentenceId,
  } = useProjectStore();

  const totalSentences = sentences.length;

  // Selected sentence index (1-based)
  const selectedSentence = sentences.find((s) => s.id === selectedSentenceId);
  const defaultFrom = selectedSentence ? selectedSentence.index : 1;

  const [newTitle, setNewTitle] = useState("");
  const [fromIndex, setFromIndex] = useState<number>(defaultFrom);
  const [toIndex, setToIndex] = useState<number>(defaultFrom);
  const [placeBefore, setPlaceBefore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset values each time modal opens
  useEffect(() => {
    if (isOpen) {
      const initialFrom = selectedSentence ? selectedSentence.index : 1;
      setFromIndex(initialFrom);
      setToIndex(initialFrom);
      setNewTitle(`Chương ${(activeChapter?.index ?? 1) + 1}`);
      setPlaceBefore(true);
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isOpen, selectedSentence, activeChapter]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeProject || !activeChapter) return null;

  const countToTransfer =
    fromIndex > 0 && toIndex >= fromIndex ? toIndex - fromIndex + 1 : 0;
  const countRemaining = Math.max(0, totalSentences - countToTransfer);

  const isValidRange =
    fromIndex >= 1 &&
    toIndex >= fromIndex &&
    toIndex <= totalSentences &&
    countToTransfer > 0;

  const handleGroup = async () => {
    if (!newTitle.trim()) {
      setErrorMessage("Vui lòng nhập tên chương mới.");
      return;
    }
    if (!isValidRange) {
      setErrorMessage(
        `Phạm vi câu không hợp lệ. Phải từ câu 1 đến câu ${totalSentences}.`
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Gọi lệnh backend Tauri gom nhóm câu sang chương mới
      await tauriSplitSentencesToChapter({
        projectId: activeProject.id,
        sourceChapterId: activeChapter.id,
        newTitle: newTitle.trim(),
        fromIndex,
        toIndex,
        placeBefore,
      });

      // Tải lại danh sách chương và danh sách câu của chương hiện tại
      const updatedChapters = await tauriGetChapters(activeProject.id);
      setChapters(updatedChapters);

      const updatedSentences = await tauriGetSentences(activeChapter.id);
      setSentences(updatedSentences);

      if (updatedSentences.length > 0) {
        setSelectedSentenceId(updatedSentences[0].id);
      } else {
        setSelectedSentenceId(null);
      }

      onClose();
    } catch (err) {
      console.error("Lỗi khi gom nhóm chương:", err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      handleGroup();
    }
  };

  const currentChapterName =
    activeChapter.title?.trim() ||
    (activeChapter.sentence_count > 500
      ? "Bản thảo còn lại"
      : `Chương ${activeChapter.index}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div style={{ marginLeft: 8 }}>
              <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                Gom Nhóm Thành Chương (Group)
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                  Ctrl+G
                </kbd>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Gom nhóm câu từ{" "}
                <span className="text-zinc-200 font-medium">
                  {currentChapterName}
                </span>{" "}
                thành một chương độc lập
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
          {/* Chapter Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Tên chương mới
            </label>
            <div className="relative">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ví dụ: Chương 1 - Mở đầu..."
                className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Sentence Range Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">
                  Từ câu số
                </label>
                <button
                  type="button"
                  onClick={() => setFromIndex(1)}
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  Từ đầu (#1)
                </button>
              </div>
              <input
                type="number"
                min={1}
                max={totalSentences}
                value={fromIndex}
                onChange={(e) => setFromIndex(Number(e.target.value))}
                className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">
                  Đến câu số
                </label>
                <button
                  type="button"
                  onClick={() => setToIndex(totalSentences)}
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  Đến hết (#{totalSentences})
                </button>
              </div>
              <input
                type="number"
                min={fromIndex}
                max={totalSentences}
                value={toIndex}
                onChange={(e) => setToIndex(Number(e.target.value))}
                className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Placement position */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Vị trí đặt chương mới:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPlaceBefore(true)}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all ${
                  placeBefore
                    ? "bg-indigo-950/60 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <ArrowUp className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-200">Đặt lên trên</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Đẩy phần bản thảo còn lại xuống dưới cùng
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlaceBefore(false)}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all ${
                  !placeBefore
                    ? "bg-indigo-950/60 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <ArrowDown className="w-4 h-4 shrink-0 text-zinc-400 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-200">Đặt tiếp nối sau</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Nằm liền sau chương hiện tại
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Chương mới ({newTitle || "Mới"}):</span>
              <span className="font-semibold text-indigo-400 font-mono">
                +{countToTransfer} câu
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">
                {currentChapterName} giảm còn:
              </span>
              <span className="font-semibold text-amber-400 font-mono">
                {countRemaining} câu (-{countToTransfer} câu)
              </span>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-1.5 text-[11px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Toàn bộ file âm thanh (.wav) đã tạo trước đó sẽ được giữ nguyên vẹn.</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Hủy (Esc)
            </button>
            <button
              type="submit"
              disabled={isLoading || !isValidRange || !newTitle.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang gom nhóm...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Gom Nhóm (Group - Enter)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
