export type AuthScope = "all" | "team" | "self";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  status: "active" | "inactive" | "locked";
  employeeId: string | null;
  employeeName: string | null;
  departmentId: string | null;
  managedDepartmentIds: string[];
  roles: string[];
  permissions: string[];
  scope: AuthScope;
};

export type AuthSession = AuthUser & {
  expiresAt: string;
};

export type RequiredPermission = {
  module: string;
  action: "view" | "manage" | "self" | "team";
};
