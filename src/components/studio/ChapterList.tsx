"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Eye,
  EyeOff,
  Plus,
  Scissors,
  Merge,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useConfirmStore } from "@/stores/useConfirmStore";
import {
  tauriDeleteChapter,
  tauriGetChapters,
  tauriGetSentences,
  tauriInsertEmptyChapter,
  tauriMergeChapters,
  tauriRenameChapter,
  tauriReorderChapter,
  tauriToggleChapterEnabled,
} from "@/lib/tauri";
import { formatTimeHours } from "@/lib/utils";
import type { ChapterItem } from "@/types";
import { MergeChapterModal } from "./MergeChapterModal";

interface ChapterListProps {
  onOpenSplitChapter?: () => void;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  onOpenSplitChapter,
}) => {
  const {
    activeProject,
    chapters,
    activeChapter,
    sentences,
    setChapters,
    setActiveChapter,
    setSentences,
    setSelectedSentenceId,
    toggleChapterEnabled,
  } = useProjectStore();

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    chapter: ChapterItem | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    chapter: null,
  });

  const [mergeModal, setMergeModal] = useState<{
    isOpen: boolean;
    currentChapter: ChapterItem | null;
    targetChapter: ChapterItem | null;
    direction: "above" | "below";
  }>({
    isOpen: false,
    currentChapter: null,
    targetChapter: null,
    direction: "above",
  });

  const [activeSubmenu, setActiveSubmenu] = useState<"insert" | "merge" | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      setActiveSubmenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseMenu();
    };
    window.addEventListener("click", handleCloseMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleCloseMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleToggleChapterEnabled = async (
    chap: ChapterItem,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    if (isProcessing) return;
    const newStatus = chap.is_enabled === false;
    toggleChapterEnabled(chap.id, newStatus);
    try {
      await tauriToggleChapterEnabled(chap.id, newStatus);
      if (activeProject) {
        const refreshed = await tauriGetChapters(activeProject.id);
        setChapters(refreshed);
      }
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái bật/tắt chương:", err);
      toggleChapterEnabled(chap.id, !newStatus);
    } finally {
      setContextMenu((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleInsertEmptyChapter = async (
    targetChapter: ChapterItem,
    placeBefore: boolean
  ) => {
    if (!activeProject || isProcessing) return;
    setIsProcessing(true);
    try {
      const created = await tauriInsertEmptyChapter({
        projectId: activeProject.id,
        targetChapterId: targetChapter.id,
        placeBefore,
      });

      const updatedChapters = await tauriGetChapters(activeProject.id);
      setChapters(updatedChapters);

      const nextActive = updatedChapters.find((c) => c.id === created.id) || created;
      setActiveChapter(nextActive);
      setSentences([]);
      setSelectedSentenceId(null);
    } catch (err) {
      console.error("Lỗi chèn chương mới:", err);
    } finally {
      setIsProcessing(false);
      setContextMenu((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleConfirmMerge = async (
    curChap: ChapterItem,
    tarChap: ChapterItem,
    finalTitle: string
  ) => {
    if (!activeProject) return;
    setIsProcessing(true);
    try {
      const result = await tauriMergeChapters({
        projectId: activeProject.id,
        currentChapterId: curChap.id,
        targetChapterId: tarChap.id,
        finalTitle,
      });

      setChapters(result.chapters);

      const mergedChap =
        result.chapters.find((c) => c.id === result.merged_chapter_id) ||
        result.chapters[0];

      if (mergedChap) {
        setActiveChapter(mergedChap);
        const updatedSentences = await tauriGetSentences(mergedChap.id);
        setSentences(updatedSentences);
        if (updatedSentences.length > 0) {
          setSelectedSentenceId(updatedSentences[0].id);
        } else {
          setSelectedSentenceId(null);
        }
      }
    } catch (err) {
      console.error("Lỗi gộp chương:", err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, chap: ChapterItem) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveSubmenu(null);
    const menuWidth = 240;
    const menuHeight = 280;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setContextMenu({
      isOpen: true,
      x: Math.max(10, x),
      y: Math.max(10, y),
      chapter: chap,
    });
  };

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

            const isEnabled = chap.is_enabled !== false;

            return (
              <div
                key={chap.id}
                onClick={() => handleSelectChapter(chap)}
                onContextMenu={(e) => handleContextMenu(e, chap)}
                className={`group relative p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-1.5 cursor-pointer ${
                  !isEnabled
                    ? isSelected
                      ? "bg-zinc-900/60 border-amber-600/40 opacity-70 text-zinc-400 ring-1 ring-amber-500/20"
                      : "bg-zinc-950/40 border-dashed border-zinc-800/80 opacity-60 text-zinc-500 hover:opacity-85"
                    : isSelected
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
                        {/* Nút bật/tắt nhanh */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleChapterEnabled(chap, e)}
                          className={`p-0.5 rounded transition-colors shrink-0 ${
                            isEnabled
                              ? "text-zinc-500 hover:text-amber-400 hover:bg-zinc-800"
                              : "text-amber-400 hover:text-amber-300 bg-amber-950/60"
                          }`}
                          title={
                            isEnabled
                              ? "Chương đang bật. Nhấn để tắt (không tính export & câu tổng)"
                              : "Chương đang tắt. Nhấn để bật lại"
                          }
                        >
                          {isEnabled ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                          #{chap.index}
                        </span>
                        <span
                          className={`font-medium truncate flex-1 ${
                            isEnabled
                              ? "text-zinc-200"
                              : "line-through text-zinc-500 decoration-zinc-600"
                          }`}
                          title={displayName}
                        >
                          {displayName}
                        </span>
                        {!isEnabled && (
                          <span className="text-[10px] font-semibold px-1 py-0.2 bg-amber-950/70 text-amber-400 border border-amber-800/60 rounded shrink-0">
                            Tắt
                          </span>
                        )}
                        {chap.bgm_path && (
                          <span
                            className="flex items-center text-emerald-400 bg-emerald-950/60 p-0.5 rounded border border-emerald-800/50 shrink-0"
                            title={`Nhạc nền: ${chap.bgm_path.split(/[/\\]/).pop()}`}
                          >
                            <Music className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {isEnabled && pct === 100 && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}

                      {/* Action buttons (Enable/Disable, Rename, Reorder, Ungroup) */}
                      <div
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity bg-zinc-900/90 rounded px-1 py-0.5 border border-zinc-700/60"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleToggleChapterEnabled(chap, e)}
                          className={`p-1 rounded ${
                            isEnabled
                              ? "text-zinc-400 hover:text-amber-400 hover:bg-zinc-800"
                              : "text-amber-400 hover:text-emerald-400 hover:bg-zinc-800"
                          }`}
                          title={isEnabled ? "Tắt chương này" : "Bật lại chương này"}
                        >
                          {isEnabled ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </button>

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
        const currentChapterDuration = activeChapter?.is_enabled !== false ? sentences.reduce(
          (sum, s) => sum + (s.status === "ready" ? s.duration || 0 : 0),
          0
        ) : 0;
        const otherChaptersDuration = chapters
          .filter((c) => c.id !== activeChapter?.id && c.is_enabled !== false)
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

      {/* Context Menu Chuột Phải */}
      {contextMenu.isOpen && contextMenu.chapter && typeof document !== "undefined" && (() => {
        const curIdx = chapters.findIndex((c) => c.id === contextMenu.chapter?.id);
        const prevChapter = curIdx > 0 ? chapters[curIdx - 1] : null;
        const nextChapter =
          curIdx >= 0 && curIdx < chapters.length - 1
            ? chapters[curIdx + 1]
            : null;

        const isNearRight =
          typeof window !== "undefined" && contextMenu.x > window.innerWidth - 460;

        return createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => {
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
                setActiveSubmenu(null);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
                setActiveSubmenu(null);
              }}
            />
            <div
              style={{
                position: "fixed",
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 9999,
                backgroundColor: "#18181b",
                borderColor: "#3f3f46",
                boxShadow:
                  "0 20px 40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)",
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-56 border rounded-xl py-1.5 text-xs text-zinc-200 select-none"
            >
              <div
                style={{ borderBottomColor: "#27272a" }}
                className="px-3 py-1.5 border-b text-[11px] font-medium text-zinc-400 truncate"
              >
                {contextMenu.chapter.title?.trim() || `Chương ${contextMenu.chapter.index}`}
              </div>

              {/* Menu Cha: Chèn Chương */}
              <div
                className="relative"
                onMouseEnter={() => setActiveSubmenu("insert")}
              >
                <button
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                    activeSubmenu === "insert"
                      ? "bg-zinc-800 text-white"
                      : "hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Chèn chương</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                </button>

                {/* Submenu Chèn Chương */}
                {activeSubmenu === "insert" && (
                  <div
                    style={{
                      backgroundColor: "#18181b",
                      borderColor: "#3f3f46",
                      boxShadow:
                        "0 20px 40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                      position: "absolute",
                      top: 0,
                      ...(isNearRight
                        ? { right: "100%", marginRight: "6px" }
                        : { left: "100%", marginLeft: "6px" }),
                      zIndex: 10000,
                      minWidth: "230px",
                      width: "max-content",
                      whiteSpace: "nowrap",
                    }}
                    className="border rounded-xl p-1 text-xs text-zinc-200 select-none shadow-2xl"
                  >
                    <button
                      onClick={() => {
                        handleInsertEmptyChapter(contextMenu.chapter!, true);
                        setActiveSubmenu(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 hover:text-white text-left transition-colors cursor-pointer whitespace-nowrap rounded-lg"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Chèn chương mới phía trên</span>
                    </button>

                    <button
                      onClick={() => {
                        handleInsertEmptyChapter(contextMenu.chapter!, false);
                        setActiveSubmenu(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 hover:text-white text-left transition-colors cursor-pointer whitespace-nowrap rounded-lg"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Chèn chương mới phía dưới</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Menu Cha: Gộp Chương */}
              {(prevChapter || nextChapter) && (
                <div
                  className="relative"
                  onMouseEnter={() => setActiveSubmenu("merge")}
                >
                  <button
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                      activeSubmenu === "merge"
                        ? "bg-zinc-800 text-white"
                        : "hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Merge className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Gộp chương</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  </button>

                  {/* Submenu Gộp Chương */}
                  {activeSubmenu === "merge" && (
                    <div
                      style={{
                        backgroundColor: "#18181b",
                        borderColor: "#3f3f46",
                        boxShadow:
                          "0 20px 40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                        position: "absolute",
                        top: 0,
                        ...(isNearRight
                          ? { right: "100%", marginRight: "6px" }
                          : { left: "100%", marginLeft: "6px" }),
                        zIndex: 10000,
                        minWidth: "230px",
                        width: "max-content",
                        whiteSpace: "nowrap",
                      }}
                      className="border rounded-xl p-1 text-xs text-zinc-200 select-none shadow-2xl"
                    >
                      {prevChapter && (
                        <button
                          onClick={() => {
                            setMergeModal({
                              isOpen: true,
                              currentChapter: contextMenu.chapter,
                              targetChapter: prevChapter,
                              direction: "above",
                            });
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                            setActiveSubmenu(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 hover:text-white text-left transition-colors cursor-pointer whitespace-nowrap rounded-lg"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>Gộp vào chương phía trên</span>
                        </button>
                      )}

                      {nextChapter && (
                        <button
                          onClick={() => {
                            setMergeModal({
                              isOpen: true,
                              currentChapter: contextMenu.chapter,
                              targetChapter: nextChapter,
                              direction: "below",
                            });
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                            setActiveSubmenu(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 hover:text-white text-left transition-colors cursor-pointer whitespace-nowrap rounded-lg"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>Gộp với chương phía dưới</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div
                style={{ backgroundColor: "#27272a" }}
                className="h-px my-1"
              />

              <button
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => handleToggleChapterEnabled(contextMenu.chapter!)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 text-left transition-colors cursor-pointer"
              >
                {contextMenu.chapter.is_enabled !== false ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-amber-300">Tắt chương (Disable)</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Bật chương (Enable)</span>
                  </>
                )}
              </button>

              <button
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={(e) => {
                  handleStartRename(contextMenu.chapter!, e);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 hover:text-white text-left transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Đổi tên chương (Rename)</span>
              </button>

              {onOpenSplitChapter && (
                <button
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={() => {
                    setActiveChapter(contextMenu.chapter);
                    onOpenSplitChapter();
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                    setActiveSubmenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 hover:text-white text-left transition-colors cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Tách chương (Split)...</span>
                </button>
              )}

              <div
                style={{ backgroundColor: "#27272a" }}
                className="h-px my-1"
              />

              <button
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={(e) => {
                  handleUngroupOrDelete(contextMenu.chapter!, e);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  setActiveSubmenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 text-left transition-colors cursor-pointer"
              >
                <Ungroup className="w-3.5 h-3.5 shrink-0" />
                <span>Rã nhóm / Xóa chương</span>
              </button>
            </div>
          </>,
          document.body
        );
      })()}

      {/* Modal Xác Nhận Gộp Chương */}
      <MergeChapterModal
        isOpen={mergeModal.isOpen}
        onClose={() => setMergeModal((prev) => ({ ...prev, isOpen: false }))}
        currentChapter={mergeModal.currentChapter}
        targetChapter={mergeModal.targetChapter}
        direction={mergeModal.direction}
        onConfirmMerge={handleConfirmMerge}
      />
    </aside>
  );
};
