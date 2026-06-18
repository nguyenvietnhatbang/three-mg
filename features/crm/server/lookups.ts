import { db } from "@/lib/db";

export async function getCrmLookups() {
  const [customers, employees, legalEntities, partners, services] =
    await Promise.all([
      db.query(`
        select id, customer_code as "code", company_name as "name"
        from customers
        where deleted_at is null
        order by company_name asc
        limit 500
      `),
      db.query(`
        select id, employee_code as "code", full_name as "name"
        from employees
        where deleted_at is null
        order by full_name asc
        limit 500
      `),
      db.query(`
        select id, code, name
        from legal_entities
        where deleted_at is null and is_active = true
        order by name asc
        limit 100
      `),
      db.query(`
        select id, code, name
        from partners
        where deleted_at is null and is_active = true
        order by name asc
        limit 100
      `),
      db.query(`
        select id, service_code as "code", name
        from services
        where deleted_at is null and is_active = true
        order by name asc
        limit 500
      `),
    ]);

  return {
    customers: customers.rows,
    employees: employees.rows,
    legalEntities: legalEntities.rows,
    partners: partners.rows,
    services: services.rows,
  };
}

