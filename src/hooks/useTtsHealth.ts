import { useCallback, useEffect, useRef, useState } from "react";
import { tauriCheckTtsConnection } from "@/lib/tauri";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";

const ONLINE_INTERVAL_MS = 15000;
const OFFLINE_INTERVAL_MS = 3000;

/**
 * Kiểm tra kết nối VieNeu-TTS.
 * - `poll = true`: tự ping định kỳ (3s khi Offline để bắt kịp lúc server vừa bật, 15s khi Online).
 * - `poll = false`: chỉ cung cấp `checkHealth` để bấm tay, không tự ping (tránh ping trùng).
 */
export function useTtsHealth(poll: boolean) {
  const serverUrl = useStudioSettingsStore((s) => s.serverUrl);
  const setIsServerOnline = useStudioSettingsStore((s) => s.setIsServerOnline);
  const [isCheckingTts, setIsCheckingTts] = useState(false);
  const inFlightRef = useRef(false);

  const runCheck = useCallback(
    async (showSpinner: boolean) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (showSpinner) setIsCheckingTts(true);
      try {
        const online = await tauriCheckTtsConnection(serverUrl);
        setIsServerOnline(online);
      } catch {
        setIsServerOnline(false);
      } finally {
        inFlightRef.current = false;
        if (showSpinner) setIsCheckingTts(false);
      }
    },
    [serverUrl, setIsServerOnline]
  );

  const checkHealth = useCallback(() => runCheck(true), [runCheck]);

  useEffect(() => {
    if (!poll) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      await runCheck(false);
      if (cancelled) return;
      const online = useStudioSettingsStore.getState().isServerOnline;
      timer = setTimeout(tick, online ? ONLINE_INTERVAL_MS : OFFLINE_INTERVAL_MS);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [poll, runCheck]);

  return { isCheckingTts, checkHealth };
}
