"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as PaginationType } from "./types";

type PaginationProps = {
  pagination: PaginationType | null;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function Pagination({
  pagination,
  loading,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (!pagination) {
    return null;
  }

  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between">
      <div>
        Hiển thị <span className="font-medium text-zinc-900">{start}-{end}</span> trong{" "}
        <span className="font-medium text-zinc-900">{pagination.total}</span> dòng
      </div>
      <div className="flex items-center gap-3">
        <select
          value={pagination.pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          disabled={loading}
          className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm"
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}/trang
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={loading || pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Trang trước"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-24 text-center">
            Trang {pagination.page}/{pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={loading || pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Trang sau"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
