import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VoicePreset } from "@/types";

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "Thảo Nhi",
    name: "Thảo Nhi (Nữ miền Nam)",
    gender: "female",
    locale: "vi-VN-South",
    description: "Giọng đọc truyền cảm, ấm áp, nhịp điệu tự nhiên thích hợp cho tiểu thuyết tình cảm & hồi ký.",
    recommended_speed: 1.0,
    recommended_temp: 0.45,
  },
  {
    id: "Ngọc Lan 18",
    name: "Ngọc Lan 18 (Nữ truyền cảm)",
    gender: "female",
    locale: "vi-VN-South",
    description: "Giọng nữ thanh thoát, tròn vành rõ chữ, phù hợp với truyện tiên hiệp, ngôn tình, kịch tính.",
    recommended_speed: 1.05,
    recommended_temp: 0.42,
  },
  {
    id: "Hà Phương",
    name: "Hà Phương (Nữ miền Bắc)",
    gender: "female",
    locale: "vi-VN-North",
    description: "Giọng đọc đĩnh đạc, chuẩn xác, rất thích hợp cho sách kinh tế, tư duy và khoa học xã hội.",
    recommended_speed: 1.0,
    recommended_temp: 0.40,
  },
  {
    id: "Minh Tuấn",
    name: "Minh Tuấn (Nam trầm ấm)",
    gender: "male",
    locale: "vi-VN-South",
    description: "Âm trầm dày, uy quyền, thích hợp cho vai nhân vật nam, kiếm hiệp hoặc sách trinh thám.",
    recommended_speed: 0.95,
    recommended_temp: 0.48,
  },
];

interface StudioSettingsState {
  serverUrl: string;
  selectedVoice: string;
  dialogueVoice: string;
  speed: number;
  temperature: number;
  isServerOnline: boolean;
  continuousPlay: boolean;
  waveformZoom: number;
  sentencePauseMs: number;
  paragraphPauseMs: number;

  setServerUrl: (url: string) => void;
  setSelectedVoice: (voice: string) => void;
  setDialogueVoice: (voice: string) => void;
  setSpeed: (speed: number) => void;
  setTemperature: (temp: number) => void;
  setIsServerOnline: (online: boolean) => void;
  setContinuousPlay: (continuous: boolean) => void;
  setWaveformZoom: (zoom: number) => void;
  setSentencePauseMs: (ms: number) => void;
  setParagraphPauseMs: (ms: number) => void;
}

export const useStudioSettingsStore = create<StudioSettingsState>()(
  persist(
    (set) => ({
      serverUrl: "http://127.0.0.1:8880",
      selectedVoice: "Thảo Nhi",
      dialogueVoice: "Thảo Nhi",
      speed: 1.0,
      temperature: 0.45,
      isServerOnline: false,
      continuousPlay: true,
      waveformZoom: 35,
      sentencePauseMs: 350,
      paragraphPauseMs: 750,

      setServerUrl: (url) => set({ serverUrl: url }),
      setSelectedVoice: (voice) => set({ selectedVoice: voice }),
      setDialogueVoice: (dialogueVoice) => set({ dialogueVoice }),
      setSpeed: (speed) => set({ speed }),
      setTemperature: (temperature) => set({ temperature }),
      setIsServerOnline: (isServerOnline) => set({ isServerOnline }),
      setContinuousPlay: (continuousPlay) => set({ continuousPlay }),
      setWaveformZoom: (waveformZoom) => set({ waveformZoom }),
      setSentencePauseMs: (sentencePauseMs) => set({ sentencePauseMs }),
      setParagraphPauseMs: (paragraphPauseMs) => set({ paragraphPauseMs }),
    }),
    {
      name: "bookstudio-settings-store",
      onRehydrateStorage: () => (state) => {
        if (state && state.serverUrl && state.serverUrl.includes("localhost")) {
          state.serverUrl = state.serverUrl.replace("localhost", "127.0.0.1");
        }
      },
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        selectedVoice: state.selectedVoice,
        dialogueVoice: state.dialogueVoice,
        speed: state.speed,
        temperature: state.temperature,
        continuousPlay: state.continuousPlay,
        waveformZoom: state.waveformZoom,
        sentencePauseMs: state.sentencePauseMs,
        paragraphPauseMs: state.paragraphPauseMs,
      }),
    }
  )
);
