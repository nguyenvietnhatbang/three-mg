"use client";

import { useMemo, useState } from "react";
import type { FieldConfig, LookupCollections, ManagementRecord } from "./types";

type RecordFormProps = {
  fields: FieldConfig[];
  lookups: LookupCollections | null;
  initialValue?: ManagementRecord | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (value: ManagementRecord) => Promise<void>;
};

export function RecordForm({
  fields,
  lookups,
  initialValue,
  submitting,
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
          <h3 className="text-sm font-semibold text-zinc-950">{section}</h3>
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
                    onChange={(value) => updateValue(field.key, value)}
                  />
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
  onChange,
}: {
  field: FieldConfig;
  value: ManagementRecord[string];
  lookups: LookupCollections | null;
  onChange: (value: string | number | boolean | null) => void;
}) {
  const baseClass =
    "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        placeholder={field.placeholder}
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
      >
        <option value="">Chọn {field.label.toLowerCase()}</option>
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
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 rounded border-zinc-300 text-zinc-950"
      />
    );
  }

  return (
    <input
      type={field.type}
      value={String(value ?? "")}
      placeholder={field.placeholder}
      required={field.required}
      onChange={(event) =>
        onChange(field.type === "number" ? Number(event.target.value || 0) : event.target.value)
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
