import { z } from "zod";
import { createManagementCrudService } from "@/features/shared/server/management-crud";
import {
  allowancePolicyInputSchema,
  allowancePolicyPatchSchema,
  commissionPolicyInputSchema,
  commissionPolicyPatchSchema,
  insurancePolicyInputSchema,
  insurancePolicyPatchSchema,
  payrollPolicyInputSchema,
  payrollPolicyPatchSchema,
  policyStatusSchema,
  salaryPaymentTypeSchema,
  taxBracketInputSchema,
  taxBracketPatchSchema,
  taxPolicyInputSchema,
  taxPolicyPatchSchema,
  taxabilitySchema,
} from "./policy-validators";

const uuidFilterSchema = z.string().uuid();
const contractTypeFilterSchema = z.enum(["full_time", "part_time", "probation", "contractor", "other"]);

export const payrollPolicyVersionService = createManagementCrudService({
  tableName: "payroll_policy_versions",
  tableAlias: "ppv",
  selectSql: `
    ppv.id, ppv.code, ppv.name, ppv.status,
    ppv.effective_from as "effectiveFrom",
    ppv.effective_to as "effectiveTo",
    ppv.standard_workdays as "standardWorkdays",
    ppv.gross_up_method as "grossUpMethod",
    ppv.notes, ppv.created_at as "createdAt", ppv.updated_at as "updatedAt"
  `,
  fromSql: "from payroll_policy_versions ppv",
  searchColumns: ["ppv.code", "ppv.name", "ppv.notes"],
  sortColumns: { code: "ppv.code", name: "ppv.name", status: "ppv.status", effectiveFrom: "ppv.effective_from", createdAt: "ppv.created_at" },
  defaultSort: "ppv.created_at",
  fieldMap: { code: "code", name: "name", status: "status", effectiveFrom: "effective_from", effectiveTo: "effective_to", standardWorkdays: "standard_workdays", grossUpMethod: "gross_up_method", notes: "notes" },
  filters: { status: { column: "ppv.status", schema: policyStatusSchema } },
  inputSchema: payrollPolicyInputSchema,
  patchSchema: payrollPolicyPatchSchema,
});

export const taxPolicyVersionService = createManagementCrudService({
  tableName: "tax_policy_versions",
  tableAlias: "tpv",
  selectSql: `
    tpv.id, tpv.code, tpv.name, tpv.status,
    tpv.effective_from as "effectiveFrom",
    tpv.effective_to as "effectiveTo",
    tpv.personal_deduction_amount as "personalDeductionAmount",
    tpv.dependent_deduction_amount as "dependentDeductionAmount",
    tpv.tax_method as "taxMethod",
    tpv.notes, tpv.created_at as "createdAt", tpv.updated_at as "updatedAt"
  `,
  fromSql: "from tax_policy_versions tpv",
  searchColumns: ["tpv.code", "tpv.name", "tpv.notes"],
  sortColumns: { code: "tpv.code", name: "tpv.name", status: "tpv.status", effectiveFrom: "tpv.effective_from", createdAt: "tpv.created_at" },
  defaultSort: "tpv.created_at",
  fieldMap: { code: "code", name: "name", status: "status", effectiveFrom: "effective_from", effectiveTo: "effective_to", personalDeductionAmount: "personal_deduction_amount", dependentDeductionAmount: "dependent_deduction_amount", taxMethod: "tax_method", notes: "notes" },
  filters: { status: { column: "tpv.status", schema: policyStatusSchema } },
  inputSchema: taxPolicyInputSchema,
  patchSchema: taxPolicyPatchSchema,
});

