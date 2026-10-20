"use client";

import React, { useState } from "react";
import {
  X,
  Server,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Info,
} from "lucide-react";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import { tauriCheckTtsConnection } from "@/lib/tauri";

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({ isOpen, onClose }) => {
  const {
    serverUrl,
    isServerOnline,
    setServerUrl,
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
        ? "Kết nối thành công tới VieNeu-TTS engine (Port 8880)!"
        : "Không thể kết nối tới server. Vui lòng kiểm tra script run_server.ps1 trên máy."
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Cấu Hình Server VieNeu-TTS
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
          {/* Server URL & Health Check */}
          <div className="space-y-2">
            <label className="font-medium text-zinc-300 flex items-center justify-between">
              <span>Đường dẫn TTS Server (OpenAI Compatible)</span>
              <span
                className={`text-[10px] font-medium flex items-center gap-1 ${
                  isServerOnline ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isServerOnline ? "● Đang trực tuyến" : "○ Ngoại tuyến"}
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
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 font-medium transition-colors"
              >
                {testingConnection ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>Ping Test</span>
              </button>
            </div>
            {testResult && (
              <p
                className={`text-[11px] flex items-center gap-1.5 ${
                  isServerOnline ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isServerOnline ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{testResult}</span>
              </p>
            )}
          </div>

          {/* Info callout for casting */}
          <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>Cài đặt giọng đọc & Tốc độ đọc (Speak Rate)</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Mọi thiết lập giọng Dẫn Truyện, Hội Thoại, nhân vật tùy chỉnh và tốc độ đọc (Speak Rate) hiện được quản lý tập trung và chi tiết tại tính năng <strong className="text-purple-300">🎭 Phân Vai</strong> trên thanh công cụ.
            </p>
          </div>

          {/* Quick guide for running local server */}
          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/60 space-y-1 text-zinc-500 text-[11px] font-mono">
            <div className="flex items-center gap-1 text-zinc-400 font-sans font-medium text-xs">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lệnh chạy VieNeu-TTS:</span>
            </div>
            <p className="text-zinc-400">D:\Workspace\AI\VieNeu-TTS\run_server.ps1</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
