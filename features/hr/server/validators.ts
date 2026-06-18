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