export const taxPolicyBracketService = createManagementCrudService({
  tableName: "tax_policy_brackets",
  tableAlias: "tpb",
  deletedAtColumn: null,
  selectSql: `
    tpb.id, tpb.tax_policy_version_id as "taxPolicyVersionId",
    tpv.code as "taxPolicyCode", tpv.name as "taxPolicyName",
    tpb.bracket_order as "bracketOrder",
    tpb.from_amount as "fromAmount",
    tpb.to_amount as "toAmount",
    tpb.tax_rate as "taxRate",
    tpb.quick_deduction_amount as "quickDeductionAmount",
    tpb.created_at as "createdAt"
  `,
  fromSql: "from tax_policy_brackets tpb join tax_policy_versions tpv on tpv.id = tpb.tax_policy_version_id",
  searchColumns: ["tpv.code", "tpv.name"],
  sortColumns: { taxPolicyName: "tpv.name", bracketOrder: "tpb.bracket_order", fromAmount: "tpb.from_amount", taxRate: "tpb.tax_rate", createdAt: "tpb.created_at" },
  defaultSort: "tpb.bracket_order",
  fieldMap: { taxPolicyVersionId: "tax_policy_version_id", bracketOrder: "bracket_order", fromAmount: "from_amount", toAmount: "to_amount", taxRate: "tax_rate", quickDeductionAmount: "quick_deduction_amount" },
  filters: { taxPolicyVersionId: { column: "tpb.tax_policy_version_id", schema: uuidFilterSchema } },
  inputSchema: taxBracketInputSchema,
  patchSchema: taxBracketPatchSchema,
});

export const insurancePolicyVersionService = createManagementCrudService({
  tableName: "insurance_policy_versions",
  tableAlias: "ipv",
  selectSql: `
    ipv.id, ipv.code, ipv.name, ipv.status,
    ipv.effective_from as "effectiveFrom", ipv.effective_to as "effectiveTo",
    ipv.employer_social_rate as "employerSocialRate",
    ipv.employer_health_rate as "employerHealthRate",
    ipv.employer_unemployment_rate as "employerUnemploymentRate",
    ipv.employer_union_rate as "employerUnionRate",
    ipv.employee_social_rate as "employeeSocialRate",
    ipv.employee_health_rate as "employeeHealthRate",
    ipv.employee_unemployment_rate as "employeeUnemploymentRate",
    ipv.min_insurance_base as "minInsuranceBase",
    ipv.max_insurance_base as "maxInsuranceBase",
    ipv.notes, ipv.created_at as "createdAt", ipv.updated_at as "updatedAt"
  `,
  fromSql: "from insurance_policy_versions ipv",
  searchColumns: ["ipv.code", "ipv.name", "ipv.notes"],
  sortColumns: { code: "ipv.code", name: "ipv.name", status: "ipv.status", effectiveFrom: "ipv.effective_from", createdAt: "ipv.created_at" },
  defaultSort: "ipv.created_at",
  fieldMap: {
    code: "code", name: "name", status: "status", effectiveFrom: "effective_from", effectiveTo: "effective_to",
    employerSocialRate: "employer_social_rate", employerHealthRate: "employer_health_rate", employerUnemploymentRate: "employer_unemployment_rate", employerUnionRate: "employer_union_rate",
    employeeSocialRate: "employee_social_rate", employeeHealthRate: "employee_health_rate", employeeUnemploymentRate: "employee_unemployment_rate",
    minInsuranceBase: "min_insurance_base", maxInsuranceBase: "max_insurance_base", notes: "notes",
  },
  filters: { status: { column: "ipv.status", schema: policyStatusSchema } },
  inputSchema: insurancePolicyInputSchema,
  patchSchema: insurancePolicyPatchSchema,
});

