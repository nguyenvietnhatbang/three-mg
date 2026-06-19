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
import { calculateLineAmounts, getPaymentStatus } from "./calculations";
import { orderInputSchema, orderPatchSchema, orderStatusSchema, orderTypeSchema, paymentStatusSchema } from "./validators";

type OrderData = z.infer<typeof orderInputSchema>;
type OrderPatchData = z.infer<typeof orderPatchSchema>;

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

const orderSelectSql = `
  o.id,
  o.order_no as "orderNo",
  o.order_type as "orderType",
  o.status,
  o.payment_status as "paymentStatus",
  o.document_date as "documentDate",
  o.due_date as "dueDate",
  o.period_start as "periodStart",
  o.period_end as "periodEnd",
  o.customer_id as "customerId",
  c.customer_code as "customerCode",
  c.company_name as "customerName",
  o.contract_id as "contractId",
  ct.contract_code as "contractCode",
  o.contract_service_id as "contractServiceId",
  o.recurring_batch_id as "recurringBatchId",
  rb.batch_code as "batchCode",
  o.one_time_task_id as "oneTimeTaskId",
  ott.task_code as "taskCode",
  o.service_id as "serviceId",
  s.service_code as "serviceCode",
  s.name as "serviceName",
  o.legal_entity_id as "legalEntityId",
  le.name as "legalEntityName",
  o.partner_id as "partnerId",
  p.name as "partnerName",
  o.responsible_employee_id as "responsibleEmployeeId",
  re.full_name as "responsibleEmployeeName",
  o.commission_employee_id as "commissionEmployeeId",
  ce.full_name as "commissionEmployeeName",
  o.revenue_source as "revenueSource",
  o.quantity,
  o.unit_price as "unitPrice",
  o.subtotal_amount as "subtotalAmount",
  o.vat_rate as "vatRate",
  o.vat_amount as "vatAmount",
  o.total_amount as "totalAmount",
  o.paid_amount as "paidAmount",
  o.net_revenue_amount as "netRevenueAmount",
  o.shared_revenue_amount as "sharedRevenueAmount",
  o.partner_payable_amount as "partnerPayableAmount",
  o.notes,
  o.issued_at as "issuedAt",
  o.cancelled_at as "cancelledAt",
  o.created_at as "createdAt",
  o.updated_at as "updatedAt"
`;

const orderFromSql = `
  from orders o
  join customers c on c.id = o.customer_id
  left join contracts ct on ct.id = o.contract_id
  left join contract_services cs on cs.id = o.contract_service_id
  left join recurring_revenue_batches rb on rb.id = o.recurring_batch_id
  left join one_time_tasks ott on ott.id = o.one_time_task_id
  left join services s on s.id = o.service_id
  left join legal_entities le on le.id = o.legal_entity_id
  left join partners p on p.id = o.partner_id
  left join employees re on re.id = o.responsible_employee_id
  left join employees ce on ce.id = o.commission_employee_id
`;

const sortColumns = {
  orderNo: "o.order_no",
  orderType: "o.order_type",
  status: "o.status",
  paymentStatus: "o.payment_status",
  documentDate: "o.document_date",
  dueDate: "o.due_date",
  customerName: "c.company_name",
  totalAmount: "o.total_amount",
  paidAmount: "o.paid_amount",
  createdAt: "o.created_at",
};

