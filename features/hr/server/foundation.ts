import { z } from "zod";
import { createManagementCrudService } from "@/features/shared/server/management-crud";
import {
  companyHolidayInputSchema,
  companyHolidayPatchSchema,
  deductionTypeInputSchema,
  deductionTypePatchSchema,
  employeeDependentInputSchema,
  employeeDependentPatchSchema,
  employeePayrollSettingInputSchema,
  employeePayrollSettingPatchSchema,
  employeePolicyOverrideInputSchema,
  employeePolicyOverridePatchSchema,
  incomeTypeInputSchema,
  incomeTypePatchSchema,
  leaveRequestInputSchema,
  leaveRequestPatchSchema,
  leaveRequestStatusSchema,
  leaveBalanceInputSchema,
  leaveBalancePatchSchema,
  leaveTypeInputSchema,
  leaveTypePatchSchema,
  salaryPaymentTypeSchema,
  taxabilitySchema,
} from "./validators";

const booleanFilterSchema = z.enum(["true", "false"]).transform((value) => value === "true");
const uuidFilterSchema = z.string().uuid();

export const employeeDependentService = createManagementCrudService({
  tableName: "employee_dependents",
  tableAlias: "ed",
  selectSql: `
    ed.id,
    ed.employee_id as "employeeId",
    e.employee_code as "employeeCode",
    e.full_name as "employeeName",
    ed.full_name as "fullName",
    ed.relationship,
    ed.tax_dependent_code as "taxDependentCode",
    ed.effective_from as "effectiveFrom",
    ed.effective_to as "effectiveTo",
    ed.created_at as "createdAt",
    ed.updated_at as "updatedAt"
  `,
  fromSql: `
    from employee_dependents ed
    join employees e on e.id = ed.employee_id
  `,
  searchColumns: ["e.employee_code", "e.full_name", "ed.full_name", "ed.relationship", "ed.tax_dependent_code"],
  sortColumns: {
    employeeName: "e.full_name",
    fullName: "ed.full_name",
    relationship: "ed.relationship",
    effectiveFrom: "ed.effective_from",
    createdAt: "ed.created_at",
  },
  defaultSort: "ed.created_at",
  fieldMap: {
    employeeId: "employee_id",
    fullName: "full_name",
    relationship: "relationship",
    taxDependentCode: "tax_dependent_code",
    effectiveFrom: "effective_from",
    effectiveTo: "effective_to",
  },
  filters: {
    employeeId: { column: "ed.employee_id", schema: uuidFilterSchema },
  },
  inputSchema: employeeDependentInputSchema,
  patchSchema: employeeDependentPatchSchema,
});

export const employeePayrollSettingService = createManagementCrudService({
  tableName: "employee_payroll_settings",
  tableAlias: "eps",
  selectSql: `
    eps.id,
    eps.employee_id as "employeeId",
    e.employee_code as "employeeCode",
    e.full_name as "employeeName",
    eps.salary_payment_type as "salaryPaymentType",
    eps.participates_insurance as "participatesInsurance",
    eps.eligible_for_commission as "eligibleForCommission",
    eps.eligible_for_exceeded_revenue_commission as "eligibleForExceededRevenueCommission",
    eps.eligible_for_one_time_customer_commission as "eligibleForOneTimeCustomerCommission",
    eps.eligible_for_new_customer_commission as "eligibleForNewCustomerCommission",
    eps.effective_from as "effectiveFrom",
    eps.effective_to as "effectiveTo",
    eps.created_at as "createdAt",
    eps.updated_at as "updatedAt"
  `,
  fromSql: `
    from employee_payroll_settings eps
    join employees e on e.id = eps.employee_id
  `,
  searchColumns: ["e.employee_code", "e.full_name"],
  sortColumns: {
    employeeName: "e.full_name",
    salaryPaymentType: "eps.salary_payment_type",
    participatesInsurance: "eps.participates_insurance",
    effectiveFrom: "eps.effective_from",
    createdAt: "eps.created_at",
  },
  defaultSort: "eps.created_at",
  fieldMap: {
    employeeId: "employee_id",
    salaryPaymentType: "salary_payment_type",
    participatesInsurance: "participates_insurance",
    eligibleForCommission: "eligible_for_commission",
    eligibleForExceededRevenueCommission: "eligible_for_exceeded_revenue_commission",
    eligibleForOneTimeCustomerCommission: "eligible_for_one_time_customer_commission",
    eligibleForNewCustomerCommission: "eligible_for_new_customer_commission",
    effectiveFrom: "effective_from",
    effectiveTo: "effective_to",
  },
  filters: {
    employeeId: { column: "eps.employee_id", schema: uuidFilterSchema },
    salaryPaymentType: { column: "eps.salary_payment_type", schema: salaryPaymentTypeSchema },
    participatesInsurance: { column: "eps.participates_insurance", schema: booleanFilterSchema },
  },
  inputSchema: employeePayrollSettingInputSchema,
  patchSchema: employeePayrollSettingPatchSchema,
});

