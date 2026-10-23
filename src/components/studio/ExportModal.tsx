"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Download,
  FileAudio,
  Sliders,
  CheckCircle2,
  Loader2,
  Folder,
  Music,
  Mic,
  AlertCircle,
  Layers,
  FolderOpen,
  Play,
} from "lucide-react";
import { documentDir } from "@tauri-apps/api/path";
import { listen } from "@tauri-apps/api/event";
import { BgmLibraryModal } from "./BgmLibraryModal";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import {
  tauriExportChapterAudio,
  tauriExportBookAudio,
  tauriExportBatchChapters,
  tauriSelectDirectory,
  tauriOpenPath,
  tauriRevealPath,
  tauriUpdateChapterBgm,
  isTauriEnvironment,
} from "@/lib/tauri";
import type { ExportScope } from "@/types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXPORT_PREFS_KEY = "bookstudio-export-prefs";

interface ExportPrefs {
  scope?: ExportScope;
  mode?: "voice_only" | "voice_bgm";
  chapterPauseMs?: number;
  format?: "wav" | "mp3" | "m4b";
}

const loadExportPrefs = (): ExportPrefs => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EXPORT_PREFS_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as ExportPrefs;
    return {
      scope: ["chapter", "all_merged", "all_batch"].includes(p.scope as string)
        ? p.scope
        : undefined,
      mode: p.mode === "voice_only" || p.mode === "voice_bgm" ? p.mode : undefined,
      chapterPauseMs:
        typeof p.chapterPauseMs === "number" ? p.chapterPauseMs : undefined,
      format:
        p.format === "wav" || p.format === "mp3" || p.format === "m4b"
          ? p.format
          : undefined,
    };
  } catch {
    return {};
  }
};

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, chapters, activeChapter, sentences, updateChapterBgm } =
    useProjectStore();
  const {
    sentencePauseMs,
    paragraphPauseMs,
    setSentencePauseMs,
    setParagraphPauseMs,
  } = useStudioSettingsStore();

  // Các lựa chọn xuất được nhớ lại cho lần mở sau
  const [savedPrefs] = useState<ExportPrefs>(loadExportPrefs);
  const [exportScope, setExportScope] = useState<ExportScope>(
    savedPrefs.scope ?? "chapter"
  );
  const [exportMode, setExportMode] = useState<"voice_only" | "voice_bgm">(
    savedPrefs.mode ?? "voice_only"
  );
  const [bgmVolume, setBgmVolume] = useState<number>(
    activeChapter?.bgm_volume ?? 0.2
  );
  const [chapterPauseMs, setChapterPauseMs] = useState<number>(
    savedPrefs.chapterPauseMs ?? 2000
  );
  const [format, setFormat] = useState<"wav" | "mp3" | "m4b">(
    savedPrefs.format ?? "wav"
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        EXPORT_PREFS_KEY,
        JSON.stringify({
          scope: exportScope,
          mode: exportMode,
          chapterPauseMs,
          format,
        })
      );
    } catch {}
  }, [exportScope, exportMode, chapterPauseMs, format]);
  const [isExporting, setIsExporting] = useState(false);
  const [isBgmLibraryOpen, setIsBgmLibraryOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<{
    title: string;
    detail: string;
    path: string;
    isDir?: boolean;
  } | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ percent: number; stage: string } | null>(null);

  // Nhận tiến độ xuất từ backend (event "export-progress")
  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    listen<{ percent: number; stage: string }>("export-progress", (e) => {
      setProgress(e.payload);
    })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch((err) => console.error("Không lắng nghe được tiến độ xuất:", err));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const cleanProjectTitle = (activeProject?.title || "Audiobook")
    .trim()
    .replace(/[/\\:*?"<>|]/g, "_");
  const cleanChapterTitle = (
    activeChapter?.title || `Chuong_${activeChapter?.index || 1}`
  )
    .trim()
    .replace(/[/\\:*?"<>|]/g, "_");

  // Chương đã đọc xong 100% (đủ điều kiện để nối vào file master)
  const completedChapters = useMemo(
    () =>
      chapters.filter(
        (c) =>
          c.is_enabled !== false &&
          c.sentence_count > 0 &&
          c.ready_sentence_count >= c.sentence_count
      ),
    [chapters]
  );
  const [selectedMergeChapterIds, setSelectedMergeChapterIds] = useState<string[]>([]);

  // Mặc định chọn hết chương hoàn chỉnh; giữ lại lựa chọn cũ nếu chương vẫn còn hợp lệ
  useEffect(() => {
    setSelectedMergeChapterIds((prev) => {
      const validIds = new Set(completedChapters.map((c) => c.id));
      const kept = prev.filter((id) => validIds.has(id));
      const known = new Set(prev);
      const added = completedChapters.filter((c) => !known.has(c.id)).map((c) => c.id);
      return [...kept, ...added];
    });
  }, [completedChapters]);

  const allCompletedSelected =
    completedChapters.length > 0 && selectedMergeChapterIds.length === completedChapters.length;

  const handleToggleSelectAllChapters = () => {
    setSelectedMergeChapterIds(allCompletedSelected ? [] : completedChapters.map((c) => c.id));
  };

  const handleToggleMergeChapter = (id: string) => {
    setSelectedMergeChapterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Thư mục xuất mặc định: thư mục anh Yu chọn gần nhất, nếu chưa có thì dùng Documents/Audiobooks của hệ điều hành
  const [baseDir, setBaseDir] = useState<string>("");
  // Đường dẫn do người dùng tự chọn/gõ theo từng scope, không bị ghi đè khi đổi chương
  const [customPaths, setCustomPaths] = useState<Partial<Record<ExportScope, string>>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved = "";
      try {
        saved = localStorage.getItem("bookstudio-export-dir") || "";
      } catch {}
      if (saved) {
        if (!cancelled) setBaseDir(saved);
        return;
      }
      if (!isTauriEnvironment()) return;
      try {
        const docs = await documentDir();
        const sep = docs.includes("\\") ? "\\" : "/";
        if (!cancelled) setBaseDir(`${docs.replace(/[/\\]+$/, "")}${sep}Audiobooks`);
      } catch (err) {
        console.error("Không lấy được thư mục Documents:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const joinPath = (dir: string, name: string) => {
    const sep = dir.includes("\\") ? "\\" : "/";
    return `${dir.replace(/[/\\]+$/, "")}${sep}${name}`;
  };

  // Tên file (tiêu đề) nhập riêng cho từng scope; không gồm đuôi file
  const [fileNames, setFileNames] = useState<Partial<Record<ExportScope, string>>>({});
  const fileNamesKey = `bookstudio-export-names:${activeProject?.id ?? ""}`;

  // Nạp lại tên file đã nhập của dự án này (lưu localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(fileNamesKey);
      setFileNames(raw ? (JSON.parse(raw) as Partial<Record<ExportScope, string>>) : {});
    } catch {
      setFileNames({});
    }
  }, [fileNamesKey]);

  const updateFileName = (value: string) => {
    setFileNames((prev) => {
      const next = { ...prev, [exportScope]: value };
      try {
        localStorage.setItem(fileNamesKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const defaultFileName =
    exportScope === "chapter"
      ? `${cleanProjectTitle}_${cleanChapterTitle}`
      : exportScope === "all_merged"
        ? `${cleanProjectTitle}_Full_Audiobook`
        : "";
  const fileName = fileNames[exportScope] ?? defaultFileName;
  const safeFileName = fileName
    .trim()
    .replace(/\.(wav|mp3|m4b)$/i, "")
    .replace(/[/\\:*?"<>|]/g, "_");

  const outputPath =
    exportScope === "all_batch"
      ? (customPaths.all_batch ?? (baseDir ? joinPath(baseDir, cleanProjectTitle) : ""))
      : baseDir && safeFileName
        ? joinPath(baseDir, `${safeFileName}.${format}`)
        : "";
  const setOutputPath = (value: string) =>
    setCustomPaths((prev) => ({ ...prev, [exportScope]: value }));

  const rememberDir = (path: string, isDir: boolean) => {
    const dir = isDir ? path : path.replace(/[/\\][^/\\]*$/, "");
    if (!dir) return;
    setBaseDir(dir);
    try {
      localStorage.setItem("bookstudio-export-dir", dir);
    } catch {}
  };

  if (!isOpen) return null;

  const readySentences = sentences.filter((s) => s.status === "ready");
  const enabledChapters = chapters.filter((c) => c.is_enabled !== false);
  const readyChapters = enabledChapters.filter(
    (c) => (c.ready_sentence_count || 0) > 0
  );
  const totalReadySentences = enabledChapters.reduce(
    (acc, c) => acc + (c.ready_sentence_count || 0),
    0
  );

  const handleSelectBgm = () => {
    if (!activeChapter) return;
    setIsBgmLibraryOpen(true);
  };

  const handleApplyBgmFromLibrary = async (file: string) => {
    if (!activeChapter) return;
    await tauriUpdateChapterBgm({
      chapterId: activeChapter.id,
      bgmPath: file,
      bgmVolume: bgmVolume,
    });
    updateChapterBgm(activeChapter.id, file, bgmVolume);
  };

  const handleBrowsePath = async () => {
    const dir = await tauriSelectDirectory();
    if (!dir) return;
    if (exportScope === "all_batch") setOutputPath(dir);
    rememberDir(dir, true);
  };

  const handleExport = async () => {
    if (!activeProject) return;

    setIsExporting(true);
    setExportMessage(null);
    setProgress({ percent: 0, stage: "Đang bắt đầu" });

    try {
      if (exportScope === "chapter") {
        if (!activeChapter || readySentences.length === 0) {
          setExportMessage("Chương hiện tại chưa có câu thoại nào sẵn sàng để xuất!");
          setIsExporting(false);
          return;
        }

        if (activeChapter.is_enabled === false) {
          setExportMessage("Chương này đang bị vô hiệu hóa (disabled), không thể xuất audio.");
          setIsExporting(false);
          return;
        }

        if (exportMode === "voice_bgm" && !activeChapter.bgm_path) {
          setExportMessage("Vui lòng chọn file nhạc nền (BGM) trước khi xuất!");
          setIsExporting(false);
          return;
        }

        const duration = await tauriExportChapterAudio({
          projectId: activeProject.id,
          chapterId: activeChapter.id,
          outputPath,
          sentencePauseMs,
          paragraphPauseMs,
          mixBgm: exportMode === "voice_bgm",
          bgmVolume: bgmVolume,
          format,
          title: fileName.trim() || undefined,
        });

        const modeText =
          exportMode === "voice_bgm"
            ? "truyện + nhạc nền (BGM)"
            : "truyện thuần";
        setExportSuccess({
          title: "Xuất chương thành công!",
          detail: `Chương "${activeChapter.title}" (${modeText}). Thời lượng: ${Math.round(duration)} giây.`,
          path: outputPath,
        });
      } else if (exportScope === "all_merged") {
        if (selectedMergeChapterIds.length === 0) {
          setExportMessage("Vui lòng chọn ít nhất 1 chương đã đọc xong để nối!");
          setIsExporting(false);
          return;
        }

        const duration = await tauriExportBookAudio({
          projectId: activeProject.id,
          outputPath,
          chapterIds: selectedMergeChapterIds,
          sentencePauseMs,
          paragraphPauseMs,
          chapterPauseMs,
          mixBgm: exportMode === "voice_bgm",
          bgmVolume: bgmVolume,
          format,
          title: fileName.trim() || undefined,
        });

        setExportSuccess({
          title: "Nối sách thành công!",
          detail: `Đã nối ${selectedMergeChapterIds.length} chương thành 1 file Audio Master. Tổng thời lượng: ${Math.round(duration)} giây (~${Math.round(duration / 60)} phút).`,
          path: outputPath,
        });
      } else if (exportScope === "all_batch") {
        if (readyChapters.length === 0) {
          setExportMessage("Chưa có chương nào có câu thoại sẵn sàng để xuất!");
          setIsExporting(false);
          return;
        }

        const res = await tauriExportBatchChapters({
          projectId: activeProject.id,
          outputDir: outputPath,
          sentencePauseMs,
          paragraphPauseMs,
          mixBgm: exportMode === "voice_bgm",
          bgmVolume: bgmVolume,
          format,
        });

        setExportSuccess({
          title: "Xuất hàng loạt thành công!",
          detail: `Đã xuất ${res.exported_count}/${res.total_chapters} chương.`,
          path: res.output_dir,
          isDir: true,
        });
      }
    } catch (err) {
      setExportMessage(
        `Lỗi xuất audio: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const isScopeChapterDisabled =
    exportScope === "chapter" &&
    (readySentences.length === 0 || activeChapter?.is_enabled === false);

  const isScopeBookDisabled =
    (exportScope === "all_merged" && selectedMergeChapterIds.length === 0) ||
    (exportScope === "all_batch" && readyChapters.length === 0);

  const isExportButtonDisabled =
    isExporting || !outputPath.trim() || isScopeChapterDisabled || isScopeBookDisabled;

  const handleOpenResult = async (action: (path: string) => Promise<void>) => {
    if (!exportSuccess) return;
    setOpenError(null);
    try {
      await action(exportSuccess.path);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCloseSuccess = () => {
    setOpenError(null);
    setExportSuccess(null);
    onClose();
  };

  if (exportSuccess) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col items-center text-center p-6 gap-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            {exportSuccess.title}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {exportSuccess.detail}
          </p>
          <p className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-300 font-mono text-[11px] break-all">
            {exportSuccess.path}
          </p>
          {openError && (
            <p className="w-full text-[11px] text-rose-400">{openError}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {!exportSuccess.isDir && (
              <button
                type="button"
                onClick={() => handleOpenResult(tauriOpenPath)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5" />
                Mở file để nghe
              </button>
            )}
            <button
              type="button"
              onClick={() => handleOpenResult(exportSuccess.isDir ? tauriOpenPath : tauriRevealPath)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Mở thư mục
            </button>
            <button
              type="button"
              onClick={handleCloseSuccess}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Xuất Bản Audio Master (Ghép Nối Âm Thanh)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Scope Selection: 3 Tùy Chọn */}
          <div className="space-y-1.5">
            <label className="block mb-2.5 font-semibold text-zinc-300">Phạm Vi Xuất Bản</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setExportScope("chapter");
                  setExportMessage(null);
                }}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                  exportScope === "chapter"
                    ? "bg-indigo-950/50 border-indigo-500 shadow-sm ring-1 ring-indigo-500/50 text-zinc-100"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <FileAudio className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Chương hiện tại</span>
                </div>
                <p className="text-[10px] text-zinc-500 line-clamp-2">
                  Xuất 1 file riêng cho #{activeChapter?.index || 1}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportScope("all_merged");
                  setExportMessage(null);
                }}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                  exportScope === "all_merged"
                    ? "bg-indigo-950/50 border-indigo-500 shadow-sm ring-1 ring-indigo-500/50 text-zinc-100"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Nối toàn bộ 1 file</span>
                </div>
                <p className="text-[10px] text-zinc-500 line-clamp-2">
                  Ghép tất cả chương thành 1 file master dài
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportScope("all_batch");
                  setExportMessage(null);
                }}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                  exportScope === "all_batch"
                    ? "bg-indigo-950/50 border-indigo-500 shadow-sm ring-1 ring-indigo-500/50 text-zinc-100"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Xuất hàng loạt</span>
                </div>
                <p className="text-[10px] text-zinc-500 line-clamp-2">
                  Mỗi chương 1 file riêng theo số thứ tự
                </p>
              </button>
            </div>
          </div>

          {/* Status info box */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
            <span className="text-zinc-400">
              {exportScope === "chapter"
                ? "Chương xuất bản:"
                : "Tiến độ sách sẵn sàng:"}
            </span>
            <span className="font-medium text-zinc-200">
              {exportScope === "chapter"
                ? `${activeChapter?.title || "Chưa chọn chương"} (${readySentences.length}/${sentences.length} câu sẵn sàng)`
                : `${readyChapters.length}/${enabledChapters.length} chương (${totalReadySentences} câu sẵn sàng)`}
            </span>
          </div>

          {/* Chọn chương để nối (chỉ chương đã đọc xong 100%) */}
          {exportScope === "all_merged" && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-medium">
                  Chọn chương để nối ({selectedMergeChapterIds.length}/{completedChapters.length})
                </span>
                <button
                  type="button"
                  onClick={handleToggleSelectAllChapters}
                  disabled={completedChapters.length === 0}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium disabled:opacity-40 transition-colors"
                >
                  {allCompletedSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              </div>

              {completedChapters.length === 0 ? (
                <p className="text-[11px] text-amber-400">
                  Chưa có chương nào đọc xong 100% để nối.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {completedChapters.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 py-1 px-2 rounded bg-zinc-900/60 border border-zinc-800/60 hover:bg-zinc-800/60 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMergeChapterIds.includes(c.id)}
                        onChange={() => handleToggleMergeChapter(c.id)}
                        className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer shrink-0"
                      />
                      <span className="text-zinc-500 font-mono text-[11px] shrink-0">#{c.index}</span>
                      <span className="text-zinc-200 truncate">{c.title}</span>
                      <span className="ml-auto text-[10px] text-emerald-400 shrink-0">
                        {c.ready_sentence_count}/{c.sentence_count}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cảnh báo nếu chương đang bị tắt (chỉ ở mode chapter) */}
          {exportScope === "chapter" && activeChapter?.is_enabled === false && (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Chương đang bị vô hiệu hóa (Disabled)</p>
                <p className="text-[11px] text-amber-400/90 mt-0.5">
                  Chương này hiện đang bị tắt nên không được tính vào xuất bản. Vui lòng bật lại chương này trong mục lục trước khi xuất file audio.
                </p>
              </div>
            </div>
          )}

          {/* Cảnh báo nếu chưa có chương nào sẵn sàng (ở mode all_merged hoặc all_batch) */}
          {exportScope === "all_batch" && readyChapters.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Chưa có câu thoại nào sẵn sàng</p>
                <p className="text-[11px] text-amber-400/90 mt-0.5">
                  Bạn cần sinh âm thanh cho ít nhất 1 chương trước khi có thể xuất audio toàn bộ sách.
                </p>
              </div>
            </div>
          )}

          {/* Mode Selection: Voice Only vs Voice + BGM */}
          <div className="space-y-2">
            <label className="block mb-2.5 font-medium text-zinc-300">Tùy Chọn Âm Thanh</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportMode("voice_only")}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                  exportMode === "voice_only"
                    ? "bg-indigo-950/40 border-indigo-500 shadow-sm ring-1 ring-indigo-500/50"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mic
                    className={`w-4 h-4 ${
                      exportMode === "voice_only"
                        ? "text-indigo-400"
                        : "text-zinc-400"
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      exportMode === "voice_only"
                        ? "text-zinc-100"
                        : "text-zinc-300"
                    }`}
                  >
                    Xuất Audio Truyện
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Chỉ xuất âm thanh giọng đọc thuần theo khoảng lặng
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportMode("voice_bgm")}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                  exportMode === "voice_bgm"
                    ? "bg-emerald-950/40 border-emerald-500 shadow-sm ring-1 ring-emerald-500/50"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Music
                    className={`w-4 h-4 ${
                      exportMode === "voice_bgm"
                        ? "text-emerald-400"
                        : "text-zinc-400"
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      exportMode === "voice_bgm"
                        ? "text-zinc-100"
                        : "text-zinc-300"
                    }`}
                  >
                    Xuất Audio Truyện + BGM
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  {exportScope === "chapter"
                    ? "Hòa âm giọng đọc với nhạc nền chương tự động"
                    : "Hòa âm với nhạc nền riêng đã gán cho từng chương"}
                </p>
              </button>
            </div>
          </div>

          {/* BGM Settings when BGM Mode is active and Scope is chapter */}
          {exportMode === "voice_bgm" && exportScope === "chapter" && (
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-lg space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                  Nhạc nền chương (BGM):
                </span>
                <button
                  type="button"
                  onClick={handleSelectBgm}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-medium transition-colors"
                >
                  {activeChapter?.bgm_path ? "Đổi tệp BGM" : "Chọn tệp BGM"}
                </button>
              </div>

              {activeChapter?.bgm_path ? (
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-emerald-300 truncate">
                  {activeChapter.bgm_path.split(/[/\\]/).pop()}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Chưa chọn nhạc nền cho chương này. Vui lòng bấm &quot;Chọn tệp BGM&quot;.</span>
                </div>
              )}

              {/* BGM Volume Slider */}
              <div className="space-y-1 pt-1 border-t border-emerald-900/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">Âm lượng BGM khi hòa âm:</span>
                  <span className="font-mono text-emerald-400">
                    {Math.round(bgmVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.6}
                  step={0.01}
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-zinc-500">
                  Gợi ý: 15% - 25% giúp nhạc nền du dương mà không át giọng đọc. BGM sẽ tự động lặp lại và fade-out êm dịu ở cuối chương.
                </p>
              </div>
            </div>
          )}

          {/* Formats */}
          <div className="space-y-2">
            <label className="block mb-2.5 font-medium text-zinc-300">Định Dạng Âm Thanh</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "wav", name: "WAV Master", desc: "Lossless 48kHz 16-bit PCM" },
                { id: "mp3", name: "MP3 Studio", desc: "320kbps + ID3 Cover Tags" },
                { id: "m4b", name: "M4B Audiobook", desc: "AAC + Chapter Markers" },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => {
                    setFormat(fmt.id as "wav" | "mp3" | "m4b");
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    format === fmt.id
                      ? "bg-indigo-950/40 border-indigo-500 shadow-sm"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <p className="font-semibold text-zinc-200">{fmt.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{fmt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Pause Injections */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            {/* Sentence pause */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Khoảng lặng giữa các câu:</span>
                <span className="font-mono text-indigo-400">{sentencePauseMs} ms</span>
              </div>
              <input
                type="range"
                min={150}
                max={800}
                step={50}
                value={sentencePauseMs}
                onChange={(e) => setSentencePauseMs(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded cursor-pointer"
              />
            </div>

            {/* Paragraph pause */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Khoảng lặng giữa các đoạn:</span>
                <span className="font-mono text-purple-400">{paragraphPauseMs} ms</span>
              </div>
              <input
                type="range"
                min={400}
                max={1500}
                step={50}
                value={paragraphPauseMs}
                onChange={(e) => setParagraphPauseMs(Number(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-zinc-800 rounded cursor-pointer"
              />
            </div>

            {/* Chapter pause (chỉ hiển thị khi nối toàn bộ sách) */}
            {exportScope === "all_merged" && (
              <div className="space-y-1 pt-1 border-t border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Khoảng nghỉ giữa các chương:</span>
                  <span className="font-mono text-cyan-400">
                    {(chapterPauseMs / 1000).toFixed(1)} giây ({chapterPauseMs} ms)
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={5000}
                  step={250}
                  value={chapterPauseMs}
                  onChange={(e) => setChapterPauseMs(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-zinc-800 rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          {exportScope !== "all_batch" && (
            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
              <label className="block text-zinc-300 font-medium">
                Tiêu đề (tên file):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => updateFileName(e.target.value)}
                  placeholder="Nhập tên file audio..."
                  className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
                <span className="px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-500 font-mono text-[11px]">
                  .{format}
                </span>
              </div>
            </div>
          )}

          {/* Output Path / Directory */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium">
                {exportScope === "all_batch"
                  ? "Thư mục lưu các file audio chương:"
                  : "Thư mục lưu file:"}
              </label>
              <button
                type="button"
                onClick={handleBrowsePath}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors"
              >
                {exportScope === "all_batch" ? (
                  <>
                    <FolderOpen className="w-3 h-3 text-cyan-400" />
                    <span>Chọn thư mục...</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-3 h-3 text-indigo-400" />
                    <span>Chọn thư mục...</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={exportScope === "all_batch" ? outputPath : baseDir}
              onChange={(e) =>
                exportScope === "all_batch"
                  ? setOutputPath(e.target.value)
                  : rememberDir(e.target.value, true)
              }
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
            />
          </div>

          {exportMessage && (
            <p
              className={`p-2.5 rounded text-xs leading-relaxed ${
                exportMessage.includes("thành công")
                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-950/40 text-rose-400 border border-rose-500/30"
              }`}
            >
              {exportMessage}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end gap-2">
          {isExporting && progress && (
            <div className="flex-1 min-w-0 mr-2 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="truncate">{progress.stage}</span>
                <span className="font-mono text-zinc-200">
                  {Math.round(progress.percent)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
          >
            Đóng
          </button>
          <button
            onClick={handleExport}
            disabled={isExportButtonDisabled}
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 disabled:opacity-40 transition-colors shadow-sm"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {exportScope === "all_merged"
                    ? "Đang nối toàn bộ sách..."
                    : exportScope === "all_batch"
                    ? "Đang xuất hàng loạt chương..."
                    : "Đang ghép audio..."}
                </span>
              </>
            ) : (
              <>
                <FileAudio className="w-3.5 h-3.5" />
                <span>
                  {exportScope === "all_merged"
                    ? "Bắt Đầu Nối Toàn Bộ Sách"
                    : exportScope === "all_batch"
                    ? "Bắt Đầu Xuất Hàng Loạt"
                    : "Bắt Đầu Ghép Nối & Xuất File"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
      <BgmLibraryModal
        isOpen={isBgmLibraryOpen}
        currentPath={activeChapter?.bgm_path}
        onClose={() => setIsBgmLibraryOpen(false)}
        onSelect={handleApplyBgmFromLibrary}
      />
    </div>
  );
};
