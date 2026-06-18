import type { PoolClient } from "pg";
import { z } from "zod";
import { BadRequestError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { createManagementCrudService } from "@/features/shared/server/management-crud";
import { getOffset, getPagination, getSortClause, likeSearch, type ListQuery } from "@/features/shared/server/query";
import { calculateLineAmounts } from "./calculations";
import { batchStatusSchema, recurringBatchInputSchema, recurringBatchPatchSchema } from "./validators";

const uuidFilterSchema = z.string().uuid();

const baseRecurringBatchService = createManagementCrudService({
  tableName: "recurring_revenue_batches",
  tableAlias: "rb",
  selectSql: `
    rb.id,
    rb.batch_code as "batchCode",
    rb.period_start as "periodStart",
    rb.period_end as "periodEnd",
    rb.status,
    rb.generated_at as "generatedAt",
    rb.approved_at as "approvedAt",
    rb.locked_at as "lockedAt",
    rb.notes,
    oa.order_count as "orderCount",
    oa.total_amount as "totalAmount",
    rb.created_at as "createdAt",
    rb.updated_at as "updatedAt"
  `,
  fromSql: `
    from recurring_revenue_batches rb
    left join lateral (
      select count(o.id)::int as order_count, coalesce(sum(o.total_amount), 0) as total_amount
      from orders o
      where o.recurring_batch_id = rb.id and o.deleted_at is null
    ) oa on true
  `,
  searchColumns: ["rb.batch_code", "rb.notes"],
  sortColumns: {
    batchCode: "rb.batch_code",
    periodStart: "rb.period_start",
    periodEnd: "rb.period_end",
    status: "rb.status",
    totalAmount: "oa.total_amount",
    createdAt: "rb.created_at",
  },
  defaultSort: "rb.created_at",
  fieldMap: {
    batchCode: "batch_code",
    periodStart: "period_start",
    periodEnd: "period_end",
    status: "status",
    notes: "notes",
  },
  filters: {
    status: { column: "rb.status", schema: batchStatusSchema },
  },
  inputSchema: recurringBatchInputSchema,
  patchSchema: recurringBatchPatchSchema,
});

export const recurringBatchService = {
  ...baseRecurringBatchService,
  async list(
    query: ListQuery,
    filters: Record<string, string | null | undefined> = {},
  ) {
    const values: unknown[] = [];
    const where = ["rb.deleted_at is null"];

    if (query.search) {
      values.push(likeSearch(query.search));
      where.push(`(rb.batch_code ilike $${values.length} or coalesce(rb.notes, '') ilike $${values.length})`);
    }
    if (filters.status) {
      values.push(batchStatusSchema.parse(filters.status));
      where.push(`rb.status = $${values.length}`);
    }
    if (filters.periodStart) {
      values.push(z.string().date().parse(filters.periodStart));
      where.push(`rb.period_end >= $${values.length}`);
    }
    if (filters.periodEnd) {
      values.push(z.string().date().parse(filters.periodEnd));
      where.push(`rb.period_start <= $${values.length}`);
    }

    const whereSql = where.join(" and ");
    const totalResult = await db.query<{ total: string }>(
      `
        select count(*)::text as total
        from recurring_revenue_batches rb
        where ${whereSql}
      `,
      values,
    );
    const pagination = getPagination(query.page, query.pageSize, Number(totalResult.rows[0]?.total ?? 0));
    values.push(query.pageSize, getOffset(query.page, query.pageSize));
    const result = await db.query(
      `
        select
          rb.id,
          rb.batch_code as "batchCode",
          rb.period_start as "periodStart",
          rb.period_end as "periodEnd",
          rb.status,
          rb.generated_at as "generatedAt",
          rb.approved_at as "approvedAt",
          rb.locked_at as "lockedAt",
          rb.notes,
          oa.order_count as "orderCount",
          oa.total_amount as "totalAmount",
          rb.created_at as "createdAt",
          rb.updated_at as "updatedAt"
        from recurring_revenue_batches rb
        left join lateral (
          select count(o.id)::int as order_count, coalesce(sum(o.total_amount), 0) as total_amount
          from orders o
          where o.recurring_batch_id = rb.id and o.deleted_at is null
        ) oa on true
        where ${whereSql}
        order by ${getSortClause(query.sortBy, query.sortOrder, {
          batchCode: "rb.batch_code",
          periodStart: "rb.period_start",
          periodEnd: "rb.period_end",
          status: "rb.status",
          totalAmount: "oa.total_amount",
          createdAt: "rb.created_at",
        }, "rb.created_at")}
        limit $${values.length - 1} offset $${values.length}
      `,
      values,
    );

    return { rows: result.rows, pagination };
  },
};

export async function generateRecurringBatch(id: string) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const batch = await getBatchForUpdate(client, id);

    if (!batch) {
      throw new BadRequestError("Không tìm thấy batch doanh thu");
    }

    if (!["draft", "reviewing"].includes(batch.status)) {
      throw new BadRequestError("Chỉ batch nháp hoặc đang rà soát mới được sinh doanh thu");
    }

    const candidates = await client.query<{
      contractServiceId: string;
      contractId: string;
      contractCode: string;
      customerId: string;
      serviceId: string;
      legalEntityId: string | null;
      partnerId: string | null;
      assignedEmployeeId: string | null;
      paymentDueDays: number;
      quantity: string;
      unitPrice: string;
      vatRate: string;
    }>(
      `
        select
          cs.id as "contractServiceId",
          ct.id as "contractId",
          ct.contract_code as "contractCode",
          ct.customer_id as "customerId",
          cs.service_id as "serviceId",
          ct.legal_entity_id as "legalEntityId",
          ct.partner_id as "partnerId",
          ct.assigned_employee_id as "assignedEmployeeId",
          ct.payment_due_days as "paymentDueDays",
          cs.quantity::text as "quantity",
          cs.unit_price::text as "unitPrice",
          cs.vat_rate::text as "vatRate"
        from contract_services cs
        join contracts ct on ct.id = cs.contract_id
        join services s on s.id = cs.service_id
        where cs.deleted_at is null
          and ct.deleted_at is null
          and s.deleted_at is null
          and s.is_active = true
          and ct.status in ('active', 'expiring')
          and cs.billing_cycle in ('monthly', 'quarterly', 'yearly')
          and ct.effective_date <= $2
          and (ct.termination_date is null or ct.termination_date >= $1)
          and cs.effective_from <= $2
          and (cs.effective_to is null or cs.effective_to >= $1)
        order by ct.contract_code asc, cs.created_at asc
      `,
      [batch.periodStart, batch.periodEnd],
    );

    let createdCount = 0;
    for (const candidate of candidates.rows) {
      const duplicate = await client.query(
        `
          select id
          from orders
          where order_type = 'recurring'
            and contract_service_id = $1
            and period_start = $2
            and period_end = $3
            and status <> 'cancelled'
            and deleted_at is null
          limit 1
        `,
        [candidate.contractServiceId, batch.periodStart, batch.periodEnd],
      );

      if (duplicate.rows[0]) {
        continue;
      }

      const amounts = calculateLineAmounts(candidate.quantity, candidate.unitPrice, candidate.vatRate);
      const orderNo = `RR-${batch.batchCode}-${String(createdCount + 1).padStart(4, "0")}`;

      await client.query(
        `
          insert into orders (
            order_no, order_type, status, payment_status, document_date, due_date,
            period_start, period_end, customer_id, contract_id, contract_service_id,
            recurring_batch_id, service_id, legal_entity_id, partner_id,
            responsible_employee_id, commission_employee_id, revenue_source,
            quantity, unit_price, subtotal_amount, vat_rate, vat_amount, total_amount,
            net_revenue_amount
          )
          values (
            $1, 'recurring', 'draft', 'unpaid', $2::date, ($2::date + ($3::int || ' days')::interval)::date,
            $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13, $13, $14, $15, $16, $17, $18, $19, $20, $17
          )
        `,
        [
          orderNo,
          batch.periodEnd,
          candidate.paymentDueDays,
          batch.periodStart,
          batch.periodEnd,
          candidate.customerId,
          candidate.contractId,
          candidate.contractServiceId,
          id,
          candidate.serviceId,
          candidate.legalEntityId,
          candidate.partnerId,
          candidate.assignedEmployeeId,
          candidate.partnerId ? "partner" : "3m",
          candidate.quantity,
          candidate.unitPrice,
          amounts.subtotalAmount,
          candidate.vatRate,
          amounts.vatAmount,
          amounts.totalAmount,
        ],
      );
      createdCount += 1;
    }

    await client.query(
      "update recurring_revenue_batches set status = 'reviewing', generated_at = now(), updated_at = now() where id = $1",
      [id],
    );
    await client.query("commit");

    return { createdCount };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function approveRecurringBatch(id: string) {
  await updateBatchStatus(id, ["draft", "reviewing"], "approved", "approved_at = now()");
  return recurringBatchService.get(id);
}

export async function lockRecurringBatch(id: string) {
  await updateBatchStatus(id, ["approved"], "locked", "locked_at = now()");
  return recurringBatchService.get(id);
}

export async function cancelRecurringBatch(id: string) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const batch = await getBatchForUpdate(client, id);

    if (!batch) {
      throw new BadRequestError("Không tìm thấy batch doanh thu");
    }

    if (batch.status === "locked") {
      throw new BadRequestError("Batch đã khóa không thể hủy");
    }

    const issued = await client.query<{ total: string }>(
      "select count(*)::text as total from orders where recurring_batch_id = $1 and status <> 'draft' and deleted_at is null",
      [id],
    );

    if (Number(issued.rows[0]?.total ?? 0) > 0) {
      throw new BadRequestError("Batch có đơn hàng đã phát hành, không thể hủy trực tiếp");
    }

    await client.query("update orders set status = 'cancelled', payment_status = 'cancelled', cancelled_at = now(), updated_at = now() where recurring_batch_id = $1 and deleted_at is null", [id]);
    await client.query("update recurring_revenue_batches set status = 'cancelled', updated_at = now() where id = $1", [id]);
    await client.query("commit");

    return recurringBatchService.get(id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function updateBatchStatus(id: string, allowed: string[], status: string, extraSet: string) {
  const result = await db.query(
    `
      update recurring_revenue_batches
      set status = $2, ${extraSet}, updated_at = now()
      where id = $1 and deleted_at is null and status = any($3::batch_status[])
      returning id
    `,
    [id, status, allowed],
  );

  if (!result.rows[0]) {
    throw new BadRequestError("Trạng thái batch không hợp lệ cho thao tác này");
  }
}

async function getBatchForUpdate(client: PoolClient, id: string) {
  const result = await client.query<{
    id: string;
    batchCode: string;
    periodStart: string;
    periodEnd: string;
    status: string;
  }>(
    `
      select id, batch_code as "batchCode", period_start as "periodStart", period_end as "periodEnd", status
      from recurring_revenue_batches
      where id = $1 and deleted_at is null
      for update
    `,
    [uuidFilterSchema.parse(id)],
  );

  return result.rows[0] ?? null;
}
