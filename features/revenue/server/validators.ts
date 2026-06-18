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
export const moneySchema = z.coerce.number().min(0).default(0);
export const quantitySchema = z.coerce.number().positive("Số lượng phải lớn hơn 0").default(1);
export const vatRateSchema = z.coerce.number().min(0).default(0);

export const batchStatusSchema = z.enum(["draft", "reviewing", "approved", "locked", "cancelled"]);
export const taskStatusSchema = z.enum(["draft", "pending_approval", "approved", "completed", "cancelled"]);
export const orderTypeSchema = z.enum(["recurring", "one_time", "manual_adjustment"]);
export const orderStatusSchema = z.enum(["draft", "issued", "partially_paid", "paid", "cancelled", "written_off"]);
export const paymentStatusSchema = z.enum(["unpaid", "partially_paid", "paid", "overpaid", "cancelled"]);
export const revenueSourceSchema = z.enum(["3m", "topa", "offset", "partner", "other"]);

const recurringBatchBaseSchema = z.object({
  batchCode: z.string().trim().min(1, "Vui lòng nhập mã batch"),
  periodStart: z.string().date("Vui lòng nhập ngày bắt đầu kỳ"),
  periodEnd: z.string().date("Vui lòng nhập ngày kết thúc kỳ"),
  status: batchStatusSchema.default("draft"),
  notes: nullableText,
});

export const recurringBatchInputSchema = recurringBatchBaseSchema.refine((value) => value.periodEnd >= value.periodStart, {
  message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
  path: ["periodEnd"],
});

export const recurringBatchPatchSchema = recurringBatchBaseSchema.partial().refine((value) => {
  if (!value.periodStart || !value.periodEnd) {
    return true;
  }

  return value.periodEnd >= value.periodStart;
}, {
  message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
  path: ["periodEnd"],
});

export const oneTimeTaskInputSchema = z.object({
  taskCode: z.string().trim().min(1, "Vui lòng nhập mã task"),
  customerId: z.string().uuid("Vui lòng chọn khách hàng"),
  serviceId: nullableUuid,
  responsibleEmployeeId: nullableUuid,
  commissionEmployeeId: nullableUuid,
  status: taskStatusSchema.default("draft"),
  taskDate: z.string().date("Vui lòng nhập ngày phát sinh"),
  description: z.string().trim().min(1, "Vui lòng nhập mô tả công việc"),
  quantity: quantitySchema,
  unitPrice: moneySchema,
  vatRate: vatRateSchema,
  revenueSource: revenueSourceSchema.default("3m"),
});

export const oneTimeTaskPatchSchema = oneTimeTaskInputSchema.partial();

const orderBaseSchema = z.object({
  orderNo: z.string().trim().min(1, "Vui lòng nhập mã đơn hàng"),
  orderType: orderTypeSchema.default("manual_adjustment"),
  status: orderStatusSchema.default("draft"),
  paymentStatus: paymentStatusSchema.default("unpaid"),
  documentDate: z.string().date("Vui lòng nhập ngày chứng từ"),
  dueDate: nullableDate,
  periodStart: nullableDate,
  periodEnd: nullableDate,
  customerId: z.string().uuid("Vui lòng chọn khách hàng"),
  contractId: nullableUuid,
  contractServiceId: nullableUuid,
  recurringBatchId: nullableUuid,
  oneTimeTaskId: nullableUuid,
  serviceId: nullableUuid,
  legalEntityId: nullableUuid,
  partnerId: nullableUuid,
  responsibleEmployeeId: nullableUuid,
  commissionEmployeeId: nullableUuid,
  revenueSource: revenueSourceSchema.default("3m"),
  quantity: quantitySchema,
  unitPrice: moneySchema,
  vatRate: vatRateSchema,
  sharedRevenueAmount: moneySchema,
  partnerPayableAmount: moneySchema,
  notes: nullableText,
});

export const orderInputSchema = orderBaseSchema.refine((value) => {
  if (!value.periodStart || !value.periodEnd) {
    return true;
  }

  return value.periodEnd >= value.periodStart;
}, {
  message: "Ngày kết thúc kỳ phải sau hoặc bằng ngày bắt đầu",
  path: ["periodEnd"],
});

export const orderPatchSchema = orderBaseSchema.partial().refine((value) => {
  if (!value.periodStart || !value.periodEnd) {
    return true;
  }

  return value.periodEnd >= value.periodStart;
}, {
  message: "Ngày kết thúc kỳ phải sau hoặc bằng ngày bắt đầu",
  path: ["periodEnd"],
});
