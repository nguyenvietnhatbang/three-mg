import type { PoolClient } from "pg";
import { z } from "zod";
import { BadRequestError } from "@/lib/api-response";
import { db } from "@/lib/db";
import {
  getOffset,
  getPagination,
  getSortClause,
  likeSearch,
  type ListQuery,
} from "@/features/shared/server/query";
import { createDebtEntry, refreshOrderPaymentStatus } from "@/features/revenue/server/orders";
import { paymentInputSchema, paymentMethodSchema, paymentPatchSchema } from "./validators";

const uuidSchema = z.string().uuid();

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

const paymentSelectSql = `
  p.id,
  p.payment_no as "paymentNo",
  p.customer_id as "customerId",
  c.customer_code as "customerCode",
  c.company_name as "customerName",
  p.payment_date as "paymentDate",
  p.method,
  p.amount,
  p.reference_no as "referenceNo",
  p.description,
  coalesce(pa.total_allocated, 0) as "allocatedAmount",
  greatest(p.amount - coalesce(pa.total_allocated, 0), 0) as "unallocatedAmount",
  p.created_at as "createdAt",
  p.updated_at as "updatedAt"
`;

const paymentFromSql = `
  from payments p
  join customers c on c.id = p.customer_id
  left join lateral (
    select sum(allocated_amount) as total_allocated
    from payment_allocations pa
    where pa.payment_id = p.id
  ) pa on true
`;

const sortColumns = {
  paymentNo: "p.payment_no",
  customerName: "c.company_name",
  paymentDate: "p.payment_date",
  method: "p.method",
  amount: "p.amount",
  allocatedAmount: "pa.total_allocated",
  createdAt: "p.created_at",
};

