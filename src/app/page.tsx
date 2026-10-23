"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  FolderOpen,
  Headphones,
  Sliders,
  Sparkles,
  Zap,
  ChevronRight,
  Trash2,
  Clock,
  Layers,
  ArrowRight,
  Search,
  Library,
  Plus,
  Loader2,
  ArrowUpDown,
  RotateCw,
  Download,
} from "lucide-react";
import { HeaderBar } from "@/components/studio/HeaderBar";
import { ChapterList } from "@/components/studio/ChapterList";
import { SentenceTable } from "@/components/studio/SentenceTable";
import { WaveformPanel } from "@/components/studio/WaveformPanel";
import { VoiceModal } from "@/components/studio/VoiceModal";
import { ExportModal } from "@/components/studio/ExportModal";
import { ImportModal } from "@/components/studio/ImportModal";
import { CharacterModal } from "@/components/studio/CharacterModal";
import { SplitChapterModal } from "@/components/studio/SplitChapterModal";
import { FindReplaceModal } from "@/components/studio/FindReplaceModal";
import { InsertParagraphModal } from "@/components/studio/InsertParagraphModal";
import { ShortcutsModal } from "@/components/studio/ShortcutsModal";
import { TextTagsModal } from "@/components/studio/TextTagsModal";
import { SettingsModal } from "@/components/studio/SettingsModal";
import { ConfirmModal } from "@/components/studio/ConfirmModal";
import { ProjectCard } from "@/components/studio/ProjectCard";
import { useTtsHealth } from "@/hooks/useTtsHealth";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import { useFindReplaceStore } from "@/stores/useFindReplaceStore";
import { useConfirmStore } from "@/stores/useConfirmStore";
import {
  isTauriEnvironment,
  tauriDeleteProject,
  tauriGetChapters,
  tauriGetProjectCharacters,
  tauriGetProjects,
  tauriGetSentences,
  tauriUpdateProjectStatus,
  tauriExportProjectArchive,
  tauriImportProjectArchive,
  tauriListenProjectArchiveProgress,
  tauriListenSentenceProgress,
  tauriSelectProjectExportPath,
  tauriSelectProjectImportFile,
} from "@/lib/tauri";
import type { ProjectMetadata } from "@/types";

