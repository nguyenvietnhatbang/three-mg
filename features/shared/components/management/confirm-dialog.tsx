"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "./modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  loading,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-9 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-9 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Đang xử lý..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="size-5" />
        </div>
        <p className="text-sm leading-6 text-zinc-600">{description}</p>
      </div>
    </Modal>
  );
}