export const leaveTypeService = createManagementCrudService({
  tableName: "leave_types",
  tableAlias: "lt",
  selectSql: `
    lt.id,
    lt.code,
    lt.name,
    lt.is_paid as "isPaid",
    lt.annual_quota_days as "annualQuotaDays",
    lt.created_at as "createdAt",
    lt.updated_at as "updatedAt"
  `,
  fromSql: "from leave_types lt",
  searchColumns: ["lt.code", "lt.name"],
  sortColumns: {
    code: "lt.code",
    name: "lt.name",
    isPaid: "lt.is_paid",
    annualQuotaDays: "lt.annual_quota_days",
    createdAt: "lt.created_at",
  },
  defaultSort: "lt.created_at",
  fieldMap: {
    code: "code",
    name: "name",
    isPaid: "is_paid",
    annualQuotaDays: "annual_quota_days",
  },
  filters: {
    isPaid: { column: "lt.is_paid", schema: booleanFilterSchema },
  },
  inputSchema: leaveTypeInputSchema,
  patchSchema: leaveTypePatchSchema,
});

export const leaveRequestService = createManagementCrudService({
  tableName: "leave_requests",
  tableAlias: "lr",
  selectSql: `
    lr.id,
    lr.employee_id as "employeeId",
    e.employee_code as "employeeCode",
    e.full_name as "employeeName",
    lr.leave_type_id as "leaveTypeId",
    lt.name as "leaveTypeName",
    lr.status,
    lr.start_date as "startDate",
    lr.end_date as "endDate",
    lr.total_days as "totalDays",
    lr.reason,
    lr.approved_by as "approvedBy",
    approver.full_name as "approvedByName",
    lr.approved_at as "approvedAt",
    lr.rejected_reason as "rejectedReason",
    lr.created_at as "createdAt",
    lr.updated_at as "updatedAt"
  `,
  fromSql: `
    from leave_requests lr
    join employees e on e.id = lr.employee_id
    join leave_types lt on lt.id = lr.leave_type_id
    left join employees approver on approver.id = lr.approved_by
  `,
  searchColumns: ["e.employee_code", "e.full_name", "lt.name", "lr.reason"],
  sortColumns: {
    employeeName: "e.full_name",
    leaveTypeName: "lt.name",
    status: "lr.status",
    startDate: "lr.start_date",
    endDate: "lr.end_date",
    totalDays: "lr.total_days",
    createdAt: "lr.created_at",
  },
  defaultSort: "lr.created_at",
  fieldMap: {
    employeeId: "employee_id",
    leaveTypeId: "leave_type_id",
    status: "status",
    startDate: "start_date",
    endDate: "end_date",
    totalDays: "total_days",
    reason: "reason",
    approvedBy: "approved_by",
    approvedAt: "approved_at",
    rejectedReason: "rejected_reason",
  },
  filters: {
    employeeId: { column: "lr.employee_id", schema: uuidFilterSchema },
    leaveTypeId: { column: "lr.leave_type_id", schema: uuidFilterSchema },
    status: { column: "lr.status", schema: leaveRequestStatusSchema },
  },
  inputSchema: leaveRequestInputSchema,
  patchSchema: leaveRequestPatchSchema,
});

