"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  Download,
  Users,
  Search,
  Sparkles,
  RotateCcw,
  Square,
  HelpCircle,
  Layers,
  FilePlus,
  Check,
  ZoomIn,
  ZoomOut,
  Repeat,
  Trash2,
  Sliders,
  RefreshCw,
  BookOpen,
  Info,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import { useFindReplaceStore } from "@/stores/useFindReplaceStore";
import { useConfirmStore } from "@/stores/useConfirmStore";
import { tauriCheckTtsConnection, tauriDeleteProject } from "@/lib/tauri";
import type { ProjectMetadata } from "@/types";

interface AppMenuBarProps {
  onOpenImport: () => void;
  onOpenVoiceSettings: () => void;
  onOpenCharacterCasting: () => void;
  onOpenExport: () => void;
  onOpenSplitChapter?: () => void;
  onOpenInsertModal?: () => void;
  onSelectProject?: (project: ProjectMetadata) => void;
  onBatchGenerate?: (forceAll: boolean) => void;
  onStopBatch?: () => void;
  onOpenShortcutsHelp?: () => void;
  onOpenAbout?: () => void;
}

type ActiveMenu = "file" | "edit" | "audio" | "view" | "help" | null;

export const AppMenuBar: React.FC<AppMenuBarProps> = ({
  onOpenImport,
  onOpenVoiceSettings,
  onOpenCharacterCasting,
  onOpenExport,
  onOpenSplitChapter,
  onOpenInsertModal,
  onSelectProject,
  onBatchGenerate,
  onStopBatch,
  onOpenShortcutsHelp,
  onOpenAbout,
}) => {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const menuBarRef = useRef<HTMLDivElement | null>(null);

  const {
    projects,
    activeProject,
    activeChapter,
    sentences,
    isBatchGenerating,
    removeProject,
    setActiveProject,
    setActiveChapter,
    setSentences,
    setSelectedSentenceId,
  } = useProjectStore();

  const {
    serverUrl,
    isServerOnline,
    setIsServerOnline,
    continuousPlay,
    setContinuousPlay,
    waveformZoom,
    setWaveformZoom,
  } = useStudioSettingsStore();

  const { openFind, openReplace } = useFindReplaceStore();

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenu]);

  const handleMenuClick = (menu: ActiveMenu) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const handleMenuMouseEnter = (menu: ActiveMenu) => {
    if (activeMenu !== null) {
      setActiveMenu(menu);
    }
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  const { askConfirm } = useConfirmStore();

  const handleDeleteProject = (
    projectId: string,
    title: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    askConfirm({
      title: "Xác Nhận Xóa Dự Án",
      description: `Bạn có chắc chắn muốn xóa vĩnh viễn dự án "${title}" khỏi thư viện?\nToàn bộ kịch bản, âm thanh và dữ liệu chương sẽ bị xóa hoàn toàn.`,
      confirmText: "Xóa Vĩnh Viễn",
      cancelText: "Hủy Bỏ",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await tauriDeleteProject(projectId);
          removeProject(projectId);
          if (activeProject?.id === projectId) {
            setActiveProject(null);
            setActiveChapter(null);
            setSentences([]);
            setSelectedSentenceId(null);
            try {
              localStorage.removeItem("bookstudio_active_project_id");
            } catch {
              // ignore
            }
          }
        } catch (err) {
          console.error("Lỗi xóa dự án:", err);
        }
      },
    });
  };

  const readyCount = sentences.filter((s) => s.status === "ready").length;

  return (
    <div className="flex items-center gap-0.5 text-xs select-none" ref={menuBarRef}>
      {/* 1. FILE MENU */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("file")}
          onMouseEnter={() => handleMenuMouseEnter("file")}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeMenu === "file"
              ? "bg-zinc-800 text-white"
              : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"
          }`}
        >
          Tệp
        </button>

        {activeMenu === "file" && (
          <div
            style={{ backgroundColor: "#18181b" }}
            className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-zinc-700/80 shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-zinc-200"
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onOpenImport();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mở sách mới (EPUB, TXT)...</span>
              </div>
              <kbd className="text-[10px] text-zinc-500 font-mono">Ctrl+O</kbd>
            </button>

            {/* Submenu: Danh sách sách trong thư viện */}
            {projects.length > 0 && (
              <>
                <div className="my-1 border-t border-zinc-800/80" />
                <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Thư viện sách ({projects.length})</span>
                  <BookOpen className="w-3 h-3 text-zinc-500" />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                  {projects.map((p) => {
                    const isCurrent = activeProject?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          closeMenu();
                          if (onSelectProject) onSelectProject(p);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer group/item ${
                          isCurrent
                            ? "bg-indigo-600/20 text-indigo-300 font-medium"
                            : "hover:bg-zinc-800 text-zinc-300 hover:text-white"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-1.5">
                          <p className="truncate text-xs text-zinc-200 font-medium group-hover/item:text-indigo-300">
                            {p.title}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {p.author} • {p.chapter_count} chương
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isCurrent && (
                            <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProject(p.id, p.title, e)}
                            className="p-1 rounded opacity-0 group-hover/item:opacity-100 hover:bg-rose-950/80 hover:text-rose-400 text-zinc-500 transition-all"
                            title="Xóa dự án này khỏi thư viện"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="my-1 border-t border-zinc-800/80" />

            {/* Export Audio */}
            <button
              type="button"
              disabled={!activeProject || readyCount === 0}
              onClick={() => {
                closeMenu();
                onOpenExport();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Xuất Audio (Truyện / BGM)...</span>
              </div>
              <kbd className="text-[10px] text-zinc-500 font-mono">Ctrl+E</kbd>
            </button>

            {/* Close Project */}
            {activeProject && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  setActiveProject(null);
                  setActiveChapter(null);
                  setSentences([]);
                  setSelectedSentenceId(null);
                  try {
                    localStorage.removeItem("bookstudio_active_project_id");
                  } catch {
                    // ignore
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors mt-0.5"
              >
                <span>Đóng dự án hiện tại</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. EDIT MENU */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("edit")}
          onMouseEnter={() => handleMenuMouseEnter("edit")}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeMenu === "edit"
              ? "bg-zinc-800 text-white"
              : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"
          }`}
        >
          Chỉnh sửa
        </button>

        {activeMenu === "edit" && (
          <div
            style={{ backgroundColor: "#18181b" }}
            className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-zinc-700/80 shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-zinc-200"
          >
            <button
              type="button"
              disabled={!activeProject}
              onClick={() => {
                closeMenu();
                openFind();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <span>Tìm kiếm...</span>
              </div>
              <kbd className="text-[10px] text-zinc-500 font-mono">Ctrl+F</kbd>
            </button>

            <button
              type="button"
              disabled={!activeProject}
              onClick={() => {
                closeMenu();
                openReplace();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tìm kiếm & Thay thế...</span>
              </div>
              <kbd className="text-[10px] text-zinc-500 font-mono">Ctrl+H</kbd>
            </button>

            <div className="my-1 border-t border-zinc-800/80" />

            <button
              type="button"
              disabled={!activeProject || !activeChapter}
              onClick={() => {
                closeMenu();
                if (onOpenInsertModal) onOpenInsertModal();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <div className="flex items-center gap-2">
                <FilePlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chèn đoạn văn bản mới...</span>
              </div>
              <kbd className="text-[10px] text-zinc-500 font-mono">Ctrl+I</kbd>
            </button>

            <button
              type="button"
              disabled={!activeProject || !activeChapter}
              onClick={() => {
                closeMenu();
                if (onOpenSplitChapter) onOpenSplitChapter();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gom nhóm thành chương mới...</span>
              </div>
              <kbd className="text-[10px] text-zinc-500 font-mono">Ctrl+G</kbd>
            </button>

            <div className="my-1 border-t border-zinc-800/80" />

            <button
              type="button"
              disabled={!activeProject}
              onClick={() => {
                closeMenu();
                onOpenCharacterCasting();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Phân vai nhân vật (Casting)...</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 3. AUDIO MENU */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("audio")}
          onMouseEnter={() => handleMenuMouseEnter("audio")}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeMenu === "audio"
              ? "bg-zinc-800 text-white"
              : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"
          }`}
        >
          Âm thanh
        </button>

        {activeMenu === "audio" && (
          <div
            style={{ backgroundColor: "#18181b" }}
            className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-zinc-700/80 shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-zinc-200"
          >
            {isBatchGenerating ? (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  if (onStopBatch) onStopBatch();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-rose-900/40 text-rose-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
                  <span>Dừng đọc hàng loạt</span>
                </div>
                <kbd className="text-[10px] text-zinc-500 font-mono">Esc</kbd>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={!activeChapter || !isServerOnline}
                  onClick={() => {
                    closeMenu();
                    if (onBatchGenerate) onBatchGenerate(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Đọc các câu chưa tạo</span>
                  </div>
                  <kbd className="text-[10px] text-zinc-500 font-mono">F5</kbd>
                </button>

                <button
                  type="button"
                  disabled={!activeChapter || !isServerOnline || readyCount === 0}
                  onClick={() => {
                    closeMenu();
                    if (onBatchGenerate) onBatchGenerate(true);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Đọc lại toàn bộ từ đầu</span>
                  </div>
                </button>
              </>
            )}

            <div className="my-1 border-t border-zinc-800/80" />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                onOpenVoiceSettings();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span>Cài đặt giọng đọc & TTS...</span>
              </div>
            </button>

            <button
              type="button"
              onClick={async () => {
                closeMenu();
                const online = await tauriCheckTtsConnection(serverUrl);
                setIsServerOnline(online);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kiểm tra kết nối VieNeu-TTS</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 4. VIEW MENU */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("view")}
          onMouseEnter={() => handleMenuMouseEnter("view")}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeMenu === "view"
              ? "bg-zinc-800 text-white"
              : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"
          }`}
        >
          Hiển thị
        </button>

        {activeMenu === "view" && (
          <div
            style={{ backgroundColor: "#18181b" }}
            className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-zinc-700/80 shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-zinc-200"
          >
            {/* Toggle Continuous Play */}
            <button
              type="button"
              onClick={() => {
                setContinuousPlay(!continuousPlay);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tự động phát câu tiếp theo</span>
              </div>
              {continuousPlay && <Check className="w-4 h-4 text-indigo-400" />}
            </button>

            <div className="my-1 border-t border-zinc-800/80" />

            {/* Zoom Controls */}
            <button
              type="button"
              onClick={() => {
                setWaveformZoom(Math.min(140, waveformZoom + 15));
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <ZoomIn className="w-3.5 h-3.5 text-zinc-400" />
                <span>Phóng to sóng âm</span>
              </div>
              <kbd className="text-[10px] text-zinc-500 font-mono">Zoom In</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                setWaveformZoom(Math.max(10, waveformZoom - 15));
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <ZoomOut className="w-3.5 h-3.5 text-zinc-400" />
                <span>Thu nhỏ sóng âm</span>
              </div>
              <kbd className="text-[10px] text-zinc-500 font-mono">Zoom Out</kbd>
            </button>
          </div>
        )}
      </div>

      {/* 5. HELP MENU */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("help")}
          onMouseEnter={() => handleMenuMouseEnter("help")}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeMenu === "help"
              ? "bg-zinc-800 text-white"
              : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"
          }`}
        >
          Trợ giúp
        </button>

        {activeMenu === "help" && (
          <div
            style={{ backgroundColor: "#18181b" }}
            className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-zinc-700/80 shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-zinc-200"
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
                if (onOpenShortcutsHelp) onOpenShortcutsHelp();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Danh sách phím tắt...</span>
              </div>
              <kbd className="text-[10px] text-zinc-500 font-mono">F1</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                if (onOpenAbout) onOpenAbout();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-zinc-400" />
                <span>Về BookStudio...</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
