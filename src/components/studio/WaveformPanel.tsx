"use client";

import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import {
  Play,
  Pause,
  Square,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Repeat,
  Music,
  Mic,
  Scissors,
  Copy,
  Check,
  Trash2,
  FolderOpen,
  Volume1,
  Plus,
  X,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import {
  tauriReadAudioBase64,
  tauriSelectBgmFile,
  tauriUpdateChapterBgm,
} from "@/lib/tauri";
import { formatDuration } from "@/lib/utils";

interface TrackVolumePopoverProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  accentColor?: "indigo" | "emerald";
  label?: string;
  max?: number;
  disabled?: boolean;
}

const TrackVolumePopover: React.FC<TrackVolumePopoverProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  accentColor = "indigo",
  label = "Âm lượng",
  max = 1,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const displayVolumePercent = isMuted ? 0 : Math.round(volume * 100);

  const renderIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX className="w-3.5 h-3.5 text-rose-400" />;
    }
    if (volume < 0.5) {
      return <Volume1 className="w-3.5 h-3.5 text-zinc-300" />;
    }
    return <Volume2 className="w-3.5 h-3.5 text-zinc-300" />;
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button: icon speaker */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-6 h-6 rounded flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
          isOpen
            ? "bg-zinc-800 text-white ring-1 ring-zinc-600"
            : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
        }`}
        title={`${label} (${displayVolumePercent}%) - Nhấn để mở thanh trượt âm lượng`}
      >
        {renderIcon()}
      </button>

      {/* HTML5 Style Volume Popover (Hướng lên trên) */}
      {isOpen && !disabled && (
        <div
          style={{
            backgroundColor: "#18181b",
            position: "absolute",
            bottom: "100%",
            left: 0,
            marginBottom: 10,
            zIndex: 50,
            width: 208,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(63,63,70,0.9)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.95)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            color: "#e4e4e7",
          }}
          className="animate-in fade-in slide-in-from-bottom-2 duration-100"
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-medium">{label}</span>
            <span
              className={`font-mono font-bold ${
                isMuted
                  ? "text-rose-400"
                  : accentColor === "emerald"
                  ? "text-emerald-400"
                  : "text-indigo-400"
              }`}
            >
              {isMuted ? "Tắt tiếng" : `${displayVolumePercent}%`}
            </span>
          </div>

          {/* Slider input */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              className="text-zinc-400 hover:text-white transition-colors"
              title={isMuted ? "Bật tiếng" : "Tắt tiếng"}
            >
              {renderIcon()}
            </button>
            <input
              type="range"
              min={0}
              max={max}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onVolumeChange(val);
                if (isMuted && val > 0) {
                  onToggleMute();
                }
              }}
              className={`w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer ${
                accentColor === "emerald" ? "accent-emerald-500" : "accent-indigo-500"
              }`}
            />
          </div>

          {/* Quick presets & Mute toggle */}
          <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800 text-[10px]">
            <button
              type="button"
              onClick={onToggleMute}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                isMuted
                  ? "bg-rose-950/80 text-rose-300 border-rose-600/80"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              {isMuted ? "Bật tiếng" : "Tắt tiếng"}
            </button>

            <div className="flex items-center gap-1 font-mono text-[9px] text-zinc-400">
              {[0.25, 0.5, 0.75, 1.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onVolumeChange(preset);
                    if (isMuted) onToggleMute();
                  }}
                  className={`px-1 py-0.5 rounded hover:bg-zinc-800 ${
                    !isMuted && Math.abs(volume - preset) < 0.05
                      ? "bg-zinc-800 text-white font-bold"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {Math.round(preset * 100)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const WaveformPanel: React.FC = () => {
  const voiceContainerRef = useRef<HTMLDivElement | null>(null);
  const bgmContainerRef = useRef<HTMLDivElement | null>(null);

  const voiceWsRef = useRef<WaveSurfer | null>(null);
  const bgmWsRef = useRef<WaveSurfer | null>(null);
  const voiceRegionsRef = useRef<any>(null);
  const bgmRegionsRef = useRef<any>(null);

  const {
    sentences,
    selectedSentenceId,
    playingSentenceId,
    isPlaying,
    activeChapter,
    setSelectedSentenceId,
    setPlayingSentenceId,
    setIsPlaying,
    updateChapterBgm,
  } = useProjectStore();

  const {
    continuousPlay,
    waveformZoom,
    setContinuousPlay,
    setWaveformZoom,
  } = useStudioSettingsStore();

  // Selection target: "voice" | "bgm"
  const [selectionTarget, setSelectionTarget] = useState<"voice" | "bgm">("voice");

  // Voice track state
  const [voiceCurrentTime, setVoiceCurrentTime] = useState(0);
  const [voiceTotalDuration, setVoiceTotalDuration] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(1);

  // BGM track state
  const [isBgmMuted, setIsBgmMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState<number>(activeChapter?.bgm_volume ?? 0.2);
  const [bgmCurrentTime, setBgmCurrentTime] = useState(0);
  const [bgmTotalDuration, setBgmTotalDuration] = useState(0);
  const [isBgmLoading, setIsBgmLoading] = useState(false);

  // Common playback state
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [selectedRegion, setSelectedRegion] = useState<{
    start: number;
    end: number;
    id: string;
    target: "voice" | "bgm";
  } | null>(null);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  const activeSentence = sentences.find((s) => s.id === selectedSentenceId);

  const continuousPlayRef = useRef(continuousPlay);
  continuousPlayRef.current = continuousPlay;

  const selectedSentenceIdRef = useRef(selectedSentenceId);
  selectedSentenceIdRef.current = selectedSentenceId;

  const sentencesRef = useRef(sentences);
  sentencesRef.current = sentences;

  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;

  const isVoiceMutedRef = useRef(isVoiceMuted);
  isVoiceMutedRef.current = isVoiceMuted;

  const isBgmMutedRef = useRef(isBgmMuted);
  isBgmMutedRef.current = isBgmMuted;

  const bgmVolumeRef = useRef(bgmVolume);
  bgmVolumeRef.current = bgmVolume;

  // Initialize Voice WaveSurfer with Regions plugin
  useEffect(() => {
    if (!voiceContainerRef.current) return;

    const regions = RegionsPlugin.create();
    voiceRegionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: voiceContainerRef.current,
      waveColor: "#4f46e5",
      progressColor: "#a855f7",
      cursorColor: "#f43f5e",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 48,
      normalize: true,
      minPxPerSec: waveformZoom,
      plugins: [regions],
    });

    regions.enableDragSelection({
      color: "rgba(99, 102, 241, 0.35)",
    });

    regions.on("region-created", (reg: Region) => {
      // Xóa các region khác trên voice và bgm
      bgmRegionsRef.current?.clearRegions();
      const all = regions.getRegions();
      for (const r of all) {
        if (r.id !== reg.id) {
          r.remove();
        }
      }
      setSelectedRegion({
        start: reg.start,
        end: reg.end,
        id: reg.id,
        target: "voice",
      });
      setSelectionTarget("voice");
    });

    regions.on("region-updated", (reg: Region) => {
      setSelectedRegion({
        start: reg.start,
        end: reg.end,
        id: reg.id,
        target: "voice",
      });
    });

    regions.on("region-removed", () => {
      setSelectedRegion((prev) => (prev?.id === regions.getRegions()[0]?.id ? prev : null));
    });

    ws.on("timeupdate", (time) => {
      setVoiceCurrentTime(time);
    });

    ws.on("ready", (dur) => {
      setVoiceTotalDuration(dur);
      try {
        ws.zoom(waveformZoom);
        if (playbackRateRef.current !== 1.0) {
          ws.setPlaybackRate(playbackRateRef.current);
        }
      } catch (e) {
        // Safe guard
      }
    });

    ws.on("play", () => {
      setIsPlaying(true);
      // Đồng bộ phát BGM nếu có
      if (bgmWsRef.current && !isBgmMutedRef.current) {
        try {
          bgmWsRef.current.setVolume(bgmVolumeRef.current);
          bgmWsRef.current.play();
        } catch {
          // ignore
        }
      }
    });

    ws.on("pause", () => {
      setIsPlaying(false);
      if (bgmWsRef.current) {
        try {
          bgmWsRef.current.pause();
        } catch {
          // ignore
        }
      }
    });

    ws.on("finish", () => {
      setIsPlaying(false);
      if (bgmWsRef.current) {
        try {
          bgmWsRef.current.pause();
        } catch {
          // ignore
        }
      }

      // Auto-advance to next sentence if continuous play is enabled
      if (continuousPlayRef.current && selectedSentenceIdRef.current) {
        const currentList = sentencesRef.current;
        const currentIndex = currentList.findIndex(
          (s) => s.id === selectedSentenceIdRef.current
        );
        if (currentIndex !== -1 && currentIndex + 1 < currentList.length) {
          const nextSentence = currentList[currentIndex + 1];
          if (nextSentence.status === "ready" && nextSentence.audio_path) {
            setSelectedSentenceId(nextSentence.id);
            setPlayingSentenceId(nextSentence.id);
          }
        }
      }
    });

    voiceWsRef.current = ws;

    return () => {
      ws.destroy();
      voiceWsRef.current = null;
      voiceRegionsRef.current = null;
    };
  }, []);

  // Initialize BGM WaveSurfer with Regions plugin
  useEffect(() => {
    if (!bgmContainerRef.current) return;

    const bgmRegions = RegionsPlugin.create();
    bgmRegionsRef.current = bgmRegions;

    const bgmWs = WaveSurfer.create({
      container: bgmContainerRef.current,
      waveColor: "#059669",
      progressColor: "#34d399",
      cursorColor: "#10b981",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 48,
      normalize: true,
      minPxPerSec: waveformZoom,
      plugins: [bgmRegions],
    });

    bgmRegions.enableDragSelection({
      color: "rgba(16, 185, 129, 0.35)",
    });

    bgmRegions.on("region-created", (reg: Region) => {
      // Xóa các region khác trên voice và bgm
      voiceRegionsRef.current?.clearRegions();
      const all = bgmRegions.getRegions();
      for (const r of all) {
        if (r.id !== reg.id) {
          r.remove();
        }
      }
      setSelectedRegion({
        start: reg.start,
        end: reg.end,
        id: reg.id,
        target: "bgm",
      });
      setSelectionTarget("bgm");
    });

    bgmRegions.on("region-updated", (reg: Region) => {
      setSelectedRegion({
        start: reg.start,
        end: reg.end,
        id: reg.id,
        target: "bgm",
      });
    });

    bgmRegions.on("region-removed", () => {
      setSelectedRegion((prev) => (prev?.id === bgmRegions.getRegions()[0]?.id ? prev : null));
    });

    bgmWs.on("ready", (dur) => {
      setBgmTotalDuration(dur);
      bgmWs.setVolume(isBgmMutedRef.current ? 0 : bgmVolumeRef.current);
      try {
        bgmWs.zoom(waveformZoom);
      } catch {
        // ignore
      }
    });

    bgmWs.on("timeupdate", (time) => {
      setBgmCurrentTime(time);
    });

    bgmWs.on("finish", () => {
      // Loop BGM nếu giọng đọc vẫn đang phát
      if (voiceWsRef.current?.isPlaying()) {
        bgmWs.seekTo(0);
        bgmWs.play();
      }
    });

    bgmWsRef.current = bgmWs;

    return () => {
      bgmWs.destroy();
      bgmWsRef.current = null;
      bgmRegionsRef.current = null;
    };
  }, []);

  // Update zoom when slider changes
  useEffect(() => {
    if (voiceWsRef.current) {
      try {
        if (voiceWsRef.current.getDuration() > 0) {
          voiceWsRef.current.zoom(waveformZoom);
        }
      } catch {
        // ignore
      }
    }
    if (bgmWsRef.current) {
      try {
        if (bgmWsRef.current.getDuration() > 0) {
          bgmWsRef.current.zoom(waveformZoom);
        }
      } catch {
        // ignore
      }
    }
  }, [waveformZoom]);

  // Load Voice audio whenever active sentence changes or is regenerated
  useEffect(() => {
    if (!activeSentence || !voiceWsRef.current) return;

    if (activeSentence.status === "ready" && activeSentence.audio_path) {
      tauriReadAudioBase64(activeSentence.audio_path)
        .then((base64Url) => {
          voiceWsRef.current?.empty();
          voiceWsRef.current?.load(base64Url);
          if (playingSentenceId === activeSentence.id) {
            voiceWsRef.current?.once("ready", () => {
              try {
                voiceWsRef.current?.play();
              } catch (e) {
                console.warn("Lỗi tự động phát câu:", e);
              }
            });
          }
        })
        .catch((err) => {
          console.error("Lỗi nạp audio vào Voice WaveSurfer:", err);
        });
    } else {
      voiceWsRef.current.empty();
      setVoiceCurrentTime(0);
      setVoiceTotalDuration(0);
    }
  }, [
    activeSentence?.id,
    activeSentence?.audio_path,
    activeSentence?.status,
    activeSentence?.duration,
    activeSentence?.voice,
    (activeSentence as any)?.updated_at,
  ]);

  // Load BGM audio whenever chapter bgm_path changes
  useEffect(() => {
    // Reset state immediately when chapter has no BGM — don't wait for WaveSurfer
    if (!activeChapter?.bgm_path) {
      setBgmTotalDuration(0);
      setBgmCurrentTime(0);
    }

    if (!bgmWsRef.current) return;

    if (activeChapter?.bgm_path) {
      setIsBgmLoading(true);
      tauriReadAudioBase64(activeChapter.bgm_path)
        .then((base64Url) => {
          bgmWsRef.current?.load(base64Url);
          setBgmVolume(activeChapter.bgm_volume ?? 0.2);
        })
        .catch((err) => {
          console.error("Lỗi nạp audio BGM vào WaveSurfer:", err);
        })
        .finally(() => {
          setIsBgmLoading(false);
        });
    } else {
      bgmWsRef.current.empty();
      setBgmTotalDuration(0);
      setBgmCurrentTime(0);
    }
  }, [activeChapter?.id, activeChapter?.bgm_path]);

  // Global Spacebar shortcut for Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, activeSentence]);

  const togglePlayPause = () => {
    if (!voiceWsRef.current || !activeSentence || activeSentence.status !== "ready") {
      // Nếu chỉ có BGM mà không có câu, cho phép nghe thử BGM
      if (bgmWsRef.current && activeChapter?.bgm_path) {
        if (isPlaying) {
          bgmWsRef.current.pause();
          setIsPlaying(false);
        } else {
          bgmWsRef.current.play();
          setIsPlaying(true);
        }
      }
      return;
    }

    try {
      if (isPlaying) {
        voiceWsRef.current.pause();
        bgmWsRef.current?.pause();
      } else {
        setPlayingSentenceId(activeSentence.id);
        voiceWsRef.current.play();
        if (bgmWsRef.current && !isBgmMuted && activeChapter?.bgm_path) {
          bgmWsRef.current.setVolume(bgmVolume);
          bgmWsRef.current.play();
        }
      }
    } catch (err) {
      console.warn("WaveSurfer play/pause error:", err);
    }
  };

  const handleStop = () => {
    if (voiceWsRef.current) {
      try {
        voiceWsRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (bgmWsRef.current) {
      try {
        bgmWsRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsPlaying(false);
    setVoiceCurrentTime(0);
    setBgmCurrentTime(0);
  };

  // Voice track controls
  const toggleVoiceMute = () => {
    if (!voiceWsRef.current) return;
    const newMute = !isVoiceMuted;
    setIsVoiceMuted(newMute);
    voiceWsRef.current.setVolume(newMute ? 0 : voiceVolume);
  };

  const handleVoiceVolumeChange = (vol: number) => {
    setVoiceVolume(vol);
    if (!isVoiceMuted && voiceWsRef.current) {
      voiceWsRef.current.setVolume(vol);
    }
  };

  // BGM track controls
  const toggleBgmMute = () => {
    if (!bgmWsRef.current) return;
    const newMute = !isBgmMuted;
    setIsBgmMuted(newMute);
    bgmWsRef.current.setVolume(newMute ? 0 : bgmVolume);
  };

  const handleBgmVolumeChange = async (vol: number) => {
    setBgmVolume(vol);
    if (!isBgmMuted && bgmWsRef.current) {
      bgmWsRef.current.setVolume(vol);
    }
    if (activeChapter) {
      await tauriUpdateChapterBgm({
        chapterId: activeChapter.id,
        bgmPath: activeChapter.bgm_path || null,
        bgmVolume: vol,
      });
      updateChapterBgm(activeChapter.id, activeChapter.bgm_path || null, vol);
    }
  };

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

  const handleRemoveBgm = async () => {
    if (!activeChapter) return;
    await tauriUpdateChapterBgm({
      chapterId: activeChapter.id,
      bgmPath: null,
      bgmVolume: bgmVolume,
    });
    updateChapterBgm(activeChapter.id, null, bgmVolume);
  };

  // Selection actions: Add, Clear, Copy, Cut, Play
  const handleAddSelection = () => {
    if (selectionTarget === "voice") {
      if (!activeSentence?.audio_path || voiceTotalDuration <= 0) {
        setClipboardNotice("Câu thoại này chưa có âm thanh để chọn vùng!");
        setTimeout(() => setClipboardNotice(null), 2500);
        return;
      }
      if (!voiceRegionsRef.current) return;

      // Xóa vùng chọn cũ ở cả 2 track
      voiceRegionsRef.current.clearRegions();
      bgmRegionsRef.current?.clearRegions();

      const start = Math.max(0, Math.min(voiceCurrentTime, Math.max(0, voiceTotalDuration - 0.5)));
      const end = Math.min(start + Math.min(2.5, Math.max(0.8, voiceTotalDuration * 0.5)), voiceTotalDuration);

      const reg = voiceRegionsRef.current.addRegion({
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
        color: "rgba(99, 102, 241, 0.35)",
        drag: true,
        resize: true,
      });

      setSelectedRegion({
        start: reg.start,
        end: reg.end,
        id: reg.id,
        target: "voice",
      });
      setClipboardNotice("Đã tạo vùng chọn Giọng đọc. Hãy kéo 2 đầu để chỉnh phạm vi!");
      setTimeout(() => setClipboardNotice(null), 2500);
    } else {
      if (!activeChapter?.bgm_path || bgmTotalDuration <= 0) {
        setClipboardNotice("Chương này chưa có nhạc nền để chọn vùng!");
        setTimeout(() => setClipboardNotice(null), 2500);
        return;
      }
      if (!bgmRegionsRef.current) return;

      voiceRegionsRef.current?.clearRegions();
      bgmRegionsRef.current.clearRegions();

      const start = Math.max(0, Math.min(bgmCurrentTime, Math.max(0, bgmTotalDuration - 1.0)));
      const end = Math.min(start + Math.min(5.0, Math.max(1.0, bgmTotalDuration * 0.3)), bgmTotalDuration);

      const reg = bgmRegionsRef.current.addRegion({
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
        color: "rgba(16, 185, 129, 0.35)",
        drag: true,
        resize: true,
      });

      setSelectedRegion({
        start: reg.start,
        end: reg.end,
        id: reg.id,
        target: "bgm",
      });
      setClipboardNotice("Đã tạo vùng chọn BGM. Hãy kéo 2 đầu để chỉnh phạm vi!");
      setTimeout(() => setClipboardNotice(null), 2500);
    }
  };

  const handleClearSelection = () => {
    if (voiceRegionsRef.current) {
      voiceRegionsRef.current.clearRegions();
    }
    if (bgmRegionsRef.current) {
      bgmRegionsRef.current.clearRegions();
    }
    setSelectedRegion(null);
    setClipboardNotice("Đã hủy vùng chọn");
    setTimeout(() => setClipboardNotice(null), 1500);
  };

  const handleCopySelection = () => {
    if (!selectedRegion) return;
    const duration = (selectedRegion.end - selectedRegion.start).toFixed(2);
    const trackLabel = selectedRegion.target === "voice" ? "Giọng đọc" : "Nhạc nền";
    const textSnippet =
      selectedRegion.target === "voice" && activeSentence
        ? ` - "${activeSentence.clean_text}"`
        : "";
    const copyText = `[${trackLabel}: ${formatDuration(selectedRegion.start)} -> ${formatDuration(selectedRegion.end)}] (${duration}s)${textSnippet}`;

    navigator.clipboard.writeText(copyText).then(() => {
      setClipboardNotice("Đã sao chép thông tin vùng chọn!");
      setTimeout(() => setClipboardNotice(null), 2500);
    });
  };

  const handleCutSelection = () => {
    if (!selectedRegion) return;
    handleCopySelection();
    if (selectedRegion.target === "voice" && voiceRegionsRef.current) {
      voiceRegionsRef.current.clearRegions();
    } else if (selectedRegion.target === "bgm" && bgmRegionsRef.current) {
      bgmRegionsRef.current.clearRegions();
    }
    setSelectedRegion(null);
    setClipboardNotice("Đã cắt vùng chọn!");
    setTimeout(() => setClipboardNotice(null), 2500);
  };

  const handlePlaySelection = () => {
    if (!selectedRegion) return;
    if (selectedRegion.target === "voice" && voiceWsRef.current) {
      voiceWsRef.current.play(selectedRegion.start, selectedRegion.end);
      setIsPlaying(true);
    } else if (selectedRegion.target === "bgm" && bgmWsRef.current) {
      bgmWsRef.current.play(selectedRegion.start, selectedRegion.end);
      setIsPlaying(true);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    try {
      voiceWsRef.current?.setPlaybackRate(rate);
      bgmWsRef.current?.setPlaybackRate(rate);
    } catch {
      // ignore
    }
  };

  const bgmFileName = activeChapter?.bgm_path
    ? activeChapter.bgm_path.split(/[/\\]/).pop()
    : null;

  return (
    <footer className="h-60 border-t border-zinc-800 bg-zinc-950 flex flex-col select-none relative">
      {/* Toast Notice */}
      {clipboardNotice && (
        <div className="absolute top-2 right-4 z-50 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <Check className="w-3.5 h-3.5" />
          <span>{clipboardNotice}</span>
        </div>
      )}

      {/* Top Toolbar (Audacity style tools: Transport, Selection, Edit) */}
      <div className="h-10 px-3 border-b border-zinc-800/80 bg-zinc-900/70 flex items-center justify-between text-xs">
        {/* Left: Transport controls & Selection Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayPause}
            disabled={!activeSentence && !activeChapter?.bgm_path}
            className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Phát / Tạm dừng đồng bộ (Space)"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleStop}
            disabled={!isPlaying}
            className="w-6 h-6 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center disabled:opacity-30"
            title="Dừng và về đầu"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>

          {/* Continuous Play Toggle */}
          <button
            onClick={() => setContinuousPlay(!continuousPlay)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
              continuousPlay
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Tự động phát câu tiếp theo khi hết câu hiện tại"
          >
            <Repeat className="w-3 h-3" />
            <span className="hidden sm:inline">Đọc liên tục</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          {/* Target Track Switcher: Voice / BGM */}
          <div className="flex items-center bg-zinc-800/80 p-0.5 rounded border border-zinc-700/60">
            <button
              onClick={() => setSelectionTarget("voice")}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                selectionTarget === "voice"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Chọn thao tác trên track Giọng đọc"
            >
              <Mic className="w-2.5 h-2.5" />
              <span>Câu thoại</span>
            </button>
            <button
              onClick={() => setSelectionTarget("bgm")}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                selectionTarget === "bgm"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Chọn thao tác trên track Nhạc nền (BGM)"
            >
              <Music className="w-2.5 h-2.5" />
              <span>BGM</span>
            </button>
          </div>

          {/* Button [➕ Chọn vùng] (Add Selection) */}
          <button
            onClick={handleAddSelection}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              selectionTarget === "voice"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30"
                : "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30"
            }`}
            title={`Tạo vùng chọn trên track ${selectionTarget === "voice" ? "Giọng đọc" : "Nhạc nền"}`}
          >
            <Plus className="w-3 h-3" />
            <span>Chọn vùng</span>
          </button>

          {/* Button [✕ Hủy chọn] */}
          {selectedRegion && (
            <button
              onClick={handleClearSelection}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-700/60 border border-zinc-700 text-zinc-300 text-[11px] transition-colors"
              title="Hủy vùng chọn"
            >
              <X className="w-3 h-3 text-rose-400" />
              <span>Hủy chọn</span>
            </button>
          )}

          {/* Audacity-style Selection Tools */}
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={handleCopySelection}
              disabled={!selectedRegion}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] disabled:opacity-30 transition-colors"
              title="Sao chép vùng chọn (Copy)"
            >
              <Copy className="w-3 h-3 text-indigo-400" />
              <span>Copy</span>
            </button>

            <button
              onClick={handleCutSelection}
              disabled={!selectedRegion}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] disabled:opacity-30 transition-colors"
              title="Cắt vùng chọn (Cut)"
            >
              <Scissors className="w-3 h-3 text-rose-400" />
              <span>Cut</span>
            </button>

            {selectedRegion && (
              <button
                onClick={handlePlaySelection}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-[11px] hover:bg-indigo-900/60"
                title="Phát riêng vùng đã chọn"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>Nghe đoạn chọn</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Selected Region Duration & Time Info */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
          {selectedRegion ? (
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] ${
                selectedRegion.target === "voice"
                  ? "bg-indigo-950/50 border-indigo-500/40 text-indigo-300"
                  : "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
              }`}
            >
              <span className="font-sans text-[10px] uppercase font-bold flex items-center gap-1">
                {selectedRegion.target === "voice" ? (
                  <Mic className="w-2.5 h-2.5 text-indigo-400" />
                ) : (
                  <Music className="w-2.5 h-2.5 text-emerald-400" />
                )}
                {selectedRegion.target === "voice" ? "Vùng Câu:" : "Vùng BGM:"}
              </span>
              <span>
                {formatDuration(selectedRegion.start)} → {formatDuration(selectedRegion.end)}
              </span>
              <span className="font-semibold opacity-90">
                ({(selectedRegion.end - selectedRegion.start).toFixed(2)}s)
              </span>
            </div>
          ) : (
            <span className="text-zinc-500 text-[10px] hidden md:inline">
              Chọn Câu hoặc BGM rồi nhấn &quot;Chọn vùng&quot; (kéo 2 đầu để căn chỉnh)
            </span>
          )}
        </div>

        {/* Right: Playback Rate & Waveform Zoom */}
        <div className="flex items-center gap-3">
          {/* Rate */}
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            {[1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  playbackRate === rate
                    ? "bg-zinc-700 text-white font-medium"
                    : "hover:bg-zinc-800 text-zinc-400"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <ZoomOut className="w-3 h-3 text-zinc-500" />
            <input
              type="range"
              min={10}
              max={140}
              value={waveformZoom}
              onChange={(e) => setWaveformZoom(Number(e.target.value))}
              className="w-16 accent-indigo-500 h-1 bg-zinc-800 rounded cursor-pointer"
              title="Phóng to / thu nhỏ sóng âm"
            />
            <ZoomIn className="w-3 h-3 text-zinc-500" />
          </div>
        </div>
      </div>

      {/* Multitrack DAW Workspace (Audacity Style) */}
      <div className="flex-1 flex flex-col divide-y divide-zinc-800/60 bg-zinc-950 relative">
        {/* Track 1: Giọng đọc (Voice Track) */}
        <div
          onClick={() => setSelectionTarget("voice")}
          className={`flex-1 flex min-h-0 transition-colors relative ${
            selectionTarget === "voice"
              ? "bg-zinc-900/30 border-l-2 border-l-indigo-500"
              : "bg-zinc-950/60 hover:bg-zinc-900/10 border-l-2 border-l-transparent"
          }`}
        >
          {/* Left Audacity Track Control Panel (Fixed Width, Exact Symmetry) */}
          <div
            style={{ width: "190px", minWidth: "190px", maxWidth: "190px" }}
            className="w-[190px] min-w-[190px] max-w-[190px] p-2.5 border-r border-zinc-800/80 bg-zinc-900/50 flex flex-col justify-between shrink-0 text-xs select-none relative"
          >
            <div>
              <div className="flex items-center gap-1.5 truncate">
                <Mic className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="font-semibold text-zinc-200 text-xs truncate">
                  {activeSentence ? `Câu #${activeSentence.index}` : "Giọng đọc (Voice)"}
                </span>
              </div>
              <p
                className="text-[10px] text-zinc-400 truncate mt-1 h-3.5 leading-none"
                title={activeSentence?.clean_text}
              >
                {activeSentence ? activeSentence.clean_text : "Chưa chọn câu"}
              </p>
            </div>

            {/* Bottom Controls Bar (Aligned with Track 2) */}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50 mt-1">
              <div className="flex items-center gap-1.5">
                {/* Mute Button (Audacity Style) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVoiceMute();
                  }}
                  className={`w-5 h-5 rounded text-[10px] font-bold border flex items-center justify-center transition-colors ${
                    isVoiceMuted
                      ? "bg-rose-950 text-rose-300 border-rose-600 shadow-sm"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                  }`}
                  title="Tắt / Bật tiếng giọng đọc (Mute)"
                >
                  M
                </button>

                {/* HTML5 Volume Popover */}
                <TrackVolumePopover
                  volume={voiceVolume}
                  isMuted={isVoiceMuted}
                  onVolumeChange={handleVoiceVolumeChange}
                  onToggleMute={toggleVoiceMute}
                  accentColor="indigo"
                  label="Giọng đọc"
                  disabled={!activeSentence?.audio_path}
                />
              </div>

              {/* Tag Character / Role */}
              <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[95px] text-right">
                {activeSentence?.speaker || (activeSentence?.is_dialogue ? "Hội thoại" : "Dẫn chuyện")}
              </div>
            </div>
          </div>

          {/* Right: Voice Waveform Canvas with Top Left Time Counter */}
          <div className="flex-1 px-3 py-1 relative flex flex-col justify-center bg-zinc-950 cursor-text overflow-hidden">
            {/* Top Left Time Counter Badge (Moved to top-left as requested) */}
            <div
              style={{
                position: "absolute",
                top: 6,
                left: 17,
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <span className="font-mono text-[10px] text-zinc-300 bg-zinc-900/90 px-2.5 py-0.5 rounded-full border border-zinc-800 shadow-sm flex items-center gap-1.5 backdrop-blur-sm">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPlaying ? "bg-indigo-400 animate-pulse" : "bg-zinc-600"
                  }`}
                />
                <span>{formatDuration(voiceCurrentTime)}</span>
                <span className="text-zinc-600">/</span>
                <span>{formatDuration(voiceTotalDuration)}</span>
              </span>
            </div>

            <div ref={voiceContainerRef} className="w-full" />
            {!activeSentence?.audio_path && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600 pointer-events-none">
                {activeSentence
                  ? "Câu này chưa được tạo audio"
                  : "Chọn một câu đã sẵn sàng để xem sóng âm"}
              </div>
            )}
          </div>
        </div>

        {/* Track 2: Nhạc nền (BGM Track) */}
        <div
          onClick={() => setSelectionTarget("bgm")}
          className={`flex-1 flex min-h-0 transition-colors relative ${
            selectionTarget === "bgm"
              ? "bg-zinc-900/30 border-l-2 border-l-emerald-500"
              : "bg-zinc-950/40 hover:bg-zinc-900/10 border-l-2 border-l-transparent"
          }`}
        >
          {/* Left Audacity Track Control Panel (Exact Same Width as Track 1) */}
          <div
            style={{ width: "190px", minWidth: "190px", maxWidth: "190px" }}
            className="w-[190px] min-w-[190px] max-w-[190px] p-2.5 border-r border-zinc-800/80 bg-zinc-900/40 flex flex-col justify-between shrink-0 text-xs select-none relative"
          >
            <div>
              <div className="flex items-center gap-1.5 truncate">
                <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-emerald-300 text-xs truncate">
                  Nhạc Nền (BGM)
                </span>
              </div>
              <p
                className="text-[10px] text-zinc-400 truncate mt-1 h-3.5 leading-none font-mono"
                title={activeChapter?.bgm_path || "Chưa gắn BGM cho chương này"}
              >
                {bgmFileName || "Chưa gắn tệp nhạc nền"}
              </p>
            </div>

            {/* Bottom Controls Bar (Exact Same Height & Align as Track 1) */}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50 mt-1">
              <div className="flex items-center gap-1.5">
                {/* Mute Button (Audacity Style) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBgmMute();
                  }}
                  disabled={!activeChapter?.bgm_path}
                  className={`w-5 h-5 rounded text-[10px] font-bold border flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    isBgmMuted
                      ? "bg-rose-950 text-rose-300 border-rose-600 shadow-sm"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                  }`}
                  title="Tắt / Bật tiếng nhạc nền (Mute)"
                >
                  M
                </button>

                {/* HTML5 Volume Popover */}
                <TrackVolumePopover
                  volume={bgmVolume}
                  isMuted={isBgmMuted}
                  onVolumeChange={handleBgmVolumeChange}
                  onToggleMute={toggleBgmMute}
                  accentColor="emerald"
                  label="Nhạc nền"
                  max={1}
                  disabled={!activeChapter?.bgm_path}
                />
              </div>

              {/* Action Buttons: Import / Delete */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectBgm();
                  }}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-300 text-[10px] font-medium flex items-center gap-1 transition-colors"
                  title="Chọn / Thay đổi tệp nhạc nền cho chương này"
                >
                  <FolderOpen className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{activeChapter?.bgm_path ? "Đổi" : "Nhập BGM"}</span>
                </button>

                {activeChapter?.bgm_path && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBgm();
                    }}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 text-[10px] transition-colors"
                    title="Gỡ BGM khỏi chương này"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: BGM Waveform Canvas with Top Left Time Counter */}
          <div className="flex-1 px-3 py-1 relative flex flex-col justify-center bg-zinc-950 cursor-pointer overflow-hidden">
            {/* Top Left Time Counter Badge (Moved to top-left as requested) */}
            <div
              style={{
                position: "absolute",
                top: 6,
                left: 17,
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <span className="font-mono text-[10px] text-zinc-300 bg-zinc-900/90 px-2.5 py-0.5 rounded-full border border-zinc-800 shadow-sm flex items-center gap-1.5 backdrop-blur-sm">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPlaying && activeChapter?.bgm_path
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-zinc-600"
                  }`}
                />
                <span>
                  {activeChapter?.bgm_path && bgmTotalDuration > 0 ? formatDuration(bgmCurrentTime) : "00:00.0"}
                </span>
                <span className="text-zinc-600">/</span>
                <span>
                  {activeChapter?.bgm_path && bgmTotalDuration > 0 ? formatDuration(bgmTotalDuration) : "00:00.0"}
                </span>
              </span>
            </div>

            <div ref={bgmContainerRef} className="w-full" />
            {!activeChapter?.bgm_path && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">
                <button
                  onClick={handleSelectBgm}
                  className="px-3 py-1.5 rounded-lg border border-dashed border-zinc-700 hover:border-emerald-500/60 bg-zinc-900/60 hover:bg-emerald-950/20 text-zinc-400 hover:text-emerald-300 flex items-center gap-1.5 text-xs transition-all"
                >
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Nhập tệp BGM cho chương này (.mp3, .wav, .flac)</span>
                </button>
              </div>
            )}
            {isBgmLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-emerald-400 bg-zinc-950/60">
                Đang nạp nhạc nền...
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
