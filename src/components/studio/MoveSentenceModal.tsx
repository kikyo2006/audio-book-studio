"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowUpDown, ArrowUpToLine, ArrowDownToLine, X, AlertCircle } from "lucide-react";
import type { SentenceItem } from "@/types";

interface MoveSentenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentence: SentenceItem | null;
  totalSentences: number;
  mode: "before" | "after";
  onConfirm: (targetLine: number) => void;
}

export const MoveSentenceModal: React.FC<MoveSentenceModalProps> = ({
  isOpen,
  onClose,
  sentence,
  totalSentences,
  mode,
  onConfirm,
}) => {
  const [targetLine, setTargetLine] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && sentence) {
      setError(null);
      // Gợi ý số dòng mặc định hợp lý
      let defaultVal = sentence.index;
      if (mode === "before") {
        defaultVal = sentence.index > 1 ? sentence.index - 1 : 1;
      } else {
        defaultVal = sentence.index < totalSentences ? sentence.index + 1 : totalSentences;
      }
      setTargetLine(String(defaultVal));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, sentence, mode, totalSentences]);

  if (!isOpen || !sentence) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lineNum = parseInt(targetLine, 10);
    if (isNaN(lineNum) || lineNum < 1 || lineNum > totalSentences) {
      setError(`Vui lòng nhập số dòng hợp lệ từ 1 đến ${totalSentences}`);
      return;
    }
    if (lineNum === sentence.index) {
      setError(`Dòng mục tiêu trùng với vị trí hiện tại (dòng ${sentence.index})`);
      return;
    }

    onConfirm(lineNum);
    onClose();
  };

  const isBefore = mode === "before";

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        style={{
          backgroundColor: "#18181b",
          borderColor: "#3f3f46",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        }}
        className="w-full max-w-md border rounded-2xl p-5 text-zinc-100 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {isBefore ? (
                <ArrowUpToLine className="w-4 h-4" />
              ) : (
                <ArrowDownToLine className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-100">
                {isBefore ? "Chuyển đến trước dòng" : "Chuyển đến sau dòng"}
              </h3>
              <p className="text-xs text-zinc-400">
                Đang chọn câu dòng #{sentence.index} (Tổng số: {totalSentences} dòng)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview câu hiện tại */}
        <div className="my-4 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="font-medium text-zinc-300">Nội dung câu hiện tại:</span>
            <span className="font-mono text-[11px] text-indigo-400">Dòng #{sentence.index}</span>
          </div>
          <p className="text-zinc-200 line-clamp-2 italic leading-relaxed">
            &ldquo;{sentence.clean_text}&rdquo;
          </p>
        </div>

        {/* Form nhập số dòng */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              {isBefore ? "Chuyển đến trước dòng số:" : "Chuyển đến sau dòng số:"}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                min={1}
                max={totalSentences}
                value={targetLine}
                onChange={(e) => {
                  setTargetLine(e.target.value);
                  setError(null);
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                placeholder={`1 - ${totalSentences}`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none font-mono">
                / {totalSentences}
              </span>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 mt-2 text-rose-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {isBefore
              ? `💡 Câu #${sentence.index} sẽ được dời đến vị trí ngay phía trên dòng số bạn chọn.`
              : `💡 Câu #${sentence.index} sẽ được dời đến vị trí ngay phía dưới dòng số bạn chọn.`}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Xác nhận di chuyển</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
