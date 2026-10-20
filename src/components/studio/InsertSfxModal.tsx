"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import {
  X,
  Sparkles,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  Check,
  AlertCircle,
  Volume2,
  Scissors,
  RotateCcw,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import {
  tauriGetChapters,
  tauriGetSentences,
  tauriInsertSfxSentence,
} from "@/lib/tauri";
import { formatDuration } from "@/lib/utils";
import { SFX_CATALOG, SfxItem } from "@/data/sfxCatalog";
import type { SentenceItem } from "@/types";

interface InsertSfxModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSentence: SentenceItem | null;
  initialSfx: SfxItem | null;
  initialPosition?: "above" | "below";
  onInserted?: (newSentence: SentenceItem) => void;
}

export const InsertSfxModal: React.FC<InsertSfxModalProps> = ({
  isOpen,
  onClose,
  targetSentence,
  initialSfx,
  initialPosition = "below",
  onInserted,
}) => {
  const { activeProject, activeChapter, setSentences, setChapters } =
    useProjectStore();

  const [selectedSfx, setSelectedSfx] = useState<SfxItem | null>(initialSfx);
  const [position, setPosition] = useState<"above" | "below">(initialPosition);
  const [startSecs, setStartSecs] = useState<number>(0);
  const [durationSecs, setDurationSecs] = useState<number>(3);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [isPlayingSelection, setIsPlayingSelection] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const waveContainerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  const activeRegionRef = useRef<Region | null>(null);

  // Sync state khi modal mở
  useEffect(() => {
    if (isOpen) {
      setSelectedSfx(initialSfx);
      setPosition(initialPosition);
      setStartSecs(0);
      setDurationSecs(3);
      setErrorMessage(null);
      setIsPlayingFull(false);
      setIsPlayingSelection(false);
    }
  }, [isOpen, initialSfx, initialPosition]);

  // Khởi tạo WaveSurfer khi có selectedSfx và modal đang mở
  useEffect(() => {
    if (!isOpen || !selectedSfx || !waveContainerRef.current) return;

    // Hủy instance cũ nếu có
    if (wsRef.current) {
      try {
        wsRef.current.destroy();
      } catch (e) {
        // ignore
      }
      wsRef.current = null;
    }

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: "#71717a",
      progressColor: "#a855f7",
      cursorColor: "#c084fc",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
      plugins: [regions],
    });

    wsRef.current = ws;

    ws.load(selectedSfx.relPath);

    ws.on("ready", (dur) => {
      setTotalDuration(dur);
      const initialDur = Math.min(dur, 3.0);
      setDurationSecs(Number(initialDur.toFixed(2)));

      // Tạo region ban đầu
      try {
        regions.clearRegions();
        const reg = regions.addRegion({
          start: 0,
          end: initialDur,
          color: "rgba(168, 85, 247, 0.3)",
          drag: true,
          resize: true,
        });
        activeRegionRef.current = reg;
      } catch (e) {
        console.warn("Lỗi tạo region ban đầu:", e);
      }
    });

    regions.on("region-updated", (reg: Region) => {
      activeRegionRef.current = reg;
      setStartSecs(Number(reg.start.toFixed(2)));
      setDurationSecs(Number((reg.end - reg.start).toFixed(2)));
    });

    ws.on("play", () => {
      // play event
    });

    ws.on("pause", () => {
      setIsPlayingFull(false);
      setIsPlayingSelection(false);
    });

    ws.on("finish", () => {
      setIsPlayingFull(false);
      setIsPlayingSelection(false);
    });

    return () => {
      try {
        ws.destroy();
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
  }, [isOpen, selectedSfx]);

  if (!mounted || !isOpen || !activeProject || !activeChapter || !targetSentence) return null;

  // Cập nhật region khi người dùng gõ vào ô input
  const handleTimeInputChange = (newStart: number, newDur: number) => {
    const s = Math.max(0, Math.min(newStart, totalDuration));
    const maxDur = Math.max(0.1, totalDuration - s);
    const d = Math.max(0.1, Math.min(newDur, maxDur));

    setStartSecs(Number(s.toFixed(2)));
    setDurationSecs(Number(d.toFixed(2)));

    if (regionsRef.current) {
      regionsRef.current.clearRegions();
      const reg = regionsRef.current.addRegion({
        start: s,
        end: s + d,
        color: "rgba(168, 85, 247, 0.3)",
        drag: true,
        resize: true,
      });
      activeRegionRef.current = reg;
    }
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
      wsRef.current.setTime(reg.start);
      wsRef.current.play();
      setIsPlayingSelection(true);

      const checkEnd = () => {
        if (!wsRef.current) return;
        if (wsRef.current.getCurrentTime() >= reg.end) {
          wsRef.current.pause();
          setIsPlayingSelection(false);
          wsRef.current.un("timeupdate", checkEnd);
        }
      };
      wsRef.current.on("timeupdate", checkEnd);
    }
  };

  const handleInsert = async () => {
    if (!selectedSfx) {
      setErrorMessage("Vui lòng chọn một hiệu ứng âm thanh.");
      return;
    }
    if (durationSecs <= 0) {
      setErrorMessage("Thời lượng hiệu ứng phải lớn hơn 0 giây.");
      return;
    }

    setIsWorking(true);
    setErrorMessage(null);

    try {
      const newSentence = await tauriInsertSfxSentence({
        projectId: activeProject.id,
        chapterId: activeChapter.id,
        targetSentenceId: targetSentence.id,
        position,
        sfxPath: selectedSfx.relPath,
        sfxName: selectedSfx.name,
        startSecs,
        durationSecs,
      });

      // Nạp lại danh sách câu & chapter để cập nhật tổng thời lượng
      const [refreshedSentences, refreshedChapters] = await Promise.all([
        tauriGetSentences(activeChapter.id),
        tauriGetChapters(activeProject.id),
      ]);

      setSentences(refreshedSentences);
      setChapters(refreshedChapters);

      if (onInserted) {
        onInserted(newSentence);
      }

      onClose();
    } catch (err: any) {
      console.error("Lỗi chèn hiệu ứng âm thanh:", err);
      setErrorMessage(err?.message || String(err));
    } finally {
      setIsWorking(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 18, paddingBottom: 18 }}
          className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm">
                Chèn Hiệu Ứng Âm Thanh (SFX)
              </h3>
              <p className="text-xs text-zinc-400">
                Cắt đoạn âm thanh và chèn vào vị trí chỉ định trong kịch bản
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

          {/* Chọn Hiệu Ứng */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
              <span>Hiệu ứng đã chọn</span>
              {totalDuration > 0 && (
                <span className="font-mono text-[11px] text-purple-400">
                  Tổng độ dài file gốc: {formatDuration(totalDuration)}
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 flex items-center justify-between">
                <span className="font-medium text-purple-300">
                  {selectedSfx?.name || "Chưa chọn hiệu ứng"}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {selectedSfx?.topicName}
                </span>
              </div>
            </div>
          </div>

          {/* Waveform Player & Selection Region */}
          <div
            style={{ padding: "18px 20px" }}
            className="space-y-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 text-purple-400 font-medium">
                <Scissors className="w-3.5 h-3.5" />
                <span>Kéo vùng chọn trực tiếp trên sóng âm:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlayFull}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                    isPlayingFull
                      ? "bg-purple-600 text-white border-purple-500"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {isPlayingFull ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Phát toàn bộ</span>
                </button>

                <button
                  type="button"
                  onClick={handlePlaySelection}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                    isPlayingSelection
                      ? "bg-purple-600 text-white border-purple-500"
                      : "bg-purple-950/80 text-purple-300 border-purple-700/80 hover:bg-purple-900"
                  }`}
                >
                  {isPlayingSelection ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Phát đoạn chọn</span>
                </button>
              </div>
            </div>

            {/* Khung sóng âm */}
            <div
              ref={waveContainerRef}
              className="w-full bg-zinc-900 rounded-lg p-2.5 overflow-hidden cursor-crosshair min-h-[80px]"
            />

            {/* Các ô nhập số giây chính xác */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">
                  Bắt đầu từ (giây):
                </label>
                <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 focus-within:border-purple-500 transition-colors">
                  <input
                    type="number"
                    min={0}
                    max={Math.max(0, totalDuration - 0.1)}
                    step={0.1}
                    value={startSecs}
                    onChange={(e) =>
                      handleTimeInputChange(
                        parseFloat(e.target.value) || 0,
                        durationSecs
                      )
                    }
                    className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                  />
                  <span className="text-[11px] text-zinc-500 font-mono shrink-0 ml-2 select-none">
                    giây
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">
                  Thời lượng cắt (giây):
                </label>
                <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 focus-within:border-purple-500 transition-colors">
                  <input
                    type="number"
                    min={0.1}
                    max={Math.max(0.1, totalDuration - startSecs)}
                    step={0.1}
                    value={durationSecs}
                    onChange={(e) =>
                      handleTimeInputChange(
                        startSecs,
                        parseFloat(e.target.value) || 0.1
                      )
                    }
                    className="w-full bg-transparent text-xs text-purple-300 font-mono font-bold focus:outline-none"
                  />
                  <span className="text-[11px] text-zinc-500 font-mono shrink-0 ml-2 select-none">
                    giây
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 pt-1 text-xs text-zinc-400">
              <span className="text-zinc-500 mr-0.5">Mẫu nhanh:</span>
              {[1.0, 2.0, 3.0, 5.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleTimeInputChange(startSecs, preset)}
                  className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                    Math.abs(durationSecs - preset) < 0.05
                      ? "bg-purple-900 text-white border-purple-600 font-semibold"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {preset}s
                </button>
              ))}
              {totalDuration > 0 && (
                <button
                  type="button"
                  onClick={() => handleTimeInputChange(0, totalDuration)}
                  className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                    Math.abs(durationSecs - totalDuration) < 0.05
                      ? "bg-purple-900 text-white border-purple-600 font-semibold"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  Toàn bộ ({totalDuration.toFixed(1)}s)
                </button>
              )}
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
                    ? "bg-purple-600/15 border-purple-500 text-purple-300 shadow-sm"
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
                    ? "bg-purple-600/15 border-purple-500 text-purple-300 shadow-sm"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                <ArrowDown className="w-4 h-4" />
                <span>Chèn phía dưới (Below)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer: Căn trái thẳng hàng với content, padding rộng rãi */}
        <div
          style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 18, paddingBottom: 18 }}
          className="flex items-center justify-start gap-3 border-t border-zinc-800 bg-zinc-900/80 shrink-0"
        >
          <button
            type="button"
            onClick={handleInsert}
            disabled={isWorking || !selectedSfx}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
