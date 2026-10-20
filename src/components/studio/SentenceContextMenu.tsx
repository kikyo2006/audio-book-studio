"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  VolumeX,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Play,
  RotateCcw,
  Edit2,
  Trash2,
  Layers,
  UserCheck,
  ChevronRight,
  FileText,
  FilePlus,
  Sparkles,
  Music,
  CloudRain,
  User,
  Home,
  Swords,
  Car,
  Ghost,
} from "lucide-react";
import { SFX_CATALOG, SfxGroup, SfxItem } from "@/data/sfxCatalog";
import { isNonSpeechSentenceText } from "@/lib/utils";
import type { CharacterProfile, SentenceItem } from "@/types";

export interface ContextMenuState {
  x: number;
  y: number;
  sentence: SentenceItem;
}

interface SentenceContextMenuProps {
  menu: ContextMenuState | null;
  characters: CharacterProfile[];
  totalSentences: number;
  onClose: () => void;
  onAddSilence: (
    sentence: SentenceItem,
    position: "above" | "below",
    durationSecs: number
  ) => void;
  onSelectSfx: (
    sentence: SentenceItem,
    sfxItem: SfxItem,
    position?: "above" | "below"
  ) => void;
  onInsertBlank: (
    sentence: SentenceItem,
    position: "above" | "below"
  ) => void;
  onInsertBgm: (
    sentence: SentenceItem,
    position: "above" | "below"
  ) => void;
  onOpenInsertModal: (sentence: SentenceItem) => void;
  onMoveSentence: (
    sentence: SentenceItem,
    mode: "up" | "down" | "before" | "after",
    targetIdx?: number
  ) => void;
  onOpenMoveModal: (sentence: SentenceItem, mode: "before" | "after") => void;
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
  totalSentences,
  onClose,
  onAddSilence,
  onSelectSfx,
  onInsertBlank,
  onInsertBgm,
  onOpenInsertModal,
  onMoveSentence,
  onOpenMoveModal,
  onPlaySentence,
  onRegenerate,
  onStartEdit,
  onAssignSpeaker,
  onOpenGroupModal,
  onDeleteSentence,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [activeSfxGroupId, setActiveSfxGroupId] = useState<string | null>(null);
  const [activeSfxItemId, setActiveSfxItemId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || !menu) return null;

  // Screen boundary positioning
  const menuWidth = 230;
  const menuHeight = 360;
  const posX = Math.min(Math.max(10, menu.x), window.innerWidth - menuWidth - 10);
  const posY = Math.min(Math.max(10, menu.y), window.innerHeight - menuHeight - 10);

  // Tính toán không gian hiển thị thông minh cho các submenu lồng nhau
  // Tổng chiều rộng khi mở Submenu Nhóm (240px) + Submenu Hiệu ứng chi tiết (320px) ~ 560px
  // Nếu khoảng trống bên phải của menu chính không đủ 560px -> tự động lật hướng sang trái
  const hasEnoughRightSpaceForLevel1 = posX + menuWidth + 250 <= window.innerWidth;
  const hasEnoughRightSpaceForLevel2 = posX + menuWidth + 250 + 320 <= window.innerWidth;

  // Khoảng lặng / hiệu ứng / nhạc nền không có tác vụ tái tạo, sửa chữ hay gán vai
  const isSilence = isNonSpeechSentenceText(menu.sentence.clean_text);

  const getSubmenuStyle = (level: 1 | 2 = 1): React.CSSProperties => {
    const flipLeft = level === 1 ? !hasEnoughRightSpaceForLevel1 : !hasEnoughRightSpaceForLevel2;

    return {
      backgroundColor: "#18181b",
      borderColor: "#3f3f46",
      boxShadow:
        "0 20px 40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)",
      position: "absolute",
      top: 0,
      ...(flipLeft
        ? { right: "100%", marginRight: "6px" }
        : { left: "100%", marginLeft: "6px" }),
      zIndex: level === 1 ? 10000 : 10001,
      minWidth: "230px",
      width: "max-content",
      whiteSpace: "nowrap",
    };
  };

