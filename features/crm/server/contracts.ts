import { db } from "@/lib/db";
import {
  getOffset,
  getPagination,
  getSortClause,
  likeSearch,
  type ListQuery,
} from "@/features/shared/server/query";
import {
  billingCycleSchema,
  contractInputSchema,
  contractPatchSchema,
  contractStatusSchema,
} from "./validators";

const contractSortColumns = {
  contractCode: "ct.contract_code",
  customerName: "c.company_name",
  status: "ct.status",
  billingCycle: "ct.billing_cycle",
  effectiveDate: "ct.effective_date",
  contractValue: "ct.contract_value",
  createdAt: "ct.created_at",
} satisfies Record<string, string>;

const contractSelect = `
  ct.id,
  ct.contract_code as "contractCode",
  ct.customer_id as "customerId",
  c.company_name as "customerName",
  c.customer_code as "customerCode",
  ct.legal_entity_id as "legalEntityId",
  le.name as "legalEntityName",
  ct.partner_id as "partnerId",
  p.name as "partnerName",
  ct.assigned_employee_id as "assignedEmployeeId",
  e.full_name as "assignedEmployeeName",
  ct.status,
  ct.billing_cycle as "billingCycle",
  ct.monthly_fee as "monthlyFee",
  ct.quarterly_fee as "quarterlyFee",
  ct.contract_value as "contractValue",
  ct.vat_rate as "vatRate",
  ct.payment_due_days as "paymentDueDays",
  ct.billing_start_date as "billingStartDate",
  ct.effective_date as "effectiveDate",
  ct.term_years as "termYears",
  ct.termination_date as "terminationDate",
  ct.notes,
  ct.created_at as "createdAt",
  ct.updated_at as "updatedAt"
`;

export type ContractFilters = {
  status?: string | null;
  customerId?: string | null;
  billingCycle?: string | null;
  assignedEmployeeId?: string | null;
};

export async function listContracts(query: ListQuery, filters: ContractFilters) {
  const values: unknown[] = [];
  const where = ["ct.deleted_at is null"];

  if (query.search) {
    values.push(likeSearch(query.search));
    where.push(`(
      ct.contract_code ilike $${values.length}
      or c.company_name ilike $${values.length}
      or c.customer_code ilike $${values.length}
    )`);
  }

  if (filters.status) {
    contractStatusSchema.parse(filters.status);
    values.push(filters.status);
    where.push(`ct.status = $${values.length}`);
  }

  if (filters.customerId) {
    values.push(filters.customerId);
    where.push(`ct.customer_id = $${values.length}`);
  }

  if (filters.billingCycle) {
    billingCycleSchema.parse(filters.billingCycle);
    values.push(filters.billingCycle);
    where.push(`ct.billing_cycle = $${values.length}`);
  }

  if (filters.assignedEmployeeId) {
    values.push(filters.assignedEmployeeId);
    where.push(`ct.assigned_employee_id = $${values.length}`);
  }

  const whereSql = where.join(" and ");
  const joinSql = `
    from contracts ct
    join customers c on c.id = ct.customer_id
    left join legal_entities le on le.id = ct.legal_entity_id
    left join partners p on p.id = ct.partner_id
    left join employees e on e.id = ct.assigned_employee_id
  `;
  const totalResult = await db.query<{ total: string }>(
    `select count(*)::text as total ${joinSql} where ${whereSql}`,
    values,
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);
  const pagination = getPagination(query.page, query.pageSize, total);

  values.push(query.pageSize, getOffset(query.page, query.pageSize));
  const sortClause = getSortClause(
    query.sortBy,
    query.sortOrder,
    contractSortColumns,
    "ct.created_at",
  );

  const result = await db.query(
    `
      select ${contractSelect}
      ${joinSql}
      where ${whereSql}
      order by ${sortClause}
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function getContract(id: string) {
  const result = await db.query(
    `
      select ${contractSelect}
      from contracts ct
      join customers c on c.id = ct.customer_id
      left join legal_entities le on le.id = ct.legal_entity_id
      left join partners p on p.id = ct.partner_id
      left join employees e on e.id = ct.assigned_employee_id
      where ct.id = $1 and ct.deleted_at is null
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createContract(input: unknown) {
  const data = contractInputSchema.parse(input);
  const result = await db.query(
    `
      insert into contracts (
        contract_code,
        customer_id,
        legal_entity_id,
        partner_id,
        assigned_employee_id,
        status,
        billing_cycle,
        monthly_fee,
        quarterly_fee,
        contract_value,
        vat_rate,
        payment_due_days,
        billing_start_date,
        effective_date,
        term_years,
        termination_date,
        notes
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17
      )
      returning id
    `,
    [
      data.contractCode,
      data.customerId,
      data.legalEntityId ?? null,
      data.partnerId ?? null,
      data.assignedEmployeeId ?? null,
      data.status,
      data.billingCycle,
      data.monthlyFee,
      data.quarterlyFee,
      data.contractValue,
      data.vatRate,
      data.paymentDueDays,
      data.billingStartDate ?? null,
      data.effectiveDate,
      data.termYears ?? null,
      data.terminationDate ?? null,
      data.notes ?? null,
    ],
  );

  return getContract(result.rows[0].id);
}

export async function updateContract(id: string, input: unknown) {
  const data = contractPatchSchema.parse(input);
  const fieldMap: Record<string, string> = {
    contractCode: "contract_code",
    customerId: "customer_id",
    legalEntityId: "legal_entity_id",
    partnerId: "partner_id",
    assignedEmployeeId: "assigned_employee_id",
    status: "status",
    billingCycle: "billing_cycle",
    monthlyFee: "monthly_fee",
    quarterlyFee: "quarterly_fee",
    contractValue: "contract_value",
    vatRate: "vat_rate",
    paymentDueDays: "payment_due_days",
    billingStartDate: "billing_start_date",
    effectiveDate: "effective_date",
    termYears: "term_years",
    terminationDate: "termination_date",
    notes: "notes",
  };
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return getContract(id);
  }

  const values: unknown[] = [];
  const assignments = entries.map(([key, value]) => {
    values.push(value);
    return `${fieldMap[key]} = $${values.length}`;
  });

  values.push(id);
  await db.query(
    `
      update contracts
      set ${assignments.join(", ")}
      where id = $${values.length} and deleted_at is null
    `,
    values,
  );

  return getContract(id);
}

export async function deleteContract(id: string) {
  const result = await db.query(
    `
      update contracts
      set deleted_at = now()
      where id = $1 and deleted_at is null
      returning id
    `,
    [id],
  );

  return Number(result.rowCount ?? 0) > 0;
}
