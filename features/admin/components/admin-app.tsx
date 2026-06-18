"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Building2,
  FileText,
  Network,
  Package,
  PanelLeft,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { crmModules, defaultModule as defaultCrmModule } from "@/features/crm/config";
import { hrModules } from "@/features/hr/config";
import type {
  ApiItemResponse,
  LookupCollections,
  ModuleConfig,
} from "@/features/shared/components/management/types";
import { ModuleScreen } from "@/features/shared/components/management/module-screen";

const moduleGroups = [
  {
    label: "CRM",
    modules: crmModules,
  },
  {
    label: "Nhân sự",
    modules: hrModules,
  },
];

const allModules: ModuleConfig[] = [...crmModules, ...hrModules];

const moduleIcons = {
  customers: Building2,
  services: Package,
  contracts: FileText,
  departments: Network,
  "job-levels": Badge,
  employees: Users,
};

const modulePaths: Record<string, string> = {
  customers: "/crm/customers",
  services: "/crm/services",
  contracts: "/crm/contracts",
  departments: "/hr/departments",
  "job-levels": "/hr/job-levels",
  employees: "/hr/employees",
};

type AdminAppProps = {
  activeModuleKey: string;
};

export function AdminApp({ activeModuleKey }: AdminAppProps) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Đang tải hệ thống...</div>}>
      <AdminAppInner activeModuleKey={activeModuleKey} />
    </Suspense>
  );
}

function AdminAppInner({ activeModuleKey }: AdminAppProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lookups, setLookups] = useState<LookupCollections | null>(null);
  const [lookupsError, setLookupsError] = useState<string | null>(null);

  const activeModule = useMemo(() => {
    return allModules.find((module) => module.key === activeModuleKey) ?? defaultCrmModule;
  }, [activeModuleKey]);

  const fetchLookups = useCallback(async () => {
    try {
      const [crmResponse, hrResponse] = await Promise.all([
        fetch("/api/crm/lookups"),
        fetch("/api/hr/lookups"),
      ]);
      const [crmPayload, hrPayload] = (await Promise.all([
        crmResponse.json(),
        hrResponse.json(),
      ])) as [ApiItemResponse<LookupCollections>, ApiItemResponse<LookupCollections>];

      if (!crmResponse.ok || !crmPayload.success) {
        throw new Error(crmPayload.error?.message ?? "Không tải được dữ liệu danh mục CRM");
      }

      if (!hrResponse.ok || !hrPayload.success) {
        throw new Error(hrPayload.error?.message ?? "Không tải được dữ liệu danh mục nhân sự");
      }

      setLookups({
        ...crmPayload.data,
        ...hrPayload.data,
      });
      setLookupsError(null);
    } catch (error) {
      setLookupsError(error instanceof Error ? error.message : "Không tải được dữ liệu danh mục");
    }
  }, []);

  useEffect(() => {
    // Admin forms need lookup data for select fields.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLookups();
  }, [fetchLookups]);

  function changeModule(moduleKey: string) {
    const moduleConfig = allModules.find((module) => module.key === moduleKey) ?? defaultCrmModule;
    const path = modulePaths[moduleConfig.key] ?? modulePaths[defaultCrmModule.key];
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", searchParams.get("pageSize") ?? "10");
    params.set("sortBy", moduleConfig.defaultSortBy);
    params.set("sortOrder", "asc");
    router.replace(`${path}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-950">
      <aside className="hidden w-72 shrink-0 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-white">
              <PanelLeft className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-950">3M Admin</p>
              <p className="text-xs text-zinc-500">CRM & Nhân sự nền</p>
            </div>
          </div>
        </div>
        <nav className="space-y-5 p-3">
          {moduleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.modules.map((module) => {
                  const Icon = moduleIcons[module.key as keyof typeof moduleIcons];
                  const active = activeModule.key === module.key;

                  return (
                    <button
                      key={module.key}
                      type="button"
                      onClick={() => changeModule(module.key)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium ${
                        active
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                      }`}
                    >
                      <Icon className="size-4" />
                      {module.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
          <p className="text-sm font-semibold">3M Admin</p>
          <select
            value={activeModule.key}
            onChange={(event) => changeModule(event.target.value)}
            className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm"
          >
            {moduleGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.modules.map((module) => (
                  <option key={module.key} value={module.key}>
                    {module.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {lookupsError ? (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-800">
            {lookupsError}
          </div>
        ) : null}
        <ModuleScreen
          key={activeModule.key}
          config={activeModule}
          lookups={lookups}
          onRefreshLookups={() => void fetchLookups()}
        />
      </main>
    </div>
  );
}
