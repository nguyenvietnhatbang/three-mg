"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import type {
  ApiItemResponse,
  ApiListResponse,
  LookupCollections,
  ManagementRecord,
  ModuleConfig,
  Pagination as PaginationType,
  RowActionConfig,
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

type RecordCacheEntry = {
  records: ManagementRecord[];
  pagination: PaginationType | null;
  updatedAt: number;
};

type QueryState = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

const recordCacheTtlMs = 2 * 60 * 1000;
const recordCache = new Map<string, RecordCacheEntry>();

function invalidateRecordCache(apiPath: string) {
  Array.from(recordCache.keys()).forEach((key) => {
    if (key.startsWith(`${apiPath}?`)) {
      recordCache.delete(key);
    }
  });
}

export function ModuleScreen({
  config,
  lookups,
  onRefreshLookups,
}: ModuleScreenProps) {
  const [records, setRecords] = useState<ManagementRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ManagementRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ManagementRecord | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ManagementRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    action: RowActionConfig;
    record: ManagementRecord;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [searchDraft, setSearchDraft] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [queryState, setQueryState] = useState<QueryState>({
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: config.defaultSortBy,
    sortOrder: "asc",
  });

  const activeFilterCount = useMemo(() => {
    const filterCount = config.filters.filter((filter) => filterValues[filter.key]).length;

    return filterCount + (queryState.search ? 1 : 0);
  }, [config.filters, filterValues, queryState.search]);

  const setParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      setQueryState((current) => {
        const next = { ...current };

        if ("page" in updates) {
          next.page = Number(updates.page ?? 1);
        }
        if ("pageSize" in updates) {
          next.pageSize = Number(updates.pageSize ?? 10);
        }
        if ("search" in updates) {
          next.search = String(updates.search ?? "");
        }
        if ("sortBy" in updates) {
          next.sortBy = String(updates.sortBy ?? config.defaultSortBy);
        }
        if ("sortOrder" in updates) {
          next.sortOrder = updates.sortOrder === "desc" ? "desc" : "asc";
        }

        return next;
      });

      setFilterValues((current) => {
        const next = { ...current };
        let changed = false;

        config.filters.forEach((filter) => {
          if (!(filter.key in updates)) {
            return;
          }

          const value = updates[filter.key];
          changed = true;

          if (value === null || value === "") {
            delete next[filter.key];
          } else {
            next[filter.key] = String(value);
          }
        });

        return changed ? next : current;
      });
    },
    [config.defaultSortBy, config.filters],
  );

  const getRecordCacheKey = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(queryState.page));
    params.set("pageSize", String(queryState.pageSize));
    params.set("search", queryState.search);
    params.set("sortBy", queryState.sortBy);
    params.set("sortOrder", queryState.sortOrder);

    config.filters.forEach((filter) => {
      const value = filterValues[filter.key];
      if (value) {
        params.set(filter.key, value);
      }
    });

    return {
      cacheKey: `${config.apiPath}?${params.toString()}`,
      params,
    };
  }, [config.apiPath, config.filters, filterValues, queryState]);

  const fetchRecords = useCallback(async (options?: { force?: boolean }) => {
    const { cacheKey, params } = getRecordCacheKey();
    const cached = recordCache.get(cacheKey);

    if (!options?.force && cached && Date.now() - cached.updatedAt < recordCacheTtlMs) {
      setRecords(cached.records);
      setPagination(cached.pagination);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiPath}?${params.toString()}`);
      const payload = (await response.json()) as ApiListResponse<ManagementRecord>;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Không tải được dữ liệu");
      }

      setRecords(payload.data);
      setPagination(payload.pagination);
      recordCache.set(cacheKey, {
        records: payload.data,
        pagination: payload.pagination,
        updatedAt: Date.now(),
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [config.apiPath, getRecordCacheKey]);

  useEffect(() => {
    // The table synchronizes with URL state and must refetch when it changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRecords();
  }, [fetchRecords]);

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
    setFormError(null);
    setFieldErrors({});

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
        setFormError(payload.error?.message ?? "Không lưu được dữ liệu");
        setFieldErrors(extractFieldErrors(payload.error?.details));
        return;
      }

      setCreateOpen(false);
      setEditingRecord(null);
      invalidateRecordCache(config.apiPath);
      await fetchRecords({ force: true });
      onRefreshLookups();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Không lưu được dữ liệu");
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
      invalidateRecordCache(config.apiPath);
      await fetchRecords({ force: true });
      onRefreshLookups();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không xóa được dữ liệu");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmRowAction() {
    if (!pendingAction) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(pendingAction.action.endpoint(pendingAction.record), {
        method: pendingAction.action.method ?? "POST",
      });
      const payload = response.status === 204
        ? null
        : ((await response.json()) as ApiItemResponse<ManagementRecord>);

      if (!response.ok || (payload && !payload.success)) {
        throw new Error(payload?.error?.message ?? "Không thực hiện được thao tác");
      }

      setPendingAction(null);
      invalidateRecordCache(config.apiPath);
      await fetchRecords({ force: true });
      onRefreshLookups();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thực hiện được thao tác");
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

  function openCreateModal() {
    setFormError(null);
    setFieldErrors({});
    setCreateOpen(true);
  }

  function openEditModal(record: ManagementRecord) {
    setFormError(null);
    setFieldErrors({});
    setEditingRecord(record);
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
              onClick={() => void fetchRecords({ force: true })}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Tải lại
            </button>
            {config.canCreate === false ? null : (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                <Plus className="size-4" />
                {config.primaryAction}
              </button>
            )}
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
              <div className="relative max-w-2xl flex-1">
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
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-zinc-900 px-1.5 text-xs text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>
            {config.filters.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {config.filters.map((filter) => {
                const options = filter.lookupKey
                  ? lookups?.[filter.lookupKey]?.map((option) => ({
                      label: `${option.name}${option.code ? ` (${option.code})` : ""}`,
                      value: option.id,
                    })) ?? []
                  : filter.options ?? [];

                return (
                  <label key={filter.key}>
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {filter.label}
                    </span>
                    {filter.type === "date" ? (
                      <input
                        type="date"
                        value={filterValues[filter.key] ?? ""}
                        onChange={(event) =>
                          setParams({ [filter.key]: event.target.value || null, page: 1 })
                        }
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                      />
                    ) : (
                      <select
                        value={filterValues[filter.key] ?? ""}
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
                    )}
                  </label>
                );
              })}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="flex flex-col gap-3 border-y border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => void fetchRecords({ force: true })}
                className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Thử lại
              </button>
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
            onEdit={openEditModal}
            onDelete={setDeletingRecord}
            onRowAction={(action, record) => setPendingAction({ action, record })}
            rowActions={config.rowActions}
            onCreate={config.canCreate === false ? undefined : openCreateModal}
            emptyActionLabel={config.primaryAction}
            canEdit={config.canEdit !== false}
            canDelete={config.canDelete !== false}
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
        <div className="space-y-6">
          {groupDetailFields(config).map((section) => (
            <section key={section.label} className="space-y-3">
              <div className="border-b border-zinc-200 pb-2">
                <h3 className="text-sm font-semibold text-zinc-950">{section.label}</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {section.fields.map((field) => (
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
            </section>
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
          setFormError(null);
          setFieldErrors({});
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
                setFormError(null);
                setFieldErrors({});
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
        {formError ? (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}
        <RecordForm
          key={`${config.key}-${editingRecord?.id ?? "new"}-${isCreateOpen ? "create" : "edit"}`}
          fields={config.fields}
          lookups={lookups}
          initialValue={editingRecord}
          submitting={submitting}
          fieldErrors={fieldErrors}
          onCancel={() => {
            setCreateOpen(false);
            setEditingRecord(null);
            setFormError(null);
            setFieldErrors({});
          }}
          onSubmit={submitRecord}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingRecord)}
        title="Xóa dữ liệu"
        description={`Bạn chắc chắn muốn xóa "${getRecordLabel(deletingRecord)}"? Dữ liệu sẽ được xóa mềm để còn lịch sử đối chiếu.`}
        confirmLabel="Xóa"
        loading={submitting}
        onCancel={() => setDeletingRecord(null)}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.action.confirmTitle ?? pendingAction?.action.label ?? "Xác nhận thao tác"}
        description={
          pendingAction?.action.confirmDescription?.(pendingAction.record) ??
          `Bạn chắc chắn muốn thực hiện "${pendingAction?.action.label}" cho "${getRecordLabel(pendingAction?.record)}"?`
        }
        confirmLabel={pendingAction?.action.confirmLabel ?? "Xác nhận"}
        loading={submitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void confirmRowAction()}
      />
    </div>
  );
}

function extractFieldErrors(details: unknown) {
  if (!details || typeof details !== "object" || !("fieldErrors" in details)) {
    return {};
  }

  const fieldErrors = (details as { fieldErrors?: Record<string, string[]> }).fieldErrors;

  if (!fieldErrors) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, messages]) => messages?.[0])
      .map(([field, messages]) => [field, messages[0]]),
  );
}

function getRecordLabel(record?: ManagementRecord | null) {
  return String(
    record?.companyName ??
      record?.name ??
      record?.fullName ??
      record?.employeeCode ??
      record?.customerName ??
      record?.orderNo ??
      record?.batchCode ??
      record?.taskCode ??
      record?.paymentNo ??
      record?.settlementNo ??
      record?.code ??
      record?.contractCode ??
      "bản ghi này",
  );
}

function groupDetailFields(config: ModuleConfig) {
  const sectionByField = new Map(config.fields.map((field) => [field.key, field.section]));
  const sectionMap = new Map<
    string,
    Array<{ key: string; label: string; format?: ModuleConfig["detailFields"][number]["format"] }>
  >();

  config.detailFields.forEach((field) => {
    const section = sectionByField.get(field.key) ?? "Thông tin";
    const fields = sectionMap.get(section) ?? [];
    fields.push(field);
    sectionMap.set(section, fields);
  });

  return Array.from(sectionMap.entries()).map(([label, fields]) => ({ label, fields }));
}
