"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Building2,
  Calculator,
  ChartColumn,
  ClipboardCheck,
  CreditCard,
  FileText,
  Landmark,
  LogOut,
  Lock,
  Network,
  Package,
  PanelLeft,
  Receipt,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  canCreateModule,
  canDeleteModule,
  canReadModule,
  canUpdateModule,
} from "@/features/auth/permissions";
import type { AuthSession } from "@/features/auth/types";
import { crmModules, defaultModule as defaultCrmModule } from "@/features/crm/config";
import { analyticsModules } from "@/features/analytics/config";
import { financeModules } from "@/features/finance/config";
import { hrModules } from "@/features/hr/config";
import { payrollModules } from "@/features/payroll/config";
import { revenueModules } from "@/features/revenue/config";
import type {
  ApiItemResponse,
  LookupCollections,
  ModuleConfig,
} from "@/features/shared/components/management/types";
import { ModuleScreen } from "@/features/shared/components/management/module-screen";

const allModules: ModuleConfig[] = [...crmModules, ...hrModules, ...revenueModules, ...financeModules, ...payrollModules, ...analyticsModules];

const moduleIcons = {
  customers: Building2,
  services: Package,
  contracts: FileText,
  "contract-services": FileText,
  "customer-contacts": Users,
  "customer-assignments": Users,
  "legal-entities": Building2,
  partners: Network,
  departments: Network,
  "job-levels": Badge,
  employees: Users,
  "employee-dependents": Users,
  "payroll-settings": Badge,
  "leave-types": FileText,
  "leave-requests": FileText,
  "leave-balances": FileText,
  "company-holidays": FileText,
  "income-types": Package,
  "deduction-types": Package,
  "policy-overrides": Badge,
  "recurring-batches": Receipt,
  "one-time-tasks": ClipboardCheck,
  orders: Receipt,
  payments: CreditCard,
  "debt-entries": Landmark,
  "debt-summary": Landmark,
  "debt-closings": Lock,
  "partner-settlements": Network,
  "partner-settlement-payments": CreditCard,
  "payroll-periods": Calculator,
  "payroll-inputs": FileText,
  "payroll-lines": Receipt,
  "payroll-policy-versions": Calculator,
  "tax-policy-versions": FileText,
  "tax-policy-brackets": FileText,
  "insurance-policy-versions": Badge,
  "commission-policies": CreditCard,
  "allowance-policies": Package,
  "kpi-snapshots": ChartColumn,
};

const navigationGroups = [
  {
    label: "CRM",
    items: [
      { label: "Hồ sơ khách hàng", moduleKeys: ["customers", "customer-contacts", "customer-assignments"], iconKey: "customers" },
      { label: "Hợp đồng & dịch vụ", moduleKeys: ["contracts", "contract-services", "services"], iconKey: "contracts" },
      { label: "Thiết lập CRM", moduleKeys: ["legal-entities", "partners"], iconKey: "legal-entities" },
    ],
  },
  {
    label: "Nhân sự",
    items: [
      { label: "Nhân viên", moduleKeys: ["employees", "employee-dependents", "payroll-settings"], iconKey: "employees" },
      { label: "Tổ chức", moduleKeys: ["departments", "job-levels"], iconKey: "departments" },
      { label: "Nghỉ phép & lịch", moduleKeys: ["leave-requests", "leave-balances", "leave-types", "company-holidays"], iconKey: "leave-requests" },
      { label: "Khoản lương HR", moduleKeys: ["income-types", "deduction-types", "policy-overrides"], iconKey: "income-types" },
    ],
  },
  {
    label: "Doanh thu",
    items: [
      { label: "Doanh thu", moduleKeys: ["orders", "one-time-tasks", "recurring-batches"], iconKey: "orders" },
    ],
  },
  {
    label: "Tài chính",
    items: [
      { label: "Thu tiền & công nợ", moduleKeys: ["payments", "debt-summary", "debt-entries", "debt-closings"], iconKey: "payments" },
      { label: "Đối soát đối tác", moduleKeys: ["partner-settlements", "partner-settlement-payments"], iconKey: "partner-settlements" },
    ],
  },
  {
    label: "Bảng lương",
    items: [
      { label: "Chạy bảng lương", moduleKeys: ["payroll-periods", "payroll-inputs", "payroll-lines"], iconKey: "payroll-periods" },
      {
        label: "Chính sách lương",
        moduleKeys: [
          "payroll-policy-versions",
          "tax-policy-versions",
          "tax-policy-brackets",
          "insurance-policy-versions",
          "commission-policies",
          "allowance-policies",
        ],
        iconKey: "payroll-policy-versions",
      },
    ],
  },
  {
    label: "KPI",
    items: [
      { label: "KPI snapshots", moduleKeys: ["kpi-snapshots"], iconKey: "kpi-snapshots" },
    ],
  },
];

