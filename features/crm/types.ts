import type {
  ApiItemResponse,
  ApiListResponse,
  LookupCollections,
  LookupOption,
  ManagementRecord,
  ModuleConfig,
  Pagination,
} from "@/features/shared/components/management/types";

export type ModuleKey =
  | "customers"
  | "services"
  | "contracts"
  | "contract-services"
  | "customer-contacts"
  | "customer-assignments"
  | "legal-entities"
  | "partners";

export type CrmRecord = ManagementRecord;
export type { ApiItemResponse, ApiListResponse, LookupOption, ModuleConfig, Pagination };

export type CrmLookups = LookupCollections & {
  customers: LookupOption[];
  employees: LookupOption[];
  legalEntities: LookupOption[];
  partners: LookupOption[];
  services: LookupOption[];
  contracts: LookupOption[];
};
