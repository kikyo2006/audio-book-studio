"use client";

import React, { useState } from "react";
import {
  X,
  Users,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Volume2,
  Sliders,
  UserCheck,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { VOICE_PRESETS } from "@/stores/useStudioSettingsStore";
import {
  tauriBatchAssignDialogues,
  tauriDeleteCharacter,
  tauriSaveCharacter,
} from "@/lib/tauri";
import type { CharacterProfile } from "@/types";

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BADGE_COLORS = [
  "#6366f1", // Indigo
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
];

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeProject,
    activeChapter,
    characters,
    addCharacter,
    removeCharacter,
    batchAssignDialoguesToSpeaker,
  } = useProjectStore();

  const [name, setName] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("Minh Tuấn");
  const [speed, setSpeed] = useState(1.0);
  const [temperature, setTemperature] = useState(0.45);
  const [color, setColor] = useState(BADGE_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateCharacter = async () => {
    if (!name.trim() || !activeProject) return;

    const newChar: CharacterProfile = {
      id: crypto.randomUUID ? crypto.randomUUID() : `char-${Date.now()}`,
      project_id: activeProject.id,
      name: name.trim(),
      voice: selectedVoice,
      speed,
      temperature,
      color,
      is_narrator: false,
    };

    addCharacter(newChar);
    try {
      await tauriSaveCharacter(newChar);
    } catch (err) {
      console.error("Lỗi lưu nhân vật:", err);
    }

    setName("");
    setIsCreating(false);
    setNotification(`Đã tạo nhân vật "${newChar.name}" thành công!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteCharacter = async (charId: string) => {
    removeCharacter(charId);
    try {
      await tauriDeleteCharacter(charId);
    } catch (err) {
      console.error("Lỗi xoá nhân vật:", err);
    }
  };

  const handleBatchAssign = async (char: CharacterProfile) => {
    if (!activeChapter) return;

    batchAssignDialoguesToSpeaker(char);
    try {
      await tauriBatchAssignDialogues({
        chapterId: activeChapter.id,
        speaker: char.name,
        voice: char.voice,
        speed: char.speed,
        temperature: char.temperature,
      });
      setNotification(
        `Đã gán tất cả lời thoại trong chương này cho "${char.name}"!`
      );
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error("Lỗi gán lời thoại:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Phân Vai Nhân Vật (Character Casting)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Gán giọng đọc đặc trưng cho từng nhân vật trong tiểu thuyết
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-xs overflow-y-auto max-h-[75vh]">
          {notification && (
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{notification}</span>
            </div>
          )}

          {/* Action to show create form */}
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-3 rounded-lg border border-dashed border-zinc-700 hover:border-indigo-500 text-zinc-300 hover:text-indigo-400 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Nhân Vật Mới</span>
            </button>
          )}

          {/* Create Character Form */}
          {isCreating && (
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200 text-sm">
                  Tạo Hồ Sơ Nhân Vật
                </span>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Name & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400">Tên nhân vật:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Phương Mộc, Nạn nhân nữ..."
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400">Màu hiển thị badge:</label>
                  <div className="flex items-center gap-2 h-8">
                    {BADGE_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border transition-all ${
                          color === c
                            ? "ring-2 ring-white scale-110"
                            : "border-transparent opacity-80"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Voice Preset Selection */}
              <div className="space-y-1">
                <label className="text-zinc-400">Chọn giọng đọc:</label>
                <div className="grid grid-cols-2 gap-2">
                  {VOICE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedVoice(p.id);
                        setSpeed(p.recommended_speed);
                        setTemperature(p.recommended_temp);
                      }}
                      className={`p-2 rounded border text-left flex items-center justify-between ${
                        selectedVoice === p.id
                          ? "bg-indigo-950/40 border-indigo-500 text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <span className="font-medium text-xs">{p.name}</span>
                      {selectedVoice === p.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders: Speed & Temperature */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Tốc độ:</span>
                    <span className="font-mono text-indigo-400">
                      {speed.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.75}
                    max={1.35}
                    step={0.05}
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Độ biểu cảm:</span>
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
                    className="w-full accent-purple-500 h-1 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleCreateCharacter}
                  disabled={!name.trim()}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-40"
                >
                  Lưu Nhân Vật
                </button>
              </div>
            </div>
          )}

          {/* Existing Character List */}
          <div className="space-y-2">
            <span className="font-medium text-zinc-400">
              Danh sách nhân vật ({characters.length}):
            </span>

            {characters.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 bg-zinc-950 border border-zinc-800/80 rounded-lg">
                Chưa có nhân vật tùy chỉnh nào được tạo. Nhấn &quot;Thêm Nhân Vật
                Mới&quot; để bắt đầu phân vai đối thoại.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: char.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-200">
                            {char.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            Giọng: {char.voice}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 flex gap-3 mt-0.5">
                          <span>Tốc độ: {char.speed.toFixed(2)}x</span>
                          <span>Biểu cảm: {char.temperature.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBatchAssign(char)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-indigo-950/60 hover:text-indigo-300 hover:border-indigo-500/40 border border-zinc-700/60 text-zinc-300 flex items-center gap-1.5 text-[11px] transition-all"
                        title="Gán giọng này cho toàn bộ câu đối thoại trong chương đang mở"
                      >
                        <UserCheck className="w-3 h-3 text-indigo-400" />
                        <span>Gán lời thoại chương</span>
                      </button>

                      <button
                        onClick={() => handleDeleteCharacter(char.id)}
                        className="p-1.5 rounded hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 transition-colors"
                        title="Xoá nhân vật"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
