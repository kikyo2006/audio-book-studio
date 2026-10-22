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
} from "lucide-react";
import { BgmLibraryModal } from "./BgmLibraryModal";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import {
  tauriExportChapterAudio,
  tauriExportBookAudio,
  tauriExportBatchChapters,
  tauriSelectDirectory,
  tauriSelectSaveAudioFile,
  tauriUpdateChapterBgm,
} from "@/lib/tauri";
import type { ExportScope } from "@/types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, chapters, activeChapter, sentences, updateChapterBgm } =
    useProjectStore();
  const {
    sentencePauseMs,
    paragraphPauseMs,
    setSentencePauseMs,
    setParagraphPauseMs,
  } = useStudioSettingsStore();

  const [exportScope, setExportScope] = useState<ExportScope>("chapter");
  const [exportMode, setExportMode] = useState<"voice_only" | "voice_bgm">(
    "voice_only"
  );
  const [bgmVolume, setBgmVolume] = useState<number>(
    activeChapter?.bgm_volume ?? 0.2
  );
  const [chapterPauseMs, setChapterPauseMs] = useState<number>(2000);
  const [format, setFormat] = useState<"wav" | "mp3" | "m4b">("wav");
  const [outputPath, setOutputPath] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [isBgmLibraryOpen, setIsBgmLibraryOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

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

  // Khởi tạo đường dẫn mặc định theo Scope
  useEffect(() => {
    if (exportScope === "chapter") {
      setOutputPath(
        `D:\\Audiobooks\\${cleanProjectTitle}_${cleanChapterTitle}.wav`
      );
    } else if (exportScope === "all_merged") {
      setOutputPath(
        `D:\\Audiobooks\\${cleanProjectTitle}_Full_Audiobook.wav`
      );
    } else if (exportScope === "all_batch") {
      setOutputPath(`D:\\Audiobooks\\${cleanProjectTitle}`);
    }
  }, [exportScope, cleanProjectTitle, cleanChapterTitle]);

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
    if (exportScope === "all_batch") {
      const dir = await tauriSelectDirectory();
      if (dir) setOutputPath(dir);
    } else {
      const file = await tauriSelectSaveAudioFile(outputPath);
      if (file) setOutputPath(file);
    }
  };

  const handleExport = async () => {
    if (!activeProject) return;

    setIsExporting(true);
    setExportMessage(null);

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
        });

        const modeText =
          exportMode === "voice_bgm"
            ? "truyện + nhạc nền (BGM)"
            : "truyện thuần";
        setExportMessage(
          `Xuất chương "${activeChapter.title}" (${modeText}) thành công! Thời lượng: ${Math.round(duration)} giây.`
        );
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
        });

        setExportMessage(
          `Nối ${selectedMergeChapterIds.length} chương thành 1 file Audio Master thành công! Tổng thời lượng: ${Math.round(duration)} giây (~${Math.round(duration / 60)} phút).`
        );
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
        });

        setExportMessage(
          `Xuất hàng loạt thành công ${res.exported_count}/${res.total_chapters} chương vào thư mục: ${res.output_dir}`
        );
      }
    } catch (err) {
      setExportMessage(
        `Lỗi xuất audio: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const isScopeChapterDisabled =
    exportScope === "chapter" &&
    (readySentences.length === 0 || activeChapter?.is_enabled === false);

  const isScopeBookDisabled =
    (exportScope === "all_merged" && selectedMergeChapterIds.length === 0) ||
    (exportScope === "all_batch" && readyChapters.length === 0);

  const isExportButtonDisabled =
    isExporting || isScopeChapterDisabled || isScopeBookDisabled;

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
                  onClick={() => setFormat(fmt.id as "wav" | "mp3" | "m4b")}
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

          {/* Output Path / Directory */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium">
                {exportScope === "all_batch"
                  ? "Thư mục lưu các file audio chương:"
                  : "Đường dẫn file audio đầu ra:"}
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
                    <span>Chọn nơi lưu...</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
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
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end gap-2">
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
