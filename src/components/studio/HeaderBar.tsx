"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Volume2,
  Download,
  Settings,
  FolderOpen,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Square,
  ChevronDown,
  Check,
  Plus,
  Trash2,
  ArchiveX,
  BookCheck,
} from "lucide-react";
import { AppMenuBar } from "./AppMenuBar";
import { useTtsHealth } from "@/hooks/useTtsHealth";
import { isNonSpeechSentenceText } from "@/lib/utils";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import { useConfirmStore } from "@/stores/useConfirmStore";
import {
  tauriDeleteProject,
  tauriSynthesizeSentence,
  tauriUpdateProjectStatus,
} from "@/lib/tauri";
import type { ProjectMetadata } from "@/types";

interface HeaderBarProps {
  onOpenImport: () => void;
  onOpenVoiceSettings: () => void;
  onOpenCharacterCasting: () => void;
  onOpenExport: () => void;
  onOpenSplitChapter?: () => void;
  onOpenInsertModal?: () => void;
  onOpenShortcutsHelp?: () => void;
  onOpenAbout?: () => void;
  onOpenSettings?: () => void;
  onSelectProject?: (project: ProjectMetadata) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenImport,
  onOpenVoiceSettings,
  onOpenCharacterCasting,
  onOpenExport,
  onOpenSplitChapter,
  onOpenInsertModal,
  onOpenShortcutsHelp,
  onOpenAbout,
  onOpenSettings,
  onSelectProject,
}) => {
  const {
    projects,
    activeProject,
    activeChapter,
    sentences,
    isBatchGenerating,
    batchProgress,
    setIsBatchGenerating,
    setBatchProgress,
    updateSentenceStatus,
    updateSentenceAudio,
    removeProject,
    setActiveProject,
    setActiveChapter,
    setSentences,
    setSelectedSentenceId,
    updateProjectStatus,
    chapters,
  } = useProjectStore();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  const handleStatusChange = async (newStatus: "active" | "dropped") => {
    if (!activeProject) return;
    if (activeProject.status === "completed") return; // Completed is final — no change allowed
    try {
      await tauriUpdateProjectStatus(activeProject.id, newStatus);
      updateProjectStatus(activeProject.id, newStatus);
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái dự án:", err);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    if (isProjectDropdownOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isProjectDropdownOpen]);

  const {
    serverUrl,
    selectedVoice,
    speed,
    temperature,
    isServerOnline,
  } = useStudioSettingsStore();

  // page.tsx đã polling định kỳ, ở đây chỉ dùng để bấm kiểm tra tay
  const { isCheckingTts, checkHealth } = useTtsHealth(false);

  const abortBatchRef = useRef(false);

  const handleStopBatch = () => {
    abortBatchRef.current = true;
    setIsBatchGenerating(false);
  };

  const handleBatchGenerate = async (forceAll: boolean = false) => {
    if (!activeProject || !activeChapter || isBatchGenerating) return;

    if (forceAll) {
      const confirmRestart = window.confirm(
        `Bạn có chắc chắn muốn đọc lại toàn bộ ${sentences.length} câu của chương này từ đầu không?\nCác file âm thanh cũ sẽ được tạo mới và ghi đè.`
      );
      if (!confirmRestart) return;
    }

    // Bỏ qua khoảng lặng / hiệu ứng: audio của chúng được tạo riêng, không đọc bằng TTS
    const speechSentences = sentences.filter((s) => !isNonSpeechSentenceText(s.clean_text));
    const targetSentences = forceAll
      ? speechSentences
      : speechSentences.filter((s) => s.status !== "ready");

    if (targetSentences.length === 0) return;

    abortBatchRef.current = false;
    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: targetSentences.length });

    for (let i = 0; i < targetSentences.length; i++) {
      if (abortBatchRef.current) {
        break;
      }

      const sentence = targetSentences[i];
      setBatchProgress({ current: i + 1, total: targetSentences.length });
      updateSentenceStatus(sentence.id, "generating");

      try {
        const res = await tauriSynthesizeSentence({
          sentenceId: sentence.id,
          projectId: activeProject.id,
          text: sentence.clean_text,
          voice: sentence.voice || selectedVoice,
          speed: sentence.speed || speed,
          temperature: sentence.temperature ?? temperature,
          serverUrl,
        });
        updateSentenceAudio(sentence.id, res.audio_path, res.duration);
      } catch (err) {
        updateSentenceStatus(
          sentence.id,
          "error",
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    setIsBatchGenerating(false);
  };

  const readyCount = sentences.filter((s) => s.status === "ready").length;
  // Export is available whenever any enabled chapter has audio, regardless of the selected chapter
  const canExport = chapters.some((c) => c.is_enabled !== false && (c.ready_sentence_count || 0) > 0);
  const progressPct =
    sentences.length > 0 ? Math.round((readyCount / sentences.length) * 100) : 0;

  return (
    <header className="relative z-30 h-14 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between select-none">
      {/* Left: Brand + Menu Bar + Active Book Dropdown */}
      <div className="flex items-center gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <img
            src="/app-icon.png"
            alt="BookStudio Logo"
            className="w-7 h-7 rounded-lg shadow-md object-cover border border-zinc-700/60"
          />
          <h1 className="text-sm font-semibold tracking-wide text-zinc-100 hidden sm:block">
            BookStudio
          </h1>
        </div>

        {/* Desktop Menu Bar (File, Edit, Audio, View, Help) - Chỉ hiện khi đã mở dự án */}
        {activeProject && (
          <>
            <AppMenuBar
              onOpenImport={onOpenImport}
              onOpenVoiceSettings={onOpenVoiceSettings}
              onOpenCharacterCasting={onOpenCharacterCasting}
              onOpenExport={onOpenExport}
              onOpenSplitChapter={onOpenSplitChapter}
              onOpenInsertModal={onOpenInsertModal}
              onSelectProject={onSelectProject}
              onBatchGenerate={handleBatchGenerate}
              onStopBatch={handleStopBatch}
              onOpenShortcutsHelp={onOpenShortcutsHelp}
              onOpenAbout={onOpenAbout}
              onOpenSettings={onOpenSettings}
            />

            <div className="h-4 w-px bg-zinc-800 mx-1 hidden md:block" />

            {/* Project Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
                className="hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-left transition-all group"
                title="Nhấp để chuyển đổi dự án / sách đang làm"
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    maxWidth: 280,
                    lineHeight: 1,
                  }}
                  className="truncate"
                >
                  <span
                    style={{ fontSize: 12, fontWeight: 600, lineHeight: 1 }}
                    className="text-zinc-100 truncate group-hover:text-indigo-400"
                  >
                    {activeProject.title}
                  </span>
                  <span
                    style={{ fontSize: 11, lineHeight: 1, userSelect: "none" }}
                    className="text-zinc-600"
                  >
                    •
                  </span>
                  <span
                    style={{ fontSize: 11, lineHeight: 1 }}
                    className="text-zinc-400 truncate"
                  >
                    {activeProject.author}
                  </span>
                </div>
                <ChevronDown
                  style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }}
                  className={`text-zinc-400 group-hover:text-zinc-200 transition-transform ${
                    isProjectDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu - Nền đen đặc 100%, không xuyên thấu */}
              {isProjectDropdownOpen && (
                <div
                  style={{ backgroundColor: "#18181b" }}
                  className="absolute left-0 top-full mt-2 w-84 rounded-xl border border-zinc-700/90 shadow-2xl shadow-black/95 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-zinc-200"
                >
                  <div className="px-2.5 py-1.5 border-b border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="font-semibold uppercase tracking-wider">
                      Thư viện sách ({projects.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        onOpenImport();
                      }}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Mới</span>
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1 space-y-0.5 pr-0.5">
                    {projects.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-500">
                        Chưa có dự án nào trong thư viện.
                      </div>
                    ) : (
                      projects.map((p) => {
                        const isCurrent = activeProject?.id === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setIsProjectDropdownOpen(false);
                              if (onSelectProject) onSelectProject(p);
                            }}
                            className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer group/item ${
                              isCurrent
                                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium"
                                : "hover:bg-zinc-800/80 text-zinc-300 hover:text-white"
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="truncate font-semibold text-zinc-200 group-hover/item:text-indigo-300">
                                {p.title}
                              </p>
                              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                                {p.author} • {p.chapter_count} chương • {p.total_sentences} câu
                              </p>
                            </div>

                            {/* Checkmark and Delete button */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isCurrent && (
                                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
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
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Center: TTS Server Status & Voice Badge */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={checkHealth}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors bg-zinc-900 border-zinc-800 hover:border-zinc-700"
          title="Bấm để kiểm tra kết nối VieNeu-TTS"
        >
          {isCheckingTts ? (
            <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
          ) : isServerOnline ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
          <span
            className={isServerOnline ? "text-emerald-400" : "text-rose-400"}
          >
            {isServerOnline ? "VieNeu-TTS :8880" : "TTS Offline"}
          </span>
        </button>
      </div>

      {/* Right Actions: Primary TTS Action & Export */}
      <div className="flex items-center gap-2">
        {activeProject && (
          <>
            {activeChapter && (
              <div className="flex items-center gap-1.5">
                {isBatchGenerating ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-amber-600/30 text-amber-200 border border-amber-500/30 cursor-default">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        Đang đọc {batchProgress.current}/{batchProgress.total}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleStopBatch}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-rose-600/25 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 transition-colors flex items-center gap-1 shadow-sm"
                      title="Dừng tiến trình đọc hàng loạt (các câu đã tạo vẫn được giữ nguyên)"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Dừng</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {/* Nút Đọc Tiếp / Đọc Cả Chương */}
                    <button
                      type="button"
                      onClick={() => handleBatchGenerate(false)}
                      disabled={!isServerOnline || (readyCount === sentences.length && sentences.length > 0)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      title={
                        readyCount === 0
                          ? "Đọc toàn bộ các câu trong chương"
                          : `Đọc tiếp ${sentences.length - readyCount} câu chưa tạo`
                      }
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {readyCount === 0
                          ? "Đọc Cả Chương"
                          : readyCount === sentences.length
                          ? "Đã Xong (100%)"
                          : `Đọc Tiếp (${sentences.length - readyCount})`}
                      </span>
                    </button>

                    {/* Nút Đọc Lại Toàn Bộ Từ Đầu (khi đã có ít nhất 1 câu ready) */}
                    {readyCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleBatchGenerate(true)}
                        disabled={!isServerOnline}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors disabled:opacity-40"
                        title="Đọc lại toàn bộ tất cả các câu của chương từ đầu (ghi đè file âm thanh cũ)"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>Làm Lại</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenExport}
              disabled={!canExport && readyCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Xuất kịch bản & file âm thanh"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Xuất Audio</span>
            </button>

            {/* Project Status Badge / Toggle */}
            {activeProject.status === "completed" ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border cursor-default select-none"
                style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)", color: "#34d399" }}
                title="Dự án đã hoàn thành — không thể thay đổi trạng thái"
              >
                <BookCheck className="w-3.5 h-3.5" />
                <span>Hoàn thành</span>
              </div>
            ) : activeProject.status === "dropped" ? (
              <button
                type="button"
                onClick={() => handleStatusChange("active")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors"
                style={{ background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)", color: "#fbbf24" }}
                title="Dự án đang Drop — bấm để khôi phục về Đang tiến hành"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStatusChange("dropped")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 transition-colors"
                title="Đánh dấu dự án này là Drop (tạm dừng)"
              >
                <ArchiveX className="w-3.5 h-3.5" />
                <span>Drop</span>
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
};
