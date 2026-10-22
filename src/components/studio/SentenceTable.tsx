"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  RotateCcw,
  MessageSquare,
  FileText,
  AlertCircle,
  Loader2,
  Check,
  Volume2,
  VolumeX,
  Layers,
  FilePlus,
  Plus,
  Sparkles,
  Music,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import { useFindReplaceStore } from "@/stores/useFindReplaceStore";
import { useConfirmStore } from "@/stores/useConfirmStore";
import { useSentenceClipboardStore } from "@/stores/useSentenceClipboardStore";
import {
  tauriAddSilenceSentence,
  tauriAssignSentenceSpeaker,
  tauriCheckTtsConnection,
  tauriDeleteSentence,
  tauriGetChapters,
  tauriGetSentences,
  tauriInsertBlankSentences,
  tauriMoveSentence,
  tauriPasteSentence,
  tauriRegenerateSentence,
  tauriUpdateSentenceText,
  tauriUpdateSilenceDuration,
} from "@/lib/tauri";
import {
  formatDuration,
  isBgmSentenceText,
  isNonSpeechSentenceText,
  MAX_SENTENCE_CHARS,
} from "@/lib/utils";
import type { CharacterProfile, SentenceItem } from "@/types";
import {
  SentenceContextMenu,
  type ContextMenuState,
} from "./SentenceContextMenu";
import { MoveSentenceModal } from "./MoveSentenceModal";
import { InsertSfxModal } from "./InsertSfxModal";
import { InsertBgmModal } from "./InsertBgmModal";
import type { SfxItem } from "@/data/sfxCatalog";

interface SentenceRowProps {
  item: SentenceItem;
  isSelected: boolean;
  isPlayingThis: boolean;
  isEditing: boolean;
  editText: string;
  characters: CharacterProfile[];
  isServerOnline: boolean;
  searchQuery?: string;
  matchCase?: boolean;
  onRowClick: (item: SentenceItem) => void;
  onContextMenu: (e: React.MouseEvent, item: SentenceItem) => void;
  onStartEdit: (item: SentenceItem) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditTextChange: (text: string) => void;
  onRegenerate: (item: SentenceItem) => void;
  onPlaySentence: (item: SentenceItem) => void;
  onAssignSpeaker: (item: SentenceItem, charName: string) => void;
  onUpdateSilenceDuration: (item: SentenceItem, newDuration: number) => void;
}

function renderHighlightedText(
  text: string,
  query?: string,
  matchCase?: boolean
): React.ReactNode {
  if (!query || !query.trim()) return text;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, matchCase ? "g" : "gi");
    const parts = text.split(regex);
    if (parts.length <= 1) return text;
    return parts.map((part, idx) => {
      const isMatch = matchCase
        ? part === query
        : part.toLowerCase() === query.toLowerCase();
      return isMatch ? (
        <mark
          key={idx}
          className="bg-amber-400/40 text-amber-100 px-0.5 rounded border border-amber-500/50 font-medium"
        >
          {part}
        </mark>
      ) : (
        part
      );
    });
  } catch {
    return text;
  }
}

