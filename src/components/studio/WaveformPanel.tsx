"use client";

import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import {
  Play,
  Pause,
  Square,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  FastForward,
  Repeat,
  Radio,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import { tauriReadAudioBase64 } from "@/lib/tauri";
import { formatDuration } from "@/lib/utils";

export const WaveformPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  const {
    sentences,
    selectedSentenceId,
    playingSentenceId,
    isPlaying,
    setSelectedSentenceId,
    setPlayingSentenceId,
    setIsPlaying,
  } = useProjectStore();

  const {
    continuousPlay,
    waveformZoom,
    setContinuousPlay,
    setWaveformZoom,
  } = useStudioSettingsStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const activeSentence = sentences.find((s) => s.id === selectedSentenceId);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#4f46e5",
      progressColor: "#ec4899",
      cursorColor: "#f43f5e",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 72,
      normalize: true,
      minPxPerSec: waveformZoom,
    });

    ws.on("timeupdate", (time) => {
      setCurrentTime(time);
    });

    ws.on("ready", (dur) => {
      setTotalDuration(dur);
    });

    ws.on("play", () => {
      setIsPlaying(true);
    });

    ws.on("pause", () => {
      setIsPlaying(false);
    });

    ws.on("finish", () => {
      setIsPlaying(false);
      // Auto-advance to next sentence if continuous play is enabled
      if (continuousPlay && selectedSentenceId) {
        const currentIndex = sentences.findIndex(
          (s) => s.id === selectedSentenceId
        );
        if (currentIndex !== -1 && currentIndex + 1 < sentences.length) {
          const nextSentence = sentences[currentIndex + 1];
          if (nextSentence.status === "ready") {
            setSelectedSentenceId(nextSentence.id);
            setPlayingSentenceId(nextSentence.id);
            // Trigger next play on next render cycle
            setTimeout(() => {
              waveSurferRef.current?.play();
            }, 100);
          }
        }
      }
    });

    waveSurferRef.current = ws;

    return () => {
      ws.destroy();
      waveSurferRef.current = null;
    };
  }, []);

  // Update zoom when slider changes
  useEffect(() => {
    if (waveSurferRef.current) {
      waveSurferRef.current.zoom(waveformZoom);
    }
  }, [waveformZoom]);

  // Load audio whenever active sentence changes
  useEffect(() => {
    if (!activeSentence || !waveSurferRef.current) return;

    if (activeSentence.status === "ready" && activeSentence.audio_path) {
      tauriReadAudioBase64(activeSentence.audio_path)
        .then((base64Url) => {
          waveSurferRef.current?.load(base64Url);
          if (playingSentenceId === activeSentence.id) {
            waveSurferRef.current?.once("ready", () => {
              waveSurferRef.current?.play();
            });
          }
        })
        .catch((err) => {
          console.error("Lỗi nạp audio vào WaveSurfer:", err);
        });
    } else {
      waveSurferRef.current.empty();
      setCurrentTime(0);
      setTotalDuration(0);
    }
  }, [activeSentence?.id, activeSentence?.audio_path, activeSentence?.status]);

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
    if (!waveSurferRef.current || !activeSentence || activeSentence.status !== "ready") return;
    if (isPlaying) {
      waveSurferRef.current.pause();
    } else {
      setPlayingSentenceId(activeSentence.id);
      waveSurferRef.current.play();
    }
  };

  const handleStop = () => {
    if (!waveSurferRef.current) return;
    waveSurferRef.current.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const toggleMute = () => {
    if (!waveSurferRef.current) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    waveSurferRef.current.setVolume(newMute ? 0 : volume);
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    waveSurferRef.current?.setPlaybackRate(rate);
  };

  return (
    <footer className="h-44 border-t border-zinc-800 bg-zinc-950 flex flex-col select-none">
      {/* Waveform Top Header: Active Sentence & Timers */}
      <div className="h-9 px-4 border-b border-zinc-800/80 flex items-center justify-between text-xs bg-zinc-900/30">
        <div className="flex items-center gap-2 max-w-lg truncate">
          <span className="font-mono text-zinc-500">
            {activeSentence ? `#${activeSentence.index}` : "--"}
          </span>
          <span className="text-zinc-300 truncate font-sans text-[11px]">
            {activeSentence ? activeSentence.clean_text : "Chọn một câu để xem biên độ sóng âm"}
          </span>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-zinc-100">{formatDuration(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-500">{formatDuration(totalDuration)}</span>
        </div>
      </div>

      {/* Waveform Canvas Area */}
      <div className="flex-1 px-4 py-2 relative flex flex-col justify-center bg-zinc-950">
        <div ref={containerRef} className="w-full cursor-pointer" />
        {!activeSentence?.audio_path && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600 pointer-events-none">
            {activeSentence
              ? "Câu này chưa được tạo audio"
              : "Chọn một câu đã sẵn sàng để phát"}
          </div>
        )}
      </div>

      {/* Control Bar: Play/Pause, Stop, Continuous Play, Zoom, Rate */}
      <div className="h-11 px-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
        {/* Left: Playback controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayPause}
            disabled={!activeSentence || activeSentence.status !== "ready"}
            className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Phát / Tạm dừng (Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleStop}
            disabled={!isPlaying}
            className="w-7 h-7 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center disabled:opacity-30"
            title="Dừng và về đầu câu"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Continuous Play Toggle */}
          <button
            onClick={() => setContinuousPlay(!continuousPlay)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
              continuousPlay
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Tự động phát câu tiếp theo khi hết câu hiện tại"
          >
            <Repeat className="w-3 h-3" />
            <span>Đọc liên tục</span>
          </button>
        </div>

        {/* Center: Playback Rate */}
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          {[1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                playbackRate === rate
                  ? "bg-zinc-700 text-white font-medium"
                  : "hover:bg-zinc-800 text-zinc-400"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Right: Waveform Zoom & Volume */}
        <div className="flex items-center gap-3">
          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <ZoomOut className="w-3 h-3 text-zinc-500" />
            <input
              type="range"
              min={10}
              max={120}
              value={waveformZoom}
              onChange={(e) => setWaveformZoom(Number(e.target.value))}
              className="w-20 accent-indigo-500 h-1 bg-zinc-800 rounded cursor-pointer"
              title="Phóng to / thu nhỏ sóng âm"
            />
            <ZoomIn className="w-3 h-3 text-zinc-500" />
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Volume */}
          <button
            onClick={toggleMute}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200"
            title="Tắt / Bật tiếng"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </footer>
  );
};
