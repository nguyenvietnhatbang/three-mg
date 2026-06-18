import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
};

export const nullableText = z.preprocess(emptyToNull, z.string().trim().nullable().optional());
export const nullableUuid = z.preprocess(emptyToNull, z.string().uuid().nullable().optional());
export const nullableDate = z.preprocess(emptyToNull, z.string().date().nullable().optional());
export const moneySchema = z.coerce.number().default(0);
export const nonNegativeMoneySchema = z.coerce.number().min(0).default(0);

export const payrollPeriodStatusSchema = z.enum([
  "draft",
  "calculated",
  "reviewing",
  "approved",
  "locked",
  "paid",
  "cancelled",
]);

const payrollPeriodBaseSchema = z.object({
  periodCode: z.string().trim().min(1, "Vui lòng nhập mã kỳ lương"),
  periodStart: z.string().date("Vui lòng nhập ngày bắt đầu"),
  periodEnd: z.string().date("Vui lòng nhập ngày kết thúc"),
  status: payrollPeriodStatusSchema.default("draft"),
  payrollPolicyVersionId: nullableUuid,
  taxPolicyVersionId: nullableUuid,
  insurancePolicyVersionId: nullableUuid,
  notes: nullableText,
});

export const payrollPeriodInputSchema = payrollPeriodBaseSchema.refine(
  (value) => value.periodEnd >= value.periodStart,
  { message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu", path: ["periodEnd"] },
);

export const payrollPeriodPatchSchema = payrollPeriodBaseSchema.partial().refine(
  (value) => !value.periodStart || !value.periodEnd || value.periodEnd >= value.periodStart,
  { message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu", path: ["periodEnd"] },
);

export const payrollInputSchema = z.object({
  payrollPeriodId: z.string().uuid("Vui lòng chọn kỳ lương"),
  employeeId: z.string().uuid("Vui lòng chọn nhân viên"),
  actualWorkdays: z.coerce.number().min(0).default(0),
  unpaidLeaveDays: z.coerce.number().min(0).default(0),
  overtimeHours: z.coerce.number().min(0).default(0),
  revenueAmount: nonNegativeMoneySchema,
  exceededRevenueAmount: nonNegativeMoneySchema,
  oneTimeJobRevenueAmount: nonNegativeMoneySchema,
  newCustomerRevenueAmount: nonNegativeMoneySchema,
  advanceAmount: nonNegativeMoneySchema,
  reimbursementAmount: moneySchema,
  taxableAdjustmentAmount: moneySchema,
  nonTaxableAdjustmentAmount: moneySchema,
  notes: nullableText,
});

export const payrollInputPatchSchema = payrollInputSchema.partial();