export const companyHolidayService = createManagementCrudService({
  tableName: "company_holidays",
  tableAlias: "ch",
  selectSql: `
    ch.id,
    ch.holiday_date as "holidayDate",
    ch.name,
    ch.is_paid as "isPaid",
    ch.created_at as "createdAt",
    ch.updated_at as "updatedAt"
  `,
  fromSql: "from company_holidays ch",
  searchColumns: ["ch.name"],
  sortColumns: {
    holidayDate: "ch.holiday_date",
    name: "ch.name",
    isPaid: "ch.is_paid",
    createdAt: "ch.created_at",
  },
  defaultSort: "ch.holiday_date",
  fieldMap: {
    holidayDate: "holiday_date",
    name: "name",
    isPaid: "is_paid",
  },
  filters: {
    isPaid: { column: "ch.is_paid", schema: booleanFilterSchema },
  },
  inputSchema: companyHolidayInputSchema,
  patchSchema: companyHolidayPatchSchema,
});

export const leaveBalanceService = createManagementCrudService({
  tableName: "leave_balances",
  tableAlias: "lb",
  deletedAtColumn: null,
  selectSql: `
    lb.id,
    lb.employee_id as "employeeId",
    e.employee_code as "employeeCode",
    e.full_name as "employeeName",
    lb.leave_type_id as "leaveTypeId",
    lt.name as "leaveTypeName",
    lb.year,
    lb.opening_days as "openingDays",
    lb.earned_days as "earnedDays",
    lb.used_days as "usedDays",
    lb.adjusted_days as "adjustedDays",
    lb.closing_days as "closingDays",
    lb.created_at as "createdAt",
    lb.updated_at as "updatedAt"
  `,
  fromSql: `
    from leave_balances lb
    join employees e on e.id = lb.employee_id
    join leave_types lt on lt.id = lb.leave_type_id
  `,
  searchColumns: ["e.employee_code", "e.full_name", "lt.name"],
  sortColumns: {
    employeeName: "e.full_name",
    leaveTypeName: "lt.name",
    year: "lb.year",
    closingDays: "lb.closing_days",
    createdAt: "lb.created_at",
  },
  defaultSort: "lb.year",
  fieldMap: {
    employeeId: "employee_id",
    leaveTypeId: "leave_type_id",
    year: "year",
    openingDays: "opening_days",
    earnedDays: "earned_days",
    usedDays: "used_days",
    adjustedDays: "adjusted_days",
    closingDays: "closing_days",
  },
  filters: {
    employeeId: { column: "lb.employee_id", schema: uuidFilterSchema },
    leaveTypeId: { column: "lb.leave_type_id", schema: uuidFilterSchema },
  },
  inputSchema: leaveBalanceInputSchema,
  patchSchema: leaveBalancePatchSchema,
});

export const incomeTypeService = createManagementCrudService({
  tableName: "income_types",
  tableAlias: "it",
  selectSql: `
    it.id,
    it.code,
    it.name,
    it.taxability,
    it.is_commission as "isCommission",
    it.is_system as "isSystem",
    it.is_active as "isActive",
    it.created_at as "createdAt",
    it.updated_at as "updatedAt"
  `,
  fromSql: "from income_types it",
  searchColumns: ["it.code", "it.name"],
  sortColumns: {
    code: "it.code",
    name: "it.name",
    taxability: "it.taxability",
    isCommission: "it.is_commission",
    isActive: "it.is_active",
    createdAt: "it.created_at",
  },
  defaultSort: "it.created_at",
  fieldMap: {
    code: "code",
    name: "name",
    taxability: "taxability",
    isCommission: "is_commission",
    isSystem: "is_system",
    isActive: "is_active",
  },
  filters: {
    taxability: { column: "it.taxability", schema: taxabilitySchema },
    isActive: { column: "it.is_active", schema: booleanFilterSchema },
    isCommission: { column: "it.is_commission", schema: booleanFilterSchema },
  },
  inputSchema: incomeTypeInputSchema,
  patchSchema: incomeTypePatchSchema,
});

