"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { useConfirmStore } from "@/stores/useConfirmStore";

export const ConfirmModal: React.FC = () => {
  const {
    isOpen,
    title,
    description,
    confirmText,
    cancelText,
    isDestructive,
    isLoading,
    onConfirmAction,
    closeConfirm,
    setIsLoading,
  } = useConfirmStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        closeConfirm();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, closeConfirm]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!onConfirmAction || isLoading) return;
    try {
      setIsLoading(true);
      await onConfirmAction();
    } catch (err) {
      console.error("Lỗi khi thực hiện xác nhận:", err);
    } finally {
      closeConfirm();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
      }}
      className="flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        style={{ backgroundColor: "#18181b" }}
        className="w-full max-w-md rounded-2xl border border-zinc-700/80 shadow-2xl shadow-black/95 overflow-hidden text-zinc-200 animate-in zoom-in-95 duration-150 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                isDestructive
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  : "bg-amber-500/15 border-amber-500/30 text-amber-400"
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
            </div>
            <h3 className="font-semibold text-sm text-zinc-100" style={{ marginLeft: 8 }}>
              {title}
            </h3>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={closeConfirm}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
          {description}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-800/90 bg-zinc-950/40 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={closeConfirm}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-40"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium text-white shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-40 ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
