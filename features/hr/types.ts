import type {
  LookupCollections,
  LookupOption,
  ModuleConfig,
} from "@/features/shared/components/management/types";

export type HrModuleKey =
  | "departments"
  | "job-levels"
  | "employees"
  | "employee-dependents"
  | "payroll-settings"
  | "leave-types"
  | "leave-requests"
  | "leave-balances"
  | "company-holidays"
  | "income-types"
  | "deduction-types"
  | "policy-overrides";

export type HrLookups = LookupCollections & {
  departments: LookupOption[];
  jobLevels: LookupOption[];
  employees: LookupOption[];
  leaveTypes: LookupOption[];
  incomeTypes: LookupOption[];
  deductionTypes: LookupOption[];
};

export type HrModuleConfig = ModuleConfig<HrModuleKey>;
