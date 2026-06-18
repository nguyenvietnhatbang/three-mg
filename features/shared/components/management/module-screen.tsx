"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ApiItemResponse,
  ApiListResponse,
  LookupCollections,
  ManagementRecord,
  ModuleConfig,
  Pagination as PaginationType,
} from "./types";
import { ConfirmDialog } from "./confirm-dialog";
import { DataTable, formatCell } from "./data-table";
import { Modal } from "./modal";
import { Pagination } from "./pagination";
import { RecordForm } from "./record-form";

type ModuleScreenProps = {
  config: ModuleConfig;
  lookups: LookupCollections | null;
  onRefreshLookups: () => void;
};

export function ModuleScreen({
  config,
  lookups,
  onRefreshLookups,
}: ModuleScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<ManagementRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ManagementRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ManagementRecord | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ManagementRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchDraft, setSearchDraft] = useState(searchParams.get("search") ?? "");

  const queryState = useMemo(
    () => ({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      search: searchParams.get("search") ?? "",
      sortBy: searchParams.get("sortBy") ?? config.defaultSortBy,
      sortOrder: (searchParams.get("sortOrder") === "desc" ? "desc" : "asc") as "asc" | "desc",
    }),
    [config.defaultSortBy, searchParams],
  );

  const setParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("module", config.key);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [config.key, router, searchParams],
  );

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(queryState.page));
    params.set("pageSize", String(queryState.pageSize));
    params.set("search", queryState.search);
    params.set("sortBy", queryState.sortBy);
    params.set("sortOrder", queryState.sortOrder);

    config.filters.forEach((filter) => {
      const value = searchParams.get(filter.key);
      if (value) {
        params.set(filter.key, value);
      }
    });

    try {
      const response = await fetch(`${config.apiPath}?${params.toString()}`);
      const payload = (await response.json()) as ApiListResponse<ManagementRecord>;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Không tải được dữ liệu");
      }

      setRecords(payload.data);
      setPagination(payload.pagination);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [config, queryState, searchParams]);

  useEffect(() => {
    // The table synchronizes with URL state and must refetch when it changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    // Keep the debounced search input aligned with URL changes and module switches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchDraft(searchParams.get("search") ?? "");
  }, [config.key, searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchDraft !== queryState.search) {
        setParams({ search: searchDraft, page: 1 });
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [queryState.search, searchDraft, setParams]);

  async function submitRecord(value: ManagementRecord) {
    setSubmitting(true);
    setError(null);

    const isEditing = Boolean(editingRecord?.id);
    const endpoint = isEditing ? `${config.apiPath}/${editingRecord?.id}` : config.apiPath;

    try {
      const response = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const payload = (await response.json()) as ApiItemResponse<ManagementRecord>;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Không lưu được dữ liệu");
      }

      setCreateOpen(false);
      setEditingRecord(null);
      await fetchRecords();
      onRefreshLookups();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không lưu được dữ liệu");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deletingRecord?.id) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiPath}/${deletingRecord.id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const payload = (await response.json()) as ApiItemResponse<ManagementRecord>;
        throw new Error(payload.error?.message ?? "Không xóa được dữ liệu");
      }

      setDeletingRecord(null);
      await fetchRecords();
      onRefreshLookups();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không xóa được dữ liệu");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSort(key: string) {
    setParams({
      sortBy: key,
      sortOrder: queryState.sortBy === key && queryState.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-zinc-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-950">{config.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-500">{config.description}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void fetchRecords()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <RefreshCw className="size-4" />
              Tải lại
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Plus className="size-4" />
              {config.primaryAction}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-50 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          {config.metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-sm text-zinc-500">{metric.label}</p>
              <div className="mt-2 text-2xl font-semibold text-zinc-950">
                {metric.getValue(records, pagination)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-white">
          <div className="space-y-3 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative max-w-xl flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder={config.searchPlaceholder}
                  className="h-10 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const reset: Record<string, string | number | null> = {
                    search: null,
                    page: 1,
                    sortBy: config.defaultSortBy,
                    sortOrder: "asc",
                  };
                  config.filters.forEach((filter) => {
                    reset[filter.key] = null;
                  });
                  setSearchDraft("");
                  setParams(reset);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <RotateCcw className="size-4" />
                Xóa lọc
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {config.filters.map((filter) => {
                const options = filter.lookupKey
                  ? lookups?.[filter.lookupKey]?.map((option) => ({
                      label: `${option.name}${option.code ? ` (${option.code})` : ""}`,
                      value: option.id,
                    })) ?? []
                  : filter.options;

                return (
                  <label key={filter.key}>
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {filter.label}
                    </span>
                    <select
                      value={searchParams.get(filter.key) ?? ""}
                      onChange={(event) =>
                        setParams({ [filter.key]: event.target.value || null, page: 1 })
                      }
                      className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                    >
                      <option value="">{filter.placeholder ?? "Tất cả"}</option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="border-y border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <DataTable
            columns={config.columns}
            records={records}
            loading={loading}
            sortBy={queryState.sortBy}
            sortOrder={queryState.sortOrder}
            onSort={handleSort}
            onView={setSelectedRecord}
            onEdit={setEditingRecord}
            onDelete={setDeletingRecord}
          />
          <Pagination
            pagination={pagination}
            loading={loading}
            onPageChange={(page) => setParams({ page })}
            onPageSizeChange={(pageSize) => setParams({ pageSize, page: 1 })}
          />
        </div>
      </div>

      <Modal
        open={Boolean(selectedRecord)}
        title={`Chi tiết ${config.title.toLowerCase()}`}
        onClose={() => setSelectedRecord(null)}
        size="xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {config.detailFields.map((field) => (
            <div key={field.key} className="rounded-md border border-zinc-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {field.label}
              </p>
              <div className="mt-2 text-sm text-zinc-900">
                {formatCell(selectedRecord?.[field.key], field.format)}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={isCreateOpen || Boolean(editingRecord)}
        title={editingRecord ? `Sửa ${config.title.toLowerCase()}` : config.primaryAction}
        description="Các trường có dấu * là bắt buộc."
        onClose={() => {
          setCreateOpen(false);
          setEditingRecord(null);
        }}
        size="xl"
        footer={
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setCreateOpen(false);
                setEditingRecord(null);
              }}
              className="h-9 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="management-record-form"
              disabled={submitting}
              className="h-9 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {submitting ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        }
      >
        <RecordForm
          key={`${config.key}-${editingRecord?.id ?? "new"}-${isCreateOpen ? "create" : "edit"}`}
          fields={config.fields}
          lookups={lookups}
          initialValue={editingRecord}
          submitting={submitting}
          onCancel={() => {
            setCreateOpen(false);
            setEditingRecord(null);
          }}
          onSubmit={submitRecord}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingRecord)}
        title="Xóa dữ liệu"
        description={`Bạn chắc chắn muốn xóa "${
          deletingRecord?.companyName ??
          deletingRecord?.name ??
          deletingRecord?.fullName ??
          deletingRecord?.employeeCode ??
          deletingRecord?.code ??
          deletingRecord?.contractCode ??
          "bản ghi này"
        }"? Dữ liệu sẽ được xóa mềm để còn lịch sử đối chiếu.`}
        confirmLabel="Xóa"
        loading={submitting}
        onCancel={() => setDeletingRecord(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
