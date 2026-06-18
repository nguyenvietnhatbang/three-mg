import { db } from "@/lib/db";

export async function getFinanceLookups() {
  const [issuedOrders, payments, debtEntries, settlements] = await Promise.all([
    db.query(`
      select o.id, o.order_no as code, concat(o.order_no, ' - ', c.company_name) as name
      from orders o
      join customers c on c.id = o.customer_id
      where o.deleted_at is null
        and o.status not in ('draft', 'cancelled', 'written_off')
      order by o.document_date desc
      limit 500
    `),
    db.query(`
      select id, payment_no as code, payment_no as name
      from payments
      where deleted_at is null
      order by payment_date desc
      limit 300
    `),
    db.query(`
      select id, entry_type as code, description as name
      from debt_entries
      where deleted_at is null
      order by entry_date desc
      limit 300
    `),
    db.query(`
      select ps.id, ps.settlement_no as code, concat(ps.settlement_no, ' - ', p.name) as name
      from partner_settlements ps
      join partners p on p.id = ps.partner_id
      where ps.deleted_at is null
      order by ps.settlement_date desc
      limit 300
    `),
  ]);

  return {
    issuedOrders: issuedOrders.rows,
    payments: payments.rows,
    debtEntries: debtEntries.rows,
    partnerSettlements: settlements.rows,
  };
}