export const deductionTypeService = createManagementCrudService({
  tableName: "deduction_types",
  tableAlias: "dt",
  selectSql: `
    dt.id,
    dt.code,
    dt.name,
    dt.is_system as "isSystem",
    dt.is_active as "isActive",
    dt.created_at as "createdAt",
    dt.updated_at as "updatedAt"
  `,
  fromSql: "from deduction_types dt",
  searchColumns: ["dt.code", "dt.name"],
  sortColumns: {
    code: "dt.code",
    name: "dt.name",
    isActive: "dt.is_active",
    createdAt: "dt.created_at",
  },
  defaultSort: "dt.created_at",
  fieldMap: {
    code: "code",
    name: "name",
    isSystem: "is_system",
    isActive: "is_active",
  },
  filters: {
    isActive: { column: "dt.is_active", schema: booleanFilterSchema },
  },
  inputSchema: deductionTypeInputSchema,
  patchSchema: deductionTypePatchSchema,
});

export const employeePolicyOverrideService = createManagementCrudService({
  tableName: "employee_policy_overrides",
  tableAlias: "epo",
  selectSql: `
    epo.id,
    epo.employee_id as "employeeId",
    e.employee_code as "employeeCode",
    e.full_name as "employeeName",
    epo.override_type as "overrideType",
    epo.income_type_id as "incomeTypeId",
    it.name as "incomeTypeName",
    epo.deduction_type_id as "deductionTypeId",
    dt.name as "deductionTypeName",
    epo.amount,
    epo.rate,
    epo.reason,
    epo.approved_by as "approvedBy",
    approver.full_name as "approvedByName",
    epo.approved_at as "approvedAt",
    epo.effective_from as "effectiveFrom",
    epo.effective_to as "effectiveTo",
    epo.created_at as "createdAt",
    epo.updated_at as "updatedAt"
  `,
  fromSql: `
    from employee_policy_overrides epo
    join employees e on e.id = epo.employee_id
    left join income_types it on it.id = epo.income_type_id
    left join deduction_types dt on dt.id = epo.deduction_type_id
    left join employees approver on approver.id = epo.approved_by
  `,
  searchColumns: ["e.employee_code", "e.full_name", "epo.override_type", "epo.reason", "it.name", "dt.name"],
  sortColumns: {
    employeeName: "e.full_name",
    overrideType: "epo.override_type",
    amount: "epo.amount",
    rate: "epo.rate",
    effectiveFrom: "epo.effective_from",
    createdAt: "epo.created_at",
  },
  defaultSort: "epo.created_at",
  fieldMap: {
    employeeId: "employee_id",
    overrideType: "override_type",
    incomeTypeId: "income_type_id",
    deductionTypeId: "deduction_type_id",
    amount: "amount",
    rate: "rate",
    reason: "reason",
    approvedBy: "approved_by",
    approvedAt: "approved_at",
    effectiveFrom: "effective_from",
    effectiveTo: "effective_to",
  },
  filters: {
    employeeId: { column: "epo.employee_id", schema: uuidFilterSchema },
    incomeTypeId: { column: "epo.income_type_id", schema: uuidFilterSchema },
    deductionTypeId: { column: "epo.deduction_type_id", schema: uuidFilterSchema },
  },
  inputSchema: employeePolicyOverrideInputSchema,
  patchSchema: employeePolicyOverridePatchSchema,
});
