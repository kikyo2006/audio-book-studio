"use client";

import React, { useState, useEffect } from "react";
import { X, FilePlus, ArrowUp, ArrowDown, Check, AlertCircle } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { tauriGetChapters, tauriGetSentences, tauriInsertBlankSentences } from "@/lib/tauri";

interface InsertParagraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInserted?: (firstSentenceId: string, firstSentenceIndex: number) => void;
}

export const InsertParagraphModal: React.FC<InsertParagraphModalProps> = ({
  isOpen,
  onClose,
  onInserted,
}) => {
  const {
    activeProject,
    activeChapter,
    sentences,
    selectedSentenceId,
    setSentences,
    setSelectedSentenceId,
    setChapters,
  } = useProjectStore();

  const [count, setCount] = useState<number>(1);
  const [position, setPosition] = useState<"before" | "after">("before");
  const [targetLine, setTargetLine] = useState<number>(1);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial targetLine from selected sentence
  useEffect(() => {
    if (isOpen) {
      const selected = sentences.find((s) => s.id === selectedSentenceId);
      setTargetLine(selected ? selected.index : 1);
      setCount(1);
      setPosition("before");
      setErrorMessage(null);
    }
  }, [isOpen, selectedSentenceId, sentences]);

  if (!isOpen || !activeChapter) return null;

  const totalLines = sentences.length;

  const handleInsert = async () => {
    if (count <= 0) {
      setErrorMessage("Số lượng đoạn văn cần chèn phải lớn hơn 0.");
      return;
    }

    setIsWorking(true);
    setErrorMessage(null);

    try {
      const created = await tauriInsertBlankSentences({
        chapterId: activeChapter.id,
        targetIndex: targetLine,
        position,
        count,
      });

      // Tải lại danh sách câu và danh sách chương (cập nhật sentence_count)
      const refreshed = await tauriGetSentences(activeChapter.id);
      setSentences(refreshed);

      if (activeProject) {
        const updatedChapters = await tauriGetChapters(activeProject.id);
        setChapters(updatedChapters);
      }

      if (created.length > 0) {
        const first = created[0];
        setSelectedSentenceId(first.id);
        if (onInserted) {
          onInserted(first.id, first.index);
        }
      }

      onClose();
    } catch (err) {
      console.error("Lỗi chèn đoạn văn:", err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsWorking(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWorking) {
      handleInsert();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FilePlus className="w-5 h-5" />
            </div>
            <div style={{ marginLeft: 8 }}>
              <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                Chèn Đoạn Văn (Insert Text)
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                  Ctrl+I
                </kbd>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Chèn một hoặc nhiều khung văn bản trống để nhập text tùy ý
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
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Number of paragraphs */}
          <div className="space-y-1.5">
            <label className="font-medium text-zinc-300 flex items-center justify-between">
              <span>Số lượng đoạn văn cần chèn:</span>
              <span className="text-[11px] text-zinc-500">Ví dụ: 1, 8, 10...</span>
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              autoFocus
            />
          </div>

          {/* Target Line Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-medium text-zinc-300">
                Tại vị trí dòng số (N):
              </label>
              <div className="flex gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setTargetLine(1)}
                  className="text-indigo-400 hover:underline"
                >
                  Đầu (#1)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetLine(Math.max(1, totalLines))}
                  className="text-indigo-400 hover:underline"
                >
                  Cuối (#{totalLines})
                </button>
              </div>
            </div>
            <input
              type="number"
              min={1}
              max={Math.max(1, totalLines)}
              value={targetLine}
              onChange={(e) => setTargetLine(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Position: Before or After */}
          <div className="space-y-1.5">
            <label className="font-medium text-zinc-300">Vị trí chèn:</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPosition("before")}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 font-medium transition-all ${
                  position === "before"
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Phía trước dòng {targetLine}</span>
              </button>

              <button
                type="button"
                onClick={() => setPosition("after")}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 font-medium transition-all ${
                  position === "after"
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Phía sau dòng {targetLine}</span>
              </button>
            </div>
          </div>

          {/* Hint */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg text-zinc-400 text-[11px] leading-relaxed">
            💡 Sẽ tạo <strong className="text-zinc-200">{count}</strong> khung đoạn văn trống {position === "before" ? "trước" : "sau"} dòng số <strong className="text-zinc-200">#{targetLine}</strong>. Các dòng phía sau sẽ tự động dời chỉ mục index.
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isWorking}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Chèn {count} đoạn văn</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
