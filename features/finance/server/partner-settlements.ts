import type { PoolClient } from "pg";
import { z } from "zod";
import { BadRequestError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { createManagementCrudService } from "@/features/shared/server/management-crud";
import {
  partnerSettlementInputSchema,
  partnerSettlementPatchSchema,
  partnerSettlementPaymentInputSchema,
  partnerSettlementPaymentPatchSchema,
  paymentMethodSchema,
  settlementStatusSchema,
  settlementTypeSchema,
} from "./validators";

const uuidFilterSchema = z.string().uuid();

function toISODate(dateVal: unknown): string {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, "0");
    const day = String(dateVal.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const s = String(dateVal);
  if (s.includes("GMT") || /^[A-Za-z]/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }
  return s.slice(0, 10);
}

export const partnerSettlementService = createManagementCrudService({
  tableName: "partner_settlements",
  tableAlias: "ps",
  selectSql: `
    ps.id,
    ps.settlement_no as "settlementNo",
    ps.partner_id as "partnerId",
    p.code as "partnerCode",
    p.name as "partnerName",
    ps.order_id as "orderId",
    o.order_no as "orderNo",
    ps.settlement_type as "settlementType",
    ps.status,
    ps.settlement_date as "settlementDate",
    ps.due_date as "dueDate",
    ps.amount,
    ps.paid_amount as "paidAmount",
    greatest(ps.amount - ps.paid_amount, 0) as "remainingAmount",
    ps.description,
    ps.created_at as "createdAt",
    ps.updated_at as "updatedAt"
  `,
  fromSql: `
    from partner_settlements ps
    join partners p on p.id = ps.partner_id
    left join orders o on o.id = ps.order_id
  `,
  searchColumns: ["ps.settlement_no", "p.code", "p.name", "o.order_no", "ps.description"],
  sortColumns: {
    settlementNo: "ps.settlement_no",
    partnerName: "p.name",
    orderNo: "o.order_no",
    settlementType: "ps.settlement_type",
    status: "ps.status",
    settlementDate: "ps.settlement_date",
    amount: "ps.amount",
    paidAmount: "ps.paid_amount",
    createdAt: "ps.created_at",
  },
  defaultSort: "ps.created_at",
  fieldMap: {
    settlementNo: "settlement_no",
    partnerId: "partner_id",
    orderId: "order_id",
    settlementType: "settlement_type",
    status: "status",
    settlementDate: "settlement_date",
    dueDate: "due_date",
    amount: "amount",
    paidAmount: "paid_amount",
    description: "description",
  },
  filters: {
    partnerId: { column: "ps.partner_id", schema: uuidFilterSchema },
    status: { column: "ps.status", schema: settlementStatusSchema },
    settlementType: { column: "ps.settlement_type", schema: settlementTypeSchema },
  },
  inputSchema: partnerSettlementInputSchema,
  patchSchema: partnerSettlementPatchSchema,
  beforeUpdate: async (id) => {
    const current = await partnerSettlementService.get(id);

    if (current && ["paid", "offset", "cancelled"].includes(String(current.status))) {
      throw new BadRequestError("Khoản đối soát đã hoàn tất/hủy không thể sửa");
    }
  },
});

export const partnerSettlementPaymentCrudService = createManagementCrudService({
  tableName: "partner_settlement_payments",
  tableAlias: "psp",
  selectSql: `
    psp.id,
    psp.partner_settlement_id as "partnerSettlementId",
    ps.settlement_no as "settlementNo",
    p.name as "partnerName",
    psp.payment_date as "paymentDate",
    psp.method,
    psp.amount,
    psp.reference_no as "referenceNo",
    psp.description,
    psp.created_at as "createdAt"
  `,
  fromSql: `
    from partner_settlement_payments psp
    join partner_settlements ps on ps.id = psp.partner_settlement_id
    join partners p on p.id = ps.partner_id
  `,
  searchColumns: ["ps.settlement_no", "p.name", "psp.reference_no", "psp.description"],
  sortColumns: {
    settlementNo: "ps.settlement_no",
    partnerName: "p.name",
    paymentDate: "psp.payment_date",
    method: "psp.method",
    amount: "psp.amount",
    createdAt: "psp.created_at",
  },
  defaultSort: "psp.created_at",
  fieldMap: {
    partnerSettlementId: "partner_settlement_id",
    paymentDate: "payment_date",
    method: "method",
    amount: "amount",
    referenceNo: "reference_no",
    description: "description",
  },
  filters: {
    partnerSettlementId: { column: "psp.partner_settlement_id", schema: uuidFilterSchema },
    method: { column: "psp.method", schema: paymentMethodSchema },
  },
  inputSchema: partnerSettlementPaymentInputSchema,
  patchSchema: partnerSettlementPaymentPatchSchema,
  deletedAtColumn: null,
});

export async function createPartnerSettlementPayment(input: unknown) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const data = partnerSettlementPaymentInputSchema.parse(input);
    const result = await client.query<{ id: string }>(
      `
        insert into partner_settlement_payments (
          partner_settlement_id, payment_date, method, amount, reference_no, description
        )
        values ($1, $2, $3, $4, $5, $6)
        returning id
      `,
      [data.partnerSettlementId, data.paymentDate, data.method, data.amount, data.referenceNo, data.description],
    );
    await refreshSettlementStatus(client, data.partnerSettlementId);
    await client.query("commit");

    return partnerSettlementPaymentCrudService.get(result.rows[0].id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePartnerSettlementPayment(id: string, input: unknown) {
  const current = await partnerSettlementPaymentCrudService.get(id);

  if (!current) {
    return null;
  }

  const data = partnerSettlementPaymentInputSchema.parse({
    partnerSettlementId: current.partnerSettlementId,
    paymentDate: toISODate(current.paymentDate),
    method: current.method,
    amount: Number(current.amount),
    referenceNo: current.referenceNo,
    description: current.description,
    ...partnerSettlementPaymentPatchSchema.parse(input),
  });
  const client = await db.connect();

  try {
    await client.query("begin");
    await client.query(
      `
        update partner_settlement_payments
        set partner_settlement_id = $1, payment_date = $2, method = $3,
            amount = $4, reference_no = $5, description = $6
        where id = $7
      `,
      [data.partnerSettlementId, data.paymentDate, data.method, data.amount, data.referenceNo, data.description, id],
    );
    await refreshSettlementStatus(client, String(current.partnerSettlementId));
    await refreshSettlementStatus(client, data.partnerSettlementId);
    await client.query("commit");

    return partnerSettlementPaymentCrudService.get(id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePartnerSettlementPayment(id: string) {
  const current = await partnerSettlementPaymentCrudService.get(id);

  if (!current) {
    return false;
  }

  const client = await db.connect();

  try {
    await client.query("begin");
    await client.query("delete from partner_settlement_payments where id = $1", [id]);
    await refreshSettlementStatus(client, String(current.partnerSettlementId));
    await client.query("commit");

    return true;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function refreshSettlementStatus(client: PoolClient, settlementId: string) {
  const result = await client.query<{ amount: string; paid: string }>(
    `
      select ps.amount::text as amount, coalesce(sum(psp.amount), 0)::text as paid
      from partner_settlements ps
      left join partner_settlement_payments psp on psp.partner_settlement_id = ps.id
      where ps.id = $1 and ps.deleted_at is null
      group by ps.id
    `,
    [settlementId],
  );

  if (!result.rows[0]) {
    throw new BadRequestError("Không tìm thấy khoản đối soát");
  }

  const amount = Number(result.rows[0].amount ?? 0);
  const paid = Number(result.rows[0].paid ?? 0);
  const status = paid <= 0 ? "confirmed" : paid >= amount ? "paid" : "partially_paid";

  await client.query(
    "update partner_settlements set paid_amount = $1, status = $2, updated_at = now() where id = $3",
    [paid, status, settlementId],
  );
}
