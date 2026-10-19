"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Volume2,
  Download,
  Settings,
  FolderOpen,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import { tauriCheckTtsConnection, tauriSynthesizeSentence } from "@/lib/tauri";

interface HeaderBarProps {
  onOpenImport: () => void;
  onOpenVoiceSettings: () => void;
  onOpenCharacterCasting: () => void;
  onOpenExport: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenImport,
  onOpenVoiceSettings,
  onOpenCharacterCasting,
  onOpenExport,
}) => {
  const {
    activeProject,
    activeChapter,
    sentences,
    isBatchGenerating,
    batchProgress,
    setIsBatchGenerating,
    setBatchProgress,
    updateSentenceStatus,
    updateSentenceAudio,
  } = useProjectStore();

  const {
    serverUrl,
    selectedVoice,
    speed,
    temperature,
    isServerOnline,
    setIsServerOnline,
  } = useStudioSettingsStore();

  const [isCheckingTts, setIsCheckingTts] = useState(false);

  const checkHealth = async () => {
    setIsCheckingTts(true);
    const online = await tauriCheckTtsConnection(serverUrl);
    setIsServerOnline(online);
    setIsCheckingTts(false);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [serverUrl]);

  const handleBatchGenerate = async () => {
    if (!activeProject || !activeChapter || isBatchGenerating) return;

    const pendingSentences = sentences.filter((s) => s.status !== "ready");
    if (pendingSentences.length === 0) return;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: pendingSentences.length });

    for (let i = 0; i < pendingSentences.length; i++) {
      const sentence = pendingSentences[i];
      setBatchProgress({ current: i + 1, total: pendingSentences.length });
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
  const progressPct =
    sentences.length > 0 ? Math.round((readyCount / sentences.length) * 100) : 0;

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur px-4 flex items-center justify-between select-none">
      {/* Brand & Active Book Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
              BookStudio
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Studio Edition
              </span>
            </h1>
          </div>
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-2" />

        {activeProject ? (
          <div className="flex items-center gap-2 max-w-sm truncate">
            <span className="text-xs text-zinc-400 truncate">
              {activeProject.title}
            </span>
            <span className="text-zinc-600 text-xs">•</span>
            <span className="text-xs text-zinc-500 truncate">
              {activeProject.author}
            </span>
          </div>
        ) : (
          <span className="text-xs text-zinc-500 italic">
            Chưa mở dự án nào
          </span>
        )}
      </div>

      {/* Center: TTS Server & Voice Badge */}
      <div className="flex items-center gap-3">
        <button
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

        <button
          onClick={onOpenVoiceSettings}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors"
        >
          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Giọng: {selectedVoice}</span>
          <Sliders className="w-3 h-3 text-zinc-500 ml-1" />
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Import Sách</span>
        </button>

        {activeProject && (
          <button
            onClick={onOpenCharacterCasting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Phân Vai</span>
          </button>
        )}

        {activeChapter && (
          <button
            onClick={handleBatchGenerate}
            disabled={isBatchGenerating || !isServerOnline}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              isBatchGenerating
                ? "bg-amber-600/30 text-amber-200 border border-amber-500/30"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {isBatchGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Đang đọc {batchProgress.current}/{batchProgress.total}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đọc Cả Chương ({progressPct}%)</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onOpenExport}
          disabled={!activeProject || readyCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Xuất Audio</span>
        </button>
      </div>
    </header>
  );
};
