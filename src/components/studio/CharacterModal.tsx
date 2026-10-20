"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Volume2,
  Sliders,
  UserCheck,
  BookOpen,
  MessageSquare,
  Globe,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  Bookmark,
  Copy,
  Edit2,
  Save,
  Check,
  Loader2,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore, VOICE_PRESETS } from "@/stores/useStudioSettingsStore";
import { useConfirmStore } from "@/stores/useConfirmStore";
import {
  tauriBatchAssignDialogues,
  tauriBatchAssignDialoguesExtended,
  tauriBatchAssignNarration,
  tauriBatchAssignSpeakerRange,
  tauriDeleteCastingPreset,
  tauriDeleteCharacter,
  tauriGetCastingPresets,
  tauriGetSentences,
  tauriSaveCastingPreset,
  tauriSaveCharacter,
} from "@/lib/tauri";
import type { CastingPreset, CharacterProfile, SentenceItem } from "@/types";

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
    sentences,
    characters,
    selectedSentenceId,
    addCharacter,
    removeCharacter,
    setSentences,
  } = useProjectStore();

  const {
    selectedVoice: defaultGlobalVoice,
    dialogueVoice: defaultGlobalDialogueVoice,
    setSelectedVoice,
    setDialogueVoice: setGlobalDialogueVoice,
  } = useStudioSettingsStore();

  // Narrator (Dẫn Truyện) Role settings
  const [narratorVoice, setNarratorVoice] = useState(defaultGlobalVoice || "Thảo Nhi");
  const [narratorSpeed, setNarratorSpeed] = useState(1.0);
  const [narratorTemp, setNarratorTemp] = useState(0.45);

  // Dialogue (Hội Thoại Chung) Role settings
  const [dialogueVoice, setDialogueVoice] = useState(defaultGlobalDialogueVoice || "Thảo Nhi");
  const [dialogueSpeed, setDialogueSpeed] = useState(1.0);
  const [dialogueTemp, setDialogueTemp] = useState(0.45);

  // Custom Character creation form
  const [name, setName] = useState("");
  const [customVoice, setCustomVoice] = useState("Minh Tuấn");
  const [customSpeed, setCustomSpeed] = useState(1.0);
  const [customTemp, setCustomTemp] = useState(0.45);
  const [customColor, setCustomColor] = useState(BADGE_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  // Batch Range Assign Modal for a specific character
  const [batchTargetChar, setBatchTargetChar] = useState<CharacterProfile | null>(null);
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(sentences.length || 1);
  const [rangeFilterMode, setRangeFilterMode] = useState<"dialogue_only" | "all" | "narration_only">("dialogue_only");

  // Notifications & Loadings
  const [notification, setNotification] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  // Casting Presets state
  const [presets, setPresets] = useState<CastingPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [isPromptNewPreset, setIsPromptNewPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [isRenamingPreset, setIsRenamingPreset] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const { askConfirm } = useConfirmStore();

  // Load presets and sync voices on mount or open
  useEffect(() => {
    if (isOpen) {
      loadPresets();

      // Đồng bộ giọng Dẫn Truyện và Hội Thoại từ store hoặc từ câu thực tế trong chương
      const dialogueSample = sentences.find((s) => s.is_dialogue && s.voice);
      const narratorSample = sentences.find((s) => !s.is_dialogue && s.voice);

      if (dialogueSample?.voice) {
        setDialogueVoice(dialogueSample.voice);
        if (dialogueSample.speed) setDialogueSpeed(dialogueSample.speed);
        if (dialogueSample.temperature) setDialogueTemp(dialogueSample.temperature);
        setGlobalDialogueVoice(dialogueSample.voice);
      } else if (defaultGlobalDialogueVoice) {
        setDialogueVoice(defaultGlobalDialogueVoice);
      }

      if (narratorSample?.voice) {
        setNarratorVoice(narratorSample.voice);
        if (narratorSample.speed) setNarratorSpeed(narratorSample.speed);
        if (narratorSample.temperature) setNarratorTemp(narratorSample.temperature);
        setSelectedVoice(narratorSample.voice);
      } else if (defaultGlobalVoice) {
        setNarratorVoice(defaultGlobalVoice);
      }
    }
  }, [isOpen]);

  const loadPresets = async () => {
    try {
      const list = await tauriGetCastingPresets();
      setPresets(list);
    } catch (err) {
      console.error("Lỗi tải danh sách preset:", err);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const p = presets.find((item) => item.id === presetId);
    if (!p) return;

    // Nạp giá trị preset vào form & đồng bộ store
    setNarratorVoice(p.narrator.voice);
    setNarratorSpeed(p.narrator.speed);
    setNarratorTemp(p.narrator.temperature);
    setSelectedVoice(p.narrator.voice);

    setDialogueVoice(p.dialogue.voice);
    setDialogueSpeed(p.dialogue.speed);
    setDialogueTemp(p.dialogue.temperature);
    setGlobalDialogueVoice(p.dialogue.voice);

    showNotice(`Đã nạp thiết lập từ Preset: "${p.name}"`);
  };

  const handleSaveCurrentAsPreset = async (customName?: string) => {
    const nameToUse = (customName || newPresetName).trim();
    if (!nameToUse) {
      showNotice("Vui lòng nhập tên cho Bộ Phân Vai (Preset)");
      return;
    }

    const presetPayload: CastingPreset = {
      id: crypto.randomUUID(),
      name: nameToUse,
      description: null,
      narrator: {
        voice: narratorVoice,
        speed: narratorSpeed,
        temperature: narratorTemp,
      },
      dialogue: {
        voice: dialogueVoice,
        speed: dialogueSpeed,
        temperature: dialogueTemp,
      },
      characters: characters.map((c) => ({
        id: c.id,
        name: c.name,
        voice: c.voice,
        speed: c.speed,
        temperature: c.temperature,
        color: c.color,
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await tauriSaveCastingPreset(presetPayload);
      await loadPresets();
      setSelectedPresetId(presetPayload.id);
      setIsPromptNewPreset(false);
      setNewPresetName("");
      showNotice(`Đã lưu thành công Preset: "${nameToUse}"`);
    } catch (err) {
      console.error("Lỗi lưu preset:", err);
      showNotice(`Lỗi lưu: ${String(err)}`);
    }
  };

  const handleUpdateCurrentPreset = async () => {
    if (!selectedPresetId) return;
    const current = presets.find((p) => p.id === selectedPresetId);
    if (!current) return;

    const updated: CastingPreset = {
      ...current,
      narrator: {
        voice: narratorVoice,
        speed: narratorSpeed,
        temperature: narratorTemp,
      },
      dialogue: {
        voice: dialogueVoice,
        speed: dialogueSpeed,
        temperature: dialogueTemp,
      },
      characters: characters.map((c) => ({
        id: c.id,
        name: c.name,
        voice: c.voice,
        speed: c.speed,
        temperature: c.temperature,
        color: c.color,
      })),
      updated_at: new Date().toISOString(),
    };

    try {
      await tauriSaveCastingPreset(updated);
      setSelectedVoice(narratorVoice);
      setGlobalDialogueVoice(dialogueVoice);
      await loadPresets();
      showNotice(`Đã cập nhật Preset: "${current.name}" với thiết lập hiện tại`);
    } catch (err) {
      showNotice(`Lỗi: ${String(err)}`);
    }
  };

  const handleDuplicatePreset = async () => {
    if (!selectedPresetId) return;
    const current = presets.find((p) => p.id === selectedPresetId);
    if (!current) return;

    const copyName = `${current.name} (Bản sao)`;
    const copyPayload: CastingPreset = {
      ...current,
      id: crypto.randomUUID(),
      name: copyName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await tauriSaveCastingPreset(copyPayload);
      await loadPresets();
      setSelectedPresetId(copyPayload.id);
      showNotice(`Đã nhân bản thành: "${copyName}"`);
    } catch (err) {
      showNotice(`Lỗi nhân bản: ${String(err)}`);
    }
  };

  const handleRenamePreset = async () => {
    if (!selectedPresetId || !renameValue.trim()) return;
    const current = presets.find((p) => p.id === selectedPresetId);
    if (!current) return;

    const updated: CastingPreset = {
      ...current,
      name: renameValue.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      await tauriSaveCastingPreset(updated);
      await loadPresets();
      setIsRenamingPreset(false);
      showNotice(`Đã đổi tên thành: "${updated.name}"`);
    } catch (err) {
      showNotice(`Lỗi đổi tên: ${String(err)}`);
    }
  };

  const handleDeletePreset = () => {
    if (!selectedPresetId) return;
    const current = presets.find((p) => p.id === selectedPresetId);
    if (!current) return;

    askConfirm({
      title: "Xác Nhận Xóa Bộ Phân Vai (Preset)",
      description: `Bạn có chắc chắn muốn xóa bộ phân vai "${current.name}" khỏi danh sách lưu trữ không?`,
      confirmText: "Xóa Preset",
      cancelText: "Hủy",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await tauriDeleteCastingPreset(current.id);
          setSelectedPresetId("");
          await loadPresets();
          showNotice(`Đã xóa Preset: "${current.name}"`);
        } catch (err) {
          showNotice(`Lỗi xóa: ${String(err)}`);
        }
      },
    });
  };

  // Áp dụng Preset vào chương hiện tại: Gán Dẫn Truyện + Hội Thoại + Lưu Characters vào dự án
  const handleApplyPresetToChapter = async () => {
    if (!activeChapter || !activeProject) return;
    setIsWorking(true);
    try {
      // 1. Gán Dẫn Truyện cho chương
      await tauriBatchAssignNarration({
        chapterId: activeChapter.id,
        voice: narratorVoice,
        speed: narratorSpeed,
        temperature: narratorTemp,
        applyAllChapters: false,
      });

      // 2. Gán Hội Thoại cho chương (chỉ những câu chưa có vai riêng)
      await tauriBatchAssignDialoguesExtended({
        chapterId: activeChapter.id,
        speaker: "Hội Thoại",
        voice: dialogueVoice,
        speed: dialogueSpeed,
        temperature: dialogueTemp,
        onlyUnassigned: true,
      });

      // 3. Nếu preset có kèm nhân vật, import vào project nếu chưa có
      const currentPreset = presets.find((p) => p.id === selectedPresetId);
      if (currentPreset && currentPreset.characters.length > 0) {
        for (const pc of currentPreset.characters) {
          const exists = characters.some((c) => c.name.toLowerCase() === pc.name.toLowerCase());
          if (!exists) {
            const newChar: CharacterProfile = {
              id: crypto.randomUUID(),
              project_id: activeProject.id,
              name: pc.name,
              voice: pc.voice,
              speed: pc.speed,
              temperature: pc.temperature,
              color: pc.color,
            };
            await tauriSaveCharacter(newChar);
            addCharacter(newChar);
          }
        }
      }

      // Đồng bộ giọng mặc định toàn cục
      setSelectedVoice(narratorVoice);
      setGlobalDialogueVoice(dialogueVoice);

      await reloadSentences();
      showNotice(`Đã áp dụng cấu hình phân vai cho Chương hiện tại!`);
    } catch (err) {
      console.error("Lỗi áp dụng preset cho chương:", err);
      showNotice(`Lỗi: ${String(err)}`);
    } finally {
      setIsWorking(false);
    }
  };

  // Áp dụng Preset cho Toàn Bộ Tác Phẩm
  const handleApplyPresetToProject = () => {
    if (!activeProject || !activeChapter) return;

    askConfirm({
      title: "Áp Dụng Bộ Phân Vai Cho Toàn Bộ Cuốn Sách",
      description: `Bạn có chắc chắn muốn áp dụng giọng Dẫn Truyện ("${narratorVoice}") và Hội Thoại ("${dialogueVoice}") cho TẤT CẢ các chương trong sách?\n(Các câu đã gán nhân vật tùy chỉnh riêng vẫn được giữ nguyên)`,
      confirmText: "Áp Dụng Toàn Bộ Sách",
      cancelText: "Hủy",
      isDestructive: false,
      onConfirm: async () => {
        setIsWorking(true);
        try {
          // 1. Áp dụng Dẫn Truyện cho toàn bộ tác phẩm
          await tauriBatchAssignNarration({
            chapterId: activeChapter.id,
            voice: narratorVoice,
            speed: narratorSpeed,
            temperature: narratorTemp,
            applyAllChapters: true,
            projectId: activeProject.id,
          });

          // 2. Gán Hội Thoại cho chương hiện tại (và lưu nhân vật)
          await tauriBatchAssignDialoguesExtended({
            chapterId: activeChapter.id,
            speaker: "Hội Thoại",
            voice: dialogueVoice,
            speed: dialogueSpeed,
            temperature: dialogueTemp,
            onlyUnassigned: true,
          });

          const currentPreset = presets.find((p) => p.id === selectedPresetId);
          if (currentPreset && currentPreset.characters.length > 0) {
            for (const pc of currentPreset.characters) {
              const exists = characters.some((c) => c.name.toLowerCase() === pc.name.toLowerCase());
              if (!exists) {
                const newChar: CharacterProfile = {
                  id: crypto.randomUUID(),
                  project_id: activeProject.id,
                  name: pc.name,
                  voice: pc.voice,
                  speed: pc.speed,
                  temperature: pc.temperature,
                  color: pc.color,
                };
                await tauriSaveCharacter(newChar);
                addCharacter(newChar);
              }
            }
          }

          // Đồng bộ giọng mặc định toàn cục
          setSelectedVoice(narratorVoice);
          setGlobalDialogueVoice(dialogueVoice);

          await reloadSentences();
          showNotice(`Đã áp dụng thành công Bộ Phân Vai cho TOÀN BỘ cuốn sách!`);
        } catch (err) {
          console.error("Lỗi áp dụng cho toàn sách:", err);
          showNotice(`Lỗi: ${String(err)}`);
        } finally {
          setIsWorking(false);
        }
      },
    });
  };

  // Đóng modal và tự động đồng bộ Hội thoại, Dẫn truyện và Nhân vật vào DB
  const handleCloseModal = async () => {
    if (activeChapter && activeProject) {
      setIsWorking(true);
      try {
        // 1. Cập nhật Dẫn Truyện vào DB cho chương hiện tại
        await tauriBatchAssignNarration({
          chapterId: activeChapter.id,
          voice: narratorVoice,
          speed: narratorSpeed,
          temperature: narratorTemp,
          applyAllChapters: false,
        });

        // 2. Cập nhật Hội Thoại vào DB cho chương hiện tại (chỉ câu thoại chưa có vai cụ thể)
        await tauriBatchAssignDialoguesExtended({
          chapterId: activeChapter.id,
          speaker: "Hội Thoại",
          voice: dialogueVoice,
          speed: dialogueSpeed,
          temperature: dialogueTemp,
          onlyUnassigned: true,
        });

        // 3. Đảm bảo toàn bộ nhân vật bên dưới được lưu vào DB
        if (characters.length > 0) {
          for (const char of characters) {
            await tauriSaveCharacter(char);
          }
        }

        // 4. Đồng bộ persisted store
        setSelectedVoice(narratorVoice);
        setGlobalDialogueVoice(dialogueVoice);

        // 5. Cập nhật danh sách câu mới nhất
        await reloadSentences();
      } catch (err) {
        console.error("Lỗi tự động đồng bộ khi đóng modal:", err);
      } finally {
        setIsWorking(false);
      }
    }
    onClose();
  };

  // Lắng nghe phím Escape để tự động lưu và đóng modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (batchTargetChar) {
          setBatchTargetChar(null);
        } else if (isCreating) {
          setIsCreating(false);
        } else if (!isWorking) {
          handleCloseModal();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    batchTargetChar,
    isCreating,
    isWorking,
    narratorVoice,
    narratorSpeed,
    narratorTemp,
    dialogueVoice,
    dialogueSpeed,
    dialogueTemp,
    characters,
    activeChapter,
    activeProject,
  ]);

  if (!isOpen) return null;

  // Statistics
  const narrationSentences = sentences.filter(
    (s) => !s.is_dialogue && !s.clean_text.startsWith("[Khoảng lặng")
  );
  const dialogueSentences = sentences.filter((s) => s.is_dialogue);
  const selectedSentence = sentences.find((s) => s.id === selectedSentenceId);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const reloadSentences = async () => {
    if (!activeChapter) return;
    try {
      const updated = await tauriGetSentences(activeChapter.id);
      setSentences(updated);
    } catch (err) {
      console.error("Lỗi tải lại danh sách câu sau phân vai:", err);
    }
  };

  // 1. Gán toàn bộ Dẫn Truyện cho chương hiện tại
  const handleAssignNarrationChapter = async () => {
    if (!activeChapter) return;
    setIsWorking(true);
    try {
      await tauriBatchAssignNarration({
        chapterId: activeChapter.id,
        voice: narratorVoice,
        speed: narratorSpeed,
        temperature: narratorTemp,
        applyAllChapters: false,
      });
      setSelectedVoice(narratorVoice);
      await reloadSentences();
      showNotice(
        `Đã gán giọng "${narratorVoice}" cho toàn bộ ${narrationSentences.length} câu Dẫn Truyện trong chương!`
      );
    } catch (err) {
      console.error("Lỗi gán dẫn truyện chương:", err);
      showNotice(`Lỗi: ${String(err)}`);
    } finally {
      setIsWorking(false);
    }
  };

  // 2. Gán Dẫn Truyện cho toàn bộ tác phẩm
  const handleAssignNarrationProject = async () => {
    if (!activeProject || !activeChapter) return;
    setIsWorking(true);
    try {
      await tauriBatchAssignNarration({
        chapterId: activeChapter.id,
        voice: narratorVoice,
        speed: narratorSpeed,
        temperature: narratorTemp,
        applyAllChapters: true,
        projectId: activeProject.id,
      });
      setSelectedVoice(narratorVoice);
      await reloadSentences();
      showNotice(
        `Đã áp dụng giọng "${narratorVoice}" cho toàn bộ câu Dẫn Truyện của TẤT CẢ các chương trong tác phẩm!`
      );
    } catch (err) {
      console.error("Lỗi gán dẫn truyện tác phẩm:", err);
      showNotice(`Lỗi: ${String(err)}`);
    } finally {
      setIsWorking(false);
    }
  };

  // 3. Gán Hội Thoại Chung
  const handleAssignDialogue = async (onlyUnassigned: boolean) => {
    if (!activeChapter) return;
    setIsWorking(true);
    try {
      await tauriBatchAssignDialoguesExtended({
        chapterId: activeChapter.id,
        speaker: "Hội Thoại",
        voice: dialogueVoice,
        speed: dialogueSpeed,
        temperature: dialogueTemp,
        onlyUnassigned,
      });
      setGlobalDialogueVoice(dialogueVoice);
      await reloadSentences();
      showNotice(
        onlyUnassigned
          ? `Đã gán giọng "${dialogueVoice}" cho các câu thoại chưa được chỉ định vai!`
          : `Đã gán giọng "${dialogueVoice}" cho toàn bộ ${dialogueSentences.length} câu Hội Thoại trong chương!`
      );
    } catch (err) {
      console.error("Lỗi gán hội thoại:", err);
      showNotice(`Lỗi: ${String(err)}`);
    } finally {
      setIsWorking(false);
    }
  };

  // 4. Tạo nhân vật tùy chỉnh mới
  const handleCreateCharacter = async () => {
    if (!name.trim() || !activeProject) return;

    const newChar: CharacterProfile = {
      id: crypto.randomUUID ? crypto.randomUUID() : `char-${Date.now()}`,
      project_id: activeProject.id,
      name: name.trim(),
      voice: customVoice,
      speed: customSpeed,
      temperature: customTemp,
      color: customColor,
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
    showNotice(`Đã tạo nhân vật "${newChar.name}" thành công!`);
  };

  const handleDeleteCharacter = async (charId: string) => {
    removeCharacter(charId);
    try {
      await tauriDeleteCharacter(charId);
    } catch (err) {
      console.error("Lỗi xoá nhân vật:", err);
    }
  };

  // 5. Mở modal phân vai hàng loạt cho nhân vật
  const handleOpenBatchForChar = (char: CharacterProfile) => {
    setBatchTargetChar(char);
    setRangeFrom(selectedSentence ? selectedSentence.index : 1);
    setRangeTo(sentences.length || 1);
    setRangeFilterMode("dialogue_only");
  };

  // 6. Thực hiện phân vai khoảng câu cho nhân vật
  const handleExecuteRangeAssign = async () => {
    if (!batchTargetChar || !activeChapter) return;
    setIsWorking(true);
    try {
      await tauriBatchAssignSpeakerRange({
        chapterId: activeChapter.id,
        fromIndex: Math.max(1, rangeFrom),
        toIndex: Math.max(1, rangeTo),
        targetMode: rangeFilterMode,
        speaker: batchTargetChar.name,
        voice: batchTargetChar.voice,
        speed: batchTargetChar.speed,
        temperature: batchTargetChar.temperature,
      });
      await reloadSentences();
      showNotice(
        `Đã phân vai "${batchTargetChar.name}" từ câu #${rangeFrom} đến #${rangeTo} thành công!`
      );
      setBatchTargetChar(null);
    } catch (err) {
      console.error("Lỗi phân vai hàng loạt theo khoảng:", err);
      showNotice(`Lỗi: ${String(err)}`);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      className="bg-black/75 backdrop-blur-sm"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          height: "85vh",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#18181b",
          border: "1px solid #27272a",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
        }}
        className="animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            padding: "14px 18px",
            borderBottom: "1px solid #27272a",
            backgroundColor: "#09090b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                Phân Vai Sách Nói & Nhân Vật (Role & Character Casting)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Gán giọng đọc cho Dẫn Truyện, Hội Thoại và các nhân vật trong tiểu thuyết
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            disabled={isWorking}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            title="Đóng và lưu thiết lập vào cơ sở dữ liệu"
          >
            {isWorking ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
          className="text-xs"
        >
          {notification && (
            <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{notification}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 0: BỘ PHÂN VAI (CASTING PRESETS TOOLBAR)          */}
          {/* ========================================================= */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(24, 24, 27, 0.7)",
              border: "1px solid #27272a",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {/* Left: Title + Preset Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Bookmark style={{ width: 15, height: 15, color: "#818cf8" }} />
                  <span style={{ fontWeight: 600, color: "#f4f4f5", fontSize: 12 }}>
                    Bộ Phân Vai:
                  </span>
                </div>

                <select
                  value={selectedPresetId}
                  onChange={(e) => handleSelectPreset(e.target.value)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 8,
                    background: "#09090b",
                    border: "1px solid #3f3f46",
                    color: "#e4e4e7",
                    fontSize: 12,
                    minWidth: 200,
                    outline: "none",
                  }}
                >
                  <option value="">-- Chọn Preset đã lưu ({presets.length}) --</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right: Actions on Selected Preset */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {selectedPresetId ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdateCurrentPreset}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        background: "#27272a",
                        border: "1px solid #3f3f46",
                        color: "#e4e4e7",
                        fontSize: 11,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title="Ghi đè thiết lập hiện tại vào Preset này"
                    >
                      <Save style={{ width: 12, height: 12, color: "#38bdf8" }} />
                      <span>Cập nhật</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDuplicatePreset}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        background: "#27272a",
                        border: "1px solid #3f3f46",
                        color: "#e4e4e7",
                        fontSize: 11,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title="Tạo bản sao từ preset này để chỉnh sửa tiếp"
                    >
                      <Copy style={{ width: 12, height: 12, color: "#a78bfa" }} />
                      <span>Nhân bản</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const current = presets.find((p) => p.id === selectedPresetId);
                        if (current) {
                          setRenameValue(current.name);
                          setIsRenamingPreset(true);
                        }
                      }}
                      style={{
                        padding: "5px 8px",
                        borderRadius: 6,
                        background: "#27272a",
                        border: "1px solid #3f3f46",
                        color: "#a1a1aa",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                      title="Đổi tên Preset"
                    >
                      <Edit2 style={{ width: 12, height: 12 }} />
                    </button>

                    <button
                      type="button"
                      onClick={handleDeletePreset}
                      style={{
                        padding: "5px 8px",
                        borderRadius: 6,
                        background: "rgba(159, 18, 57, 0.3)",
                        border: "1px solid rgba(244, 63, 94, 0.4)",
                        color: "#fb7185",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                      title="Xóa Preset này"
                    >
                      <Trash2 style={{ width: 12, height: 12 }} />
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsPromptNewPreset(true)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    background: "rgba(99, 102, 241, 0.2)",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    color: "#a5b4fc",
                    fontWeight: 500,
                    fontSize: 11,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title="Lưu thiết lập Dẫn Truyện + Hội Thoại + Nhân Vật thành một Preset mới"
                >
                  <Plus style={{ width: 12, height: 12 }} />
                  <span>Lưu Preset Mới</span>
                </button>
              </div>
            </div>

            {/* Prompt New Preset Name Box */}
            {isPromptNewPreset && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "#09090b",
                  border: "1px solid #4f46e5",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="text"
                  placeholder="Nhập tên Bộ Phân Vai (ví dụ: Truyện Kiếm Hiệp - Nữ Dẫn Truyện)..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveCurrentAsPreset();
                  }}
                  autoFocus
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSaveCurrentAsPreset()}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "#4f46e5",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => setIsPromptNewPreset(false)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "#27272a",
                    color: "#a1a1aa",
                    fontSize: 11,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
              </div>
            )}

            {/* Rename Preset Box */}
            {isRenamingPreset && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "#09090b",
                  border: "1px solid #3b82f6",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="text"
                  placeholder="Nhập tên mới..."
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenamePreset();
                  }}
                  autoFocus
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <button
                  type="button"
                  onClick={handleRenamePreset}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "#2563eb",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Đổi Tên
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenamingPreset(false)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "#27272a",
                    color: "#a1a1aa",
                    fontSize: 11,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
              </div>
            )}

            {/* Bottom: Fast Apply Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 8,
                borderTop: "1px solid #27272a",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 11, color: "#71717a" }}>
                💡 Chọn preset rồi bấm áp dụng cho chương hoặc toàn bộ cuốn sách:
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleApplyPresetToChapter}
                  disabled={isWorking}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "#4f46e5",
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                    cursor: isWorking ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: isWorking ? 0.6 : 1,
                    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.35)",
                  }}
                  title="Gán giọng Dẫn Truyện + Hội Thoại của cấu hình này cho Chương hiện tại"
                >
                  <Sparkles style={{ width: 13, height: 13 }} />
                  <span>Áp Dụng Cho Chương Này</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyPresetToProject}
                  disabled={isWorking}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    color: "#34d399",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: isWorking ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: isWorking ? 0.6 : 1,
                  }}
                  title="Gán Dẫn Truyện & Hội Thoại cho toàn bộ các chương trong sách"
                >
                  <Globe style={{ width: 13, height: 13 }} />
                  <span>Áp Dụng Toàn Bộ Sách</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 1: SYSTEM ROLES (DẪN TRUYỆN & HỘI THOẠI CHUNG)     */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">
                  1. Vai Hệ Thống Mặc Định (System Roles)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Cốt lõi sách nói
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Chương hiện tại: {sentences.length} câu
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Card A: DẪN TRUYỆN (NARRATOR) */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-zinc-100 text-sm">
                        Dẫn Truyện (Narrator)
                      </span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                      {narrationSentences.length} câu
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Giọng đọc văn xuôi, tả cảnh, diễn biến cốt truyện (các câu không phải đối thoại).
                  </p>

                  {/* Voice Select */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Giọng Dẫn Truyện:</span>
                      <select
                        value={narratorVoice}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNarratorVoice(v);
                          setSelectedVoice(v);
                          const p = VOICE_PRESETS.find((item) => item.id === v);
                          if (p) {
                            setNarratorSpeed(p.recommended_speed);
                            setNarratorTemp(p.recommended_temp);
                          }
                        }}
                        className="bg-zinc-900 border border-zinc-700/80 rounded px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {VOICE_PRESETS.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Tốc độ: {narratorSpeed.toFixed(2)}x</span>
                      <input
                        type="range"
                        min={0.75}
                        max={1.35}
                        step={0.05}
                        value={narratorSpeed}
                        onChange={(e) => setNarratorSpeed(parseFloat(e.target.value))}
                        className="w-28 accent-indigo-500 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Nhiệt độ ngữ điệu: {narratorTemp.toFixed(2)}</span>
                      <input
                        type="range"
                        min={0.25}
                        max={0.75}
                        step={0.02}
                        value={narratorTemp}
                        onChange={(e) => setNarratorTemp(parseFloat(e.target.value))}
                        className="w-28 accent-indigo-500 h-1 bg-zinc-800 rounded cursor-pointer"
                        title="Nhiệt độ ngữ điệu (Temperature): càng cao đọc càng biểu cảm, sinh động"
                      />
                    </div>
                  </div>
                </div>

                {/* Batch Action Buttons */}
                <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-1.5">
                  <button
                    onClick={handleAssignNarrationChapter}
                    disabled={isWorking || narrationSentences.length === 0}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
                    title="Gán giọng này cho toàn bộ câu Dẫn Truyện trong chương đang mở"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Gán Dẫn Truyện (Chương này)</span>
                  </button>

                  <button
                    onClick={handleAssignNarrationProject}
                    disabled={isWorking}
                    className="w-full py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-[11px] transition-colors flex items-center justify-center gap-1.5"
                    title="Áp dụng giọng Dẫn Truyện này cho toàn bộ tất cả các chương trong cuốn sách"
                  >
                    <Globe className="w-3 h-3 text-indigo-400" />
                    <span>Áp dụng cho toàn bộ tác phẩm</span>
                  </button>
                </div>
              </div>

              {/* Card B: HỘI THOẠI CHUNG (DIALOGUE) */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-zinc-100 text-sm">
                        Hội Thoại Chung (Dialogue)
                      </span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                      {dialogueSentences.length} câu
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Giọng đọc mặc định cho tất cả các câu thoại trong ngoặc kép `""` hoặc gạch đầu dòng `—`.
                  </p>

                  {/* Voice Select */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Giọng Hội Thoại:</span>
                      <select
                        value={dialogueVoice}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDialogueVoice(v);
                          setGlobalDialogueVoice(v);
                          const p = VOICE_PRESETS.find((item) => item.id === v);
                          if (p) {
                            setDialogueSpeed(p.recommended_speed);
                            setDialogueTemp(p.recommended_temp);
                          }
                        }}
                        className="bg-zinc-900 border border-zinc-700/80 rounded px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {VOICE_PRESETS.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Tốc độ: {dialogueSpeed.toFixed(2)}x</span>
                      <input
                        type="range"
                        min={0.75}
                        max={1.35}
                        step={0.05}
                        value={dialogueSpeed}
                        onChange={(e) => setDialogueSpeed(parseFloat(e.target.value))}
                        className="w-28 accent-purple-500 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Nhiệt độ ngữ điệu: {dialogueTemp.toFixed(2)}</span>
                      <input
                        type="range"
                        min={0.25}
                        max={0.75}
                        step={0.02}
                        value={dialogueTemp}
                        onChange={(e) => setDialogueTemp(parseFloat(e.target.value))}
                        className="w-28 accent-purple-500 h-1 bg-zinc-800 rounded cursor-pointer"
                        title="Nhiệt độ ngữ điệu (Temperature): càng cao đọc càng biểu cảm, sinh động"
                      />
                    </div>
                  </div>
                </div>

                {/* Batch Action Buttons */}
                <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-1.5">
                  <button
                    onClick={() => handleAssignDialogue(false)}
                    disabled={isWorking || dialogueSentences.length === 0}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
                    title="Gán giọng này cho toàn bộ câu thoại trong chương"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Gán tất cả câu Hội Thoại</span>
                  </button>

                  <button
                    onClick={() => handleAssignDialogue(true)}
                    disabled={isWorking || dialogueSentences.length === 0}
                    className="w-full py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-[11px] transition-colors flex items-center justify-center gap-1.5"
                    title="Chỉ gán cho những câu thoại chưa được chỉ định vai nhân vật cụ thể nào"
                  >
                    <Filter className="w-3 h-3 text-purple-400" />
                    <span>Chỉ gán câu thoại chưa có vai</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 2: CUSTOM CHARACTERS (NHÂN VẬT TÙY CHỈNH)          */}
          {/* ========================================================= */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <span className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">
                2. Nhân Vật Tùy Chỉnh ({characters.length})
              </span>
              {!isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Nhân Vật Mới</span>
                </button>
              )}
            </div>

            {/* Create Character Form */}
            {isCreating && (
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Tạo Hồ Sơ Nhân Vật Mới
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
                    <label className="text-zinc-400 text-[11px]">Tên nhân vật:</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ví dụ: Phương Mộc, Nạn nhân nữ, Trưởng phòng..."
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[11px]">Màu hiển thị badge:</label>
                    <div className="flex items-center gap-2 h-8">
                      {BADGE_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCustomColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border transition-all ${
                            customColor === c
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
                  <label className="text-zinc-400 text-[11px]">Chọn giọng đọc:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VOICE_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setCustomVoice(p.id);
                          setCustomSpeed(p.recommended_speed);
                          setCustomTemp(p.recommended_temp);
                        }}
                        className={`p-2 rounded-lg border text-left flex items-center justify-between ${
                          customVoice === p.id
                            ? "bg-indigo-950/40 border-indigo-500 text-white"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <span className="font-medium text-xs">{p.name}</span>
                        {customVoice === p.id && (
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
                        {customSpeed.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.75}
                      max={1.35}
                      step={0.05}
                      value={customSpeed}
                      onChange={(e) => setCustomSpeed(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-400">Độ biểu cảm:</span>
                      <span className="font-mono text-purple-400">
                        {customTemp.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.25}
                      max={0.75}
                      step={0.02}
                      value={customTemp}
                      onChange={(e) => setCustomTemp(parseFloat(e.target.value))}
                      className="w-full accent-purple-500 h-1 bg-zinc-800 rounded"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleCreateCharacter}
                    disabled={!name.trim()}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-40"
                  >
                    Lưu Nhân Vật
                  </button>
                </div>
              </div>
            )}

            {/* Character List */}
            {characters.length === 0 && !isCreating ? (
              <div className="p-6 text-center text-zinc-500 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
                <p>Chưa có nhân vật tùy chỉnh nào được tạo.</p>
                <p className="text-[11px] text-zinc-600">
                  Nhấn &quot;Thêm Nhân Vật Mới&quot; để gán giọng riêng cho các nhân vật chính trong truyện.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: char.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100 text-sm">
                            {char.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
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
                        onClick={() => handleOpenBatchForChar(char)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm"
                        title="Mở bảng phân vai hàng loạt theo phân cảnh cho nhân vật này"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Phân vai hàng loạt...</span>
                      </button>

                      <button
                        onClick={() => handleDeleteCharacter(char.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 transition-colors"
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

          {/* ========================================================= */}
          {/* MODAL CON: BATCH ASSIGN BY RANGE FOR A SPECIFIC CHARACTER */}
          {/* ========================================================= */}
          {batchTargetChar && (
            <div
              style={{ zIndex: 60 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
            >
              <div className="w-full max-w-md bg-zinc-950 border border-zinc-700 rounded-xl p-5 shadow-2xl space-y-4 text-zinc-200">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: batchTargetChar.color }}
                    />
                    <h4 className="font-semibold text-sm text-zinc-100">
                      Phân Vai Hàng Loạt: {batchTargetChar.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => setBatchTargetChar(null)}
                    className="p-1 rounded text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Gán vai <span className="text-zinc-100 font-semibold">{batchTargetChar.name}</span> (Giọng: {batchTargetChar.voice}) cho các câu trong chương theo phân cảnh:
                </p>

                {/* Range inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-400">Từ câu số:</span>
                      {selectedSentence && (
                        <button
                          type="button"
                          onClick={() => setRangeFrom(selectedSentence.index)}
                          className="text-indigo-400 hover:underline"
                        >
                          Câu đang chọn (#{selectedSentence.index})
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={sentences.length || 1}
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-400">Đến câu số:</span>
                      <button
                        type="button"
                        onClick={() => setRangeTo(sentences.length)}
                        className="text-indigo-400 hover:underline"
                      >
                        Đến cuối (#{sentences.length})
                      </button>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={sentences.length || 1}
                      value={rangeTo}
                      onChange={(e) => setRangeTo(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Filter Mode */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Loại câu áp dụng trong khoảng:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRangeFilterMode("dialogue_only")}
                      className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-medium transition-colors ${
                        rangeFilterMode === "dialogue_only"
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Chỉ câu thoại
                    </button>
                    <button
                      type="button"
                      onClick={() => setRangeFilterMode("all")}
                      className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-medium transition-colors ${
                        rangeFilterMode === "all"
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Tất cả các câu
                    </button>
                    <button
                      type="button"
                      onClick={() => setRangeFilterMode("narration_only")}
                      className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-medium transition-colors ${
                        rangeFilterMode === "narration_only"
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Chỉ dẫn truyện
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button
                    onClick={() => setBatchTargetChar(null)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleExecuteRangeAssign}
                    disabled={isWorking}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                  >
                    <span>Thực hiện phân vai</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            flexShrink: 0,
            padding: "14px 18px",
            borderTop: "1px solid #27272a",
            backgroundColor: "#09090b",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleCloseModal}
            disabled={isWorking}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isWorking && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
            <span>{isWorking ? "Đang lưu & đồng bộ..." : "Đóng & Cập nhật"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
