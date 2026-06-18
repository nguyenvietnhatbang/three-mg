import type {
  LookupCollections,
  LookupOption,
  ModuleConfig,
} from "@/features/shared/components/management/types";

export type HrModuleKey = "departments" | "job-levels" | "employees";

export type HrLookups = LookupCollections & {
  departments: LookupOption[];
  jobLevels: LookupOption[];
  employees: LookupOption[];
};

export type HrModuleConfig = ModuleConfig<HrModuleKey>;
