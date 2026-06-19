import type { AuthSession, RequiredPermission } from "./types";

const adminRoles = new Set(["admin"]);
const managerRoles = new Set(["manager"]);
const teamRoles = new Set(["department_head"]);

const modulePermissionMap: Record<string, RequiredPermission["module"]> = {
  customers: "customers",
  services: "services",
  contracts: "contracts",
  "contract-services": "contracts",
  "customer-contacts": "customers",
  "customer-assignments": "customers",
  "legal-entities": "settings",
  partners: "settings",
  departments: "employees",
  "job-levels": "employees",
  employees: "employees",
  "employee-dependents": "employees",
  "payroll-settings": "payroll",
  "leave-types": "leave",
  "leave-requests": "leave",
  "leave-balances": "leave",
  "company-holidays": "leave",
  "income-types": "payroll",
  "deduction-types": "payroll",
  "policy-overrides": "payroll",
  "recurring-batches": "orders",
  "one-time-tasks": "orders",
  orders: "orders",
  payments: "debts",
  "debt-entries": "debts",
  "debt-summary": "debts",
  "debt-closings": "debts",
  "partner-settlements": "debts",
  "partner-settlement-payments": "debts",
  "payroll-periods": "payroll",
  "payroll-inputs": "payroll",
  "payroll-lines": "payroll",
  "payroll-policy-versions": "payroll",
  "tax-policy-versions": "payroll",
  "tax-policy-brackets": "payroll",
  "insurance-policy-versions": "payroll",
  "commission-policies": "payroll",
  "allowance-policies": "payroll",
  "kpi-snapshots": "reports",
  dashboard: "reports",
};

const apiResourceModuleMap: Record<string, RequiredPermission["module"]> = {
  customers: "customers",
  services: "services",
  contracts: "contracts",
  "contract-services": "contracts",
  "customer-contacts": "customers",
  "customer-assignments": "customers",
  "legal-entities": "settings",
  partners: "settings",
  departments: "employees",
  "job-levels": "employees",
  employees: "employees",
  "employee-dependents": "employees",
  "payroll-settings": "payroll",
  "leave-types": "leave",
  "leave-requests": "leave",
  "leave-balances": "leave",
  "company-holidays": "leave",
  "income-types": "payroll",
  "deduction-types": "payroll",
  "policy-overrides": "payroll",
  "recurring-revenue-batches": "orders",
  "one-time-tasks": "orders",
  orders: "orders",
  payments: "debts",
  "debt-entries": "debts",
  "debt-summary": "debts",
  "debt-closings": "debts",
  "partner-settlements": "debts",
  "partner-settlement-payments": "debts",
  "payroll-periods": "payroll",
  "payroll-inputs": "payroll",
  "payroll-lines": "payroll",
  "payroll-policy-versions": "payroll",
  "tax-policy-versions": "payroll",
  "tax-policy-brackets": "payroll",
  "insurance-policy-versions": "payroll",
  "commission-policies": "payroll",
  "allowance-policies": "payroll",
  "kpi-snapshots": "reports",
  dashboard: "reports",
  crm: "customers",
  hr: "employees",
  revenue: "orders",
  finance: "debts",
  payroll: "payroll",
};

export function getPermissionForModuleKey(moduleKey: string): RequiredPermission {
  return {
    module: modulePermissionMap[moduleKey] ?? "settings",
    action: "view",
  };
}

export function getRequiredPermissionForPath(pathname: string, method = "GET") {
  if (pathname === "/" || pathname === "/dashboard") {
    return { module: "reports", action: "view" } satisfies RequiredPermission;
  }

  if (pathname.startsWith("/api/")) {
    const resource = pathname.split("/")[2] ?? "";
    const permissionModule = apiResourceModuleMap[resource];
    if (!permissionModule) {
      return null;
    }

    return {
      module: permissionModule,
      action: getActionForMethod(method, pathname),
    } satisfies RequiredPermission;
  }

  const [, group, moduleKey] = pathname.split("/");
  if (group === "dashboard" || group === "kpi") {
    return { module: "reports", action: "view" } satisfies RequiredPermission;
  }

  if (!moduleKey) {
    return null;
  }

  return getPermissionForModuleKey(moduleKey);
}

export function canAccess(
  session: Pick<AuthSession, "roles" | "permissions"> | null | undefined,
  module: string,
  action: RequiredPermission["action"],
) {
  if (!session) {
    return false;
  }

  if (session.roles.some((role) => adminRoles.has(role))) {
    return true;
  }

  const permissions = new Set(session.permissions);

  if (permissions.has(`${module}.${action}`) || permissions.has(`${module}:${action}`)) {
    return true;
  }

  if (action === "view") {
    return (
      permissions.has(`${module}.view`) ||
      permissions.has(`${module}.manage`) ||
      permissions.has(`${module}.team`)
    );
  }

  if (module === "leave") {
    return permissions.has("leave.team") || permissions.has("leave.manage");
  }

  if (action === "manage") {
    return permissions.has(`${module}.manage`);
  }

  return permissions.has(`${module}.${action}`);
}

export function canReadModule(session: AuthSession | null | undefined, moduleKey: string) {
  const permission = getPermissionForModuleKey(moduleKey);

  return canAccess(session, permission.module, permission.action);
}

export function canCreateModule(session: AuthSession | null | undefined, moduleKey: string) {
  const permission = getPermissionForModuleKey(moduleKey);

  return canAccess(session, permission.module, "manage");
}

export function canUpdateModule(session: AuthSession | null | undefined, moduleKey: string) {
  return canCreateModule(session, moduleKey);
}

export function canDeleteModule(session: AuthSession | null | undefined, moduleKey: string) {
  return canCreateModule(session, moduleKey);
}

export function canAccessEmployeeScope(
  session: Pick<AuthSession, "scope" | "employeeId" | "departmentId" | "managedDepartmentIds">,
  targetEmployeeId: string | null | undefined,
  targetDepartmentId: string | null | undefined,
) {
  if (session.scope === "all") {
    return true;
  }

  if (session.scope === "self") {
    return Boolean(targetEmployeeId && session.employeeId === targetEmployeeId);
  }

  if (targetDepartmentId && session.managedDepartmentIds.includes(targetDepartmentId)) {
    return true;
  }

  return Boolean(targetEmployeeId && session.employeeId === targetEmployeeId);
}

export function deriveScope(roles: string[]) {
  if (roles.some((role) => adminRoles.has(role) || managerRoles.has(role))) {
    return "all";
  }

  if (roles.some((role) => teamRoles.has(role))) {
    return "team";
  }

  return "self";
}

function getActionForMethod(method: string, pathname: string): RequiredPermission["action"] {
  if (method === "GET") {
    return "view";
  }

  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments.at(-1);
  if (["approve", "reject", "submit", "complete", "cancel", "lock", "generate", "issue", "write-off"].includes(lastSegment ?? "")) {
    return "manage";
  }

  return "manage";
}
