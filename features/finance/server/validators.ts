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
export const positiveMoneySchema = z.coerce.number().positive("Số tiền phải lớn hơn 0");

export const paymentMethodSchema = z.enum(["bank_transfer", "cash", "offset", "other"]);
export const debtEntryTypeSchema = z.enum([
  "opening_balance",
  "order_debit",
  "payment_credit",
  "adjustment_debit",
  "adjustment_credit",
  "write_off",
]);
export const adjustmentDebtEntryTypeSchema = z.enum([
  "opening_balance",
  "adjustment_debit",
  "adjustment_credit",
  "write_off",
]);
export const settlementTypeSchema = z.enum(["payable", "receivable", "collection_on_behalf", "offset"]);
export const settlementStatusSchema = z.enum(["draft", "confirmed", "partially_paid", "paid", "offset", "cancelled"]);

export const paymentAllocationInputSchema = z.object({
  orderId: z.string().uuid("Vui lòng chọn đơn hàng"),
  allocatedAmount: positiveMoneySchema,
});

export const paymentInputSchema = z.object({
  paymentNo: z.string().trim().min(1, "Vui lòng nhập mã phiếu thu"),
  customerId: z.string().uuid("Vui lòng chọn khách hàng"),
  paymentDate: z.string().date("Vui lòng nhập ngày thanh toán"),
  method: paymentMethodSchema.default("bank_transfer"),
  amount: positiveMoneySchema,
  referenceNo: nullableText,
  description: nullableText,
  allocations: z.array(paymentAllocationInputSchema).default([]),
});

export const paymentPatchSchema = paymentInputSchema.partial().extend({
  allocations: z.array(paymentAllocationInputSchema).optional(),
});

const debtAdjustmentBaseSchema = z.object({
  customerId: z.string().uuid("Vui lòng chọn khách hàng"),
  orderId: nullableUuid,
  paymentId: nullableUuid,
  entryDate: z.string().date("Vui lòng nhập ngày ghi nhận"),
  entryType: adjustmentDebtEntryTypeSchema.default("adjustment_debit"),
  description: z.string().trim().min(1, "Vui lòng nhập lý do điều chỉnh"),
  debitAmount: moneySchema,
  creditAmount: moneySchema,
});

export const debtAdjustmentInputSchema = debtAdjustmentBaseSchema.refine((value) => Number(value.debitAmount) > 0 || Number(value.creditAmount) > 0, {
  message: "Cần nhập số tiền tăng hoặc giảm",
  path: ["debitAmount"],
});

export const debtAdjustmentPatchSchema = debtAdjustmentBaseSchema.partial().refine((value) => {
  if (value.debitAmount === undefined && value.creditAmount === undefined) {
    return true;
  }

  return Number(value.debitAmount ?? 0) > 0 || Number(value.creditAmount ?? 0) > 0;
}, {
  message: "Cần nhập số tiền tăng hoặc giảm",
  path: ["debitAmount"],
});

const debtClosingBaseSchema = z.object({
  customerId: nullableUuid,
  periodStart: z.string().date("Vui lòng nhập ngày bắt đầu kỳ"),
  periodEnd: z.string().date("Vui lòng nhập ngày kết thúc kỳ"),
});

export const debtClosingInputSchema = debtClosingBaseSchema.refine((value) => value.periodEnd >= value.periodStart, {
  message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
  path: ["periodEnd"],
});

export const debtClosingPatchSchema = debtClosingBaseSchema.partial().refine((value) => {
  if (!value.periodStart || !value.periodEnd) {
    return true;
  }

  return value.periodEnd >= value.periodStart;
}, {
  message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
  path: ["periodEnd"],
});

export const partnerSettlementInputSchema = z.object({
  settlementNo: z.string().trim().min(1, "Vui lòng nhập mã đối soát"),
  partnerId: z.string().uuid("Vui lòng chọn đối tác"),
  orderId: nullableUuid,
  settlementType: settlementTypeSchema.default("payable"),
  status: settlementStatusSchema.default("draft"),
  settlementDate: z.string().date("Vui lòng nhập ngày đối soát"),
  dueDate: nullableDate,
  amount: moneySchema,
  paidAmount: moneySchema,
  description: nullableText,
});

export const partnerSettlementPatchSchema = partnerSettlementInputSchema.partial();

export const partnerSettlementPaymentInputSchema = z.object({
  partnerSettlementId: z.string().uuid("Vui lòng chọn khoản đối soát"),
  paymentDate: z.string().date("Vui lòng nhập ngày thanh toán"),
  method: paymentMethodSchema.default("bank_transfer"),
  amount: positiveMoneySchema,
  referenceNo: nullableText,
  description: nullableText,
});

export const partnerSettlementPaymentPatchSchema = partnerSettlementPaymentInputSchema.partial();
