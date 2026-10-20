"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Merge,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowUp,
  ArrowDown,
  Info,
} from "lucide-react";
import type { ChapterItem } from "@/types";

interface MergeChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChapter: ChapterItem | null;
  targetChapter: ChapterItem | null;
  direction: "above" | "below";
  onConfirmMerge: (
    currentChapter: ChapterItem,
    targetChapter: ChapterItem,
    finalTitle: string
  ) => Promise<void>;
}

export const MergeChapterModal: React.FC<MergeChapterModalProps> = ({
  isOpen,
  onClose,
  currentChapter,
  targetChapter,
  direction,
  onConfirmMerge,
}) => {
  const [selectedTitleOption, setSelectedTitleOption] = useState<
    "current" | "target"
  >("current");
  const [customTitle, setCustomTitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTitle =
    currentChapter?.title?.trim() ||
    (currentChapter ? `Chương ${currentChapter.index}` : "");
  const targetTitle =
    targetChapter?.title?.trim() ||
    (targetChapter ? `Chương ${targetChapter.index}` : "");

  // Đồng bộ tiêu đề mặc định khi mở modal
  useEffect(() => {
    if (isOpen && currentChapter && targetChapter) {
      setSelectedTitleOption("current");
      setCustomTitle(currentTitle);
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen, currentChapter, targetChapter, currentTitle]);

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen || !currentChapter || !targetChapter) return null;

  const totalSentences =
    (currentChapter.sentence_count || 0) + (targetChapter.sentence_count || 0);

  const handleSelectOption = (option: "current" | "target") => {
    setSelectedTitleOption(option);
    if (option === "current") {
      setCustomTitle(currentTitle);
    } else {
      setCustomTitle(targetTitle);
    }
  };

  const handleSubmit = async () => {
    if (!customTitle.trim()) {
      setError("Vui lòng nhập hoặc chọn tiêu đề cho chương sau khi gộp.");
      return;
    }
    setError(null);
    setIsProcessing(true);
    try {
      await onConfirmMerge(currentChapter, targetChapter, customTitle.trim());
      onClose();
    } catch (err: unknown) {
      console.error("Lỗi khi gộp chương:", err);
      setError(
        typeof err === "string"
          ? err
          : (err as Error)?.message || "Đã xảy ra lỗi trong quá trình gộp chương."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isAbove = direction === "above";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-150"
      onClick={() => {
        if (!isProcessing) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#18181b",
          borderColor: "#3f3f46",
          boxShadow:
            "0 20px 40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          padding: 32,
          gap: 24,
        }}
        className="w-full max-w-lg border rounded-2xl text-zinc-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ paddingBottom: 16 }} className="flex items-center justify-between border-b border-zinc-800">
          <div style={{ gap: 14 }} className="flex items-center">
            <div style={{ padding: 10 }} className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Merge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Xác Nhận Gộp Chương
              </h2>
              <p className="text-xs text-zinc-400">
                {isAbove
                  ? "Gộp nội dung chương hiện tại với chương phía trên"
                  : "Gộp nội dung chương hiện tại với chương phía dưới"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{ padding: 8 }}
            className="rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thông tin 2 chương được gộp */}
        <div style={{ padding: 16, gap: 10 }} className="flex flex-col rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs">
          <div className="flex items-center justify-between">
            <div style={{ gap: 10 }} className="flex items-center min-w-0">
              <span className="font-mono text-[11px] text-zinc-500">
                #{currentChapter.index}
              </span>
              <span className="font-medium text-zinc-200 truncate">
                {currentTitle}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                (Hiện tại)
              </span>
            </div>
            <span className="text-zinc-400 shrink-0 font-mono">
              {currentChapter.sentence_count} câu
            </span>
          </div>

          <div className="flex items-center justify-center my-0.5 text-zinc-500">
            {isAbove ? (
              <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-medium">
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Gộp vào chương phía trên</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-medium">
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Gộp với chương phía dưới</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div style={{ gap: 10 }} className="flex items-center min-w-0">
              <span className="font-mono text-[11px] text-zinc-500">
                #{targetChapter.index}
              </span>
              <span className="font-medium text-zinc-200 truncate">
                {targetTitle}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                {isAbove ? "Chương trên" : "Chương dưới"}
              </span>
            </div>
            <span className="text-zinc-400 shrink-0 font-mono">
              {targetChapter.sentence_count} câu
            </span>
          </div>

          <div style={{ marginTop: 6, paddingTop: 12 }} className="border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Tổng số câu sau khi gộp:</span>
            <span className="font-semibold text-emerald-400 font-mono">
              {totalSentences} câu
            </span>
          </div>
        </div>

        {/* Lựa chọn tiêu đề chương sau khi gộp */}
        <div style={{ gap: 12 }} className="flex flex-col">
          <label className="text-xs font-semibold text-zinc-300">
            Lựa chọn tiêu đề cho chương sau khi gộp:
          </label>

          <div style={{ gap: 10 }} className="flex flex-col">
            {/* Lựa chọn 1: Tiêu đề chương hiện tại */}
            <div
              onClick={() => handleSelectOption("current")}
              style={{ padding: 16, gap: 14 }}
              className={`rounded-xl border flex items-center cursor-pointer transition-all ${
                selectedTitleOption === "current"
                  ? "bg-indigo-950/40 border-indigo-500 text-zinc-100 ring-1 ring-indigo-500/30"
                  : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  selectedTitleOption === "current"
                    ? "border-indigo-400 bg-indigo-600"
                    : "border-zinc-600 bg-transparent"
                }`}
              >
                {selectedTitleOption === "current" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-zinc-400">
                  Giữ tiêu đề chương hiện tại (chương gộp):
                </div>
                <div className="text-xs font-medium text-zinc-100 truncate mt-0.5">
                  {currentTitle}
                </div>
              </div>
            </div>

            {/* Lựa chọn 2: Tiêu đề chương được gộp (phía trên/dưới) */}
            <div
              onClick={() => handleSelectOption("target")}
              style={{ padding: 16, gap: 14 }}
              className={`rounded-xl border flex items-center cursor-pointer transition-all ${
                selectedTitleOption === "target"
                  ? "bg-indigo-950/40 border-indigo-500 text-zinc-100 ring-1 ring-indigo-500/30"
                  : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  selectedTitleOption === "target"
                    ? "border-indigo-400 bg-indigo-600"
                    : "border-zinc-600 bg-transparent"
                }`}
              >
                {selectedTitleOption === "target" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-zinc-400">
                  Giữ tiêu đề chương được gộp (
                  {isAbove ? "chương phía trên" : "chương phía dưới"}):
                </div>
                <div className="text-xs font-medium text-zinc-100 truncate mt-0.5">
                  {targetTitle}
                </div>
              </div>
            </div>
          </div>

          {/* Ô chỉnh sửa tiêu đề tùy biến */}
          <div style={{ marginTop: 8, gap: 8 }} className="flex flex-col">
            <label className="text-[11px] text-zinc-400">
              Hoặc tùy chỉnh tiêu đề cuối cùng:
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Nhập tiêu đề chương..."
              disabled={isProcessing}
              style={{ padding: "10px 14px" }}
              className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-indigo-500 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Thông báo an toàn dữ liệu */}
        <div style={{ padding: 14, gap: 10 }} className="flex items-start rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-[11px] text-zinc-400">
          <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <span>
            Toàn bộ câu thoại, giọng đọc, diễn viên lồng tiếng và file âm thanh
            đã sinh của cả 2 chương đều được giữ nguyên 100% và ghép nối liền mạch
            theo đúng thứ tự.
          </span>
        </div>

        {/* Lỗi hiển thị nếu có */}
        {error && (
          <div style={{ padding: 14 }} className="rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ gap: 12, paddingTop: 20 }} className="flex items-center justify-end border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{ padding: "10px 20px" }}
            className="rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || !customTitle.trim()}
            style={{ padding: "10px 20px", gap: 8 }}
            className="rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang gộp chương...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Gộp</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
