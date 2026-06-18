import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
};

export const nullableText = z.preprocess(
  emptyToNull,
  z.string().trim().nullable().optional(),
);

export const nullableUuid = z.preprocess(
  emptyToNull,
  z.string().uuid().nullable().optional(),
);

export const nullableDate = z.preprocess(
  emptyToNull,
  z.string().date().nullable().optional(),
);

export const employeeStatusSchema = z.enum([
  "active",
  "probation",
  "inactive",
  "terminated",
]);

export const contractTypeSchema = z.enum([
  "full_time",
  "part_time",
  "probation",
  "contractor",
  "other",
]);

export const salaryPaymentTypeSchema = z.enum(["gross", "net"]);
export const leaveRequestStatusSchema = z.enum([
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const taxabilitySchema = z.enum(["taxable", "non_taxable"]);

export const departmentInputSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã phòng ban"),
  name: z.string().trim().min(1, "Vui lòng nhập tên phòng ban"),
  parentDepartmentId: nullableUuid,
  managerEmployeeId: nullableUuid,
  description: nullableText,
});

export const departmentPatchSchema = departmentInputSchema.partial();

export const jobLevelInputSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã bậc"),
  name: z.string().trim().min(1, "Vui lòng nhập tên bậc"),
  rankOrder: z.coerce.number().int().min(0).default(0),
  description: nullableText,
});

export const jobLevelPatchSchema = jobLevelInputSchema.partial();

export const employeeInputSchema = z.object({
  employeeCode: z.string().trim().min(1, "Vui lòng nhập mã nhân viên"),
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên"),
  shortName: nullableText,
  departmentId: nullableUuid,
  jobLevelId: nullableUuid,
  workEmail: nullableText,
  personalEmail: nullableText,
  phone: nullableText,
  status: employeeStatusSchema.default("active"),
  hireDate: nullableDate,
  terminationDate: nullableDate,
  bankName: nullableText,
  bankAccountNumber: nullableText,
  bankAccountName: nullableText,
  notes: nullableText,
  contractType: contractTypeSchema.default("full_time"),
  salaryPaymentType: salaryPaymentTypeSchema.default("gross"),
  baseSalary: z.coerce.number().min(0).default(0),
  standardWorkdays: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
  contractEffectiveFrom: nullableDate,
  contractEffectiveTo: nullableDate,
});

export const employeePatchSchema = employeeInputSchema.partial();

export const employeeDependentInputSchema = z.object({
  employeeId: z.string().uuid("Vui lòng chọn nhân viên"),
  fullName: z.string().trim().min(1, "Vui lòng nhập tên người phụ thuộc"),
  relationship: nullableText,
  taxDependentCode: nullableText,
  effectiveFrom: z.string().date("Vui lòng nhập ngày hiệu lực"),
  effectiveTo: nullableDate,
});

export const employeeDependentPatchSchema = employeeDependentInputSchema.partial();

export const employeePayrollSettingInputSchema = z.object({
  employeeId: z.string().uuid("Vui lòng chọn nhân viên"),
  salaryPaymentType: salaryPaymentTypeSchema.default("gross"),
  participatesInsurance: z.coerce.boolean().default(true),
  eligibleForCommission: z.coerce.boolean().default(true),
  eligibleForExceededRevenueCommission: z.coerce.boolean().default(true),
  eligibleForOneTimeCustomerCommission: z.coerce.boolean().default(true),
  eligibleForNewCustomerCommission: z.coerce.boolean().default(true),
  effectiveFrom: z.string().date("Vui lòng nhập ngày hiệu lực"),
  effectiveTo: nullableDate,
});

export const employeePayrollSettingPatchSchema = employeePayrollSettingInputSchema.partial();

export const leaveTypeInputSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã loại phép"),
  name: z.string().trim().min(1, "Vui lòng nhập tên loại phép"),
  isPaid: z.coerce.boolean().default(true),
  annualQuotaDays: z.coerce.number().min(0).default(0),
});

export const leaveTypePatchSchema = leaveTypeInputSchema.partial();

export const leaveRequestInputSchema = z.object({
  employeeId: z.string().uuid("Vui lòng chọn nhân viên"),
  leaveTypeId: z.string().uuid("Vui lòng chọn loại phép"),
  status: leaveRequestStatusSchema.default("draft"),
  startDate: z.string().date("Vui lòng nhập ngày bắt đầu"),
  endDate: z.string().date("Vui lòng nhập ngày kết thúc"),
  totalDays: z.coerce.number().positive("Số ngày nghỉ phải lớn hơn 0"),
  reason: nullableText,
  approvedBy: nullableUuid,
  approvedAt: nullableDate,
  rejectedReason: nullableText,
});

export const leaveRequestPatchSchema = leaveRequestInputSchema.partial();

export const leaveBalanceInputSchema = z.object({
  employeeId: z.string().uuid("Vui lòng chọn nhân viên"),
  leaveTypeId: z.string().uuid("Vui lòng chọn loại phép"),
  year: z.coerce.number().int().min(2000),
  openingDays: z.coerce.number().default(0),
  earnedDays: z.coerce.number().default(0),
  usedDays: z.coerce.number().default(0),
  adjustedDays: z.coerce.number().default(0),
  closingDays: z.coerce.number().default(0),
});

export const leaveBalancePatchSchema = leaveBalanceInputSchema.partial();

export const companyHolidayInputSchema = z.object({
  holidayDate: z.string().date("Vui lòng nhập ngày nghỉ"),
  name: z.string().trim().min(1, "Vui lòng nhập tên ngày nghỉ"),
  isPaid: z.coerce.boolean().default(true),
});

export const companyHolidayPatchSchema = companyHolidayInputSchema.partial();

export const incomeTypeInputSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã loại thu nhập"),
  name: z.string().trim().min(1, "Vui lòng nhập tên loại thu nhập"),
  taxability: taxabilitySchema.default("taxable"),
  isCommission: z.coerce.boolean().default(false),
  isSystem: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
});

export const incomeTypePatchSchema = incomeTypeInputSchema.partial();

export const deductionTypeInputSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã loại khấu trừ"),
  name: z.string().trim().min(1, "Vui lòng nhập tên loại khấu trừ"),
  isSystem: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
});

export const deductionTypePatchSchema = deductionTypeInputSchema.partial();

export const employeePolicyOverrideInputSchema = z.object({
  employeeId: z.string().uuid("Vui lòng chọn nhân viên"),
  overrideType: z.string().trim().min(1, "Vui lòng nhập loại ngoại lệ"),
  incomeTypeId: nullableUuid,
  deductionTypeId: nullableUuid,
  amount: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
  rate: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
  reason: z.string().trim().min(1, "Vui lòng nhập lý do"),
  approvedBy: nullableUuid,
  approvedAt: nullableDate,
  effectiveFrom: z.string().date("Vui lòng nhập ngày hiệu lực"),
  effectiveTo: nullableDate,
});

export const employeePolicyOverridePatchSchema = employeePolicyOverrideInputSchema.partial();
