import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const nullableText = z.preprocess(emptyToNull, z.string().trim().nullable().optional());
export const nullableUuid = z.preprocess(emptyToNull, z.string().uuid().nullable().optional());
export const nullableDate = z.preprocess(emptyToNull, z.string().date().nullable().optional());
export const policyStatusSchema = z.enum(["draft", "active", "inactive", "archived"]);
export const taxabilitySchema = z.enum(["taxable", "non_taxable"]);
export const contractTypeSchema = z.enum(["full_time", "part_time", "probation", "contractor", "other"]);
export const salaryPaymentTypeSchema = z.enum(["gross", "net"]);

export const policyVersionBaseSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã chính sách"),
  name: z.string().trim().min(1, "Vui lòng nhập tên chính sách"),
  status: policyStatusSchema.default("draft"),
  effectiveFrom: z.string().date("Vui lòng nhập ngày hiệu lực"),
  effectiveTo: nullableDate,
  notes: nullableText,
});

export const payrollPolicyInputSchema = policyVersionBaseSchema.extend({
  standardWorkdays: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
  grossUpMethod: nullableText,
});
export const payrollPolicyPatchSchema = payrollPolicyInputSchema.partial();

export const taxPolicyInputSchema = policyVersionBaseSchema.extend({
  personalDeductionAmount: z.coerce.number().min(0).default(0),
  dependentDeductionAmount: z.coerce.number().min(0).default(0),
  taxMethod: z.string().trim().min(1).default("progressive"),
});
export const taxPolicyPatchSchema = taxPolicyInputSchema.partial();

export const taxBracketInputSchema = z.object({
  taxPolicyVersionId: z.string().uuid("Vui lòng chọn chính sách thuế"),
  bracketOrder: z.coerce.number().int().positive("Thứ tự bậc phải lớn hơn 0"),
  fromAmount: z.coerce.number().min(0).default(0),
  toAmount: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
  taxRate: z.coerce.number().min(0).default(0),
  quickDeductionAmount: z.coerce.number().min(0).default(0),
});
export const taxBracketPatchSchema = taxBracketInputSchema.partial();

export const insurancePolicyInputSchema = policyVersionBaseSchema.extend({
  employerSocialRate: z.coerce.number().min(0).default(0),
  employerHealthRate: z.coerce.number().min(0).default(0),
  employerUnemploymentRate: z.coerce.number().min(0).default(0),
  employerUnionRate: z.coerce.number().min(0).default(0),
  employeeSocialRate: z.coerce.number().min(0).default(0),
  employeeHealthRate: z.coerce.number().min(0).default(0),
  employeeUnemploymentRate: z.coerce.number().min(0).default(0),
  minInsuranceBase: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
  maxInsuranceBase: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
});
export const insurancePolicyPatchSchema = insurancePolicyInputSchema.partial();

export const commissionPolicyInputSchema = policyVersionBaseSchema.extend({
  commissionType: z.string().trim().min(1, "Vui lòng nhập loại hoa hồng"),
  departmentId: nullableUuid,
  jobLevelId: nullableUuid,
  contractType: z.preprocess(emptyToNull, contractTypeSchema.nullable().optional()),
  salaryPaymentType: z.preprocess(emptyToNull, salaryPaymentTypeSchema.nullable().optional()),
  targetRevenueMultiplier: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
  minRate: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
  defaultRate: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
  maxRate: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
});
export const commissionPolicyPatchSchema = commissionPolicyInputSchema.partial();

export const allowancePolicyInputSchema = policyVersionBaseSchema.extend({
  incomeTypeId: nullableUuid,
  departmentId: nullableUuid,
  jobLevelId: nullableUuid,
  contractType: z.preprocess(emptyToNull, contractTypeSchema.nullable().optional()),
  workArea: nullableText,
  amount: z.coerce.number().min(0).default(0),
  taxability: taxabilitySchema.default("taxable"),
});
export const allowancePolicyPatchSchema = allowancePolicyInputSchema.partial();
