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

export const moneySchema = z.coerce.number().min(0).default(0);

export const customerStatusSchema = z.enum(["active", "inactive", "archived"]);
export const contractStatusSchema = z.enum([
  "draft",
  "active",
  "expiring",
  "terminated",
  "cancelled",
]);
export const billingCycleSchema = z.enum([
  "monthly",
  "quarterly",
  "yearly",
  "one_time",
  "custom",
]);

export const customerInputSchema = z.object({
  customerCode: z.string().trim().min(1, "Vui lòng nhập mã khách hàng"),
  companyName: z.string().trim().min(1, "Vui lòng nhập tên công ty"),
  shortName: nullableText,
  taxCode: nullableText,
  address: nullableText,
  email: nullableText,
  phone: nullableText,
  representativeName: nullableText,
  representativeTitle: nullableText,
  accountingSoftware: nullableText,
  accountingSoftwareUrl: nullableText,
  assignedEmployeeId: nullableUuid,
  defaultLegalEntityId: nullableUuid,
  status: customerStatusSchema.default("active"),
  notes: nullableText,
});

export const customerPatchSchema = customerInputSchema.partial();

export const serviceInputSchema = z.object({
  serviceCode: z.string().trim().min(1, "Vui lòng nhập mã dịch vụ"),
  name: z.string().trim().min(1, "Vui lòng nhập tên dịch vụ"),
  description: nullableText,
  standardUnitPrice: moneySchema,
  serviceType: z.string().trim().min(1, "Vui lòng nhập loại dịch vụ"),
  isActive: z.coerce.boolean().default(true),
});

export const servicePatchSchema = serviceInputSchema.partial();

export const contractInputSchema = z.object({
  contractCode: z.string().trim().min(1, "Vui lòng nhập mã hợp đồng"),
  customerId: z.string().uuid("Vui lòng chọn khách hàng"),
  legalEntityId: nullableUuid,
  partnerId: nullableUuid,
  assignedEmployeeId: nullableUuid,
  status: contractStatusSchema.default("draft"),
  billingCycle: billingCycleSchema.default("monthly"),
  monthlyFee: moneySchema,
  quarterlyFee: moneySchema,
  contractValue: moneySchema,
  vatRate: z.coerce.number().min(0).default(0),
  paymentDueDays: z.coerce.number().int().min(0).default(15),
  billingStartDate: nullableDate,
  effectiveDate: z.string().date("Vui lòng nhập ngày hiệu lực"),
  termYears: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
  terminationDate: nullableDate,
  notes: nullableText,
});

export const contractPatchSchema = contractInputSchema.partial();