const SentenceRow = memo(function SentenceRow({
  item,
  isSelected,
  isPlayingThis,
  isEditing,
  editText,
  characters,
  isServerOnline,
  searchQuery,
  matchCase,
  onRowClick,
  onContextMenu,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
  onRegenerate,
  onPlaySentence,
  onAssignSpeaker,
  onUpdateSilenceDuration,
}: SentenceRowProps) {
  const isSilence = Boolean(item.clean_text?.startsWith("[Khoảng lặng"));
  const isSfx = Boolean(item.clean_text?.startsWith("[Hiệu ứng:"));
  const isBgm = isBgmSentenceText(item.clean_text);
  const isTooLong = editText.trim().length > MAX_SENTENCE_CHARS;
  const [durationInput, setDurationInput] = useState<string>(
    item.duration ? String(item.duration) : "3.0"
  );

  useEffect(() => {
    if (item.duration !== undefined) {
      setDurationInput(String(item.duration));
    }
  }, [item.duration]);

  const handleDurationBlur = () => {
    const val = parseFloat(durationInput);
    if (!isNaN(val) && val > 0 && Math.abs(val - (item.duration || 0)) > 0.05) {
      onUpdateSilenceDuration(item, val);
    } else {
      setDurationInput(String(item.duration || 3.0));
    }
  };

  return (
    <div
      onClick={() => onRowClick(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      className={`p-3 rounded-lg border transition-all flex flex-col gap-2 ${
        isSilence
          ? isPlayingThis
            ? "bg-indigo-950/60 border-indigo-400 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-400/50"
            : isSelected
            ? "bg-indigo-950/30 border-indigo-500/60 border-dashed"
            : "bg-zinc-950/40 hover:bg-zinc-900/60 border-zinc-800 border-dashed"
          : isBgm
          ? isPlayingThis
            ? "bg-emerald-950/60 border-emerald-400 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/50"
            : isSelected
            ? "bg-emerald-950/40 border-emerald-500/60"
            : "bg-emerald-950/15 hover:bg-emerald-950/30 border-emerald-500/30"
          : isSfx
          ? isPlayingThis
            ? "bg-purple-950/60 border-purple-400 shadow-md shadow-purple-500/20 ring-1 ring-purple-400/50"
            : isSelected
            ? "bg-purple-950/40 border-purple-500/60"
            : "bg-purple-950/15 hover:bg-purple-950/30 border-purple-500/30"
          : isPlayingThis
          ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50"
          : isSelected
          ? "bg-zinc-800/80 border-zinc-700"
          : "bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/60"
      }`}
    >
      {/* Row Header: Index, Badge, Duration, Status, Actions */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-500 text-[11px] w-6">
            #{item.index.toString().padStart(2, "0")}
          </span>

          {/* Silence Badge with Inline Duration Input */}
          {isSilence ? (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <VolumeX className="w-3 h-3 text-indigo-400" />
                Khoảng lặng (Silence)
              </span>

              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-700/80 rounded px-1.5 py-0.5">
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="300"
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={handleDurationBlur}
                  className="w-12 bg-transparent text-[11px] font-mono text-zinc-100 text-center focus:outline-none focus:text-indigo-400"
                  title="Nhập số giây khoảng lặng (bấm Enter để cập nhật sóng âm)"
                />
                <span className="text-[10px] text-zinc-500 font-mono">
                  giây (s)
                </span>
              </div>
            </div>
          ) : isBgm ? (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Music className="w-3 h-3 text-emerald-400" />
                Nhạc nền (BGM)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-zinc-950 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                {item.duration ? `${item.duration.toFixed(1)}s` : "0.0s"}
              </span>
            </div>
          ) : isSfx ? (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Hiệu ứng âm thanh (SFX)
              </span>
              <span className="text-[10px] font-mono text-purple-400 bg-zinc-950 border border-purple-500/20 px-1.5 py-0.5 rounded">
                {item.duration ? `${item.duration.toFixed(1)}s` : "0.0s"}
              </span>
            </div>
          ) : (
            /* Role / Character Selector */
            <div
              className="flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <select
                value={
                  item.speaker
                    ? item.speaker
                    : item.is_dialogue
                    ? "Hội Thoại"
                    : ""
                }
                onChange={(e) => onAssignSpeaker(item, e.target.value)}
                className="text-[10px] bg-zinc-950 border border-zinc-700/80 rounded px-1.5 py-0.5 text-zinc-300 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="">📖 Dẫn truyện</option>
                <option value="Hội Thoại">💬 Hội thoại</option>
                {characters.length > 0 && (
                  <optgroup label="Nhân vật tùy chỉnh">
                    {characters.map((c) => (
                      <option key={c.id} value={c.name}>
                        👤 {c.name} ({c.voice})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {item.speaker && !isSilence && (
            item.speaker === "Hội Thoại" ? (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 bg-purple-500/10 border-purple-500/30 text-purple-300">
                <MessageSquare className="w-2.5 h-2.5" />
                Hội thoại
              </span>
            ) : (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 text-white"
                style={{
                  backgroundColor: `${
                    characters.find((c) => c.name === item.speaker)?.color ||
                    "#6366f1"
                  }20`,
                  borderColor: `${
                    characters.find((c) => c.name === item.speaker)?.color ||
                    "#6366f1"
                  }60`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      characters.find((c) => c.name === item.speaker)?.color ||
                      "#6366f1",
                  }}
                />
                {item.speaker}
              </span>
            )
          )}

          {item.voice && !isSilence && (
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Volume2 className="w-2.5 h-2.5" />
              {item.voice}
            </span>
          )}
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2">
          {/* Status badge */}
          {item.status === "ready" && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <Check className="w-3 h-3" />
              {formatDuration(item.duration || 0)}
            </span>
          )}

          {item.status === "generating" && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Đang tạo...
            </span>
          )}

          {item.status === "error" && (
            <span
              className="flex items-center gap-1 text-[11px] text-rose-400"
              title={item.error_message || "Lỗi tạo giọng đọc"}
            >
              <AlertCircle className="w-3 h-3" />
              Lỗi
            </span>
          )}

          {item.status === "pending" && !isSilence && !isSfx && !isBgm && (
            <span className="text-[11px] text-zinc-500">Chưa tạo</span>
          )}

          {/* Play Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlaySentence(item);
            }}
            disabled={item.status === "generating"}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title={
              isSilence
                ? `Nghe thử khoảng lặng (${item.duration}s)`
                : isBgm
                ? `Nghe thử nhạc nền (${item.duration?.toFixed(1)}s)`
                : isSfx
                ? `Nghe thử hiệu ứng âm thanh (${item.duration?.toFixed(1)}s)`
                : item.status === "ready"
                ? "Nghe câu này"
                : "Tạo giọng và phát câu này (TTS)"
            }
          >
            {item.status === "generating" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          {/* Regenerate Button */}
          {!isSilence && !isSfx && !isBgm && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate(item);
              }}
              disabled={!isServerOnline || item.status === "generating"}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-indigo-400 disabled:opacity-30 cursor-pointer"
              title="Tái tạo âm thanh cho câu này (Ctrl+Enter)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sentence Body / Inline Editor / Silence Visualizer / SFX Visualizer */}
      {isSilence ? (
        <div
          className="flex items-center gap-2 py-1.5 px-3 rounded bg-zinc-950/60 border border-dashed border-zinc-800/90 text-zinc-500 text-xs font-mono select-none"
          title="Nhấp chuột phải vào đây để chèn thêm hoặc xóa khoảng lặng"
        >
          <VolumeX className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <div className="flex-1 border-t border-dashed border-zinc-800" />
          <span className="text-[11px] text-zinc-400">
            Sóng âm im lặng tuyệt đối {item.duration || 3.0} giây
          </span>
          <div className="flex-1 border-t border-dashed border-zinc-800" />
        </div>
      ) : isBgm ? (
        <div
          className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-xs select-none"
          title="Nhấp chuột phải vào đây để chèn thêm hoặc xóa nhạc nền"
        >
          <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Music className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-emerald-100 truncate text-[13px]">
              {item.clean_text.replace(/^\[Nhạc nền:\s*/, "").replace(/\s*\([\d.]+s\)]$/, "")}
            </div>
            <div className="text-[11px] text-emerald-400/80 font-mono flex items-center gap-2">
              <span>Thời lượng phát: {item.duration ? `${item.duration.toFixed(2)}s` : "0.0s"}</span>
              <span>•</span>
              <span className="text-zinc-500">BGM tổng của chương tắt tiếng trong đoạn này</span>
            </div>
          </div>
        </div>
      ) : isSfx ? (
        <div
          className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-purple-950/20 border border-purple-500/30 text-purple-200 text-xs select-none"
          title="Nhấp chuột phải vào đây để chèn thêm hoặc xóa hiệu ứng"
        >
          <div className="w-6 h-6 rounded bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-purple-100 truncate text-[13px]">
              {item.clean_text.replace(/^\[Hiệu ứng:\s*/, "").replace(/\s*\([\d.]+s\)]$/, "")}
            </div>
            <div className="text-[11px] text-purple-400/80 font-mono flex items-center gap-2">
              <span>Thời lượng phát: {item.duration ? `${item.duration.toFixed(2)}s` : "0.0s"}</span>
              <span>•</span>
              <span className="text-zinc-500">Đã tích hợp vào timeline toàn chương</span>
            </div>
          </div>
        </div>
      ) : isEditing ? (
        <div
          className="flex flex-col gap-2 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (isTooLong) return;
                onSaveEdit(item.id);
                onRegenerate({ ...item, clean_text: editText });
              } else if (e.key === "Escape") {
                onCancelEdit();
              }
            }}
            rows={2}
            className={`w-full p-2 bg-zinc-950 border rounded text-sm text-zinc-100 focus:outline-none focus:ring-1 font-sans resize-none ${
              isTooLong
                ? "border-rose-500 focus:ring-rose-500"
                : "border-indigo-500 focus:ring-indigo-500"
            }`}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              className={`font-mono text-[11px] ${
                isTooLong ? "text-rose-400 font-semibold" : "text-zinc-500"
              }`}
              title={`Mỗi câu tối đa ${MAX_SENTENCE_CHARS} ký tự`}
            >
              {editText.length}/{MAX_SENTENCE_CHARS}
              {isTooLong ? " - Câu quá dài, hãy tách thành nhiều câu" : ""}
            </span>
            <div className="flex gap-2">
            <button
              onClick={onCancelEdit}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              Huỷ
            </button>
            <button
              onClick={() => onSaveEdit(item.id)}
              disabled={isTooLong}
              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
            >
              Lưu thay đổi
            </button>
            </div>
          </div>
        </div>
      ) : (
        <p
          onDoubleClick={() => onStartEdit(item)}
          className={`text-sm leading-relaxed cursor-text transition-colors ${
            isPlayingThis
              ? "text-indigo-200 font-medium"
              : item.status === "ready"
              ? "text-zinc-200"
              : "text-zinc-400"
          }`}
          style={{ minHeight: 24 }}
          title="Nhấp đúp chuột để chỉnh sửa văn bản câu"
        >
          {(item.clean_text || item.raw_text || "").trim() ? (
            renderHighlightedText(item.clean_text || item.raw_text || "", searchQuery, matchCase)
          ) : (
            <span className="italic text-zinc-600">
              Câu trống - nhấp đúp để nhập nội dung...
            </span>
          )}
        </p>
      )}
    </div>
  );
});

interface SentenceTableProps {
  onOpenSplitChapter?: () => void;
  onOpenInsertModal?: () => void;
}

export const SentenceTable: React.FC<SentenceTableProps> = ({
  onOpenSplitChapter,
  onOpenInsertModal,
}) => {
  const {
    activeProject,
    activeChapter,
    sentences,
    characters,
    selectedSentenceId,
    playingSentenceId,
    setChapters,
    setSentences,
    setSelectedSentenceId,
    setPlayingSentenceId,
    setIsPlaying,
    updateSentenceStatus,
    updateSentenceAudio,
    clearSentenceAudio,
    updateSentenceText,
    assignSpeakerToSentence,
  } = useProjectStore();

  const {
    serverUrl,
    selectedVoice,
    dialogueVoice,
    speed,
    temperature,
    isServerOnline,
    setIsServerOnline,
  } = useStudioSettingsStore();

  const { searchQuery, matchCase, registerScrollCallback } =
    useFindReplaceStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [moveModal, setMoveModal] = useState<{
    isOpen: boolean;
    sentence: SentenceItem | null;
    mode: "before" | "after";
  }>({
    isOpen: false,
    sentence: null,
    mode: "before",
  });
  const [bgmModal, setBgmModal] = useState<{
    isOpen: boolean;
    sentence: SentenceItem | null;
    position: "above" | "below";
  }>({
    isOpen: false,
    sentence: null,
    position: "below",
  });
  const [sfxModal, setSfxModal] = useState<{
    isOpen: boolean;
    sentence: SentenceItem | null;
    sfxItem: SfxItem | null;
    position: "above" | "below";
  }>({
    isOpen: false,
    sentence: null,
    sfxItem: null,
    position: "below",
  });
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: sentences.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 10,
    // Key measured heights by sentence id (not index) so inserting / deleting rows
    // doesn't leave stale heights behind and create gaps or overlaps
    getItemKey: (index) => sentences[index]?.id ?? index,
  });

  // Register smooth scroll callback for Find & Replace dialog
  useEffect(() => {
    registerScrollCallback((index: number) => {
      rowVirtualizer.scrollToIndex(index, {
        align: "center",
        behavior: "smooth",
      });
    });
    return () => registerScrollCallback(null);
  }, [rowVirtualizer, registerScrollCallback]);

  // Auto-scroll teleprompter to keep the currently playing sentence visible.
  // Only reacts to the playing sentence changing, NOT to list edits (insert / delete / paste),
  // otherwise every edit above would yank the view back to the playing row.
  const sentencesForScrollRef = useRef(sentences);
  useEffect(() => {
    sentencesForScrollRef.current = sentences;
  }, [sentences]);

  useEffect(() => {
    if (playingSentenceId) {
      const index = sentencesForScrollRef.current.findIndex((s) => s.id === playingSentenceId);
      if (index !== -1) {
        rowVirtualizer.scrollToIndex(index, {
          align: "center",
          behavior: "smooth",
        });
      }
    }
  }, [playingSentenceId, rowVirtualizer]);

  const handleRowClick = useCallback(
    (sentence: SentenceItem) => {
      setSelectedSentenceId(sentence.id);
    },
    [setSelectedSentenceId]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: SentenceItem) => {
      e.preventDefault();
      setSelectedSentenceId(item.id);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        sentence: item,
      });
    },
    [setSelectedSentenceId]
  );

  const handleStartEdit = useCallback((sentence: SentenceItem) => {
    // Khoảng lặng / hiệu ứng / nhạc nền không sửa chữ được (chữ chỉ là nhãn hiển thị)
    if (isNonSpeechSentenceText(sentence.clean_text)) return;
    setEditingId(sentence.id);
    setEditText(sentence.clean_text);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleEditTextChange = useCallback((text: string) => {
    setEditText(text);
  }, []);

  const handleSaveEdit = useCallback(
    async (sentenceId: string) => {
      if (!editText.trim()) return;
      if (editText.trim().length > MAX_SENTENCE_CHARS) return;
      updateSentenceText(sentenceId, editText.trim());
      setEditingId(null);
      try {
        await tauriUpdateSentenceText(sentenceId, editText.trim());
      } catch (err) {
        console.error("Lỗi cập nhật nội dung câu:", err);
      }
    },
    [editText, updateSentenceText]
  );

  const handleRegenerate = useCallback(
    async (sentence: SentenceItem) => {
      if (!activeProject) return;
      // Khoảng lặng / hiệu ứng không đọc bằng TTS (tránh đọc thành tiếng "Khoảng lặng 45 giây")
      if (isNonSpeechSentenceText(sentence.clean_text)) return;

      // Nếu đang báo offline, thử ping nhanh xem server đã dậy chưa
      let online = isServerOnline;
      if (!online) {
        online = await tauriCheckTtsConnection(serverUrl);
        if (online) setIsServerOnline(true);
      }
      if (!online) {
        alert("Server VieNeu-TTS chưa sẵn sàng (Offline). Vui lòng kiểm tra lại server port 8880!");
        return;
      }

      const voiceToUse =
        sentence.voice ||
        (sentence.is_dialogue ? (dialogueVoice || "Thảo Nhi") : selectedVoice);

      // 1. Unload và reset trạng thái âm thanh cũ ngay lập tức
      clearSentenceAudio(sentence.id);
      setSelectedSentenceId(sentence.id);
      if (playingSentenceId === sentence.id) {
        setIsPlaying(false);
        setPlayingSentenceId(null);
      }

      try {
        // 2. Chờ TTS xử lý và ghi file âm thanh mới
        const res = await tauriRegenerateSentence({
          sentenceId: sentence.id,
          projectId: activeProject.id,
          text: sentence.clean_text,
          voice: voiceToUse,
          speed: sentence.speed || speed,
          temperature: sentence.temperature ?? temperature,
          serverUrl,
        });

        // 3. Nạp file mới vào câu và tự động kích hoạt phát
        updateSentenceAudio(sentence.id, res.audio_path, res.duration, voiceToUse);
        setPlayingSentenceId(sentence.id);
        setIsPlaying(true);
      } catch (err) {
        updateSentenceStatus(
          sentence.id,
          "error",
          err instanceof Error ? err.message : String(err)
        );
      }
    },
    [
      activeProject,
      clearSentenceAudio,
      dialogueVoice,
      isServerOnline,
      playingSentenceId,
      selectedVoice,
      serverUrl,
      setIsPlaying,
      setIsServerOnline,
      setPlayingSentenceId,
      setSelectedSentenceId,
      speed,
      temperature,
      updateSentenceAudio,
      updateSentenceStatus,
    ]
  );

  const handlePlaySentence = useCallback(
    async (sentence: SentenceItem) => {
      setSelectedSentenceId(sentence.id);

      // Nếu câu đã có âm thanh sẵn sàng -> chỉ việc phát
      // (khoảng lặng / hiệu ứng đã có file audio thì luôn phát file đó, không bao giờ gửi TTS)
      if (
        sentence.status === "ready" ||
        (isNonSpeechSentenceText(sentence.clean_text) && sentence.audio_path)
      ) {
        setPlayingSentenceId(sentence.id);
        setIsPlaying(true);
        return;
      }
      if (isNonSpeechSentenceText(sentence.clean_text)) return;

      if (!activeProject) return;

      // Nếu đang báo offline, thử ping nhanh xem server đã dậy chưa
      let online = isServerOnline;
      if (!online) {
        online = await tauriCheckTtsConnection(serverUrl);
        if (online) setIsServerOnline(true);
      }
      if (!online) {
        alert("Server VieNeu-TTS chưa sẵn sàng (Offline). Vui lòng kiểm tra lại server port 8880!");
        return;
      }

      const voiceToUse =
        sentence.voice ||
        (sentence.is_dialogue ? (dialogueVoice || "Thảo Nhi") : selectedVoice);

      updateSentenceStatus(sentence.id, "generating");
      try {
        const res = await tauriRegenerateSentence({
          sentenceId: sentence.id,
          projectId: activeProject.id,
          text: sentence.clean_text,
          voice: voiceToUse,
          speed: sentence.speed || speed,
          temperature: sentence.temperature ?? temperature,
          serverUrl,
        });
        updateSentenceAudio(sentence.id, res.audio_path, res.duration, voiceToUse);
        // Sau khi tạo xong, tự động kích hoạt phát câu này ngay lập tức
        setPlayingSentenceId(sentence.id);
        setIsPlaying(true);
      } catch (err) {
        updateSentenceStatus(
          sentence.id,
          "error",
          err instanceof Error ? err.message : String(err)
        );
      }
    },
    [
      activeProject,
      dialogueVoice,
      isServerOnline,
      selectedVoice,
      serverUrl,
      setIsPlaying,
      setIsServerOnline,
      setPlayingSentenceId,
      setSelectedSentenceId,
      speed,
      temperature,
      updateSentenceAudio,
      updateSentenceStatus,
    ]
  );

  const handleAssignSpeaker = useCallback(
    async (item: SentenceItem, chosenName: string) => {
      let voice = selectedVoice;
      let charSpeed = speed;
      let charTemp = temperature;
      let charColor = "#6366f1";
      let speakerValue = chosenName;

      if (chosenName === "Hội Thoại") {
        voice = dialogueVoice || "Thảo Nhi";
        charColor = "#a855f7";
      } else if (chosenName && chosenName !== "Dẫn Truyện") {
        const found = characters.find((c) => c.name === chosenName);
        if (found) {
          voice = found.voice;
          charSpeed = found.speed;
          charTemp = found.temperature;
          charColor = found.color;
        }
      } else {
        speakerValue = "";
      }

      assignSpeakerToSentence(item.id, {
        id: "",
        project_id: "",
        name: speakerValue,
        voice,
        speed: charSpeed,
        temperature: charTemp,
        color: charColor,
        is_narrator: speakerValue === "",
      });

      try {
        await tauriAssignSentenceSpeaker({
          sentenceId: item.id,
          speaker: speakerValue,
          voice,
          speed: charSpeed,
          temperature: charTemp,
        });
      } catch (err) {
        console.error("Lỗi gán nhân vật:", err);
      }
    },
    [
      characters,
      dialogueVoice,
      selectedVoice,
      speed,
      temperature,
      assignSpeakerToSentence,
    ]
  );

  const handleAddSilence = useCallback(
    async (
      targetSentence: SentenceItem,
      position: "above" | "below",
      durationSecs: number
    ) => {
      if (!activeProject || !activeChapter) return;
      try {
        const newSent = await tauriAddSilenceSentence({
          projectId: activeProject.id,
          chapterId: activeChapter.id,
          targetSentenceId: targetSentence.id,
          position,
          durationSecs,
        });

        const refreshed = await tauriGetSentences(activeChapter.id);
        setSentences(refreshed);
        setSelectedSentenceId(newSent.id);

        const updatedChapters = await tauriGetChapters(activeProject.id);
        setChapters(updatedChapters);
      } catch (err) {
        console.error("Lỗi chèn khoảng lặng:", err);
        alert(err instanceof Error ? err.message : String(err));
      }
    },
    [
      activeProject,
      activeChapter,
      setSentences,
      setSelectedSentenceId,
      setChapters,
    ]
  );

  const handleInsertBlank = useCallback(
    async (targetSentence: SentenceItem, position: "above" | "below") => {
      if (!activeProject || !activeChapter) return;
      try {
        const created = await tauriInsertBlankSentences({
          chapterId: activeChapter.id,
          targetSentenceId: targetSentence.id,
          position,
          count: 1,
        });

        const refreshed = await tauriGetSentences(activeChapter.id);
        setSentences(refreshed);

        const updatedChapters = await tauriGetChapters(activeProject.id);
        setChapters(updatedChapters);

        if (created.length > 0) {
          const first = created[0];
          setSelectedSentenceId(first.id);
          setEditingId(first.id);
          setEditText("");
        }
      } catch (err) {
        console.error("Lỗi chèn đoạn văn:", err);
        alert(err instanceof Error ? err.message : String(err));
      }
    },
    [
      activeProject,
      activeChapter,
      setSentences,
      setSelectedSentenceId,
      setChapters,
    ]
  );

  const handleUpdateSilenceDuration = useCallback(
    async (sentence: SentenceItem, newDuration: number) => {
      if (!activeProject || !activeChapter) return;
      try {
        await tauriUpdateSilenceDuration({
          projectId: activeProject.id,
          sentenceId: sentence.id,
          durationSecs: newDuration,
        });
        // updateSentenceText đặt status = "pending" nên phải gọi trước updateSentenceAudio (đặt lại "ready"),
        // nếu không câu khoảng lặng bị coi là chưa tạo và bị gửi cho TTS đọc
        updateSentenceText(
          sentence.id,
          `[Khoảng lặng ${newDuration.toFixed(1)}s]`
        );
        updateSentenceAudio(sentence.id, sentence.audio_path || "", newDuration);

        const updatedChapters = await tauriGetChapters(activeProject.id);
        setChapters(updatedChapters);
      } catch (err) {
        console.error("Lỗi cập nhật số giây khoảng lặng:", err);
      }
    },
    [activeProject, activeChapter, updateSentenceAudio, updateSentenceText, setChapters]
  );

  const handleMoveSentence = useCallback(
    async (
      sentence: SentenceItem,
      mode: "up" | "down" | "before" | "after",
      targetIdx?: number
    ) => {
      if (!activeChapter) return;
      try {
        const updated = await tauriMoveSentence({
          chapterId: activeChapter.id,
          sentenceId: sentence.id,
          targetMode: mode,
          targetIdx,
        });
        if (updated && updated.length > 0) {
          setSentences(updated);
          setSelectedSentenceId(sentence.id);
        }
      } catch (err) {
        console.error("Lỗi di chuyển câu:", err);
        alert(err instanceof Error ? err.message : String(err));
      }
    },
    [activeChapter, setSentences, setSelectedSentenceId]
  );

  const handleOpenMoveModal = useCallback(
    (sentence: SentenceItem, mode: "before" | "after") => {
      setMoveModal({
        isOpen: true,
        sentence,
        mode,
      });
    },
    []
  );

  const handleSelectSfx = useCallback(
    (
      sentence: SentenceItem,
      sfxItem: SfxItem,
      position: "above" | "below" = "below"
    ) => {
      setSfxModal({
        isOpen: true,
        sentence,
        sfxItem,
        position,
      });
    },
    []
  );

  const handleInsertBgm = useCallback(
    (sentence: SentenceItem, position: "above" | "below" = "below") => {
      setBgmModal({ isOpen: true, sentence, position });
    },
    []
  );

  const { askConfirm } = useConfirmStore();

  const handleDeleteSentence = useCallback(
    (sentence: SentenceItem) => {
      if (!activeChapter || !activeProject) return;
      const isSilence = Boolean(sentence.clean_text?.startsWith("[Khoảng lặng"));
      const isSfx = Boolean(sentence.clean_text?.startsWith("[Hiệu ứng:"));
      const isBgm = isBgmSentenceText(sentence.clean_text);
      const title = isSilence
        ? "Xác Nhận Xóa Khoảng Lặng"
        : isSfx
        ? "Xác Nhận Xóa Hiệu Ứng"
        : isBgm
        ? "Xác Nhận Xóa Nhạc Nền"
        : "Xác Nhận Xóa Câu";
      const desc = isSilence
        ? "Bạn có chắc chắn muốn xóa khoảng lặng này khỏi kịch bản?"
        : isSfx
        ? `Bạn có chắc muốn xóa hiệu ứng: "${sentence.clean_text}" khỏi kịch bản?`
        : isBgm
        ? `Bạn có chắc muốn xóa nhạc nền: "${sentence.clean_text}" khỏi kịch bản?`
        : `Bạn có chắc muốn xóa câu thoại: "${(sentence.clean_text || sentence.raw_text || "").slice(0, 60)}..."?`;
      const confirmText = isSfx
        ? "Xóa Hiệu Ứng"
        : isBgm
        ? "Xóa Nhạc Nền"
        : isSilence
        ? "Xóa Khoảng Lặng"
        : "Xóa Câu";

      askConfirm({
        title,
        description: desc,
        confirmText,
        isDestructive: true,
        onConfirm: async () => {
          try {
            await tauriDeleteSentence(sentence.id);
            const refreshed = await tauriGetSentences(activeChapter.id);
            setSentences(refreshed);
            const updatedChapters = await tauriGetChapters(activeProject.id);
            setChapters(updatedChapters);
          } catch (err) {
            console.error("Lỗi xóa câu:", err);
          }
        },
      });
    },
    [activeChapter, activeProject, setSentences, setChapters, askConfirm]
  );

  const handleCopySentence = useCallback((sentence: SentenceItem) => {
    useSentenceClipboardStore.getState().setCopiedSentenceId(sentence.id);
  }, []);

  // Paste = insert a duplicate right below the target sentence (works for every sentence type)
  const handlePasteSentence = useCallback(
    async (targetSentence: SentenceItem) => {
      if (!activeProject || !activeChapter) return;
      const sourceId = useSentenceClipboardStore.getState().copiedSentenceId;
      if (!sourceId) return;
      try {
        const created = await tauriPasteSentence({
          projectId: activeProject.id,
          sourceSentenceId: sourceId,
          targetSentenceId: targetSentence.id,
        });
        const refreshed = await tauriGetSentences(activeChapter.id);
        setSentences(refreshed);
        setSelectedSentenceId(created.id);
        const updatedChapters = await tauriGetChapters(activeProject.id);
        setChapters(updatedChapters);
      } catch (err) {
        console.error("Lỗi dán câu:", err);
        alert(err instanceof Error ? err.message : String(err));
      }
    },
    [activeProject, activeChapter, setSentences, setSelectedSentenceId, setChapters]
  );

  // Ctrl+C / Ctrl+V on sentences. Skipped while typing or when text is selected,
  // so normal text copy/paste keeps working.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.shiftKey) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "c" && key !== "v") return;
      if (!selectedSentenceId || editingId) return;
      if (contextMenu || moveModal.isOpen || sfxModal.isOpen || bgmModal.isOpen) return;
      if (useConfirmStore.getState().isOpen) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable)
      ) {
        return;
      }
      if (target && target !== document.body && !parentRef.current?.contains(target)) {
        return;
      }
      // Let the browser copy highlighted text
      if (key === "c" && (window.getSelection()?.toString() ?? "") !== "") return;

      const sentence = sentences.find((s) => s.id === selectedSentenceId);
      if (!sentence) return;

      if (key === "c") {
        e.preventDefault();
        handleCopySentence(sentence);
      } else if (useSentenceClipboardStore.getState().copiedSentenceId) {
        e.preventDefault();
        handlePasteSentence(sentence);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedSentenceId,
    editingId,
    contextMenu,
    moveModal.isOpen,
    sfxModal.isOpen,
    bgmModal.isOpen,
    sentences,
    handleCopySentence,
    handlePasteSentence,
  ]);

  // Phím Delete: xóa câu đang chọn (giống menu chuột phải "Xóa câu này")
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" || e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (!selectedSentenceId || editingId) return;
      if (contextMenu || moveModal.isOpen || sfxModal.isOpen || bgmModal.isOpen) return;
      if (useConfirmStore.getState().isOpen) return;

      // Không bắt phím khi đang gõ ở ô nhập liệu
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable)
      ) {
        return;
      }
      // Chỉ nhận khi focus đang ở nền trang hoặc trong bảng câu (tránh xóa nhầm khi đang ở dialog khác)
      if (target && target !== document.body && !parentRef.current?.contains(target)) {
        return;
      }

      const sentence = sentences.find((s) => s.id === selectedSentenceId);
      if (!sentence) return;
      e.preventDefault();
      handleDeleteSentence(sentence);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedSentenceId,
    editingId,
    contextMenu,
    moveModal.isOpen,
    sfxModal.isOpen,
    bgmModal.isOpen,
    sentences,
    handleDeleteSentence,
  ]);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
      }}
      className="flex-1 min-w-0 flex flex-col h-full bg-zinc-900/30 overflow-hidden relative"
    >
      {/* Chapter Title Bar (Clean, uncluttered, professional) */}
      <div
        style={{ paddingLeft: 15 }}
        className="py-2.5 pr-5 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between select-none"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            {activeChapter ? activeChapter.title : "Chưa chọn chương"}
          </h2>
          {sentences.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
              {sentences.length} câu
            </span>
          )}
          {activeChapter && sentences.length > 0 && (
            <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline-block">
              • {sentences.filter((s) => s.status === "ready").length}/{sentences.length} câu đã có âm thanh
            </span>
          )}
        </div>
      </div>

      {/* Script Virtual Table / List */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto p-3"
        style={{ contain: "strict" }}
      >
        {sentences.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 select-none">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-400 shadow-sm">
              <FilePlus className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-200">
              {activeChapter
                ? `Chương "${activeChapter.title?.trim() || `Chương ${activeChapter.index}`}" đang rỗng`
                : "Chưa có dữ liệu câu"}
            </p>
            <p className="text-xs mt-1 text-zinc-500 max-w-sm">
              Chương này hiện chưa có dòng thoại nào. Bạn có thể thêm câu mới để tự do nhập kịch bản hoặc lời thoại tùy ý.
            </p>
            {activeChapter && (
              <div className="flex items-center gap-2 mt-5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await tauriInsertBlankSentences({
                        chapterId: activeChapter.id,
                        position: "before",
                        targetIndex: 1,
                        count: 1,
                      });
                      const refreshed = await tauriGetSentences(activeChapter.id);
                      setSentences(refreshed);
                      if (refreshed.length > 0) {
                        setSelectedSentenceId(refreshed[0].id);
                        handleStartEdit(refreshed[0]);
                      }
                      if (activeProject) {
                        const refreshedChaps = await tauriGetChapters(activeProject.id);
                        setChapters(refreshedChaps);
                      }
                    } catch (err) {
                      console.error("Lỗi thêm câu trống đầu tiên:", err);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm câu thoại đầu tiên</span>
                </button>
                {onOpenInsertModal && (
                  <button
                    type="button"
                    onClick={onOpenInsertModal}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Chèn đoạn văn bản...</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = sentences[virtualRow.index];
              if (!item) return null;

              const isSelected = selectedSentenceId === item.id;
              const isPlayingThis = playingSentenceId === item.id;
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  data-index={virtualRow.index}
                  // Ref inline (đổi identity mỗi lần render) để React gọi lại và đo lại chiều cao
                  // ngay khi dòng bung ra/thu gọn lúc vào/thoát chế độ sửa, tránh dòng dưới bị đè
                  ref={(el) => rowVirtualizer.measureElement(el)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: "8px",
                  }}
                >
                  <SentenceRow
                    item={item}
                    isSelected={isSelected}
                    isPlayingThis={isPlayingThis}
                    isEditing={isEditing}
                    editText={editText}
                    characters={characters}
                    isServerOnline={isServerOnline}
                    searchQuery={searchQuery}
                    matchCase={matchCase}
                    onRowClick={handleRowClick}
                    onContextMenu={handleContextMenu}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onEditTextChange={handleEditTextChange}
                    onRegenerate={handleRegenerate}
                    onPlaySentence={handlePlaySentence}
                    onAssignSpeaker={handleAssignSpeaker}
                    onUpdateSilenceDuration={handleUpdateSilenceDuration}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu Overlay */}
      <SentenceContextMenu
        menu={contextMenu}
        characters={characters}
        totalSentences={sentences.length}
        onClose={() => setContextMenu(null)}
        onAddSilence={handleAddSilence}
        onSelectSfx={handleSelectSfx}
        onInsertBgm={handleInsertBgm}
        onInsertBlank={handleInsertBlank}
        onOpenInsertModal={() => {
          if (onOpenInsertModal) onOpenInsertModal();
        }}
        onMoveSentence={handleMoveSentence}
        onOpenMoveModal={handleOpenMoveModal}
        onPlaySentence={handlePlaySentence}
        onRegenerate={handleRegenerate}
        onStartEdit={handleStartEdit}
        onAssignSpeaker={handleAssignSpeaker}
        onOpenGroupModal={() => {
          if (onOpenSplitChapter) onOpenSplitChapter();
        }}
        onDeleteSentence={handleDeleteSentence}
        onCopySentence={handleCopySentence}
        onPasteSentence={handlePasteSentence}
      />

      {/* Modal Chuyển Câu đến trước/sau dòng */}
      <MoveSentenceModal
        isOpen={moveModal.isOpen}
        onClose={() => setMoveModal((prev) => ({ ...prev, isOpen: false }))}
        sentence={moveModal.sentence}
        totalSentences={sentences.length}
        mode={moveModal.mode}
        onConfirm={(targetLine) => {
          if (moveModal.sentence) {
            handleMoveSentence(moveModal.sentence, moveModal.mode, targetLine);
          }
        }}
      />

      {/* Modal Chèn Hiệu Ứng Âm Thanh (SFX) */}
      <InsertSfxModal
        isOpen={sfxModal.isOpen}
        onClose={() => setSfxModal((prev) => ({ ...prev, isOpen: false }))}
        targetSentence={sfxModal.sentence}
        initialSfx={sfxModal.sfxItem}
        initialPosition={sfxModal.position}
        onInserted={(newSentence) => {
          setSelectedSentenceId(newSentence.id);
        }}
      />

      {/* Modal Chèn Nhạc Nền (BGM) */}
      <InsertBgmModal
        isOpen={bgmModal.isOpen}
        onClose={() => setBgmModal((prev) => ({ ...prev, isOpen: false }))}
        targetSentence={bgmModal.sentence}
        initialPosition={bgmModal.position}
        onInserted={(newSentence) => {
          setSelectedSentenceId(newSentence.id);
        }}
      />
    </div>
  );
};