export default function Home() {
  const {
    projects,
    activeProject,
    activeChapter,
    setProjects,
    setActiveProject,
    setChapters,
    setActiveChapter,
    setSentences,
    setCharacters,
    setSelectedSentenceId,
    removeProject,
    updateProjectStatus,
  } = useProjectStore();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCharacterOpen, setIsCharacterOpen] = useState(false);
  const [isSplitChapterOpen, setIsSplitChapterOpen] = useState(false);
  const [isInsertParagraphOpen, setIsInsertParagraphOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTextTagsOpen, setIsTextTagsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCardCount, setVisibleCardCount] = useState(12);
  const [sortKey, setSortKey] = useState<"updated_at" | "title" | "progress_asc" | "progress_desc">("updated_at");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed" | "dropped">("all");
  const [isRefreshingProjects, setIsRefreshingProjects] = useState(false);

  const { isServerOnline } = useStudioSettingsStore();
  const { isCheckingTts, checkHealth } = useTtsHealth(true);

  const {
    isOpen: isFindReplaceOpen,
    tab: findReplaceTab,
    openFind,
    openReplace,
    close: closeFindReplace,
  } = useFindReplaceStore();

  const filteredProjects = useMemo(() => {
    let list = projects;
    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)
      );
    }
    // Filter by status
    if (filterStatus !== "all") {
      list = list.filter((p) => {
        const s = p.status ?? "active";
        if (filterStatus === "completed") return s === "completed";
        if (filterStatus === "dropped") return s === "dropped";
        return s === "active"; // "active" = đang tiến hành
      });
    }
    // Sort
    const sorted = [...list];
    if (sortKey === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    } else if (sortKey === "progress_desc") {
      sorted.sort((a, b) => {
        const pa = a.total_sentences > 0 ? a.completed_sentences / a.total_sentences : 0;
        const pb = b.total_sentences > 0 ? b.completed_sentences / b.total_sentences : 0;
        return pb - pa;
      });
    } else if (sortKey === "progress_asc") {
      sorted.sort((a, b) => {
        const pa = a.total_sentences > 0 ? a.completed_sentences / a.total_sentences : 0;
        const pb = b.total_sentences > 0 ? b.completed_sentences / b.total_sentences : 0;
        return pa - pb;
      });
    }
    return sorted;
  }, [projects, searchQuery, sortKey, filterStatus]);

  const visibleProjects = useMemo(() => {
    return filteredProjects.slice(0, visibleCardCount);
  }, [filteredProjects, visibleCardCount]);

  const openProject = async (project: ProjectMetadata) => {
    setActiveProject(project);
    try {
      localStorage.setItem("bookstudio_active_project_id", project.id);
    } catch {
      // ignore
    }

    try {
      // Load characters
      const chars = await tauriGetProjectCharacters(project.id);
      setCharacters(chars);

      // Load chapters
      const chaps = await tauriGetChapters(project.id);
      setChapters(chaps);

      // Default to the first enabled chapter (skip disabled ones)
      const firstChapter = chaps.find((c) => c.is_enabled !== false) ?? null;
      if (firstChapter) {
        setActiveChapter(firstChapter);
        const sents = await tauriGetSentences(firstChapter.id);
        setSentences(sents);
        if (sents.length > 0) {
          setSelectedSentenceId(sents[0].id);
        } else {
          setSelectedSentenceId(null);
        }
      } else {
        setActiveChapter(null);
        setSentences([]);
        setSelectedSentenceId(null);
      }
    } catch (err) {
      console.error("Lỗi khi mở dự án:", err);
    }
  };

  const { askConfirm } = useConfirmStore();

  // Export / import a whole project (.bsproj) with all audio
  const [archiveBusy, setArchiveBusy] = useState<{
    kind: "export" | "import";
    title: string;
    current: number;
    total: number;
  } | null>(null);
  const [archiveNotice, setArchiveNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const runArchiveTask = async <T,>(
    kind: "export" | "import",
    title: string,
    task: () => Promise<T>
  ): Promise<T | null> => {
    setArchiveNotice(null);
    setArchiveBusy({ kind, title, current: 0, total: 0 });
    const unlisten = await tauriListenProjectArchiveProgress((p) => {
      if (p.kind === kind) {
        setArchiveBusy({ kind, title, current: p.current, total: p.total });
      }
    });
    try {
      return await task();
    } catch (err) {
      console.error(`Lỗi ${kind} dự án:`, err);
      setArchiveNotice({ ok: false, message: String(err) });
      return null;
    } finally {
      unlisten();
      setArchiveBusy(null);
    }
  };

  const handleExportProject = async (project: ProjectMetadata) => {
    if (archiveBusy) return;
    const destPath = await tauriSelectProjectExportPath(project.title);
    if (!destPath) return;
    const summary = await runArchiveTask("export", project.title, () =>
      tauriExportProjectArchive(project.id, destPath)
    );
    if (summary) {
      const mb = (summary.size_bytes / (1024 * 1024)).toFixed(1);
      const missing =
        summary.missing_audio_count > 0
          ? ` (${summary.missing_audio_count} câu mất file audio nên xuất không kèm âm thanh)`
          : "";
      setArchiveNotice({
        ok: true,
        message: `Đã xuất "${project.title}": ${summary.audio_count} file audio, ${mb} MB${missing}.`,
      });
    }
  };

  const handleImportProject = async () => {
    if (archiveBusy) return;
    const filePath = await tauriSelectProjectImportFile();
    if (!filePath) return;
    const summary = await runArchiveTask("import", "Đang nhập dự án", () =>
      tauriImportProjectArchive(filePath)
    );
    if (summary) {
      await refreshProjects();
      const missing =
        summary.missing_audio_count > 0
          ? ` ${summary.missing_audio_count} câu thiếu audio cần tạo lại.`
          : "";
      setArchiveNotice({
        ok: true,
        message: `Đã nhập "${summary.project.title}": ${summary.audio_count} file audio.${missing}`,
      });
    }
  };

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
          try {
            const savedId = localStorage.getItem("bookstudio_active_project_id");
            if (savedId === projectId) {
              localStorage.removeItem("bookstudio_active_project_id");
            }
          } catch {
            // ignore
          }
        } catch (err) {
          console.error("Lỗi xóa dự án:", err);
        }
      },
    });
  };

  // Listen to sentence sub-segment TTS generation progress (e.g. 1/11)
  const setSentenceProgress = useProjectStore((s) => s.setSentenceProgress);
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void tauriListenSentenceProgress((p) => {
      setSentenceProgress(p.sentenceId, { current: p.current, total: p.total });
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [setSentenceProgress]);

  // Global shortcuts & Disable Browser Inspect/F12
  useEffect(() => {
    // 1. Chặn hoàn toàn Context Menu mặc định của browser (Inspect, View Source, Reload)
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Chặn các phím tắt DevTools & Browser Inspect
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Chặn F12
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      // Chặn Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools Inspect)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        ["i", "j", "c"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        return;
      }

      // Chặn Ctrl+U (View Page Source)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        return;
      }

      // F1: Help Shortcuts
      if (e.key === "F1") {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // F2: toggle text tags panel
      if (e.key === "F2") {
        e.preventDefault();
        setIsTextTagsOpen((prev) => !prev);
        return;
      }

      // Find: Ctrl+F / Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        openFind();
        return;
      }

      // Replace: Ctrl+H / Cmd+H
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
        e.preventDefault();
        openReplace();
        return;
      }

      // Insert Paragraph: Ctrl+I / Cmd+I
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        if (activeProject && activeChapter) {
          setIsInsertParagraphOpen(true);
        }
        return;
      }

      // Group: Ctrl+G / Cmd+G
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (activeProject && activeChapter) {
          setIsSplitChapterOpen(true);
        }
      }
    };

    window.addEventListener("contextmenu", handleGlobalContextMenu);
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("contextmenu", handleGlobalContextMenu);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [activeProject, activeChapter, openFind, openReplace]);

  // Hàm nạp danh sách dự án từ SQLite với cơ chế retry thông minh và tự mở lại sách cũ
  const refreshProjects = async (autoOpenSaved = false, retry = 0) => {
    setIsRefreshingProjects(true);
    try {
      const projs = await tauriGetProjects();
      setProjects(projs);

      if (projs.length === 0 && retry < 4) {
        setTimeout(() => {
          refreshProjects(autoOpenSaved, retry + 1);
        }, 300 * (retry + 1));
        return;
      }

      if (projs.length > 0 && autoOpenSaved && !activeProject) {
        try {
          const savedId = localStorage.getItem("bookstudio_active_project_id");
          if (savedId) {
            const matched = projs.find((p) => p.id === savedId);
            if (matched) {
              await openProject(matched);
            }
          }
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error("Lỗi làm mới thư viện sách:", err);
    } finally {
      setIsRefreshingProjects(false);
    }
  };

  // Initial load & window focus sync: Fetch recent projects and characters from SQLite
  useEffect(() => {
    refreshProjects(true);

    const handleFocus = () => {
      if (!activeProject) {
        refreshProjects(false);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeProject]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Header Bar - Chỉ hiện khi đang trong phòng thu dự án (Xóa hoàn toàn ở màn hình Welcome) */}
      {activeProject && (
        <HeaderBar
          onOpenImport={() => setIsImportOpen(true)}
          onOpenVoiceSettings={() => setIsVoiceOpen(true)}
          onOpenCharacterCasting={() => setIsCharacterOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenSplitChapter={() => setIsSplitChapterOpen(true)}
          onOpenInsertModal={() => setIsInsertParagraphOpen(true)}
          onOpenShortcutsHelp={() => setIsShortcutsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAbout={() =>
            alert(
              "BookStudio — Audiobook Production Studio\nPhiên bản Studio Edition\n\nTích hợp mô hình giọng đọc VieNeu-TTS, phân tách kịch bản thông minh & quản lý đa nhân vật."
            )
          }
          onSelectProject={openProject}
        />
      )}

      {/* Main Studio Body: Chapter List (Left) + Sentence Script (Center) */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          width: "100%",
        }}
        className="flex-1 flex flex-row overflow-hidden w-full"
      >
        {activeProject ? (
          <>
            <ChapterList
              onOpenSplitChapter={() => setIsSplitChapterOpen(true)}
            />
            <SentenceTable
              onOpenSplitChapter={() => setIsSplitChapterOpen(true)}
              onOpenInsertModal={() => setIsInsertParagraphOpen(true)}
            />
          </>
        ) : (
          /* Welcome Screen & Bookshelf Card Grid */
          <div
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              overflowY: "auto",
              background: "radial-gradient(ellipse at top, rgba(49,46,129,0.12) 0%, #09090b 60%)",
              userSelect: "none",
            }}
          >
            {/* ── Hero Section ─────────────────────────────── */}
            <div
              style={{
                paddingTop: 52, paddingBottom: 28,
                paddingLeft: 40, paddingRight: 40,
                maxWidth: 780, margin: "0 auto", width: "100%",
                textAlign: "center", display: "flex",
                flexDirection: "column", alignItems: "center",
              }}
            >
              {/* Logo */}
              <img
                src="/app-icon.png"
                alt="BookStudio Logo"
                style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", flexShrink: 0 }}
                className="shadow-2xl shadow-indigo-500/20 border border-zinc-700/60"
              />

              {/* VieNeu-TTS Badge */}
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={checkHealth}
                  title="Bấm để kiểm tra lại kết nối VieNeu-TTS"
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    gap: 6, flexWrap: "nowrap", whiteSpace: "nowrap",
                    minWidth: 200,
                    paddingTop: 6, paddingBottom: 6, paddingLeft: 14, paddingRight: 14,
                    borderRadius: 9999, border: "1px solid #27272a",
                    background: "rgba(24,24,27,0.9)",
                    fontSize: 12, fontWeight: 500,
                    cursor: "pointer", backdropFilter: "blur(8px)",
                  }}
                  className="hover:border-zinc-700 hover:bg-zinc-800/80 transition-colors"
                >
                  {/* Status Indicator: Spinner khi checking, Dot khi idle */}
                  {isCheckingTts ? (
                    <Loader2
                      style={{ width: 12, height: 12, flexShrink: 0 }}
                      className="animate-spin text-zinc-400"
                    />
                  ) : (
                    <span
                      style={{
                        width: 8, height: 8, minWidth: 8, minHeight: 8,
                        borderRadius: "50%", flexShrink: 0,
                        backgroundColor: isServerOnline ? "#10b981" : "#f43f5e",
                      }}
                      className={isServerOnline ? "animate-pulse" : ""}
                    />
                  )}
                  {/* Label */}
                  <span
                    style={{
                      fontFamily: "monospace", flexShrink: 0,
                      color: isServerOnline ? "#34d399" : "#fb7185",
                      fontWeight: isServerOnline ? 600 : 400,
                    }}
                  >
                    {isServerOnline ? "VieNeu-TTS :8880" : "TTS Offline"}
                  </span>
                </button>
              </div>

              {/* Heading & description */}
              <div style={{ marginBottom: 4, maxWidth: 500 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>
                  Chào Mừng Đến Với BookStudio
                </h2>
                <p
                  style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}
                >
                  Trạm sản xuất sách nói chuẩn phòng thu. Bóc tách câu tiếng Việt thông minh, phân vai nhân vật đa giọng đọc và kết nối trực tiếp với mô hình VieNeu-TTS.
                </p>
              </div>

              {/* CTA Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 20 }}>
                <button
                  onClick={() => setIsImportOpen(true)}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={{ paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16 }}
                >
                  <Plus style={{ width: 16, height: 16, flexShrink: 0 }} />
                  <span>Mở Sách Mới (EPUB / TXT / Markdown)</span>
                </button>

                <button
                  onClick={() => setIsVoiceOpen(true)}
                  className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-zinc-800 flex items-center gap-2 hover:border-zinc-700 transition-colors"
                  style={{ paddingTop: 8, paddingBottom: 8, paddingLeft: 14, paddingRight: 14 }}
                >
                  <Sliders style={{ width: 14, height: 14, flexShrink: 0 }} className="text-zinc-400" />
                  <span>Cài Đặt Giọng & Kiểm Tra TTS</span>
                </button>

                <button
                  onClick={handleImportProject}
                  disabled={!!archiveBusy}
                  className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-zinc-800 flex items-center gap-2 hover:border-zinc-700 transition-colors disabled:opacity-50"
                  style={{ paddingTop: 8, paddingBottom: 8, paddingLeft: 14, paddingRight: 14 }}
                  title="Nhập dự án đã xuất từ máy khác (file .bsproj, kèm toàn bộ audio)"
                >
                  <Download style={{ width: 14, height: 14, flexShrink: 0 }} className="text-zinc-400" />
                  <span>Nhập Dự Án (.bsproj)</span>
                </button>
              </div>
            </div>

            {/* ── Divider ──────────────────────────────────── */}
            <div
              style={{
                borderTop: "1px solid rgba(63,63,70,0.5)",
                maxWidth: 980, margin: "0 auto", width: "100%",
                paddingLeft: 40, paddingRight: 40, boxSizing: "border-box",
              }}
            />

            {/* ── Bookshelf Section ────────────────────────── */}
            <div
              style={{
                flex: 1, width: "100%", maxWidth: 980,
                margin: "0 auto",
                paddingTop: 0, paddingLeft: 40, paddingRight: 40, paddingBottom: 48,
                display: "flex", flexDirection: "column", boxSizing: "border-box",
              }}
            >
              {/* ── Library toolbar: title + filter tabs + search + sort ── */}
              <div style={{ paddingTop: 18, paddingBottom: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Row 1: icon + title + search + sort */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Library style={{ width: 16, height: 16, flexShrink: 0 }} className="text-indigo-400" />
                  <h3 style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0, margin: 0 }}>
                    Thư Viện Sách ({projects.length})
                  </h3>

                  {/* Nút Làm Mới Thư Viện */}
                  <button
                    type="button"
                    onClick={() => refreshProjects(false)}
                    disabled={isRefreshingProjects}
                    title="Làm mới danh sách sách từ database"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingTop: 3,
                      paddingBottom: 3,
                      paddingLeft: 8,
                      paddingRight: 8,
                      borderRadius: 6,
                      background: "rgba(39,39,42,0.6)",
                      border: "1px solid #27272a",
                      fontSize: 11,
                      color: "#a1a1aa",
                      cursor: "pointer",
                      gap: 4,
                    }}
                    className="hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                  >
                    <RotateCw
                      style={{
                        width: 12,
                        height: 12,
                        animation: isRefreshingProjects ? "spin 1s linear infinite" : "none",
                      }}
                    />
                    <span>{isRefreshingProjects ? "Đang nạp..." : "Làm mới"}</span>
                  </button>

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Search */}
                  {projects.length > 0 && (
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: 190, height: 28, flexShrink: 0,
                        paddingLeft: 10, paddingRight: 10,
                        borderRadius: 8, border: "1px solid #27272a",
                        background: "#18181b",
                      }}
                      className="focus-within:border-indigo-500 transition-colors"
                    >
                      <Search style={{ width: 13, height: 13, flexShrink: 0 }} className="text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Tìm sách, tác giả..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#e4e4e7", minWidth: 0 }}
                        className="placeholder-zinc-600"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          style={{ flexShrink: 0, fontSize: 11, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                          className="text-zinc-500 hover:text-zinc-300"
                        >✕</button>
                      )}
                    </div>
                  )}

                  {/* Sort dropdown */}
                  {projects.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <ArrowUpDown style={{ width: 13, height: 13 }} className="text-zinc-500" />
                      <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                        style={{
                          background: "#18181b", border: "1px solid #27272a", borderRadius: 8,
                          color: "#a1a1aa", fontSize: 12, height: 28,
                          paddingLeft: 8, paddingRight: 8, cursor: "pointer", outline: "none",
                        }}
                        className="hover:border-zinc-700 transition-colors"
                      >
                        <option value="updated_at">Mới cập nhật</option>
                        <option value="title">Tên A→Z</option>
                        <option value="progress_desc">Tiến độ cao</option>
                        <option value="progress_asc">Tiến độ thấp</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Row 2: Filter status tabs */}
                {projects.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {(["all", "active", "completed", "dropped"] as const).map((s) => {
                      const labels: Record<string, string> = {
                        all: "Tất cả",
                        active: "Đang tiến hành",
                        completed: "Hoàn thành",
                        dropped: "Drop",
                      };
                      const colors: Record<string, { active: string; bg: string }> = {
                        all:       { active: "#6366f1", bg: "rgba(99,102,241,0.15)" },
                        active:    { active: "#22c55e", bg: "rgba(34,197,94,0.12)" },
                        completed: { active: "#10b981", bg: "rgba(16,185,129,0.12)" },
                        dropped:   { active: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
                      };
                      const isActive = filterStatus === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFilterStatus(s)}
                          style={{
                            paddingTop: 3, paddingBottom: 3, paddingLeft: 10, paddingRight: 10,
                            borderRadius: 6, fontSize: 11, fontWeight: isActive ? 600 : 400,
                            border: isActive ? `1px solid ${colors[s].active}` : "1px solid #27272a",
                            background: isActive ? colors[s].bg : "transparent",
                            color: isActive ? colors[s].active : "#71717a",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                        >
                          {labels[s]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cards / empty states */}
              {filteredProjects.length === 0 ? (
                projects.length === 0 ? (
                  <div
                    style={{
                      padding: "64px 24px", textAlign: "center",
                      background: "rgba(24,24,27,0.3)", borderRadius: 16,
                      border: "1px dashed #27272a", marginTop: 4,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                    }}
                  >
                    <BookOpen style={{ width: 40, height: 40 }} className="text-zinc-600" />
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#a1a1aa", margin: 0 }}>
                      Chưa có dự án sách nào trong thư viện
                    </p>
                    <p style={{ fontSize: 12, color: "#71717a", maxWidth: 340, margin: 0 }}>
                      Hãy nhấn nút &quot;Mở Sách Mới&quot; phía trên để nạp tệp sách EPUB, TXT hoặc Markdown đầu tiên vào BookStudio.
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                      <button
                        onClick={() => setIsImportOpen(true)}
                        className="rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-medium transition-all"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                          paddingTop: 6,
                          paddingBottom: 6,
                          paddingLeft: 12,
                          paddingRight: 12,
                          cursor: "pointer",
                        }}
                      >
                        <Plus style={{ width: 14, height: 14, flexShrink: 0 }} />
                        <span style={{ whiteSpace: "nowrap" }}>Nhập sách ngay</span>
                      </button>

                      <button
                        onClick={() => refreshProjects(true)}
                        disabled={isRefreshingProjects}
                        className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium transition-all"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                          paddingTop: 6,
                          paddingBottom: 6,
                          paddingLeft: 12,
                          paddingRight: 12,
                          cursor: isRefreshingProjects ? "not-allowed" : "pointer",
                        }}
                        title="Tải lại danh sách sách từ database"
                      >
                        <RotateCw
                          style={{
                            width: 13,
                            height: 13,
                            flexShrink: 0,
                            animation: isRefreshingProjects ? "spin 1s linear infinite" : "none",
                          }}
                        />
                        <span style={{ whiteSpace: "nowrap" }}>{isRefreshingProjects ? "Đang tải lại..." : "Tải Lại Thư Viện"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "48px 0", textAlign: "center", fontSize: 12, color: "#71717a" }}>
                    Không tìm thấy sách nào{filterStatus !== "all" ? ` trong mục "${filterStatus === "active" ? "Đang tiến hành" : filterStatus === "completed" ? "Hoàn thành" : "Drop"}"` : ""}{searchQuery ? ` khớp với "${searchQuery}"` : ""}.
                  </div>
                )
              ) : (
                <>
                  {/* Card grid — 4 cột cố định */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 210px)", gap: 20 }}>
                    {visibleProjects.map((proj) => (
                      <ProjectCard
                        key={proj.id}
                        project={proj}
                        onOpen={openProject}
                        onDelete={handleDeleteProject}
                        onExport={handleExportProject}
                        onStatusChange={async (id, status) => {
                          await tauriUpdateProjectStatus(id, status);
                          updateProjectStatus(id, status);
                        }}
                      />
                    ))}
                  </div>

                  {/* Load more */}
                  {filteredProjects.length > visibleCardCount && (
                    <div style={{ paddingTop: 32, textAlign: "center" }}>
                      <button
                        onClick={() => setVisibleCardCount((prev) => prev + 12)}
                        className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 text-xs font-medium transition-colors"
                        style={{ paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16 }}
                      >
                        Tải thêm sách ({filteredProjects.length - visibleCardCount} còn lại)...
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Waveform Inspector Panel */}
      {activeProject && <WaveformPanel />}

      {/* Project export / import status (solid background, bottom right) */}
      {(archiveBusy || archiveNotice) && (
        <div
          style={{
            position: "fixed", right: 20, bottom: 20, zIndex: 9990, width: 340,
            backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 12,
            padding: "12px 14px", boxShadow: "0 20px 40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          }}
        >
          {archiveBusy ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#e4e4e7", fontWeight: 600 }}>
                <Loader2 className="animate-spin text-indigo-400 shrink-0" style={{ width: 14, height: 14 }} />
                <span className="truncate">
                  {archiveBusy.kind === "export" ? "Đang xuất" : "Đang nhập"}: {archiveBusy.title}
                </span>
              </div>
              <div style={{ marginTop: 8, height: 6, borderRadius: 999, backgroundColor: "#27272a", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%", backgroundColor: "#6366f1", transition: "width 0.2s",
                    width: archiveBusy.total > 0 ? `${Math.round((archiveBusy.current / archiveBusy.total) * 100)}%` : "8%",
                  }}
                />
              </div>
              <div style={{ marginTop: 4, fontSize: 10, color: "#a1a1aa" }}>
                {archiveBusy.total > 0 ? `${archiveBusy.current} / ${archiveBusy.total} file audio` : "Đang chuẩn bị..."}
              </div>
            </>
          ) : (
            archiveNotice && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <p style={{ flex: 1, margin: 0, fontSize: 12, lineHeight: 1.5, color: archiveNotice.ok ? "#6ee7b7" : "#fda4af" }}>
                  {archiveNotice.message}
                </p>
                <button
                  onClick={() => setArchiveNotice(null)}
                  className="text-zinc-500 hover:text-zinc-200 text-xs shrink-0"
                  aria-label="Đóng thông báo"
                >
                  ✕
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Overlays / Modals */}
      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <VoiceModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
      <CharacterModal isOpen={isCharacterOpen} onClose={() => setIsCharacterOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <SplitChapterModal isOpen={isSplitChapterOpen} onClose={() => setIsSplitChapterOpen(false)} />
      <FindReplaceModal
        isOpen={isFindReplaceOpen}
        initialTab={findReplaceTab}
        onClose={closeFindReplace}
      />
      <InsertParagraphModal
        isOpen={isInsertParagraphOpen}
        onClose={() => setIsInsertParagraphOpen(false)}
      />
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <TextTagsModal
        isOpen={isTextTagsOpen}
        onClose={() => setIsTextTagsOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <ConfirmModal />
    </div>
  );
}
