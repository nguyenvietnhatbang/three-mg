"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
};

const sizeClass = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

export function Modal({
  title,
  description,
  open,
  onClose,
  children,
  footer,
  size = "lg",
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div
        className={`flex max-h-[92vh] w-full ${sizeClass[size]} flex-col overflow-hidden rounded-lg bg-white shadow-xl`}
      >
        <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Đóng"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