export type PaymentFilters = {
  customerId?: string | null;
  method?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export async function listPayments(query: ListQuery, filters: PaymentFilters = {}) {
  const values: unknown[] = [];
  const where = ["p.deleted_at is null"];

  if (query.search) {
    values.push(likeSearch(query.search));
    where.push(`(p.payment_no ilike $${values.length} or c.customer_code ilike $${values.length} or c.company_name ilike $${values.length} or coalesce(p.reference_no, '') ilike $${values.length})`);
  }

  applyFilters(where, values, filters);
  const whereSql = where.join(" and ");
  const totalResult = await db.query<{ total: string }>(
    `select count(*)::text as total ${paymentFromSql} where ${whereSql}`,
    values,
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);
  const pagination = getPagination(query.page, query.pageSize, total);
  values.push(query.pageSize, getOffset(query.page, query.pageSize));
  const result = await db.query(
    `
      select ${paymentSelectSql}
      ${paymentFromSql}
      where ${whereSql}
      order by ${getSortClause(query.sortBy, query.sortOrder, sortColumns, "p.created_at")}
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function getPayment(id: string, client: PoolClient | typeof db = db) {
  const result = await client.query(
    `select ${paymentSelectSql} ${paymentFromSql} where p.id = $1 and p.deleted_at is null`,
    [id],
  );
  const payment = result.rows[0];

  if (!payment) {
    return null;
  }

  const allocations = await client.query(
    `
      select pa.id, pa.order_id as "orderId", o.order_no as "orderNo", pa.allocated_amount as "allocatedAmount"
      from payment_allocations pa
      join orders o on o.id = pa.order_id
      where pa.payment_id = $1
      order by pa.created_at asc
    `,
    [id],
  );

  return { ...payment, allocations: allocations.rows };
}

export async function createPayment(input: unknown) {
  const data = paymentInputSchema.parse(normalizePaymentInput(input));
  const client = await db.connect();

  try {
    await client.query("begin");
    const paymentResult = await client.query<{ id: string }>(
      `
        insert into payments (payment_no, customer_id, payment_date, method, amount, reference_no, description)
        values ($1, $2, $3, $4, $5, $6, $7)
        returning id
      `,
      [data.paymentNo, data.customerId, data.paymentDate, data.method, data.amount, data.referenceNo, data.description],
    );
    await replaceAllocations(client, paymentResult.rows[0].id, data.customerId, data.amount, data.paymentDate, data.allocations);
    await client.query("commit");

    return getPayment(paymentResult.rows[0].id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePayment(id: string, input: unknown) {
  const current = await getPayment(id);

  if (!current) {
    return null;
  }

  const data = paymentInputSchema.parse({
    paymentNo: current.paymentNo,
    customerId: current.customerId,
    paymentDate: toISODate(current.paymentDate),
    method: current.method,
    amount: Number(current.amount),
    referenceNo: current.referenceNo,
    description: current.description,
    allocations: current.allocations,
    ...paymentPatchSchema.parse(normalizePaymentInput(input)),
  });
  const client = await db.connect();

  try {
    await client.query("begin");
    await assertPaymentDebtUnlocked(client, id);
    const affectedOrders = await clearAllocationsAndDebt(client, id);
    await client.query(
      `
        update payments
        set payment_no = $1, customer_id = $2, payment_date = $3, method = $4,
            amount = $5, reference_no = $6, description = $7, updated_at = now()
        where id = $8 and deleted_at is null
      `,
      [data.paymentNo, data.customerId, data.paymentDate, data.method, data.amount, data.referenceNo, data.description, id],
    );
    await replaceAllocations(client, id, data.customerId, data.amount, data.paymentDate, data.allocations);
    for (const orderId of affectedOrders) {
      await refreshOrderPaymentStatus(client, orderId);
    }
    await client.query("commit");

    return getPayment(id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function normalizePaymentInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return input;
  }

  const value = input as Record<string, unknown>;

  if (Array.isArray(value.allocations)) {
    return value;
  }

  if (value.allocationOrderId && value.allocatedAmount) {
    return {
      ...value,
      allocations: [
        {
          orderId: value.allocationOrderId,
          allocatedAmount: value.allocatedAmount,
        },
      ],
    };
  }

  return { ...value, allocations: [] };
}

export async function deletePayment(id: string) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const current = await getPayment(id, client);

    if (!current) {
      await client.query("rollback");
      return false;
    }

    await assertPaymentDebtUnlocked(client, id);
    const affectedOrders = await clearAllocationsAndDebt(client, id);
    await client.query("update payments set deleted_at = now(), updated_at = now() where id = $1 and deleted_at is null", [id]);
    for (const orderId of affectedOrders) {
      await refreshOrderPaymentStatus(client, orderId);
    }
    await client.query("commit");

    return true;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function replaceAllocations(
  client: PoolClient,
  paymentId: string,
  customerId: string,
  amount: number,
  paymentDate: string,
  allocations: Array<{ orderId: string; allocatedAmount: number }>,
) {
  const totalAllocated = allocations.reduce((sum, allocation) => sum + Number(allocation.allocatedAmount), 0);

  if (totalAllocated > amount) {
    throw new BadRequestError("Tổng phân bổ không được lớn hơn số tiền thanh toán");
  }

  const orderIds = new Set<string>();
  for (const allocation of allocations) {
    if (orderIds.has(allocation.orderId)) {
      throw new BadRequestError("Một đơn hàng chỉ được phân bổ một lần trong cùng phiếu thu");
    }

    orderIds.add(allocation.orderId);
    const order = await client.query<{
      id: string;
      customerId: string;
      orderNo: string;
    }>(
      `
        select id, customer_id as "customerId", order_no as "orderNo"
        from orders
        where id = $1 and deleted_at is null and status not in ('draft', 'cancelled', 'written_off')
      `,
      [allocation.orderId],
    );

    if (!order.rows[0]) {
      throw new BadRequestError("Đơn hàng phân bổ không hợp lệ hoặc chưa phát hành");
    }

    if (order.rows[0].customerId !== customerId) {
      throw new BadRequestError("Đơn hàng phân bổ phải thuộc cùng khách hàng với phiếu thu");
    }

    await client.query(
      "insert into payment_allocations (payment_id, order_id, allocated_amount) values ($1, $2, $3)",
      [paymentId, allocation.orderId, allocation.allocatedAmount],
    );
    await createDebtEntry(client, {
      customerId,
      orderId: allocation.orderId,
      paymentId,
      entryDate: paymentDate,
      entryType: "payment_credit",
      description: `Thanh toán cho đơn hàng ${order.rows[0].orderNo}`,
      debitAmount: 0,
      creditAmount: Number(allocation.allocatedAmount),
    });
    await refreshOrderPaymentStatus(client, allocation.orderId);
  }
}

async function clearAllocationsAndDebt(client: PoolClient, paymentId: string) {
  const allocations = await client.query<{ orderId: string }>(
    "select order_id as \"orderId\" from payment_allocations where payment_id = $1",
    [paymentId],
  );
  const affectedOrders = allocations.rows.map((row) => row.orderId);

  await client.query("delete from payment_allocations where payment_id = $1", [paymentId]);
  await client.query("update debt_entries set deleted_at = now(), updated_at = now() where payment_id = $1 and is_locked = false and deleted_at is null", [paymentId]);

  return affectedOrders;
}

async function assertPaymentDebtUnlocked(client: PoolClient, paymentId: string) {
  const locked = await client.query<{ total: string }>(
    "select count(*)::text as total from debt_entries where payment_id = $1 and is_locked = true and deleted_at is null",
    [paymentId],
  );

  if (Number(locked.rows[0]?.total ?? 0) > 0) {
    throw new BadRequestError("Phiếu thu có dòng công nợ đã khóa, không thể sửa hoặc xóa");
  }
}

function applyFilters(where: string[], values: unknown[], filters: PaymentFilters) {
  if (filters.customerId) {
    values.push(uuidSchema.parse(filters.customerId));
    where.push(`p.customer_id = $${values.length}`);
  }
  if (filters.method) {
    values.push(paymentMethodSchema.parse(filters.method));
    where.push(`p.method = $${values.length}`);
  }
  if (filters.dateFrom) {
    values.push(z.string().date().parse(filters.dateFrom));
    where.push(`p.payment_date >= $${values.length}`);
  }
  if (filters.dateTo) {
    values.push(z.string().date().parse(filters.dateTo));
    where.push(`p.payment_date <= $${values.length}`);
  }
}
