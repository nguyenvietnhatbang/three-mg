import { db } from "@/lib/db";

export async function getRevenueLookups() {
  const [batches, oneTimeTasks, orders, contractServices] = await Promise.all([
    db.query(`
      select id, batch_code as code, concat(period_start, ' - ', period_end) as name
      from recurring_revenue_batches
      where deleted_at is null
      order by created_at desc
      limit 300
    `),
    db.query(`
      select id, task_code as code, description as name
      from one_time_tasks
      where deleted_at is null
      order by task_date desc
      limit 300
    `),
    db.query(`
      select o.id, o.order_no as code, concat(o.order_no, ' - ', c.company_name) as name
      from orders o
      join customers c on c.id = o.customer_id
      where o.deleted_at is null
      order by o.document_date desc
      limit 500
    `),
    db.query(`
      select cs.id, ct.contract_code as code, concat(ct.contract_code, ' - ', s.name) as name
      from contract_services cs
      join contracts ct on ct.id = cs.contract_id
      join services s on s.id = cs.service_id
      where cs.deleted_at is null
      order by ct.contract_code asc
      limit 500
    `),
  ]);

  return {
    recurringBatches: batches.rows,
    oneTimeTasks: oneTimeTasks.rows,
    orders: orders.rows,
    contractServices: contractServices.rows,
  };
}
