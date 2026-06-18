import type { ReactNode } from "react";

export type ManagementRecord = Record<string, string | number | boolean | null | undefined>;

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  pagination: Pagination;
  error?: { message: string };
};

export type ApiItemResponse<T> = {
  success: boolean;
  data: T;
  error?: { message: string; details?: unknown };
};

export type LookupOption = {
  id: string;
  code: string;
  name: string;
};

export type LookupCollections = Record<string, LookupOption[]>;

export type ColumnConfig = {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  format?: "text" | "money" | "date" | "status" | "boolean";
};

export type FilterConfig = {
  key: string;
  label: string;
  type: "select" | "date";
  options?: Array<{ label: string; value: string }>;
  lookupKey?: string;
  placeholder?: string;
};

export type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "date" | "checkbox";
  required?: boolean;
  section: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  lookupKey?: string;
};

export type MetricConfig = {
  label: string;
  getValue: (records: ManagementRecord[], pagination: Pagination | null) => ReactNode;
};

export type RowActionConfig = {
  key: string;
  label: string;
  icon?: "send" | "check" | "lock" | "x" | "play" | "file" | "ban" | "dollar";
  endpoint: (record: ManagementRecord) => string;
  method?: "POST" | "PATCH";
  variant?: "default" | "success" | "warning" | "danger";
  confirmTitle?: string;
  confirmLabel?: string;
  confirmDescription?: (record: ManagementRecord) => string;
  hidden?: (record: ManagementRecord) => boolean;
};

export type ModuleConfig<TKey extends string = string> = {
  key: TKey;
  title: string;
  description: string;
  primaryAction: string;
  apiPath: string;
  searchPlaceholder: string;
  defaultSortBy: string;
  columns: ColumnConfig[];
  filters: FilterConfig[];
  fields: FieldConfig[];
  detailFields: Array<{ key: string; label: string; format?: ColumnConfig["format"] }>;
  metrics: MetricConfig[];
  rowActions?: RowActionConfig[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};