  return createPortal(
    <>
      {/* Invisible backdrop overlay to capture outside clicks & prevent orphan menus */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => {
          onClose();
          setActiveSubmenu(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
          setActiveSubmenu(null);
        }}
      />

      <div
        ref={menuRef}
        style={{
          position: "fixed",
          left: posX,
          top: posY,
          zIndex: 9999,
          backgroundColor: "#18181b",
          borderColor: "#3f3f46",
          boxShadow:
            "0 20px 40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        }}
        className="min-w-[220px] border rounded-xl p-1.5 text-xs text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Submenu Silence */}
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu("silence")}
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
              style={getSubmenuStyle(1)}
              className="border rounded-xl p-1.5 text-xs text-zinc-200 select-none shadow-2xl"
            >
              <button
                onClick={() => {
                  onAddSilence(menu.sentence, "above", 3.0);
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
              >
                <ArrowUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Chèn phía trên (Above)</span>
              </button>
              <button
                onClick={() => {
                  onAddSilence(menu.sentence, "below", 3.0);
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
              >
                <ArrowDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Chèn phía dưới (Below)</span>
              </button>
            </div>
          )}
        </div>

        {/* Submenu Sound Effects (SFX) */}
        <div
          className="relative"
          onMouseEnter={() => {
            setActiveSubmenu("sfx");
            setActiveSfxGroupId(null);
            setActiveSfxItemId(null);
          }}
        >
          <button
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors font-medium cursor-pointer ${
              activeSubmenu === "sfx"
                ? "bg-zinc-700 text-white"
                : "text-zinc-200 hover:bg-zinc-700/80 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 text-purple-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-zinc-100">Hiệu ứng âm thanh (Effect)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* Submenu 1: Danh sách Nhóm lớn */}
          {activeSubmenu === "sfx" && (
            <div
              style={getSubmenuStyle(1)}
              className="border rounded-xl p-1.5 text-xs text-zinc-200 select-none shadow-2xl"
            >
              {SFX_CATALOG.map((group) => {
                const isGroupActive = activeSfxGroupId === group.id;
                const allItems = group.topics.flatMap((t) => t.items);

                return (
                  <div
                    key={group.id}
                    className="relative"
                    onMouseEnter={() => {
                      setActiveSfxGroupId(group.id);
                      setActiveSfxItemId(null);
                    }}
                  >
                    <button
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer whitespace-nowrap ${
                        isGroupActive
                          ? "bg-zinc-700 text-white"
                          : "text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>{group.name}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0 ml-3" />
                    </button>

                    {/* Submenu 2: Từng hiệu ứng chi tiết tiếng Việt */}
                    {isGroupActive && (
                      <div
                        style={{
                          ...getSubmenuStyle(2),
                          minWidth: "260px",
                          maxWidth: "340px",
                          maxHeight: "380px",
                          overflowY: "auto",
                          zIndex: 10001,
                        }}
                        className="border rounded-xl p-1.5 text-xs text-zinc-200 select-none shadow-2xl custom-scrollbar"
                      >
                        {allItems.map((item) => {
                          const isItemActive = activeSfxItemId === item.id;

                          return (
                            <div
                              key={item.id + item.fileName}
                              className="relative"
                              onMouseEnter={() => setActiveSfxItemId(item.id)}
                            >
                              <button
                                onClick={() => {
                                  onSelectSfx(menu.sentence, item, "below");
                                  onClose();
                                  setActiveSubmenu(null);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer whitespace-nowrap ${
                                  isItemActive
                                    ? "bg-purple-900/40 text-purple-200"
                                    : "text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
                                }`}
                                title="Click để mở hộp thoại cắt và chèn âm thanh"
                              >
                                <span className="truncate pr-2 font-medium">
                                  {item.name}
                                </span>
                                <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
                              </button>

                              {/* Submenu 3: Vị trí chèn nhanh Trên/Dưới */}
                              {isItemActive && (
                                <div
                                  style={{
                                    ...getSubmenuStyle(2),
                                    minWidth: "200px",
                                    zIndex: 10003,
                                  }}
                                  className="border rounded-xl p-1.5 text-xs text-zinc-200 select-none shadow-2xl"
                                >
                                  <button
                                    onClick={() => {
                                      onSelectSfx(menu.sentence, item, "above");
                                      onClose();
                                      setActiveSubmenu(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                    <span>Chèn phía trên (Above)</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      onSelectSfx(menu.sentence, item, "below");
                                      onClose();
                                      setActiveSubmenu(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                    <span>Chèn phía dưới (Below)</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submenu Background Music (BGM chèn: BGM tổng của chương tắt tiếng trong lúc dòng này chạy) */}
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu("bgm")}
        >
          <button
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors font-medium cursor-pointer ${
              activeSubmenu === "bgm"
                ? "bg-zinc-700 text-white"
                : "text-zinc-200 hover:bg-zinc-700/80 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 text-emerald-400">
              <Music className="w-3.5 h-3.5 shrink-0" />
              <span className="text-zinc-100">Nhạc nền (BGM)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>

          {activeSubmenu === "bgm" && (
            <div
              style={getSubmenuStyle(1)}
              className="border rounded-xl p-1.5 text-xs text-zinc-200 select-none shadow-2xl"
            >
              <button
                onClick={() => {
                  onInsertBgm(menu.sentence, "above");
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
              >
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Chèn phía trên (Above)</span>
              </button>
              <button
                onClick={() => {
                  onInsertBgm(menu.sentence, "below");
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
              >
                <ArrowDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Chèn phía dưới (Below)</span>
              </button>
            </div>
          )}
        </div>

        {/* Submenu Insert Text Paragraph */}
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu("text")}
        >
          <button
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors font-medium cursor-pointer ${
              activeSubmenu === "text"
                ? "bg-zinc-700 text-white"
                : "text-zinc-200 hover:bg-zinc-700/80 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 text-indigo-400">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="text-zinc-100">Chèn đoạn văn (Text)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>

          {activeSubmenu === "text" && (
            <div
              style={{
                ...getSubmenuStyle(1),
                minWidth: "250px",
              }}
              className="border rounded-xl p-1.5 text-xs text-zinc-200 select-none shadow-2xl"
            >
              <button
                onClick={() => {
                  onInsertBlank(menu.sentence, "above");
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
              >
                <ArrowUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Chèn phía trên (Above)</span>
              </button>
              <button
                onClick={() => {
                  onInsertBlank(menu.sentence, "below");
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
              >
                <ArrowDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Chèn phía dưới (Below)</span>
              </button>
              <div className="my-1 border-t border-[#27272a]" />
              <button
                onClick={() => {
                  onOpenInsertModal(menu.sentence);
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center gap-2.5">
                  <FilePlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Chèn nhiều đoạn...</span>
                </div>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                  Ctrl+I
                </kbd>
              </button>
            </div>
          )}
        </div>

        {/* Submenu Move Sentence */}
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu("move")}
        >
          <button
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors font-medium cursor-pointer ${
              activeSubmenu === "move"
                ? "bg-zinc-700 text-white"
                : "text-zinc-200 hover:bg-zinc-700/80 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 text-indigo-400">
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
              <span className="text-zinc-100">Di chuyển</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>

          {activeSubmenu === "move" && (
            <div
              style={{
                ...getSubmenuStyle(1),
                minWidth: "240px",
              }}
              className="border rounded-xl p-1.5 text-xs text-zinc-200 select-none shadow-2xl"
            >
              <button
                disabled={menu.sentence.index <= 1}
                onClick={() => {
                  onMoveSentence(menu.sentence, "up");
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                title={menu.sentence.index <= 1 ? "Câu đang ở vị trí đầu tiên" : "Hoán đổi vị trí với câu liền kề phía trên"}
              >
                <ArrowUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Chuyển lên trên</span>
              </button>

              <button
                disabled={menu.sentence.index >= totalSentences}
                onClick={() => {
                  onMoveSentence(menu.sentence, "down");
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                title={menu.sentence.index >= totalSentences ? "Câu đang ở vị trí cuối cùng" : "Hoán đổi vị trí với câu liền kề phía dưới"}
              >
                <ArrowDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Chuyển xuống dưới</span>
              </button>

              <div className="my-1 border-t border-[#27272a]" />

              <button
                onClick={() => {
                  onOpenMoveModal(menu.sentence, "before");
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
                title="Dời câu này đến đặt ngay trước một dòng cụ thể"
              >
                <ArrowUpToLine className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Chuyển đến trước dòng...</span>
              </button>

              <button
                onClick={() => {
                  onOpenMoveModal(menu.sentence, "after");
                  onClose();
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
                title="Dời câu này đến đặt ngay sau một dòng cụ thể"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Chuyển đến sau dòng...</span>
              </button>
            </div>
          )}
        </div>

        <div className="my-1 border-t border-[#27272a]" />

        {/* Play sentence */}
        {menu.sentence.status === "ready" && (
          <button
            onMouseEnter={() => setActiveSubmenu(null)}
            onClick={() => {
              onPlaySentence(menu.sentence);
              onClose();
              setActiveSubmenu(null);
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
            onMouseEnter={() => setActiveSubmenu(null)}
            onClick={() => {
              onRegenerate(menu.sentence);
              onClose();
              setActiveSubmenu(null);
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
            onMouseEnter={() => setActiveSubmenu(null)}
            onClick={() => {
              onStartEdit(menu.sentence);
              onClose();
              setActiveSubmenu(null);
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
                  ...getSubmenuStyle(1),
                  minWidth: "240px",
                }}
                className="max-h-64 overflow-y-auto border rounded-xl p-1.5 text-xs text-zinc-200 select-none shadow-2xl"
              >
                <button
                  onClick={() => {
                    onAssignSpeaker(menu.sentence, "");
                    onClose();
                    setActiveSubmenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
                >
                  <span className="shrink-0">📖</span>
                  <span>Dẫn truyện (Mặc định)</span>
                </button>

                <button
                  onClick={() => {
                    onAssignSpeaker(menu.sentence, "Hội Thoại");
                    onClose();
                    setActiveSubmenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
                >
                  <span className="shrink-0">💬</span>
                  <span>Hội thoại chung</span>
                </button>

                {characters.length > 0 && (
                  <>
                    <div className="my-1 border-t border-[#27272a]" />
                    <div className="px-3 py-1 text-[10px] uppercase font-semibold text-zinc-500 whitespace-nowrap">
                      Nhân vật tùy chỉnh
                    </div>
                    {characters.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onAssignSpeaker(menu.sentence, c.name);
                          onClose();
                          setActiveSubmenu(null);
                        }}
                        className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white whitespace-nowrap"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="font-medium text-zinc-200">{c.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0">{c.voice}</span>
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
          onMouseEnter={() => setActiveSubmenu(null)}
          onClick={() => {
            onOpenGroupModal(menu.sentence);
            onClose();
            setActiveSubmenu(null);
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gom nhóm từ câu này (Ctrl+G)</span>
        </button>

        {/* Delete sentence */}
        <button
          onMouseEnter={() => setActiveSubmenu(null)}
          onClick={() => {
            onDeleteSentence(menu.sentence);
            onClose();
            setActiveSubmenu(null);
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-rose-400 hover:text-rose-100 hover:bg-rose-600/25"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa câu này (Delete)</span>
        </button>
      </div>
    </>,
    document.body
  );
};
