import { z } from "zod";
import { BadRequestError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { createManagementCrudService } from "@/features/shared/server/management-crud";
import { getOffset, getPagination, getSortClause, likeSearch, type ListQuery } from "@/features/shared/server/query";
import { createDebtEntry } from "@/features/revenue/server/orders";
import { debtAdjustmentInputSchema, debtAdjustmentPatchSchema, debtClosingInputSchema, debtClosingPatchSchema, debtEntryTypeSchema } from "./validators";

const uuidFilterSchema = z.string().uuid();

export const debtEntryService = createManagementCrudService({
  tableName: "debt_entries",
  tableAlias: "de",
  selectSql: `
    de.id,
    de.customer_id as "customerId",
    c.customer_code as "customerCode",
    c.company_name as "customerName",
    de.order_id as "orderId",
    o.order_no as "orderNo",
    de.payment_id as "paymentId",
    p.payment_no as "paymentNo",
    de.entry_date as "entryDate",
    de.entry_type as "entryType",
    de.description,
    de.debit_amount as "debitAmount",
    de.credit_amount as "creditAmount",
    de.balance_after_entry as "balanceAfterEntry",
    de.is_locked as "isLocked",
    de.created_at as "createdAt",
    de.updated_at as "updatedAt"
  `,
  fromSql: `
    from debt_entries de
    join customers c on c.id = de.customer_id
    left join orders o on o.id = de.order_id
    left join payments p on p.id = de.payment_id
  `,
  searchColumns: ["c.customer_code", "c.company_name", "o.order_no", "p.payment_no", "de.description"],
  sortColumns: {
    customerName: "c.company_name",
    orderNo: "o.order_no",
    paymentNo: "p.payment_no",
    entryDate: "de.entry_date",
    entryType: "de.entry_type",
    debitAmount: "de.debit_amount",
    creditAmount: "de.credit_amount",
    balanceAfterEntry: "de.balance_after_entry",
    isLocked: "de.is_locked",
    createdAt: "de.created_at",
  },
  defaultSort: "de.entry_date",
  fieldMap: {
    customerId: "customer_id",
    orderId: "order_id",
    paymentId: "payment_id",
    entryDate: "entry_date",
    entryType: "entry_type",
    description: "description",
    debitAmount: "debit_amount",
    creditAmount: "credit_amount",
  },
  filters: {
    customerId: { column: "de.customer_id", schema: uuidFilterSchema },
    orderId: { column: "de.order_id", schema: uuidFilterSchema },
    paymentId: { column: "de.payment_id", schema: uuidFilterSchema },
    entryType: { column: "de.entry_type", schema: debtEntryTypeSchema },
  },
  inputSchema: debtAdjustmentInputSchema,
  patchSchema: debtAdjustmentPatchSchema,
  beforeCreate: async (data) => {
    if (data.entryType === "order_debit" || data.entryType === "payment_credit") {
      throw new BadRequestError("Dòng công nợ hệ thống không được tạo thủ công");
    }
  },
  beforeUpdate: async (id) => {
    const current = await debtEntryService.get(id);

    if (current?.isLocked) {
      throw new BadRequestError("Dòng công nợ đã khóa không thể sửa");
    }
  },
});

export async function createDebtAdjustment(input: unknown) {
  const data = debtAdjustmentInputSchema.parse(input);
  const client = await db.connect();

  try {
    await client.query("begin");
    await createDebtEntry(client, {
      customerId: data.customerId,
      orderId: data.orderId ?? null,
      paymentId: data.paymentId ?? null,
      entryDate: data.entryDate,
      entryType: data.entryType,
      description: data.description,
      debitAmount: Number(data.debitAmount ?? 0),
      creditAmount: Number(data.creditAmount ?? 0),
    });
    await client.query("commit");

    const created = await db.query("select id from debt_entries where customer_id = $1 order by created_at desc limit 1", [data.customerId]);

    return debtEntryService.get(created.rows[0].id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteDebtEntry(id: string) {
  const current = await debtEntryService.get(id);

  if (!current) {
    return false;
  }

  if (current.isLocked) {
    throw new BadRequestError("Dòng công nợ đã khóa không thể xóa");
  }

  if (current.entryType === "order_debit" || current.entryType === "payment_credit") {
    throw new BadRequestError("Dòng công nợ hệ thống không được xóa thủ công");
  }

  return debtEntryService.remove(id);
}

export type DebtSummaryFilters = {
  customerId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
};

export async function listDebtSummary(query: ListQuery, filters: DebtSummaryFilters = {}) {
  const filterValues: unknown[] = [];
  const where = ["c.deleted_at is null"];
  const periodStart = filters.periodStart ? z.string().date().parse(filters.periodStart) : "1900-01-01";
  const periodEnd = filters.periodEnd ? z.string().date().parse(filters.periodEnd) : "2999-12-31";

  if (query.search) {
    filterValues.push(likeSearch(query.search));
    where.push(`(c.customer_code ilike $${filterValues.length} or c.company_name ilike $${filterValues.length})`);
  }
  if (filters.customerId) {
    filterValues.push(uuidFilterSchema.parse(filters.customerId));
    where.push(`c.id = $${filterValues.length}`);
  }

  const whereSql = where.join(" and ");
  const totalResult = await db.query<{ total: string }>(
    `select count(*)::text as total from customers c where ${whereSql}`,
    filterValues,
  );
  const pagination = getPagination(query.page, query.pageSize, Number(totalResult.rows[0]?.total ?? 0));
  const values = [periodStart, periodEnd, ...filterValues, query.pageSize, getOffset(query.page, query.pageSize)];
  const dataWhereSql = whereSql.replaceAll("$1", "$3").replaceAll("$2", "$4");
  const result = await db.query(
    `
      select
        c.id,
        c.customer_code as "customerCode",
        c.company_name as "customerName",
        coalesce(sum(de.debit_amount - de.credit_amount) filter (where de.entry_date < $1), 0) as "openingBalance",
        coalesce(sum(de.debit_amount) filter (where de.entry_date between $1 and $2), 0) as "debitAmount",
        coalesce(sum(de.credit_amount) filter (where de.entry_date between $1 and $2), 0) as "creditAmount",
        coalesce(sum(de.debit_amount - de.credit_amount) filter (where de.entry_date <= $2), 0) as "closingBalance",
        coalesce(overdue.overdue_amount, 0) as "overdueAmount"
      from customers c
      left join debt_entries de on de.customer_id = c.id and de.deleted_at is null
      left join lateral (
        select sum(greatest(o.total_amount - o.paid_amount, 0)) as overdue_amount
        from orders o
        where o.customer_id = c.id
          and o.deleted_at is null
          and o.status in ('issued', 'partially_paid')
          and o.due_date < current_date
      ) overdue on true
      where ${dataWhereSql}
      group by c.id, overdue.overdue_amount
      order by ${getSortClause(query.sortBy, query.sortOrder, {
        customerCode: "c.customer_code",
        customerName: "c.company_name",
        closingBalance: "\"closingBalance\"",
        overdueAmount: "\"overdueAmount\"",
      }, "c.company_name")}
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function closeDebtPeriod(input: unknown) {
  const data = debtClosingInputSchema.parse(input);
  const client = await db.connect();

  try {
    await client.query("begin");
    const customers = data.customerId
      ? [{ id: data.customerId }]
      : (await client.query<{ id: string }>("select id from customers where deleted_at is null")).rows;

    for (const customer of customers) {
      const summary = await client.query<{
        opening: string;
        debit: string;
        credit: string;
        closing: string;
      }>(
        `
          select
            coalesce(sum(debit_amount - credit_amount) filter (where entry_date < $2), 0)::text as opening,
            coalesce(sum(debit_amount) filter (where entry_date between $2 and $3), 0)::text as debit,
            coalesce(sum(credit_amount) filter (where entry_date between $2 and $3), 0)::text as credit,
            coalesce(sum(debit_amount - credit_amount) filter (where entry_date <= $3), 0)::text as closing
          from debt_entries
          where customer_id = $1 and deleted_at is null
        `,
        [customer.id, data.periodStart, data.periodEnd],
      );

      await client.query(
        `
          insert into debt_period_closings (
            customer_id, period_start, period_end, opening_balance,
            debit_amount, credit_amount, closing_balance, locked_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, now())
          on conflict (customer_id, period_start, period_end)
          do update set
            opening_balance = excluded.opening_balance,
            debit_amount = excluded.debit_amount,
            credit_amount = excluded.credit_amount,
            closing_balance = excluded.closing_balance,
            locked_at = now(),
            updated_at = now()
        `,
        [
          customer.id,
          data.periodStart,
          data.periodEnd,
          summary.rows[0]?.opening ?? 0,
          summary.rows[0]?.debit ?? 0,
          summary.rows[0]?.credit ?? 0,
          summary.rows[0]?.closing ?? 0,
        ],
      );
    }

    await client.query(
      `
        update debt_entries
        set is_locked = true, updated_at = now()
        where entry_date between $1 and $2
          and deleted_at is null
          and ($3::uuid is null or customer_id = $3)
      `,
      [data.periodStart, data.periodEnd, data.customerId ?? null],
    );
    await client.query("commit");

    return { closedCustomers: customers.length };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export const debtClosingService = createManagementCrudService({
  tableName: "debt_period_closings",
  tableAlias: "dpc",
  selectSql: `
    dpc.id,
    dpc.customer_id as "customerId",
    c.customer_code as "customerCode",
    c.company_name as "customerName",
    dpc.period_start as "periodStart",
    dpc.period_end as "periodEnd",
    dpc.opening_balance as "openingBalance",
    dpc.debit_amount as "debitAmount",
    dpc.credit_amount as "creditAmount",
    dpc.closing_balance as "closingBalance",
    dpc.locked_at as "lockedAt",
    dpc.created_at as "createdAt",
    dpc.updated_at as "updatedAt"
  `,
  fromSql: `
    from debt_period_closings dpc
    left join customers c on c.id = dpc.customer_id
  `,
  searchColumns: ["c.customer_code", "c.company_name"],
  sortColumns: {
    customerName: "c.company_name",
    periodStart: "dpc.period_start",
    periodEnd: "dpc.period_end",
    closingBalance: "dpc.closing_balance",
    lockedAt: "dpc.locked_at",
    createdAt: "dpc.created_at",
  },
  defaultSort: "dpc.created_at",
  fieldMap: {
    customerId: "customer_id",
    periodStart: "period_start",
    periodEnd: "period_end",
  },
  filters: {
    customerId: { column: "dpc.customer_id", schema: uuidFilterSchema },
  },
  inputSchema: debtClosingInputSchema,
  patchSchema: debtClosingPatchSchema,
  deletedAtColumn: null,
});
