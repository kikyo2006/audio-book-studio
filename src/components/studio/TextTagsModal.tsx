"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Tag, Copy, Check } from "lucide-react";

interface TextTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Tag chèn thẳng vào văn bản câu. Pause do BookStudio xử lý (ghép khoảng lặng), emotion do VieNeu-TTS v3 Turbo xử lý.
const TEXT_TAGS = [
  { tag: "[pause:300ms]", desc: "Ngắt nghỉ ngắn 0,3 giây" },
  { tag: "[pause:500ms]", desc: "Ngắt nghỉ 0,5 giây" },
  { tag: "[pause:1s]", desc: "Ngắt nghỉ 1 giây" },
  { tag: "[pause:2s]", desc: "Ngắt nghỉ 2 giây" },
  { tag: "[cười]", desc: "Tiếng cười (VieNeu v3 Turbo, thử nghiệm)" },
  { tag: "[thở dài]", desc: "Tiếng thở dài (VieNeu v3 Turbo, thử nghiệm)" },
  { tag: "[hắng giọng]", desc: "Tiếng hắng giọng (VieNeu v3 Turbo, thử nghiệm)" },
];

export const TextTagsModal: React.FC<TextTagsModalProps> = ({ isOpen, onClose }) => {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopyTag = async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopiedTag(null), 1500);
    } catch (err) {
      console.error("Không copy được tag:", err);
    }
  };

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
            <Tag className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-sm text-white">Tag chèn trong câu</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          <div className="px-1 pb-1 text-[11px] text-zinc-500 leading-relaxed">
            Bấm để copy. Pause: số + ms hoặc s (VD: [pause:750ms], [pause:1.5s]), tối đa 10 giây mỗi tag.
          </div>
          {TEXT_TAGS.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => handleCopyTag(t.tag)}
              title="Bấm để copy tag"
              className="w-full flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 hover:bg-zinc-800/80 text-xs text-left transition-colors cursor-pointer"
            >
              <span className="text-zinc-300">{t.desc}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-emerald-300 font-mono text-[11px] font-semibold border border-zinc-700/60 shadow-sm whitespace-nowrap">
                  {t.tag}
                </kbd>
                {copiedTag === t.tag ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="pt-2 text-center text-[11px] text-zinc-500">
          Nhấn <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">F2</kbd> hoặc{" "}
          <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">Esc</kbd> để đóng
        </div>
      </div>
    </div>
  );
};
