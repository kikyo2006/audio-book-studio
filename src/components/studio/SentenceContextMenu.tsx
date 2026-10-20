"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  VolumeX,
  ArrowUp,
  ArrowDown,
  Play,
  RotateCcw,
  Edit2,
  Trash2,
  Layers,
  UserCheck,
  ChevronRight,
  FileText,
  FilePlus,
} from "lucide-react";
import type { CharacterProfile, SentenceItem } from "@/types";

export interface ContextMenuState {
  x: number;
  y: number;
  sentence: SentenceItem;
}

interface SentenceContextMenuProps {
  menu: ContextMenuState | null;
  characters: CharacterProfile[];
  onClose: () => void;
  onAddSilence: (
    sentence: SentenceItem,
    position: "above" | "below",
    durationSecs: number
  ) => void;
  onInsertBlank: (
    sentence: SentenceItem,
    position: "above" | "below"
  ) => void;
  onOpenInsertModal: (sentence: SentenceItem) => void;
  onPlaySentence: (sentence: SentenceItem) => void;
  onRegenerate: (sentence: SentenceItem) => void;
  onStartEdit: (sentence: SentenceItem) => void;
  onAssignSpeaker: (sentence: SentenceItem, speakerName: string) => void;
  onOpenGroupModal: (sentence: SentenceItem) => void;
  onDeleteSentence: (sentence: SentenceItem) => void;
}

export const SentenceContextMenu: React.FC<SentenceContextMenuProps> = ({
  menu,
  characters,
  onClose,
  onAddSilence,
  onInsertBlank,
  onOpenInsertModal,
  onPlaySentence,
  onRegenerate,
  onStartEdit,
  onAssignSpeaker,
  onOpenGroupModal,
  onDeleteSentence,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!menu) return null;

  // Screen boundary positioning
  const menuWidth = 230;
  const menuHeight = 280;
  const posX = Math.min(menu.x, window.innerWidth - menuWidth - 10);
  const posY = Math.min(menu.y, window.innerHeight - menuHeight - 10);

  const isSilence = menu.sentence.clean_text.startsWith("[Khoảng lặng");

  return (
    <div
      ref={menuRef}
      style={{
        left: posX,
        top: posY,
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        boxShadow:
          "0 16px 36px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)",
      }}
      className="fixed z-50 min-w-[220px] border rounded-xl p-1.5 text-xs text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Submenu Silence */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu("silence")}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors font-medium cursor-pointer ${
            activeSubmenu === "silence"
              ? "bg-zinc-700 text-white"
              : "text-zinc-200 hover:bg-zinc-700/80 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2 text-indigo-400">
            <VolumeX className="w-3.5 h-3.5" />
            <span className="text-zinc-100">Khoảng lặng (Silence)</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        </button>

        {/* Nested Silence Submenu */}
        {activeSubmenu === "silence" && (
          <div
            style={{
              backgroundColor: "#18181b",
              borderColor: "#27272a",
              boxShadow:
                "0 16px 36px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)",
            }}
            className="absolute left-full top-0 ml-1 min-w-[190px] border rounded-xl p-1.5 text-xs text-zinc-200"
          >
            <button
              onClick={() => {
                onAddSilence(menu.sentence, "above", 3.0);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
            >
              <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Chèn phía trên (Above)</span>
            </button>
            <button
              onClick={() => {
                onAddSilence(menu.sentence, "below", 3.0);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
            >
              <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>Chèn phía dưới (Below)</span>
            </button>
          </div>
        )}
      </div>

      {/* Submenu Insert Text Paragraph */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu("text")}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors font-medium cursor-pointer ${
            activeSubmenu === "text"
              ? "bg-zinc-700 text-white"
              : "text-zinc-200 hover:bg-zinc-700/80 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2 text-indigo-400">
            <FileText className="w-3.5 h-3.5" />
            <span className="text-zinc-100">Chèn đoạn văn (Text)</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        </button>

        {activeSubmenu === "text" && (
          <div
            style={{
              backgroundColor: "#18181b",
              borderColor: "#27272a",
              boxShadow:
                "0 16px 36px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)",
            }}
            className="absolute left-full top-0 ml-1 min-w-[200px] border rounded-xl p-1.5 text-xs text-zinc-200"
          >
            <button
              onClick={() => {
                onInsertBlank(menu.sentence, "above");
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
            >
              <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Chèn phía trên (Above)</span>
            </button>
            <button
              onClick={() => {
                onInsertBlank(menu.sentence, "below");
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
            >
              <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>Chèn phía dưới (Below)</span>
            </button>
            <div className="my-1 border-t border-[#27272a]" />
            <button
              onClick={() => {
                onOpenInsertModal(menu.sentence);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <FilePlus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Chèn nhiều đoạn...</span>
              </div>
              <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                Ctrl+I
              </kbd>
            </button>
          </div>
        )}
      </div>

      <div className="my-1 border-t border-[#27272a]" />

      {/* Play sentence */}
      {menu.sentence.status === "ready" && (
        <button
          onClick={() => {
            onPlaySentence(menu.sentence);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>Nghe thử câu này</span>
        </button>
      )}

      {/* Regenerate */}
      {!isSilence && (
        <button
          onClick={() => {
            onRegenerate(menu.sentence);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Tái tạo âm thanh câu</span>
        </button>
      )}

      {/* Edit text */}
      {!isSilence && (
        <button
          onClick={() => {
            onStartEdit(menu.sentence);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
        >
          <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Chỉnh sửa nội dung</span>
        </button>
      )}

      {/* Character Casting Submenu */}
      {!isSilence && (
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu("character")}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <button
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
              activeSubmenu === "character"
                ? "bg-zinc-700 text-white"
                : "text-zinc-200 hover:bg-zinc-700/80 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 text-zinc-300">
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Phân vai nhân vật</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {activeSubmenu === "character" && (
            <div
              style={{
                backgroundColor: "#18181b",
                borderColor: "#27272a",
                boxShadow:
                  "0 16px 36px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)",
              }}
              className="absolute left-full top-0 ml-1 min-w-[190px] max-h-64 overflow-y-auto border rounded-xl p-1.5 text-xs text-zinc-200"
            >
              <button
                onClick={() => {
                  onAssignSpeaker(menu.sentence, "");
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
              >
                <span>📖</span>
                <span>Dẫn truyện (Mặc định)</span>
              </button>

              <button
                onClick={() => {
                  onAssignSpeaker(menu.sentence, "Hội Thoại");
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
              >
                <span>💬</span>
                <span>Hội thoại chung</span>
              </button>

              {characters.length > 0 && (
                <>
                  <div className="my-1 border-t border-[#27272a]" />
                  <div className="px-2 py-0.5 text-[10px] uppercase font-semibold text-zinc-500">
                    Nhân vật tùy chỉnh
                  </div>
                  {characters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onAssignSpeaker(menu.sentence, c.name);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="font-medium text-zinc-200">{c.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">{c.voice}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="my-1 border-t border-[#27272a]" />

      {/* Group from here */}
      <button
        onClick={() => {
          onOpenGroupModal(menu.sentence);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
      >
        <Layers className="w-3.5 h-3.5 text-indigo-400" />
        <span>Gom nhóm từ câu này (Ctrl+G)</span>
      </button>

      {/* Delete sentence */}
      <button
        onClick={() => {
          onDeleteSentence(menu.sentence);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-rose-400 hover:text-rose-100 hover:bg-rose-600/25"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Xóa câu này</span>
      </button>
    </div>
  );
};
