"use client";

import React, { useState } from "react";
import {
  ListOrdered,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Ungroup,
  ChevronUp,
  ChevronDown,
  ArrowDownToLine,
  Check,
  X,
  Layers,
  Music,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useConfirmStore } from "@/stores/useConfirmStore";
import {
  tauriDeleteChapter,
  tauriGetChapters,
  tauriGetSentences,
  tauriRenameChapter,
  tauriReorderChapter,
} from "@/lib/tauri";
import { formatTimeHours } from "@/lib/utils";
import type { ChapterItem } from "@/types";

export const ChapterList: React.FC = () => {
  const {
    activeProject,
    chapters,
    activeChapter,
    sentences,
    setChapters,
    setActiveChapter,
    setSentences,
    setSelectedSentenceId,
  } = useProjectStore();

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectChapter = async (chap: ChapterItem) => {
    if (editingChapterId === chap.id) return;
    setActiveChapter(chap);
    try {
      const sentences = await tauriGetSentences(chap.id);
      setSentences(sentences);
      if (sentences.length > 0) {
        setSelectedSentenceId(sentences[0].id);
      } else {
        setSelectedSentenceId(null);
      }
    } catch (err) {
      console.error("Lỗi tải câu trong chương:", err);
    }
  };

  const handleStartRename = (chap: ChapterItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChapterId(chap.id);
    setEditTitle(chap.title?.trim() || `Chương ${chap.index}`);
  };

  const handleSaveRename = async (chapId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editTitle.trim()) return;

    try {
      await tauriRenameChapter(chapId, editTitle.trim());
      setChapters(
        chapters.map((c) =>
          c.id === chapId ? { ...c, title: editTitle.trim() } : c
        )
      );
      if (activeChapter?.id === chapId) {
        setActiveChapter({ ...activeChapter, title: editTitle.trim() });
      }
    } catch (err) {
      console.error("Lỗi đổi tên chương:", err);
    } finally {
      setEditingChapterId(null);
    }
  };

  const handleCancelRename = () => {
    setEditingChapterId(null);
  };

  const handleReorder = async (
    chapId: string,
    direction: "up" | "down" | "bottom",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!activeProject || isProcessing) return;
    setIsProcessing(true);
    try {
      const updated = await tauriReorderChapter(chapId, direction);
      setChapters(updated);
      if (activeChapter) {
        const refreshedActive = updated.find((c) => c.id === activeChapter.id);
        if (refreshedActive) setActiveChapter(refreshedActive);
      }
    } catch (err) {
      console.error("Lỗi sắp xếp thứ tự chương:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const { askConfirm } = useConfirmStore();

  const handleUngroupOrDelete = (chap: ChapterItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeProject || isProcessing) return;

    // Tìm chương còn lại hoặc chương lớn nhất để hoàn trả câu
    const targetChapter =
      chapters.find((c) => c.id !== chap.id && c.sentence_count > 50) ||
      chapters.find((c) => c.id !== chap.id);

    const isUngroupable = Boolean(targetChapter && chap.sentence_count > 0);
    const titleText = isUngroupable ? "Xác Nhận Rã Nhóm Chương" : "Xác Nhận Xóa Chương";
    const message = isUngroupable
      ? `Bạn có chắc muốn rã nhóm (Ungroup) "${chap.title?.trim() || `Chương ${chap.index}`}"?\n\nToàn bộ ${chap.sentence_count} câu sẽ được hoàn trả về "${targetChapter?.title?.trim() || "Bản thảo còn lại"}".`
      : `Bạn có chắc muốn xóa vĩnh viễn "${chap.title?.trim() || `Chương ${chap.index}`}"?`;

    askConfirm({
      title: titleText,
      description: message,
      confirmText: isUngroupable ? "Rã Nhóm" : "Xóa Vĩnh Viễn",
      isDestructive: true,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await tauriDeleteChapter(chap.id, isUngroupable ? targetChapter?.id : undefined);

          const updatedChapters = await tauriGetChapters(activeProject.id);
          setChapters(updatedChapters);

          if (updatedChapters.length > 0) {
            const nextChap =
              updatedChapters.find((c) => c.id === targetChapter?.id) ||
              updatedChapters[0];
            setActiveChapter(nextChap);
            const nextSentences = await tauriGetSentences(nextChap.id);
            setSentences(nextSentences);
            if (nextSentences.length > 0) {
              setSelectedSentenceId(nextSentences[0].id);
            } else {
              setSelectedSentenceId(null);
            }
          } else {
            setActiveChapter(null);
            setSentences([]);
            setSelectedSentenceId(null);
          }
        } catch (err) {
          console.error("Lỗi xóa/rã nhóm chương:", err);
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  return (
    <aside
      style={{
        width: 320,
        minWidth: 320,
        maxWidth: 320,
        flexShrink: 0,
      }}
      className="w-80 shrink-0 border-r border-zinc-800 bg-zinc-950/60 flex flex-col h-full select-none"
    >
      {/* Sidebar Header */}
      <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
            Mục Lục Chương ({chapters.length})
          </span>
        </div>
      </div>

      {/* Chapters Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {chapters.length === 0 ? (
          <div className="text-center py-12 px-4 text-zinc-500 text-xs">
            Chưa có chương nào. Hãy mở hoặc import một cuốn sách để bắt đầu.
          </div>
        ) : (
          chapters.map((chap, idx) => {
            const isSelected = activeChapter?.id === chap.id;
            const isEditing = editingChapterId === chap.id;
            const pct =
              chap.sentence_count > 0
                ? Math.round(
                    (chap.ready_sentence_count / chap.sentence_count) * 100
                  )
                : 0;

            const displayName =
              chap.title?.trim() ||
              (chap.sentence_count > 500
                ? "Bản thảo còn lại"
                : `Chương ${chap.index}`);

            return (
              <div
                key={chap.id}
                onClick={() => handleSelectChapter(chap)}
                className={`group relative p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-zinc-800/90 border-indigo-500/50 shadow-sm text-zinc-100 ring-1 ring-indigo-500/30"
                    : "bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {/* Chapter Title / Edit Input */}
                <div className="flex items-center justify-between gap-1.5 min-h-[22px]">
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1 w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(chap.id);
                          if (e.key === "Escape") handleCancelRename();
                        }}
                        autoFocus
                        className="flex-1 bg-zinc-950 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(chap.id)}
                        className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                        title="Lưu tên"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCancelRename}
                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                        title="Hủy"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                          #{chap.index}
                        </span>
                        <span
                          className="font-medium truncate flex-1 text-zinc-200"
                          title={displayName}
                        >
                          {displayName}
                        </span>
                        {chap.bgm_path && (
                          <span
                            className="flex items-center text-emerald-400 bg-emerald-950/60 p-0.5 rounded border border-emerald-800/50 shrink-0"
                            title={`Nhạc nền: ${chap.bgm_path.split(/[/\\]/).pop()}`}
                          >
                            <Music className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {pct === 100 && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}

                      {/* Action buttons (Rename, Reorder, Ungroup) */}
                      <div
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity bg-zinc-900/90 rounded px-1 py-0.5 border border-zinc-700/60"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleStartRename(chap, e)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          title="Đổi tên chương (Rename)"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>

                        {idx > 0 && (
                          <button
                            onClick={(e) => handleReorder(chap.id, "up", e)}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                            title="Di chuyển lên"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                        )}

                        {idx < chapters.length - 1 && (
                          <button
                            onClick={(e) => handleReorder(chap.id, "down", e)}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                            title="Di chuyển xuống"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        )}

                        {idx < chapters.length - 1 && (
                          <button
                            onClick={(e) => handleReorder(chap.id, "bottom", e)}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400"
                            title="Đẩy xuống dưới cùng"
                          >
                            <ArrowDownToLine className="w-3 h-3" />
                          </button>
                        )}

                        {chapters.length > 1 && (
                          <button
                            onClick={(e) => handleUngroupOrDelete(chap, e)}
                            className="p-1 rounded hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400"
                            title="Rã nhóm (Ungroup) / Xóa chương"
                          >
                            <Ungroup className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Sub info */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="font-mono">{chap.sentence_count} câu</span>
                  <span>{pct}%</span>
                </div>

                {/* Mini Progress Bar */}
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Stats (Live Duration Calculation) */}
      {activeProject && (() => {
        const currentChapterDuration = sentences.reduce(
          (sum, s) => sum + (s.status === "ready" ? s.duration || 0 : 0),
          0
        );
        const otherChaptersDuration = chapters
          .filter((c) => c.id !== activeChapter?.id)
          .reduce((sum, c) => sum + (c.total_duration || 0), 0);
        const totalProjectDuration = Math.max(
          activeProject.total_duration || 0,
          currentChapterDuration + otherChaptersDuration
        );

        return (
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 text-xs text-zinc-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Tổng thời lượng:</span>
            </div>
            <span className="font-mono font-semibold text-zinc-100">
              {formatTimeHours(totalProjectDuration)}
            </span>
          </div>
        );
      })()}
    </aside>
  );
};
