"use client";

import React, { useState } from "react";
import {
  X,
  Volume2,
  Server,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  useStudioSettingsStore,
  VOICE_PRESETS,
} from "@/stores/useStudioSettingsStore";
import { tauriCheckTtsConnection } from "@/lib/tauri";

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({ isOpen, onClose }) => {
  const {
    serverUrl,
    selectedVoice,
    speed,
    temperature,
    isServerOnline,
    setServerUrl,
    setSelectedVoice,
    setSpeed,
    setTemperature,
    setIsServerOnline,
  } = useStudioSettingsStore();

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const online = await tauriCheckTtsConnection(serverUrl);
    setIsServerOnline(online);
    setTestingConnection(false);
    setTestResult(
      online
        ? "Kết nối thành công tới VieNeu-TTS engine!"
        : "Không thể kết nối tới server. Vui lòng kiểm tra script run_server.ps1."
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Cấu Hình Giọng Đọc & Server VieNeu-TTS
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
        <div className="p-5 space-y-5 text-xs">
          {/* Server URL & Health Check */}
          <div className="space-y-2">
            <label className="font-medium text-zinc-300 flex items-center justify-between">
              <span>Đường dẫn TTS Server (OpenAI Compatible)</span>
              <span
                className={`text-[10px] ${
                  isServerOnline ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isServerOnline ? "● Đang kết nối" : "○ Ngoại tuyến"}
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                placeholder="http://localhost:8880"
              />
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5"
              >
                {testingConnection ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Server className="w-3.5 h-3.5" />
                )}
                <span>Ping Test</span>
              </button>
            </div>
            {testResult && (
              <p
                className={`text-[11px] ${
                  isServerOnline ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {testResult}
              </p>
            )}
          </div>

          {/* Voice Presets Selection */}
          <div className="space-y-2">
            <label className="font-medium text-zinc-300">
              Chọn Preset Giọng Đọc Mặc Định
            </label>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_PRESETS.map((preset) => {
                const isSelected = selectedVoice === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedVoice(preset.id);
                      setSpeed(preset.recommended_speed);
                      setTemperature(preset.recommended_temp);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500 shadow-sm"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-2">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders: Speed & Temperature */}
          <div className="space-y-4 pt-2 border-t border-zinc-800/80">
            {/* Speed */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-300">
                  Tốc độ đọc (Speed)
                </span>
                <span className="font-mono text-indigo-400">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.75}
                max={1.35}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-300">
                  Nhiệt độ ngữ điệu (Temperature)
                </span>
                <span className="font-mono text-purple-400">
                  {temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.25}
                max={0.75}
                step={0.02}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
              />
              <p className="text-[10px] text-zinc-500">
                Thấp (0.35): Đều giọng, chuẩn từng từ. Cao (0.55): Cảm xúc, kịch tính hơn.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
          >
            Áp Dụng
          </button>
        </div>
      </div>
    </div>
  );
};