const modulePaths: Record<string, string> = {
  customers: "/crm/customers",
  services: "/crm/services",
  contracts: "/crm/contracts",
  "contract-services": "/crm/contract-services",
  "customer-contacts": "/crm/customer-contacts",
  "customer-assignments": "/crm/customer-assignments",
  "legal-entities": "/crm/legal-entities",
  partners: "/crm/partners",
  departments: "/hr/departments",
  "job-levels": "/hr/job-levels",
  employees: "/hr/employees",
  "employee-dependents": "/hr/employee-dependents",
  "payroll-settings": "/hr/payroll-settings",
  "leave-types": "/hr/leave-types",
  "leave-requests": "/hr/leave-requests",
  "leave-balances": "/hr/leave-balances",
  "company-holidays": "/hr/company-holidays",
  "income-types": "/hr/income-types",
  "deduction-types": "/hr/deduction-types",
  "policy-overrides": "/hr/policy-overrides",
  "recurring-batches": "/revenue/recurring-batches",
  "one-time-tasks": "/revenue/one-time-tasks",
  orders: "/revenue/orders",
  payments: "/finance/payments",
  "debt-entries": "/finance/debt-entries",
  "debt-summary": "/finance/debt-summary",
  "debt-closings": "/finance/debt-closings",
  "partner-settlements": "/finance/partner-settlements",
  "partner-settlement-payments": "/finance/partner-settlement-payments",
  "payroll-periods": "/payroll/payroll-periods",
  "payroll-inputs": "/payroll/payroll-inputs",
  "payroll-lines": "/payroll/payroll-lines",
  "payroll-policy-versions": "/payroll/payroll-policy-versions",
  "tax-policy-versions": "/payroll/tax-policy-versions",
  "tax-policy-brackets": "/payroll/tax-policy-brackets",
  "insurance-policy-versions": "/payroll/insurance-policy-versions",
  "commission-policies": "/payroll/commission-policies",
  "allowance-policies": "/payroll/allowance-policies",
  "kpi-snapshots": "/kpi/kpi-snapshots",
};

type AdminAppProps = {
  activeModuleKey: string;
};