export const commissionPolicyService = createManagementCrudService({
  tableName: "commission_policies",
  tableAlias: "cp",
  selectSql: `
    cp.id, cp.code, cp.name, cp.status, cp.commission_type as "commissionType",
    cp.department_id as "departmentId", d.name as "departmentName",
    cp.job_level_id as "jobLevelId", jl.name as "jobLevelName",
    cp.contract_type as "contractType", cp.salary_payment_type as "salaryPaymentType",
    cp.target_revenue_multiplier as "targetRevenueMultiplier",
    cp.min_rate as "minRate", cp.default_rate as "defaultRate", cp.max_rate as "maxRate",
    cp.effective_from as "effectiveFrom", cp.effective_to as "effectiveTo",
    cp.created_at as "createdAt", cp.updated_at as "updatedAt"
  `,
  fromSql: "from commission_policies cp left join departments d on d.id = cp.department_id left join job_levels jl on jl.id = cp.job_level_id",
  searchColumns: ["cp.code", "cp.name", "cp.commission_type", "d.name", "jl.name"],
  sortColumns: { code: "cp.code", name: "cp.name", status: "cp.status", commissionType: "cp.commission_type", defaultRate: "cp.default_rate", effectiveFrom: "cp.effective_from", createdAt: "cp.created_at" },
  defaultSort: "cp.created_at",
  fieldMap: { code: "code", name: "name", status: "status", commissionType: "commission_type", departmentId: "department_id", jobLevelId: "job_level_id", contractType: "contract_type", salaryPaymentType: "salary_payment_type", targetRevenueMultiplier: "target_revenue_multiplier", minRate: "min_rate", defaultRate: "default_rate", maxRate: "max_rate", effectiveFrom: "effective_from", effectiveTo: "effective_to" },
  filters: {
    status: { column: "cp.status", schema: policyStatusSchema },
    departmentId: { column: "cp.department_id", schema: uuidFilterSchema },
    jobLevelId: { column: "cp.job_level_id", schema: uuidFilterSchema },
    contractType: { column: "cp.contract_type", schema: contractTypeFilterSchema },
    salaryPaymentType: { column: "cp.salary_payment_type", schema: salaryPaymentTypeSchema },
  },
  inputSchema: commissionPolicyInputSchema,
  patchSchema: commissionPolicyPatchSchema,
});

export const allowancePolicyService = createManagementCrudService({
  tableName: "allowance_policies",
  tableAlias: "ap",
  selectSql: `
    ap.id, ap.code, ap.name, ap.status,
    ap.income_type_id as "incomeTypeId", it.name as "incomeTypeName",
    ap.department_id as "departmentId", d.name as "departmentName",
    ap.job_level_id as "jobLevelId", jl.name as "jobLevelName",
    ap.contract_type as "contractType", ap.work_area as "workArea",
    ap.amount, ap.taxability,
    ap.effective_from as "effectiveFrom", ap.effective_to as "effectiveTo",
    ap.created_at as "createdAt", ap.updated_at as "updatedAt"
  `,
  fromSql: "from allowance_policies ap left join income_types it on it.id = ap.income_type_id left join departments d on d.id = ap.department_id left join job_levels jl on jl.id = ap.job_level_id",
  searchColumns: ["ap.code", "ap.name", "ap.work_area", "it.name", "d.name", "jl.name"],
  sortColumns: { code: "ap.code", name: "ap.name", status: "ap.status", amount: "ap.amount", taxability: "ap.taxability", effectiveFrom: "ap.effective_from", createdAt: "ap.created_at" },
  defaultSort: "ap.created_at",
  fieldMap: { code: "code", name: "name", status: "status", incomeTypeId: "income_type_id", departmentId: "department_id", jobLevelId: "job_level_id", contractType: "contract_type", workArea: "work_area", amount: "amount", taxability: "taxability", effectiveFrom: "effective_from", effectiveTo: "effective_to" },
  filters: {
    status: { column: "ap.status", schema: policyStatusSchema },
    incomeTypeId: { column: "ap.income_type_id", schema: uuidFilterSchema },
    departmentId: { column: "ap.department_id", schema: uuidFilterSchema },
    jobLevelId: { column: "ap.job_level_id", schema: uuidFilterSchema },
    taxability: { column: "ap.taxability", schema: taxabilitySchema },
  },
  inputSchema: allowancePolicyInputSchema,
  patchSchema: allowancePolicyPatchSchema,
});
