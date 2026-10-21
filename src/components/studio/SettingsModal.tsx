"use client";

import React, { useEffect } from "react";
import { X, Settings2, RotateCcw } from "lucide-react";
import {
  useStudioSettingsStore,
  type PunctuationPauseSettings,
} from "@/stores/useStudioSettingsStore";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PUNCTUATION_ROWS: { key: keyof PunctuationPauseSettings; mark: string; label: string }[] = [
  { key: "comma", mark: ",", label: "Dấu phẩy" },
  { key: "semicolon", mark: ";", label: "Dấu chấm phẩy" },
  { key: "colon", mark: ":", label: "Dấu hai chấm" },
  { key: "dash", mark: "-", label: "Gạch ngang (đứng riêng giữa câu)" },
  { key: "period", mark: ".", label: "Dấu chấm giữa câu" },
  { key: "question", mark: "?", label: "Dấu hỏi giữa câu" },
  { key: "exclamation", mark: "!", label: "Dấu chấm than giữa câu" },
  { key: "ellipsis", mark: "...", label: "Dấu ba chấm" },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    punctuationPauseEnabled,
    punctuationPauses,
    setPunctuationPauseEnabled,
    setPunctuationPause,
    resetPunctuationPauses,
  } = useStudioSettingsStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        style={{ backgroundColor: "#18181b" }}
        className="w-full max-w-md rounded-2xl border border-zinc-700/80 shadow-2xl p-5 text-zinc-200 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm text-white">Thiết lập ngắt nghỉ theo dấu câu</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[11px] text-zinc-500 leading-relaxed">
          Khi tạo âm thanh, câu được tách tại các dấu bên dưới (dấu vẫn gửi cho TTS) rồi chèn khoảng lặng
          tương ứng, giống tag [pause]. Đặt 0 ms để tắt riêng dấu đó. Chỉ áp dụng cho câu tạo hoặc tái tạo
          sau này; dấu kết thúc cả câu, số thập phân (3,5) và viết tắt (TP.HCM, Mr.) không bị ngắt.
        </div>

        <label className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-xs cursor-pointer">
          <span className="text-zinc-200 font-medium">Bật ngắt nghỉ theo dấu câu</span>
          <input
            type="checkbox"
            checked={punctuationPauseEnabled}
            onChange={(e) => setPunctuationPauseEnabled(e.target.checked)}
            className="w-4 h-4 accent-indigo-500 cursor-pointer"
          />
        </label>

        <div className={`space-y-1.5 ${punctuationPauseEnabled ? "" : "opacity-40 pointer-events-none"}`}>
          {PUNCTUATION_ROWS.map((row) => {
            const value = punctuationPauses[row.key];
            return (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <kbd className="min-w-8 text-center px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300 font-mono text-[11px] font-semibold border border-zinc-700/60">
                    {row.mark}
                  </kbd>
                  <span className="text-zinc-300 truncate">{row.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {value === 0 && <span className="text-[10px] text-zinc-500">Tắt</span>}
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    step={50}
                    value={value}
                    onChange={(e) => setPunctuationPause(row.key, Number(e.target.value))}
                    className="w-20 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-right text-zinc-100 font-mono text-[11px] outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-zinc-500">ms</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={resetPunctuationPauses}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};
