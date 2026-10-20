"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import {
  X,
  Music,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  Check,
  AlertCircle,
  Scissors,
  FolderOpen,
  Repeat,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import {
  tauriGetChapters,
  tauriGetSentences,
  tauriInsertBgmSentence,
  tauriReadAudioBase64,
  tauriSelectBgmFile,
} from "@/lib/tauri";
import { formatDuration } from "@/lib/utils";
import type { SentenceItem } from "@/types";

interface InsertBgmModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSentence: SentenceItem | null;
  initialPosition?: "above" | "below";
  onInserted?: (newSentence: SentenceItem) => void;
}

const MAX_TARGET_SECS = 3600;

const getFileName = (path: string): string => {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
};

const stripExtension = (name: string): string => name.replace(/\.[^.]+$/, "");

export const InsertBgmModal: React.FC<InsertBgmModalProps> = ({
  isOpen,
  onClose,
  targetSentence,
  initialPosition = "below",
  onInserted,
}) => {
  const { activeProject, activeChapter, setSentences, setChapters } =
    useProjectStore();

  const [filePath, setFilePath] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [position, setPosition] = useState<"above" | "below">(initialPosition);
  const [startSecs, setStartSecs] = useState<number>(0);
  const [cutSecs, setCutSecs] = useState<number>(10);
  const [targetSecs, setTargetSecs] = useState<number>(10);
  const [targetTouched, setTargetTouched] = useState(false);
  const [fadeInSecs, setFadeInSecs] = useState<number>(1);
  const [fadeOutSecs, setFadeOutSecs] = useState<number>(1);
  const [volumePct, setVolumePct] = useState<number>(100);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [isPlayingSelection, setIsPlayingSelection] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const waveContainerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null);
  const activeRegionRef = useRef<Region | null>(null);
  const targetTouchedRef = useRef(false);
  targetTouchedRef.current = targetTouched;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state khi modal mở
  useEffect(() => {
    if (isOpen) {
      setFilePath(null);
      setAudioUrl(null);
      setPosition(initialPosition);
      setStartSecs(0);
      setCutSecs(10);
      setTargetSecs(10);
      setTargetTouched(false);
      setFadeInSecs(1);
      setFadeOutSecs(1);
      setVolumePct(100);
      setTotalDuration(0);
      setErrorMessage(null);
      setIsPlayingFull(false);
      setIsPlayingSelection(false);
    }
  }, [isOpen, initialPosition]);

  // Khởi tạo WaveSurfer khi đã nạp file nhạc
  useEffect(() => {
    if (!isOpen || !audioUrl || !waveContainerRef.current) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: "#71717a",
      progressColor: "#10b981",
      cursorColor: "#34d399",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
      plugins: [regions],
    });
    wsRef.current = ws;

    ws.on("ready", (dur) => {
      setTotalDuration(dur);
      const initialCut = Math.min(dur, 10.0);
      setStartSecs(0);
      setCutSecs(Number(initialCut.toFixed(2)));
      if (!targetTouchedRef.current) {
        setTargetSecs(Number(initialCut.toFixed(2)));
      }

      try {
        regions.clearRegions();
        const reg = regions.addRegion({
          start: 0,
          end: initialCut,
          color: "rgba(16, 185, 129, 0.3)",
          drag: true,
          resize: true,
        });
        activeRegionRef.current = reg;
      } catch (e) {
        console.warn("Lỗi tạo region ban đầu:", e);
      }
    });

    ws.on("error", (err) => {
      console.error("Lỗi nạp nhạc nền vào WaveSurfer:", err);
      setErrorMessage("Không đọc được file nhạc này. Hãy thử định dạng MP3 / WAV / FLAC / OGG / M4A.");
    });

    regions.on("region-updated", (reg: Region) => {
      activeRegionRef.current = reg;
      const s = Number(reg.start.toFixed(2));
      const d = Number((reg.end - reg.start).toFixed(2));
      setStartSecs(s);
      setCutSecs(d);
      if (!targetTouchedRef.current) setTargetSecs(d);
    });

    ws.on("pause", () => {
      setIsPlayingFull(false);
      setIsPlayingSelection(false);
    });
    ws.on("finish", () => {
      setIsPlayingFull(false);
      setIsPlayingSelection(false);
    });

    ws.load(audioUrl);

    return () => {
      try {
        ws.destroy();
      } catch {
        // ignore
      }
      wsRef.current = null;
      regionsRef.current = null;
      activeRegionRef.current = null;
    };
  }, [isOpen, audioUrl]);

  if (!mounted || !isOpen || !activeProject || !activeChapter || !targetSentence) return null;

  const handleChooseFile = async () => {
    setErrorMessage(null);
    const selected = await tauriSelectBgmFile();
    if (!selected) return;

    setIsLoadingFile(true);
    try {
      const url = await tauriReadAudioBase64(selected);
      setTargetTouched(false);
      setFilePath(selected);
      setAudioUrl(url);
    } catch (err) {
      console.error("Lỗi đọc file nhạc nền:", err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Cập nhật vùng chọn khi người dùng gõ số giây
  const handleCutInputChange = (newStart: number, newDur: number) => {
    const s = Math.max(0, Math.min(newStart, Math.max(0, totalDuration - 0.1)));
    const maxDur = Math.max(0.1, totalDuration - s);
    const d = Math.max(0.1, Math.min(newDur, maxDur));

    setStartSecs(Number(s.toFixed(2)));
    setCutSecs(Number(d.toFixed(2)));
    if (!targetTouched) setTargetSecs(Number(d.toFixed(2)));

    if (regionsRef.current) {
      regionsRef.current.clearRegions();
      const reg = regionsRef.current.addRegion({
        start: s,
        end: s + d,
        color: "rgba(16, 185, 129, 0.3)",
        drag: true,
        resize: true,
      });
      activeRegionRef.current = reg;
    }
  };

  const handleTargetChange = (value: number) => {
    const v = Math.max(0.5, Math.min(value, MAX_TARGET_SECS));
    setTargetTouched(true);
    setTargetSecs(Number(v.toFixed(2)));
  };

  const handlePlayFull = () => {
    if (!wsRef.current) return;
    if (isPlayingFull) {
      wsRef.current.pause();
      setIsPlayingFull(false);
    } else {
      if (isPlayingSelection) {
        wsRef.current.pause();
        setIsPlayingSelection(false);
      }
      wsRef.current.setTime(0);
      wsRef.current.play();
      setIsPlayingFull(true);
    }
  };

  const handlePlaySelection = () => {
    if (!wsRef.current || !activeRegionRef.current) return;
    if (isPlayingSelection) {
      wsRef.current.pause();
      setIsPlayingSelection(false);
    } else {
      if (isPlayingFull) {
        wsRef.current.pause();
        setIsPlayingFull(false);
      }
      const reg = activeRegionRef.current;
      const ws = wsRef.current;
      ws.setTime(reg.start);
      ws.play();
      setIsPlayingSelection(true);

      const checkEnd = () => {
        if (ws.getCurrentTime() >= reg.end) {
          ws.pause();
          setIsPlayingSelection(false);
          ws.un("timeupdate", checkEnd);
        }
      };
      ws.on("timeupdate", checkEnd);
    }
  };

  const handleInsert = async () => {
    if (!filePath) {
      setErrorMessage("Vui lòng chọn một file nhạc nền.");
      return;
    }
    if (cutSecs <= 0 || targetSecs <= 0) {
      setErrorMessage("Thời lượng phải lớn hơn 0 giây.");
      return;
    }

    setIsWorking(true);
    setErrorMessage(null);

    try {
      const newSentence = await tauriInsertBgmSentence({
        projectId: activeProject.id,
        chapterId: activeChapter.id,
        targetSentenceId: targetSentence.id,
        position,
        bgmPath: filePath,
        bgmName: stripExtension(getFileName(filePath)),
        startSecs,
        cutSecs,
        targetSecs,
        fadeInSecs,
        fadeOutSecs,
        volume: volumePct / 100,
      });

      const [refreshedSentences, refreshedChapters] = await Promise.all([
        tauriGetSentences(activeChapter.id),
        tauriGetChapters(activeProject.id),
      ]);
      setSentences(refreshedSentences);
      setChapters(refreshedChapters);

      if (onInserted) onInserted(newSentence);
      onClose();
    } catch (err) {
      console.error("Lỗi chèn nhạc nền:", err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsWorking(false);
    }
  };

  const loopCount = cutSecs > 0 ? targetSecs / cutSecs : 1;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 18, paddingBottom: 18 }}
          className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm">Chèn Nhạc Nền (BGM)</h3>
              <p className="text-xs text-zinc-400">
                Khi xuất audio, BGM tổng của chương sẽ tắt tiếng trong đoạn nhạc này
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isWorking}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div
          style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 24, paddingBottom: 24 }}
          className="space-y-5 overflow-y-auto max-h-[calc(92vh-140px)] custom-scrollbar"
        >
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Chọn file nhạc */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
              <span>File nhạc nền</span>
              {totalDuration > 0 && (
                <span className="font-mono text-[11px] text-emerald-400">
                  Tổng độ dài file gốc: {formatDuration(totalDuration)}
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200">
                <span
                  className={`block truncate font-medium ${
                    filePath ? "text-emerald-300" : "text-zinc-500"
                  }`}
                  title={filePath ?? undefined}
                >
                  {filePath ? getFileName(filePath) : "Chưa chọn file nhạc"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleChooseFile}
                disabled={isLoadingFile || isWorking}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{isLoadingFile ? "Đang nạp..." : filePath ? "Đổi file..." : "Chọn file..."}</span>
              </button>
            </div>
          </div>

          {/* Waveform Player & Selection Region */}
          {audioUrl && (
            <div
              style={{ padding: "18px 20px" }}
              className="space-y-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Kéo vùng chọn trực tiếp trên sóng âm:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePlayFull}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                      isPlayingFull
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                    }`}
                  >
                    {isPlayingFull ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Phát toàn bộ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePlaySelection}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                      isPlayingSelection
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900"
                    }`}
                  >
                    {isPlayingSelection ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Phát đoạn chọn</span>
                  </button>
                </div>
              </div>

              {/* Khung sóng âm */}
              <div
                ref={waveContainerRef}
                className="w-full bg-zinc-900 rounded-lg p-2.5 overflow-hidden cursor-crosshair min-h-[80px]"
              />

              {/* Ô nhập số giây chính xác */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Bắt đầu từ (giây):</label>
                  <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 focus-within:border-emerald-500 transition-colors">
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, totalDuration - 0.1)}
                      step={0.1}
                      value={startSecs}
                      onChange={(e) =>
                        handleCutInputChange(parseFloat(e.target.value) || 0, cutSecs)
                      }
                      className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                    />
                    <span className="text-[11px] text-zinc-500 font-mono shrink-0 ml-2 select-none">giây</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Thời lượng cắt (giây):</label>
                  <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 focus-within:border-emerald-500 transition-colors">
                    <input
                      type="number"
                      min={0.1}
                      max={Math.max(0.1, totalDuration - startSecs)}
                      step={0.1}
                      value={cutSecs}
                      onChange={(e) =>
                        handleCutInputChange(startSecs, parseFloat(e.target.value) || 0.1)
                      }
                      className="w-full bg-transparent text-xs text-emerald-300 font-mono font-bold focus:outline-none"
                    />
                    <span className="text-[11px] text-zinc-500 font-mono shrink-0 ml-2 select-none">giây</span>
                  </div>
                </div>
              </div>

              {totalDuration > 0 && (
                <div className="flex items-center gap-1.5 pt-1 text-xs text-zinc-400">
                  <button
                    type="button"
                    onClick={() => handleCutInputChange(0, totalDuration)}
                    className="px-2.5 py-1 rounded-lg border text-xs transition-colors bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  >
                    Chọn toàn bộ ({totalDuration.toFixed(1)}s)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Độ dài chèn + fade + volume */}
          <div
            style={{ padding: "18px 20px" }}
            className="space-y-4 bg-zinc-950/80 border border-zinc-800 rounded-xl"
          >
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium flex items-center justify-between">
                <span>Độ dài dòng nhạc nền trong kịch bản (giây):</span>
                {audioUrl && loopCount > 1.01 && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                    <Repeat className="w-3 h-3" />
                    lặp {loopCount.toFixed(1)} lần
                  </span>
                )}
              </label>
              <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 focus-within:border-emerald-500 transition-colors">
                <input
                  type="number"
                  min={0.5}
                  max={MAX_TARGET_SECS}
                  step={0.5}
                  value={targetSecs}
                  onChange={(e) => handleTargetChange(parseFloat(e.target.value) || 0.5)}
                  className="w-full bg-transparent text-xs text-emerald-300 font-mono font-bold focus:outline-none"
                />
                <span className="text-[11px] text-zinc-500 font-mono shrink-0 ml-2 select-none">giây</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1 text-xs text-zinc-400">
                <span className="text-zinc-500 mr-0.5">Mẫu nhanh:</span>
                {[15, 30, 45, 60].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTargetChange(preset)}
                    className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                      Math.abs(targetSecs - preset) < 0.05
                        ? "bg-emerald-900 text-white border-emerald-600 font-semibold"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {preset}s
                  </button>
                ))}
                {audioUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetTouched(false);
                      setTargetSecs(cutSecs);
                    }}
                    className="px-2.5 py-1 rounded-lg border text-xs transition-colors bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  >
                    Bằng vùng chọn
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Dài hơn vùng chọn thì nhạc được lặp lại cho đủ, ngắn hơn thì cắt bớt.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Fade in (giây):</label>
                <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 focus-within:border-emerald-500 transition-colors">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={fadeInSecs}
                    onChange={(e) => setFadeInSecs(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Fade out (giây):</label>
                <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 focus-within:border-emerald-500 transition-colors">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={fadeOutSecs}
                    onChange={(e) => setFadeOutSecs(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Âm lượng (%):</label>
                <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 focus-within:border-emerald-500 transition-colors">
                  <input
                    type="number"
                    min={1}
                    max={200}
                    step={5}
                    value={volumePct}
                    onChange={(e) =>
                      setVolumePct(Math.max(1, Math.min(200, parseFloat(e.target.value) || 100)))
                    }
                    className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vị trí chèn */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Vị trí chèn so với câu #[{targetSentence.index}]
            </label>
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setPosition("above")}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-all ${
                  position === "above"
                    ? "bg-emerald-600/15 border-emerald-500 text-emerald-300 shadow-sm"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                <ArrowUp className="w-4 h-4" />
                <span>Chèn phía trên (Above)</span>
              </button>

              <button
                type="button"
                onClick={() => setPosition("below")}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-all ${
                  position === "below"
                    ? "bg-emerald-600/15 border-emerald-500 text-emerald-300 shadow-sm"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                <ArrowDown className="w-4 h-4" />
                <span>Chèn phía dưới (Below)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 18, paddingBottom: 18 }}
          className="flex items-center justify-start gap-3 border-t border-zinc-800 bg-zinc-900/80 shrink-0"
        >
          <button
            type="button"
            onClick={handleInsert}
            disabled={isWorking || !filePath}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isWorking ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang cắt & chèn...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Chèn vào kịch bản</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
