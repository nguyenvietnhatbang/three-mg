"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, Eye, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { ColumnConfig, ManagementRecord } from "./types";
import { StatusBadge } from "./status-badge";

type DataTableProps = {
  columns: ColumnConfig[];
  records: ManagementRecord[];
  loading?: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (key: string) => void;
  onView: (record: ManagementRecord) => void;
  onEdit: (record: ManagementRecord) => void;
  onDelete: (record: ManagementRecord) => void;
  onCreate?: () => void;
  emptyActionLabel?: string;
};

export function DataTable({
  columns,
  records,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
  onCreate,
  emptyActionLabel,
}: DataTableProps) {
  const tableMinWidth = useMemo(() => getTableMinWidth(columns), [columns]);

  return (
    <div className="overflow-hidden border-y border-zinc-200 bg-white">
      <div className="overflow-x-auto">
        <table
          className="border-separate border-spacing-0 text-left text-sm"
          style={{ minWidth: tableMinWidth }}
        >
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className="border-b border-zinc-200 px-4 py-3 font-semibold"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-zinc-900"
                    >
                      {column.label}
                      {sortBy === column.key ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              <th className="sticky right-0 z-10 w-[132px] border-b border-l border-zinc-200 bg-zinc-50 px-4 py-3 text-right font-semibold">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column.key} className="border-b border-zinc-100 px-4 py-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
                    </td>
                  ))}
                  <td className="sticky right-0 z-10 border-b border-l border-zinc-100 bg-white px-4 py-3">
                    <div className="ml-auto h-8 w-24 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-zinc-900">Không có dữ liệu phù hợp</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Thử đổi bộ lọc hoặc tạo bản ghi mới nếu bạn có quyền.
                  </p>
                  {onCreate && emptyActionLabel ? (
                    <button
                      type="button"
                      onClick={onCreate}
                      className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      {emptyActionLabel}
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={String(record.id)} className="hover:bg-zinc-50/70">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{ width: column.width }}
                      className="border-b border-zinc-100 px-4 py-3 text-zinc-700"
                    >
                      {formatCell(record[column.key], column.format)}
                    </td>
                  ))}
                  <td className="sticky right-0 z-10 border-b border-l border-zinc-100 bg-white px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Xem"
                        onClick={() => onView(record)}
                        className="inline-flex size-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        title="Sửa"
                        onClick={() => onEdit(record)}
                        className="inline-flex size-8 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        title="Xóa"
                        onClick={() => onDelete(record)}
                        className="inline-flex size-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function formatCell(value: unknown, format: ColumnConfig["format"]) {
  if (format === "money") {
    return formatCurrency(value as string | number | null | undefined);
  }

  if (format === "date") {
    return <span>{formatDate(value as string | null | undefined)}</span>;
  }

  if (format === "status") {
    return <StatusBadge value={String(value ?? "")} />;
  }

  if (format === "boolean") {
    return <StatusBadge value={value ? "active" : "inactive"} />;
  }

  if (value === null || value === undefined || value === "") {
    return <span className="text-zinc-400">Chưa có</span>;
  }

  return <span className="line-clamp-2">{String(value)}</span>;
}

function getTableMinWidth(columns: ColumnConfig[]) {
  const columnsWidth = columns.reduce((total, column) => total + parsePixelWidth(column.width), 0);

  return Math.max(1180, columnsWidth + 132);
}

function parsePixelWidth(width?: string) {
  if (!width?.endsWith("px")) {
    return 160;
  }

  return Number(width.replace("px", "")) || 160;
}
