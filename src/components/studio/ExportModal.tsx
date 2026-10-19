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
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import { tauriExportChapterAudio } from "@/lib/tauri";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, activeChapter, sentences } = useProjectStore();
  const {
    sentencePauseMs,
    paragraphPauseMs,
    setSentencePauseMs,
    setParagraphPauseMs,
  } = useStudioSettingsStore();

  const [format, setFormat] = useState<"wav" | "mp3" | "m4b">("wav");
  const [outputPath, setOutputPath] = useState(
    `D:\\Audiobooks\\${activeProject?.title || "Audiobook"}_${activeChapter?.title || "Chapter"}.wav`
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const readySentences = sentences.filter((s) => s.status === "ready");

  const handleExport = async () => {
    if (!activeProject || !activeChapter || readySentences.length === 0) return;

    setIsExporting(true);
    setExportMessage(null);

    try {
      const duration = await tauriExportChapterAudio({
        projectId: activeProject.id,
        chapterId: activeChapter.id,
        outputPath,
        sentencePauseMs,
        paragraphPauseMs,
      });

      setExportMessage(
        `Xuất file audio thành công! Thời lượng tổng: ${Math.round(duration)} giây.`
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
