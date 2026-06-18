import type { PoolClient } from "pg";
import { z } from "zod";
import { BadRequestError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { createManagementCrudService } from "@/features/shared/server/management-crud";
import { calculateLineAmounts } from "./calculations";
import { oneTimeTaskInputSchema, oneTimeTaskPatchSchema, taskStatusSchema } from "./validators";

const uuidFilterSchema = z.string().uuid();

const baseTaskService = createManagementCrudService({
  tableName: "one_time_tasks",
  tableAlias: "ott",
  selectSql: `
    ott.id,
    ott.task_code as "taskCode",
    ott.customer_id as "customerId",
    c.customer_code as "customerCode",
    c.company_name as "customerName",
    ott.service_id as "serviceId",
    s.service_code as "serviceCode",
    s.name as "serviceName",
    ott.responsible_employee_id as "responsibleEmployeeId",
    re.full_name as "responsibleEmployeeName",
    ott.commission_employee_id as "commissionEmployeeId",
    ce.full_name as "commissionEmployeeName",
    ott.status,
    ott.task_date as "taskDate",
    ott.description,
    ott.quantity,
    ott.unit_price as "unitPrice",
    ott.subtotal_amount as "subtotalAmount",
    ott.vat_rate as "vatRate",
    ott.vat_amount as "vatAmount",
    ott.total_amount as "totalAmount",
    ott.revenue_source as "revenueSource",
    ott.approved_at as "approvedAt",
    ott.created_at as "createdAt",
    ott.updated_at as "updatedAt"
  `,
  fromSql: `
    from one_time_tasks ott
    join customers c on c.id = ott.customer_id
    left join services s on s.id = ott.service_id
    left join employees re on re.id = ott.responsible_employee_id
    left join employees ce on ce.id = ott.commission_employee_id
  `,
  searchColumns: ["ott.task_code", "c.customer_code", "c.company_name", "s.name", "ott.description"],
  sortColumns: {
    taskCode: "ott.task_code",
    customerName: "c.company_name",
    serviceName: "s.name",
    status: "ott.status",
    taskDate: "ott.task_date",
    totalAmount: "ott.total_amount",
    createdAt: "ott.created_at",
  },
  defaultSort: "ott.created_at",
  fieldMap: {
    taskCode: "task_code",
    customerId: "customer_id",
    serviceId: "service_id",
    responsibleEmployeeId: "responsible_employee_id",
    commissionEmployeeId: "commission_employee_id",
    status: "status",
    taskDate: "task_date",
    description: "description",
    quantity: "quantity",
    unitPrice: "unit_price",
    subtotalAmount: "subtotal_amount",
    vatRate: "vat_rate",
    vatAmount: "vat_amount",
    totalAmount: "total_amount",
    revenueSource: "revenue_source",
  },
  filters: {
    status: { column: "ott.status", schema: taskStatusSchema },
    customerId: { column: "ott.customer_id", schema: uuidFilterSchema },
    employeeId: { column: "ott.responsible_employee_id", schema: uuidFilterSchema },
  },
  inputSchema: oneTimeTaskInputSchema.transform((data) => ({
    ...data,
    ...calculateLineAmounts(data.quantity, data.unitPrice, data.vatRate),
  })),
  patchSchema: oneTimeTaskPatchSchema.transform((data) => {
    if (data.quantity === undefined && data.unitPrice === undefined && data.vatRate === undefined) {
      return data;
    }

    return {
      ...data,
      ...calculateLineAmounts(data.quantity ?? 1, data.unitPrice ?? 0, data.vatRate ?? 0),
    };
  }),
  beforeUpdate: async (id) => {
    const current = await oneTimeTaskService.get(id);

    if (current && ["completed", "cancelled"].includes(String(current.status))) {
      throw new BadRequestError("Task đã hoàn tất hoặc đã hủy không thể sửa");
    }
  },
});

export const oneTimeTaskService = {
  ...baseTaskService,
  async update(id: string, input: unknown) {
    const current = await baseTaskService.get(id);

    if (!current) {
      return null;
    }

    const patch = oneTimeTaskPatchSchema.parse(input);
    const merged = oneTimeTaskInputSchema.parse({
      taskCode: current.taskCode,
      customerId: current.customerId,
      serviceId: current.serviceId,
      responsibleEmployeeId: current.responsibleEmployeeId,
      commissionEmployeeId: current.commissionEmployeeId,
      status: current.status,
      taskDate: String(current.taskDate).slice(0, 10),
      description: current.description,
      quantity: Number(current.quantity ?? 1),
      unitPrice: Number(current.unitPrice ?? 0),
      vatRate: Number(current.vatRate ?? 0),
      revenueSource: current.revenueSource,
      ...patch,
    });

    return baseTaskService.update(id, merged);
  },
};

export async function submitOneTimeTask(id: string) {
  await transitionTask(id, ["draft"], "pending_approval");
  return oneTimeTaskService.get(id);
}

export async function approveOneTimeTask(id: string) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const task = await getTaskForUpdate(client, id);

    if (!task) {
      throw new BadRequestError("Không tìm thấy task phát sinh");
    }

    if (!["draft", "pending_approval"].includes(task.status)) {
      throw new BadRequestError("Task không ở trạng thái có thể duyệt");
    }

    await client.query(
      "update one_time_tasks set status = 'approved', approved_at = now(), updated_at = now() where id = $1",
      [id],
    );

    const existingOrder = await client.query(
      "select id from orders where one_time_task_id = $1 and deleted_at is null limit 1",
      [id],
    );

    if (!existingOrder.rows[0]) {
      await client.query(
        `
          insert into orders (
            order_no, order_type, status, payment_status, document_date, due_date,
            customer_id, one_time_task_id, service_id, responsible_employee_id,
            commission_employee_id, revenue_source, quantity, unit_price, subtotal_amount,
            vat_rate, vat_amount, total_amount, net_revenue_amount
          )
          values (
            $1, 'one_time', 'draft', 'unpaid', $2, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14, $11
          )
        `,
        [
          `OT-${task.taskCode}`,
          task.taskDate,
          task.customerId,
          id,
          task.serviceId,
          task.responsibleEmployeeId,
          task.commissionEmployeeId,
          task.revenueSource,
          task.quantity,
          task.unitPrice,
          task.subtotalAmount,
          task.vatRate,
          task.vatAmount,
          task.totalAmount,
        ],
      );
    }

    await client.query("commit");

    return oneTimeTaskService.get(id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeOneTimeTask(id: string) {
  await transitionTask(id, ["approved"], "completed");
  return oneTimeTaskService.get(id);
}

export async function cancelOneTimeTask(id: string) {
  await transitionTask(id, ["draft", "pending_approval"], "cancelled");
  return oneTimeTaskService.get(id);
}

async function transitionTask(id: string, allowed: string[], nextStatus: string) {
  const result = await db.query(
    `
      update one_time_tasks
      set status = $2, updated_at = now()
      where id = $1 and deleted_at is null and status = any($3::task_status[])
      returning id
    `,
    [id, nextStatus, allowed],
  );

  if (!result.rows[0]) {
    throw new BadRequestError("Trạng thái task không hợp lệ cho thao tác này");
  }
}

async function getTaskForUpdate(client: PoolClient, id: string) {
  const result = await client.query<{
    id: string;
    taskCode: string;
    customerId: string;
    serviceId: string | null;
    responsibleEmployeeId: string | null;
    commissionEmployeeId: string | null;
    status: string;
    taskDate: string;
    quantity: string;
    unitPrice: string;
    subtotalAmount: string;
    vatRate: string;
    vatAmount: string;
    totalAmount: string;
    revenueSource: string;
  }>(
    `
      select
        id,
        task_code as "taskCode",
        customer_id as "customerId",
        service_id as "serviceId",
        responsible_employee_id as "responsibleEmployeeId",
        commission_employee_id as "commissionEmployeeId",
        status,
        task_date as "taskDate",
        quantity::text as "quantity",
        unit_price::text as "unitPrice",
        subtotal_amount::text as "subtotalAmount",
        vat_rate::text as "vatRate",
        vat_amount::text as "vatAmount",
        total_amount::text as "totalAmount",
        revenue_source as "revenueSource"
      from one_time_tasks
      where id = $1 and deleted_at is null
      for update
    `,
    [id],
  );

  return result.rows[0] ?? null;
}
