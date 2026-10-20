"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import {
  tauriExportChapterAudio,
  tauriSelectBgmFile,
  tauriUpdateChapterBgm,
} from "@/lib/tauri";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, activeChapter, sentences, updateChapterBgm } =
    useProjectStore();
  const {
    sentencePauseMs,
    paragraphPauseMs,
    setSentencePauseMs,
    setParagraphPauseMs,
  } = useStudioSettingsStore();

  const [exportMode, setExportMode] = useState<"voice_only" | "voice_bgm">(
    "voice_only"
  );
  const [bgmVolume, setBgmVolume] = useState<number>(
    activeChapter?.bgm_volume ?? 0.2
  );
  const [format, setFormat] = useState<"wav" | "mp3" | "m4b">("wav");
  const [outputPath, setOutputPath] = useState(
    `D:\\Audiobooks\\${activeProject?.title || "Audiobook"}_${activeChapter?.title || "Chapter"}.wav`
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const readySentences = sentences.filter((s) => s.status === "ready");

  const handleSelectBgm = async () => {
    if (!activeChapter) return;
    const file = await tauriSelectBgmFile();
    if (file) {
      await tauriUpdateChapterBgm({
        chapterId: activeChapter.id,
        bgmPath: file,
        bgmVolume: bgmVolume,
      });
      updateChapterBgm(activeChapter.id, file, bgmVolume);
    }
  };

  const handleExport = async () => {
    if (!activeProject || !activeChapter || readySentences.length === 0) return;

    if (exportMode === "voice_bgm" && !activeChapter.bgm_path) {
      setExportMessage("Vui lòng chọn file nhạc nền (BGM) trước khi xuất!");
      return;
    }

    setIsExporting(true);
    setExportMessage(null);

    try {
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
        `Xuất file audio ${modeText} thành công! Thời lượng: ${Math.round(duration)} giây.`
      );
    } catch (err) {
      setExportMessage(
        `Lỗi xuất audio: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
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
        <div className="p-5 space-y-4 text-xs">
          {/* Status info */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
            <span className="text-zinc-400">Chương xuất bản:</span>
            <span className="font-medium text-zinc-200">
              {activeChapter?.title} ({readySentences.length}/{sentences.length} câu sẵn sàng)
            </span>
          </div>

          {/* Mode Selection: Voice Only vs Voice + BGM */}
          <div className="space-y-2">
            <label className="font-medium text-zinc-300">Tùy Chọn Xuất Bản</label>
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
                  <Mic className={`w-4 h-4 ${exportMode === "voice_only" ? "text-indigo-400" : "text-zinc-400"}`} />
                  <span className={`font-semibold ${exportMode === "voice_only" ? "text-zinc-100" : "text-zinc-300"}`}>
                    Xuất Audio Truyện
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">Chỉ xuất âm thanh giọng đọc thuần theo khoảng lặng</p>
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
                  <Music className={`w-4 h-4 ${exportMode === "voice_bgm" ? "text-emerald-400" : "text-zinc-400"}`} />
                  <span className={`font-semibold ${exportMode === "voice_bgm" ? "text-zinc-100" : "text-zinc-300"}`}>
                    Xuất Audio Truyện + BGM
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">Hòa âm giọng đọc với nhạc nền chương tự động</p>
              </button>
            </div>
          </div>

          {/* BGM Settings when BGM Mode is active */}
          {exportMode === "voice_bgm" && (
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
                  <span className="font-mono text-emerald-400">{Math.round(bgmVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.60}
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
            <label className="font-medium text-zinc-300">Định Dạng Âm Thanh</label>
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
          </div>

          {/* Output Path */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
            <label className="text-zinc-300 font-medium">Đường dẫn file đầu ra:</label>
            <input
              type="text"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
            />
          </div>

          {exportMessage && (
            <p
              className={`p-2 rounded text-xs ${
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
            disabled={isExporting || readySentences.length === 0}
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 disabled:opacity-40"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang ghép audio...</span>
              </>
            ) : (
              <>
                <FileAudio className="w-3.5 h-3.5" />
                <span>Bắt Đầu Ghép Nối & Xuất File</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
