import { create } from "zustand";

interface AskConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  isDestructive: boolean;
  isLoading: boolean;
  onConfirmAction: (() => void | Promise<void>) | null;
  askConfirm: (options: AskConfirmOptions) => void;
  closeConfirm: () => void;
  setIsLoading: (loading: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  title: "",
  description: "",
  confirmText: "Xác nhận",
  cancelText: "Hủy bỏ",
  isDestructive: true,
  isLoading: false,
  onConfirmAction: null,
  askConfirm: (options) =>
    set({
      isOpen: true,
      title: options.title,
      description: options.description,
      confirmText: options.confirmText ?? "Xóa Vĩnh Viễn",
      cancelText: options.cancelText ?? "Hủy Bỏ",
      isDestructive: options.isDestructive ?? true,
      isLoading: false,
      onConfirmAction: options.onConfirm,
    }),
  closeConfirm: () =>
    set({
      isOpen: false,
      onConfirmAction: null,
      isLoading: false,
    }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
