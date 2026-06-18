import { z } from "zod";
import { BadRequestError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { createManagementCrudService } from "@/features/shared/server/management-crud";
import { billingCycleSchema } from "./validators";
import {
  contractServiceInputSchema,
  contractServicePatchSchema,
  customerAssignmentInputSchema,
  customerAssignmentPatchSchema,
  customerContactInputSchema,
  customerContactPatchSchema,
  legalEntityInputSchema,
  legalEntityPatchSchema,
  partnerInputSchema,
  partnerPatchSchema,
} from "./validators";

const booleanFilterSchema = z.enum(["true", "false"]).transform((value) => value === "true");
const uuidFilterSchema = z.string().uuid();

export const legalEntityService = createManagementCrudService({
  tableName: "legal_entities",
  tableAlias: "le",
  selectSql: `
    le.id,
    le.code,
    le.name,
    le.tax_code as "taxCode",
    le.address,
    le.is_active as "isActive",
    le.created_at as "createdAt",
    le.updated_at as "updatedAt"
  `,
  fromSql: "from legal_entities le",
  searchColumns: ["le.code", "le.name", "le.tax_code", "le.address"],
  sortColumns: {
    code: "le.code",
    name: "le.name",
    taxCode: "le.tax_code",
    isActive: "le.is_active",
    createdAt: "le.created_at",
  },
  defaultSort: "le.created_at",
  fieldMap: {
    code: "code",
    name: "name",
    taxCode: "tax_code",
    address: "address",
    isActive: "is_active",
  },
  filters: {
    isActive: { column: "le.is_active", schema: booleanFilterSchema },
  },
  inputSchema: legalEntityInputSchema,
  patchSchema: legalEntityPatchSchema,
});

export const partnerService = createManagementCrudService({
  tableName: "partners",
  tableAlias: "p",
  selectSql: `
    p.id,
    p.code,
    p.name,
    p.tax_code as "taxCode",
    p.address,
    p.email,
    p.phone,
    p.is_active as "isActive",
    p.created_at as "createdAt",
    p.updated_at as "updatedAt"
  `,
  fromSql: "from partners p",
  searchColumns: ["p.code", "p.name", "p.tax_code", "p.email", "p.phone"],
  sortColumns: {
    code: "p.code",
    name: "p.name",
    taxCode: "p.tax_code",
    isActive: "p.is_active",
    createdAt: "p.created_at",
  },
  defaultSort: "p.created_at",
  fieldMap: {
    code: "code",
    name: "name",
    taxCode: "tax_code",
    address: "address",
    email: "email",
    phone: "phone",
    isActive: "is_active",
  },
  filters: {
    isActive: { column: "p.is_active", schema: booleanFilterSchema },
  },
  inputSchema: partnerInputSchema,
  patchSchema: partnerPatchSchema,
});

export const customerContactService = createManagementCrudService({
  tableName: "customer_contacts",
  tableAlias: "cc",
  selectSql: `
    cc.id,
    cc.customer_id as "customerId",
    c.customer_code as "customerCode",
    c.company_name as "customerName",
    cc.full_name as "fullName",
    cc.title,
    cc.email,
    cc.phone,
    cc.is_primary as "isPrimary",
    cc.created_at as "createdAt",
    cc.updated_at as "updatedAt"
  `,
  fromSql: `
    from customer_contacts cc
    join customers c on c.id = cc.customer_id
  `,
  searchColumns: ["c.customer_code", "c.company_name", "cc.full_name", "cc.email", "cc.phone"],
  sortColumns: {
    customerName: "c.company_name",
    fullName: "cc.full_name",
    title: "cc.title",
    isPrimary: "cc.is_primary",
    createdAt: "cc.created_at",
  },
  defaultSort: "cc.created_at",
  fieldMap: {
    customerId: "customer_id",
    fullName: "full_name",
    title: "title",
    email: "email",
    phone: "phone",
    isPrimary: "is_primary",
  },
  filters: {
    customerId: { column: "cc.customer_id", schema: uuidFilterSchema },
    isPrimary: { column: "cc.is_primary", schema: booleanFilterSchema },
  },
  inputSchema: customerContactInputSchema,
  patchSchema: customerContactPatchSchema,
});

export const customerAssignmentService = createManagementCrudService({
  tableName: "customer_employee_assignments",
  tableAlias: "cea",
  selectSql: `
    cea.id,
    cea.customer_id as "customerId",
    c.customer_code as "customerCode",
    c.company_name as "customerName",
    cea.employee_id as "employeeId",
    e.employee_code as "employeeCode",
    e.full_name as "employeeName",
    cea.role_name as "roleName",
    cea.effective_from as "effectiveFrom",
    cea.effective_to as "effectiveTo",
    cea.created_at as "createdAt",
    cea.updated_at as "updatedAt"
  `,
  fromSql: `
    from customer_employee_assignments cea
    join customers c on c.id = cea.customer_id
    join employees e on e.id = cea.employee_id
  `,
  searchColumns: ["c.customer_code", "c.company_name", "e.employee_code", "e.full_name", "cea.role_name"],
  sortColumns: {
    customerName: "c.company_name",
    employeeName: "e.full_name",
    roleName: "cea.role_name",
    effectiveFrom: "cea.effective_from",
    createdAt: "cea.created_at",
  },
  defaultSort: "cea.created_at",
  fieldMap: {
    customerId: "customer_id",
    employeeId: "employee_id",
    roleName: "role_name",
    effectiveFrom: "effective_from",
    effectiveTo: "effective_to",
  },
  filters: {
    customerId: { column: "cea.customer_id", schema: uuidFilterSchema },
    employeeId: { column: "cea.employee_id", schema: uuidFilterSchema },
  },
  inputSchema: customerAssignmentInputSchema,
  patchSchema: customerAssignmentPatchSchema,
});

export const contractServiceService = createManagementCrudService({
  tableName: "contract_services",
  tableAlias: "cs",
  selectSql: `
    cs.id,
    cs.contract_id as "contractId",
    ct.contract_code as "contractCode",
    c.company_name as "customerName",
    cs.service_id as "serviceId",
    s.service_code as "serviceCode",
    s.name as "serviceName",
    cs.billing_cycle as "billingCycle",
    cs.quantity,
    cs.unit_price as "unitPrice",
    cs.vat_rate as "vatRate",
    cs.is_primary as "isPrimary",
    cs.effective_from as "effectiveFrom",
    cs.effective_to as "effectiveTo",
    cs.created_at as "createdAt",
    cs.updated_at as "updatedAt"
  `,
  fromSql: `
    from contract_services cs
    join contracts ct on ct.id = cs.contract_id
    join customers c on c.id = ct.customer_id
    join services s on s.id = cs.service_id
  `,
  searchColumns: ["ct.contract_code", "c.company_name", "s.service_code", "s.name"],
  sortColumns: {
    contractCode: "ct.contract_code",
    customerName: "c.company_name",
    serviceName: "s.name",
    billingCycle: "cs.billing_cycle",
    effectiveFrom: "cs.effective_from",
    createdAt: "cs.created_at",
  },
  defaultSort: "cs.created_at",
  fieldMap: {
    contractId: "contract_id",
    serviceId: "service_id",
    billingCycle: "billing_cycle",
    quantity: "quantity",
    unitPrice: "unit_price",
    vatRate: "vat_rate",
    isPrimary: "is_primary",
    effectiveFrom: "effective_from",
    effectiveTo: "effective_to",
  },
  filters: {
    contractId: { column: "cs.contract_id", schema: uuidFilterSchema },
    serviceId: { column: "cs.service_id", schema: uuidFilterSchema },
    billingCycle: { column: "cs.billing_cycle", schema: billingCycleSchema },
  },
  inputSchema: contractServiceInputSchema,
  patchSchema: contractServicePatchSchema,
  beforeCreate: validateActiveService,
  beforeUpdate: async (_id, data) => validateActiveService(data),
});

async function validateActiveService(data: Record<string, unknown>) {
  if (!data.serviceId) {
    return;
  }

  const result = await db.query<{ id: string }>(
    `
      select id
      from services
      where id = $1 and is_active = true and deleted_at is null
    `,
    [data.serviceId],
  );

  if (!result.rows[0]) {
    throw new BadRequestError("Dịch vụ đã ngưng hoạt động hoặc không tồn tại, không thể chọn cho hợp đồng");
  }
}