type VisibleNavigationItem = {
  id: string;
  label: string;
  iconKey: keyof typeof moduleIcons;
  modules: ModuleConfig[];
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
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lookups, setLookups] = useState<LookupCollections | null>(null);
  const [lookupsError, setLookupsError] = useState<string | null>(null);

  const activeModule = useMemo(() => {
    return allModules.find((module) => module.key === activeModuleKey) ?? defaultCrmModule;
  }, [activeModuleKey]);

  const visibleNavigationGroups = useMemo(() => {
    if (!auth) {
      return [];
    }

    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items
          .map<VisibleNavigationItem>((item) => ({
            id: item.moduleKeys.join(":"),
            label: item.label,
            iconKey: item.iconKey as keyof typeof moduleIcons,
            modules: item.moduleKeys
              .map((moduleKey) => allModules.find((module) => module.key === moduleKey))
              .filter((module): module is ModuleConfig => module !== undefined)
              .filter((module) => canReadModule(auth, module.key)),
          }))
          .filter((item) => item.modules.length > 0),
      }))
      .filter((group) => group.items.length > 0);
  }, [auth]);

  const activeNavigationItem = useMemo(() => {
    return visibleNavigationGroups
      .flatMap((group) => group.items)
      .find((item) => item.modules.some((module) => module.key === activeModule.key));
  }, [activeModule.key, visibleNavigationGroups]);

  const effectiveActiveModule = useMemo<ModuleConfig>(() => {
    if (!auth) {
      return activeModule;
    }

    const canCreate = activeModule.canCreate !== false && canCreateModule(auth, activeModule.key);
    const canEdit = activeModule.canEdit !== false && canUpdateModule(auth, activeModule.key);
    const canDelete = activeModule.canDelete !== false && canDeleteModule(auth, activeModule.key);
    const rowActions = canUpdateModule(auth, activeModule.key) ? activeModule.rowActions : [];

    return {
      ...activeModule,
      rowActions,
      canCreate,
      canEdit,
      canDelete,
    };
  }, [activeModule, auth]);

  const fetchAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const response = await fetch("/api/auth/me");
      const payload = (await response.json()) as ApiItemResponse<AuthSession>;

      if (!response.ok || !payload.success) {
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      setAuth(payload.data);
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  const fetchLookups = useCallback(async () => {
    try {
      const responses = await Promise.allSettled([
        fetchLookup("/api/crm/lookups"),
        fetchLookup("/api/hr/lookups"),
        fetchLookup("/api/revenue/lookups"),
        fetchLookup("/api/finance/lookups"),
        fetchLookup("/api/payroll/lookups"),
      ]);
      const mergedLookups = responses.reduce<LookupCollections>((merged, response) => {
        if (response.status === "fulfilled") {
          return { ...merged, ...response.value };
        }

        return merged;
      }, {});

      setLookups(mergedLookups);
      setLookupsError(null);
    } catch (error) {
      setLookupsError(error instanceof Error ? error.message : "Không tải được dữ liệu danh mục");
    }
  }, []);

  useEffect(() => {
    // Auth state is synchronized from the server-side session endpoint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAuth();
  }, [fetchAuth]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    // Admin forms need lookup data for select fields.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLookups();
  }, [auth, fetchLookups]);

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-950">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-white">
              <PanelLeft className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-950">3M Admin</p>
              <p className="text-xs text-zinc-500">Production workspace</p>
            </div>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
          {visibleNavigationGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = moduleIcons[item.iconKey];
                  const active = item.modules.some((module) => module.key === activeModule.key);
                  const targetModule = item.modules[0];

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => changeModule(targetModule.key)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium ${
                        active
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                      }`}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-zinc-200 px-5 py-3">
          <p className="truncate text-sm font-medium text-zinc-900">{auth?.displayName}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {auth?.roles.join(", ") || "Chưa có vai trò"} · Scope {auth?.scope}
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 inline-flex h-8 items-center gap-2 rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <LogOut className="size-3.5" />
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
          <p className="text-sm font-semibold">3M Admin</p>
          <select
            value={activeNavigationItem?.modules[0]?.key ?? activeModule.key}
            onChange={(event) => changeModule(event.target.value)}
            className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm"
          >
            {visibleNavigationGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.modules[0].key}>
                    {item.label}
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
        {activeNavigationItem && activeNavigationItem.modules.length > 1 ? (
          <div className="border-b border-zinc-200 bg-white px-4 pt-3">
            <div className="flex gap-1 overflow-x-auto">
              {activeNavigationItem.modules.map((module) => {
                const active = module.key === activeModule.key;

                return (
                  <button
                    key={module.key}
                    type="button"
                    onClick={() => changeModule(module.key)}
                    className={`whitespace-nowrap rounded-t-md border border-b-0 px-3 py-2 text-sm font-medium ${
                      active
                        ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                        : "border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    {module.title}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <ModuleScreen
          key={effectiveActiveModule.key}
          config={effectiveActiveModule}
          lookups={lookups}
          onRefreshLookups={() => void fetchLookups()}
        />
      </main>
    </div>
  );
}

async function fetchLookup(endpoint: string) {
  const response = await fetch(endpoint);

  if (response.status === 401 || response.status === 403) {
    return {};
  }

  const payload = (await response.json()) as ApiItemResponse<LookupCollections>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? "Không tải được dữ liệu danh mục");
  }

  return payload.data;
}
