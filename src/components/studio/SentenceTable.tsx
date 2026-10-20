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
  Search,
  FilePlus,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import { useFindReplaceStore } from "@/stores/useFindReplaceStore";
import { useConfirmStore } from "@/stores/useConfirmStore";
import {
  tauriAddSilenceSentence,
  tauriAssignSentenceSpeaker,
  tauriCheckTtsConnection,
  tauriDeleteSentence,
  tauriGetChapters,
  tauriGetSentences,
  tauriInsertBlankSentences,
  tauriRegenerateSentence,
  tauriUpdateSentenceText,
  tauriUpdateSilenceDuration,
} from "@/lib/tauri";
import { formatDuration } from "@/lib/utils";
import type { CharacterProfile, SentenceItem } from "@/types";
import {
  SentenceContextMenu,
  type ContextMenuState,
} from "./SentenceContextMenu";

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
  const isSilence = item.clean_text.startsWith("[Khoảng lặng");
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

          {item.status === "pending" && !isSilence && (
            <span className="text-[11px] text-zinc-500">Chưa tạo</span>
          )}

          {/* Play Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlaySentence(item);
            }}
            disabled={item.status === "generating"}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent"
            title={
              isSilence
                ? `Nghe thử khoảng lặng (${item.duration}s)`
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
          {!isSilence && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate(item);
              }}
              disabled={!isServerOnline || item.status === "generating"}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-indigo-400 disabled:opacity-30"
              title="Tái tạo âm thanh cho câu này (Ctrl+Enter)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sentence Body / Inline Editor / Silence Visualizer */}
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
                onSaveEdit(item.id);
                onRegenerate({ ...item, clean_text: editText });
              } else if (e.key === "Escape") {
                onCancelEdit();
              }
            }}
            rows={2}
            className="w-full p-2 bg-zinc-950 border border-indigo-500 rounded text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2 text-xs">
            <button
              onClick={onCancelEdit}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              Huỷ
            </button>
            <button
              onClick={() => onSaveEdit(item.id)}
              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
            >
              Lưu thay đổi
            </button>
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
          title="Nhấp đúp chuột để chỉnh sửa văn bản câu"
        >
          {renderHighlightedText(item.clean_text, searchQuery, matchCase)}
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

  const { searchQuery, matchCase, openFind, registerScrollCallback } =
    useFindReplaceStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: sentences.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 10,
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

  // Auto-scroll teleprompter to keep the currently playing sentence visible
  useEffect(() => {
    if (playingSentenceId) {
      const index = sentences.findIndex((s) => s.id === playingSentenceId);
      if (index !== -1) {
        rowVirtualizer.scrollToIndex(index, {
          align: "center",
          behavior: "smooth",
        });
      }
    }
  }, [playingSentenceId, sentences, rowVirtualizer]);

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
        setSelectedSentenceId(sentence.id);
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
      setIsServerOnline,
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
      if (sentence.status === "ready") {
        setPlayingSentenceId(sentence.id);
        setIsPlaying(true);
        return;
      }

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
        updateSentenceAudio(sentence.id, sentence.audio_path || "", newDuration);
        updateSentenceText(
          sentence.id,
          `[Khoảng lặng ${newDuration.toFixed(1)}s]`
        );

        const updatedChapters = await tauriGetChapters(activeProject.id);
        setChapters(updatedChapters);
      } catch (err) {
        console.error("Lỗi cập nhật số giây khoảng lặng:", err);
      }
    },
    [activeProject, activeChapter, updateSentenceAudio, updateSentenceText, setChapters]
  );

  const { askConfirm } = useConfirmStore();

  const handleDeleteSentence = useCallback(
    (sentence: SentenceItem) => {
      if (!activeChapter || !activeProject) return;
      const isSilence = sentence.clean_text.startsWith("[Khoảng lặng");
      const title = isSilence ? "Xác Nhận Xóa Khoảng Lặng" : "Xác Nhận Xóa Câu";
      const desc = isSilence
        ? "Bạn có chắc chắn muốn xóa khoảng lặng này khỏi kịch bản?"
        : `Bạn có chắc muốn xóa câu thoại: "${sentence.clean_text.slice(0, 60)}..."?`;

      askConfirm({
        title,
        description: desc,
        confirmText: "Xóa Câu",
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

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900/30 overflow-hidden relative">
      {/* Chapter Title Bar (Clean, uncluttered, professional) */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
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

        {/* Quick hint for shortcuts */}
        <div className="text-[11px] text-zinc-500 flex items-center gap-2.5">
          <button
            type="button"
            onClick={openFind}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Tìm kiếm (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <span className="text-zinc-600">|</span>
          <span className="text-[11px] text-zinc-500">
            Nhấn <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">F1</kbd> xem phím tắt
          </span>
        </div>
      </div>

      {/* Script Virtual Table / List */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto p-3"
        style={{ contain: "strict" }}
      >
        {sentences.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
            <p className="text-sm">Không có dữ liệu câu trong chương này.</p>
            <p className="text-xs mt-1 text-zinc-600">
              Hãy chọn một chương từ mục lục bên trái.
            </p>
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
                  ref={rowVirtualizer.measureElement}
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
        onClose={() => setContextMenu(null)}
        onAddSilence={handleAddSilence}
        onInsertBlank={handleInsertBlank}
        onOpenInsertModal={() => {
          if (onOpenInsertModal) onOpenInsertModal();
        }}
        onPlaySentence={handlePlaySentence}
        onRegenerate={handleRegenerate}
        onStartEdit={handleStartEdit}
        onAssignSpeaker={handleAssignSpeaker}
        onOpenGroupModal={() => {
          if (onOpenSplitChapter) onOpenSplitChapter();
        }}
        onDeleteSentence={handleDeleteSentence}
      />
    </div>
  );
};
