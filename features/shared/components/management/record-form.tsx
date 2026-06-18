"use client";

import { useMemo, useState } from "react";
import type { FieldConfig, LookupCollections, ManagementRecord } from "./types";

type RecordFormProps = {
  fields: FieldConfig[];
  lookups: LookupCollections | null;
  initialValue?: ManagementRecord | null;
  submitting?: boolean;
  fieldErrors?: Record<string, string>;
  onCancel: () => void;
  onSubmit: (value: ManagementRecord) => Promise<void>;
};

export function RecordForm({
  fields,
  lookups,
  initialValue,
  submitting,
  fieldErrors,
  onCancel,
  onSubmit,
}: RecordFormProps) {
  const [formValue, setFormValue] = useState<ManagementRecord>(() => buildInitialValue(fields, initialValue));
  const sections = useMemo(
    () => Array.from(new Set(fields.map((field) => field.section))),
    [fields],
  );

  function updateValue(key: string, value: string | number | boolean | null) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      id="management-record-form"
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(formValue);
      }}
    >
      {sections.map((section) => (
        <section key={section} className="space-y-3">
          <div className="border-b border-zinc-200 pb-2">
            <h3 className="text-sm font-semibold text-zinc-950">{section}</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {fields
              .filter((field) => field.section === section)
              .map((field) => (
                <label
                  key={field.key}
                  className={field.type === "textarea" ? "md:col-span-2" : ""}
                >
                  <span className="mb-1 block text-sm font-medium text-zinc-700">
                    {field.label}
                    {field.required ? <span className="text-red-600"> *</span> : null}
                  </span>
                  <FieldInput
                    field={field}
                    value={formValue[field.key]}
                    lookups={lookups}
                    disabled={submitting}
                    invalid={Boolean(fieldErrors?.[field.key])}
                    onChange={(value) => updateValue(field.key, value)}
                  />
                  {fieldErrors?.[field.key] ? (
                    <span className="mt-1 block text-xs text-red-600">
                      {fieldErrors[field.key]}
                    </span>
                  ) : null}
                </label>
              ))}
          </div>
        </section>
      ))}
      <div className="hidden">
        <button type="submit" disabled={submitting}>
          Submit
        </button>
      </div>
      <div className="sr-only">
        <button type="button" onClick={onCancel}>
          Hủy
        </button>
      </div>
    </form>
  );
}

function FieldInput({
  field,
  value,
  lookups,
  disabled,
  invalid,
  onChange,
}: {
  field: FieldConfig;
  value: ManagementRecord[string];
  lookups: LookupCollections | null;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string | number | boolean | null) => void;
}) {
  const baseClass =
    `h-10 w-full rounded-md border bg-white px-3 text-sm text-zinc-900 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 ${
      invalid
        ? "border-red-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/10"
        : "border-zinc-300 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
    }`;

  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${baseClass} min-h-24 py-2`}
      />
    );
  }

  if (field.type === "select") {
    const options = field.lookupKey
      ? lookups?.[field.lookupKey]?.map((option) => ({
          label: `${option.name}${option.code ? ` (${option.code})` : ""}`,
          value: option.id,
        })) ?? []
      : field.options ?? [];

    return (
      <select
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value || null)}
        className={baseClass}
        required={field.required}
        disabled={disabled || (Boolean(field.lookupKey) && !lookups)}
      >
        <option value="">
          {field.lookupKey && !lookups ? "Đang tải danh mục..." : `Chọn ${field.label.toLowerCase()}`}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 rounded border-zinc-300 text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
      />
    );
  }

  return (
    <input
      type={field.type}
      value={String(value ?? "")}
      placeholder={field.placeholder}
      required={field.required}
      disabled={disabled}
      onChange={(event) =>
        onChange(field.type === "number" ? numberInputValue(event.target.value) : event.target.value)
      }
      className={baseClass}
    />
  );
}

function buildInitialValue(fields: FieldConfig[], initialValue?: ManagementRecord | null) {
  return fields.reduce<ManagementRecord>((value, field) => {
    if (initialValue && initialValue[field.key] !== undefined) {
      value[field.key] = normalizeInitialValue(initialValue[field.key]);
      return value;
    }

    if (field.type === "checkbox") {
      value[field.key] = true;
      return value;
    }

    if (field.type === "number") {
      value[field.key] = 0;
      return value;
    }

    value[field.key] = "";
    return value;
  }, {});
}

function normalizeInitialValue(value: ManagementRecord[string]) {
  if (typeof value === "string" && value.includes("T") && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  return value ?? "";
}

function numberInputValue(value: string) {
  if (value === "") {
    return null;
  }

  return Number(value);
}