export type OrderFilters = {
  status?: string | null;
  customerId?: string | null;
  contractId?: string | null;
  employeeId?: string | null;
  partnerId?: string | null;
  paymentStatus?: string | null;
  orderType?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export async function listOrders(query: ListQuery, filters: OrderFilters = {}) {
  const values: unknown[] = [];
  const where = ["o.deleted_at is null"];

  if (query.search) {
    values.push(likeSearch(query.search));
    where.push(`(o.order_no ilike $${values.length} or c.customer_code ilike $${values.length} or c.company_name ilike $${values.length} or coalesce(s.name, '') ilike $${values.length})`);
  }

  applyOrderFilters(where, values, filters);
  const whereSql = where.join(" and ");
  const totalResult = await db.query<{ total: string }>(
    `select count(*)::text as total ${orderFromSql} where ${whereSql}`,
    values,
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);
  const pagination = getPagination(query.page, query.pageSize, total);
  values.push(query.pageSize, getOffset(query.page, query.pageSize));

  const result = await db.query(
    `
      select ${orderSelectSql}
      ${orderFromSql}
      where ${whereSql}
      order by ${getSortClause(query.sortBy, query.sortOrder, sortColumns, "o.created_at")} 
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function getOrder(id: string, client: PoolClient | typeof db = db) {
  const result = await client.query(
    `select ${orderSelectSql} ${orderFromSql} where o.id = $1 and o.deleted_at is null`,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createOrder(input: unknown) {
  const data = orderInputSchema.parse(input);
  const result = await db.query<{ id: string }>(insertOrderSql(), orderValues(data));

  return getOrder(result.rows[0].id);
}

export async function updateOrder(id: string, input: unknown) {
  const current = await getOrder(id);

  if (!current) {
    return null;
  }

  if (current.status !== "draft") {
    throw new BadRequestError("Chỉ được sửa đơn hàng ở trạng thái nháp");
  }

  const data = orderPatchSchema.parse(input);
  const merged = orderInputSchema.parse({ ...currentToInput(current), ...data });
  const values = orderValues(merged);
  values.push(id);
  await db.query(
    `
      update orders set
        order_no = $1,
        order_type = $2,
        status = $3,
        payment_status = $4,
        document_date = $5,
        due_date = $6,
        period_start = $7,
        period_end = $8,
        customer_id = $9,
        contract_id = $10,
        contract_service_id = $11,
        recurring_batch_id = $12,
        one_time_task_id = $13,
        service_id = $14,
        legal_entity_id = $15,
        partner_id = $16,
        responsible_employee_id = $17,
        commission_employee_id = $18,
        revenue_source = $19,
        quantity = $20,
        unit_price = $21,
        subtotal_amount = $22,
        vat_rate = $23,
        vat_amount = $24,
        total_amount = $25,
        net_revenue_amount = $26,
        shared_revenue_amount = $27,
        partner_payable_amount = $28,
        notes = $29,
        updated_at = now()
      where id = $30 and deleted_at is null
    `,
    values,
  );

  return getOrder(id);
}

export async function deleteOrder(id: string) {
  const current = await getOrder(id);

  if (!current) {
    return false;
  }

  if (current.status !== "draft" && current.status !== "cancelled") {
    throw new BadRequestError("Chỉ được xóa mềm đơn hàng nháp hoặc đã hủy");
  }

  const result = await db.query(
    "update orders set deleted_at = now() where id = $1 and deleted_at is null returning id",
    [id],
  );

  return Number(result.rowCount ?? 0) > 0;
}

export async function issueOrder(id: string) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const current = await getOrder(id, client);

    if (!current) {
      throw new BadRequestError("Không tìm thấy đơn hàng");
    }

    if (current.status !== "draft") {
      throw new BadRequestError("Chỉ đơn hàng nháp mới được phát hành");
    }

    await client.query(
      `
        update orders
        set status = 'issued',
            issued_at = now(),
            due_date = coalesce(due_date, document_date),
            updated_at = now()
        where id = $1 and deleted_at is null
      `,
      [id],
    );
    await createOrderDebitEntry(client, id);
    await maybeCreatePartnerSettlement(client, id);
    await client.query("commit");

    return getOrder(id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelOrder(id: string) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const current = await getOrder(id, client);

    if (!current) {
      throw new BadRequestError("Không tìm thấy đơn hàng");
    }

    const debtResult = await client.query<{ total: string }>(
      "select count(*)::text as total from debt_entries where order_id = $1 and deleted_at is null",
      [id],
    );

    if (Number(debtResult.rows[0]?.total ?? 0) > 0 || Number(current.paidAmount ?? 0) > 0) {
      throw new BadRequestError("Đơn hàng đã phát sinh công nợ hoặc thanh toán, cần dùng điều chỉnh/xóa nợ thay vì hủy trực tiếp");
    }

    await client.query(
      "update orders set status = 'cancelled', payment_status = 'cancelled', cancelled_at = now(), updated_at = now() where id = $1 and deleted_at is null",
      [id],
    );
    await client.query("commit");

    return getOrder(id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function writeOffOrder(id: string) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const current = await getOrder(id, client);

    if (!current) {
      throw new BadRequestError("Không tìm thấy đơn hàng");
    }

    if (!["issued", "partially_paid", "paid"].includes(String(current.status))) {
      throw new BadRequestError("Chỉ được xóa nợ đơn hàng đã phát hành");
    }

    const remaining = Math.max(0, Number(current.totalAmount ?? 0) - Number(current.paidAmount ?? 0));

    if (remaining <= 0) {
      throw new BadRequestError("Đơn hàng không còn dư nợ để xóa");
    }

    await createDebtEntry(client, {
      customerId: String(current.customerId),
      orderId: id,
      paymentId: null,
      entryDate: new Date().toISOString().slice(0, 10),
      entryType: "write_off",
      description: `Xóa nợ đơn hàng ${current.orderNo}`,
      debitAmount: 0,
      creditAmount: remaining,
    });
    await client.query(
      "update orders set status = 'written_off', payment_status = 'paid', updated_at = now() where id = $1 and deleted_at is null",
      [id],
    );
    await client.query("commit");

    return getOrder(id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function refreshOrderPaymentStatus(client: PoolClient, orderId: string) {
  const result = await client.query<{ total: string; paid: string }>(
    `
      select o.total_amount::text as total,
             coalesce(sum(pa.allocated_amount) filter (where p.deleted_at is null), 0)::text as paid
      from orders o
      left join payment_allocations pa on pa.order_id = o.id
      left join payments p on p.id = pa.payment_id
      where o.id = $1 and o.deleted_at is null
      group by o.id
    `,
    [orderId],
  );
  const total = Number(result.rows[0]?.total ?? 0);
  const paid = Number(result.rows[0]?.paid ?? 0);
  const paymentStatus = getPaymentStatus(total, paid);
  const orderStatus = paymentStatus === "paid" || paymentStatus === "overpaid" ? "paid" : paymentStatus === "partially_paid" ? "partially_paid" : "issued";

  await client.query(
    "update orders set paid_amount = $1, payment_status = $2, status = case when status in ('cancelled', 'written_off') then status else $3::order_status end, updated_at = now() where id = $4",
    [paid, paymentStatus, orderStatus, orderId],
  );
}

export async function createDebtEntry(
  client: PoolClient,
  input: {
    customerId: string;
    orderId: string | null;
    paymentId: string | null;
    entryDate: string;
    entryType: string;
    description: string;
    debitAmount: number;
    creditAmount: number;
  },
) {
  const previous = await client.query<{ balance: string }>(
    `
      select coalesce(sum(debit_amount - credit_amount), 0)::text as balance
      from debt_entries
      where customer_id = $1 and deleted_at is null
    `,
    [input.customerId],
  );
  const balanceAfterEntry = Number(previous.rows[0]?.balance ?? 0) + input.debitAmount - input.creditAmount;

  await client.query(
    `
      insert into debt_entries (
        customer_id, order_id, payment_id, entry_date, entry_type,
        description, debit_amount, credit_amount, balance_after_entry
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      input.customerId,
      input.orderId,
      input.paymentId,
      input.entryDate,
      input.entryType,
      input.description,
      input.debitAmount,
      input.creditAmount,
      balanceAfterEntry,
    ],
  );
}

async function createOrderDebitEntry(client: PoolClient, orderId: string) {
  const existing = await client.query(
    "select id from debt_entries where order_id = $1 and entry_type = 'order_debit' and deleted_at is null limit 1",
    [orderId],
  );

  if (existing.rows[0]) {
    return;
  }

  const order = await getOrder(orderId, client);

  if (!order) {
    throw new BadRequestError("Không tìm thấy đơn hàng");
  }

  await createDebtEntry(client, {
    customerId: String(order.customerId),
    orderId,
    paymentId: null,
    entryDate: toISODate(order.documentDate),
    entryType: "order_debit",
    description: `Ghi nhận công nợ đơn hàng ${order.orderNo}`,
    debitAmount: Number(order.totalAmount ?? 0),
    creditAmount: 0,
  });
}

async function maybeCreatePartnerSettlement(client: PoolClient, orderId: string) {
  const order = await getOrder(orderId, client);

  if (!order?.partnerId || Number(order.partnerPayableAmount ?? 0) <= 0) {
    return;
  }

  const existing = await client.query(
    "select id from partner_settlements where order_id = $1 and deleted_at is null limit 1",
    [orderId],
  );

  if (existing.rows[0]) {
    return;
  }

  await client.query(
    `
      insert into partner_settlements (
        settlement_no, partner_id, order_id, settlement_type, status,
        settlement_date, due_date, amount, paid_amount, description
      )
      values ($1, $2, $3, 'payable', 'draft', $4, $5, $6, 0, $7)
    `,
    [
      `TOPA-${order.orderNo}`,
      order.partnerId,
      orderId,
      order.documentDate,
      order.dueDate,
      order.partnerPayableAmount,
      `Khoản phải trả đối tác từ đơn hàng ${order.orderNo}`,
    ],
  );
}

function applyOrderFilters(where: string[], values: unknown[], filters: OrderFilters) {
  if (filters.status) {
    values.push(orderStatusSchema.parse(filters.status));
    where.push(`o.status = $${values.length}`);
  }
  if (filters.paymentStatus) {
    values.push(paymentStatusSchema.parse(filters.paymentStatus));
    where.push(`o.payment_status = $${values.length}`);
  }
  if (filters.orderType) {
    values.push(orderTypeSchema.parse(filters.orderType));
    where.push(`o.order_type = $${values.length}`);
  }
  if (filters.customerId) {
    values.push(uuidSchema.parse(filters.customerId));
    where.push(`o.customer_id = $${values.length}`);
  }
  if (filters.contractId) {
    values.push(uuidSchema.parse(filters.contractId));
    where.push(`o.contract_id = $${values.length}`);
  }
  if (filters.partnerId) {
    values.push(uuidSchema.parse(filters.partnerId));
    where.push(`o.partner_id = $${values.length}`);
  }
  if (filters.employeeId) {
    values.push(uuidSchema.parse(filters.employeeId));
    where.push(`(o.responsible_employee_id = $${values.length} or o.commission_employee_id = $${values.length})`);
  }
  if (filters.periodStart) {
    values.push(z.string().date().parse(filters.periodStart));
    where.push(`o.period_end >= $${values.length}`);
  }
  if (filters.periodEnd) {
    values.push(z.string().date().parse(filters.periodEnd));
    where.push(`o.period_start <= $${values.length}`);
  }
  if (filters.dateFrom) {
    values.push(z.string().date().parse(filters.dateFrom));
    where.push(`o.document_date >= $${values.length}`);
  }
  if (filters.dateTo) {
    values.push(z.string().date().parse(filters.dateTo));
    where.push(`o.document_date <= $${values.length}`);
  }
}

function insertOrderSql() {
  return `
    insert into orders (
      order_no, order_type, status, payment_status, document_date, due_date,
      period_start, period_end, customer_id, contract_id, contract_service_id,
      recurring_batch_id, one_time_task_id, service_id, legal_entity_id, partner_id,
      responsible_employee_id, commission_employee_id, revenue_source,
      quantity, unit_price, subtotal_amount, vat_rate, vat_amount, total_amount,
      net_revenue_amount, shared_revenue_amount, partner_payable_amount, notes
    )
    values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
    )
    returning id
  `;
}

function orderValues(data: OrderData | OrderPatchData) {
  const amounts = calculateLineAmounts(data.quantity, data.unitPrice, data.vatRate);
  const totalAmount = amounts.totalAmount;
  const sharedRevenueAmount = Number(data.sharedRevenueAmount ?? 0);

  return [
    data.orderNo,
    data.orderType,
    data.status ?? "draft",
    data.paymentStatus ?? "unpaid",
    data.documentDate,
    data.dueDate ?? null,
    data.periodStart ?? null,
    data.periodEnd ?? null,
    data.customerId,
    data.contractId ?? null,
    data.contractServiceId ?? null,
    data.recurringBatchId ?? null,
    data.oneTimeTaskId ?? null,
    data.serviceId ?? null,
    data.legalEntityId ?? null,
    data.partnerId ?? null,
    data.responsibleEmployeeId ?? null,
    data.commissionEmployeeId ?? null,
    data.revenueSource ?? "3m",
    data.quantity ?? 1,
    data.unitPrice ?? 0,
    amounts.subtotalAmount,
    data.vatRate ?? 0,
    amounts.vatAmount,
    totalAmount,
    Math.max(0, totalAmount - sharedRevenueAmount),
    sharedRevenueAmount,
    data.partnerPayableAmount ?? 0,
    data.notes ?? null,
  ];
}

function currentToInput(current: Record<string, unknown>): OrderData {
  return {
    orderNo: String(current.orderNo),
    orderType: String(current.orderType) as OrderData["orderType"],
    status: String(current.status) as OrderData["status"],
    paymentStatus: String(current.paymentStatus) as OrderData["paymentStatus"],
    documentDate: toISODate(current.documentDate),
    dueDate: current.dueDate ? toISODate(current.dueDate) : null,
    periodStart: current.periodStart ? toISODate(current.periodStart) : null,
    periodEnd: current.periodEnd ? toISODate(current.periodEnd) : null,
    customerId: String(current.customerId),
    contractId: current.contractId ? String(current.contractId) : null,
    contractServiceId: current.contractServiceId ? String(current.contractServiceId) : null,
    recurringBatchId: current.recurringBatchId ? String(current.recurringBatchId) : null,
    oneTimeTaskId: current.oneTimeTaskId ? String(current.oneTimeTaskId) : null,
    serviceId: current.serviceId ? String(current.serviceId) : null,
    legalEntityId: current.legalEntityId ? String(current.legalEntityId) : null,
    partnerId: current.partnerId ? String(current.partnerId) : null,
    responsibleEmployeeId: current.responsibleEmployeeId ? String(current.responsibleEmployeeId) : null,
    commissionEmployeeId: current.commissionEmployeeId ? String(current.commissionEmployeeId) : null,
    revenueSource: String(current.revenueSource) as OrderData["revenueSource"],
    quantity: Number(current.quantity ?? 1),
    unitPrice: Number(current.unitPrice ?? 0),
    vatRate: Number(current.vatRate ?? 0),
    sharedRevenueAmount: Number(current.sharedRevenueAmount ?? 0),
    partnerPayableAmount: Number(current.partnerPayableAmount ?? 0),
    notes: current.notes ? String(current.notes) : null,
  };
}
