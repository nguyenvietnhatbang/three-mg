-- 3M Management System - Initial PostgreSQL schema
-- Scope: CRM, contracts, services, recurring revenue, one-time work,
-- payments, debts, partners, HR, leave, payroll policy/versioning, KPI views.

begin;

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create type user_status as enum ('active', 'inactive', 'locked');
create type employee_status as enum ('active', 'probation', 'inactive', 'terminated');
create type employment_contract_type as enum ('full_time', 'part_time', 'probation', 'contractor', 'other');
create type salary_payment_type as enum ('gross', 'net');
create type policy_status as enum ('draft', 'active', 'inactive', 'archived');
create type customer_status as enum ('active', 'inactive', 'archived');
create type contract_status as enum ('draft', 'active', 'expiring', 'terminated', 'cancelled');
create type billing_cycle as enum ('monthly', 'quarterly', 'yearly', 'one_time', 'custom');
create type revenue_source as enum ('3m', 'topa', 'offset', 'partner', 'other');
create type batch_status as enum ('draft', 'reviewing', 'approved', 'locked', 'cancelled');
create type task_status as enum ('draft', 'pending_approval', 'approved', 'completed', 'cancelled');
create type order_type as enum ('recurring', 'one_time', 'manual_adjustment');
create type order_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'cancelled', 'written_off');
create type payment_status as enum ('unpaid', 'partially_paid', 'paid', 'overpaid', 'cancelled');
create type payment_method as enum ('bank_transfer', 'cash', 'offset', 'other');
create type debt_entry_type as enum ('opening_balance', 'order_debit', 'payment_credit', 'adjustment_debit', 'adjustment_credit', 'write_off');
create type partner_settlement_type as enum ('payable', 'receivable', 'collection_on_behalf', 'offset');
create type settlement_status as enum ('draft', 'confirmed', 'partially_paid', 'paid', 'offset', 'cancelled');
create type leave_request_status as enum ('draft', 'pending', 'approved', 'rejected', 'cancelled');
create type payroll_period_status as enum ('draft', 'calculated', 'reviewing', 'approved', 'locked', 'paid', 'cancelled');
create type taxability_type as enum ('taxable', 'non_taxable');
create type insurance_paid_by as enum ('employee', 'employer');
create type import_status as enum ('uploaded', 'validating', 'validated', 'processing', 'completed', 'failed', 'cancelled');
create type import_row_status as enum ('pending', 'valid', 'invalid', 'processed', 'skipped');

-- ============================================================
-- Access control
-- ============================================================

create table roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  module text not null,
  action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text,
  status user_status not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id)
);

create table user_roles (
  user_id uuid not null references app_users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references app_users(id),
  primary key (user_id, role_id)
);

-- ============================================================
-- HR master data, departments, employee contracts, leave
-- ============================================================

create table departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  parent_department_id uuid references departments(id),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id)
);

create table job_levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  rank_order integer not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  full_name text not null,
  short_name text,
  department_id uuid references departments(id),
  job_level_id uuid references job_levels(id),
  work_email text unique,
  personal_email text,
  phone text,
  status employee_status not null default 'active',
  hire_date date,
  termination_date date,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (termination_date is null or hire_date is null or termination_date >= hire_date)
);

alter table app_users
  add column employee_id uuid unique references employees(id);

alter table departments
  add column manager_employee_id uuid references employees(id);

create table employee_contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  contract_number text,
  contract_type employment_contract_type not null,
  salary_payment_type salary_payment_type not null default 'gross',
  base_salary numeric(18,2) not null default 0 check (base_salary >= 0),
  standard_workdays numeric(6,2) check (standard_workdays is null or standard_workdays > 0),
  effective_from date not null,
  effective_to date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from)
);

create table employee_dependents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  full_name text not null,
  relationship text,
  tax_dependent_code text,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from)
);

create table employee_payroll_settings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  salary_payment_type salary_payment_type not null,
  participates_insurance boolean not null default true,
  eligible_for_commission boolean not null default true,
  eligible_for_exceeded_revenue_commission boolean not null default true,
  eligible_for_one_time_customer_commission boolean not null default true,
  eligible_for_new_customer_commission boolean not null default true,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from)
);

create table leave_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_paid boolean not null default true,
  annual_quota_days numeric(6,2) not null default 0 check (annual_quota_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  leave_type_id uuid not null references leave_types(id),
  status leave_request_status not null default 'draft',
  start_date date not null,
  end_date date not null,
  total_days numeric(6,2) not null check (total_days > 0),
  reason text,
  approved_by uuid references employees(id),
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (end_date >= start_date)
);

create table leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  leave_type_id uuid not null references leave_types(id),
  year integer not null check (year >= 2000),
  opening_days numeric(8,2) not null default 0,
  earned_days numeric(8,2) not null default 0,
  used_days numeric(8,2) not null default 0,
  adjusted_days numeric(8,2) not null default 0,
  closing_days numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, leave_type_id, year)
);

create table company_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null,
  is_paid boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id)
);

-- ============================================================
-- Customers, partners, services, contracts
-- ============================================================

create table legal_entities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  tax_code text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table partners (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  tax_code text,
  address text,
  email text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique,
  company_name text not null,
  short_name text,
  tax_code text,
  address text,
  email text,
  phone text,
  representative_name text,
  representative_title text,
  accounting_software text,
  accounting_software_url text,
  assigned_employee_id uuid references employees(id),
  default_legal_entity_id uuid references legal_entities(id),
  status customer_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id)
);

create unique index customers_tax_code_active_uidx
  on customers (tax_code)
  where tax_code is not null and deleted_at is null;

create table customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  full_name text not null,
  title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id)
);

create table customer_employee_assignments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  employee_id uuid not null references employees(id),
  role_name text not null default 'primary_owner',
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from)
);

create table services (
  id uuid primary key default gen_random_uuid(),
  service_code text not null unique,
  name text not null,
  description text,
  standard_unit_price numeric(18,2) not null default 0 check (standard_unit_price >= 0),
  service_type text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id)
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  contract_code text not null unique,
  customer_id uuid not null references customers(id),
  legal_entity_id uuid references legal_entities(id),
  partner_id uuid references partners(id),
  assigned_employee_id uuid references employees(id),
  status contract_status not null default 'draft',
  billing_cycle billing_cycle not null default 'monthly',
  monthly_fee numeric(18,2) not null default 0 check (monthly_fee >= 0),
  quarterly_fee numeric(18,2) not null default 0 check (quarterly_fee >= 0),
  contract_value numeric(18,2) not null default 0 check (contract_value >= 0),
  vat_rate numeric(7,4) not null default 0 check (vat_rate >= 0),
  payment_due_days integer not null default 15 check (payment_due_days >= 0),
  billing_start_date date,
  effective_date date not null,
  term_years numeric(6,2) check (term_years is null or term_years >= 0),
  termination_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (termination_date is null or termination_date >= effective_date)
);

create table contract_services (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  service_id uuid not null references services(id),
  billing_cycle billing_cycle not null default 'monthly',
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit_price numeric(18,2) not null default 0 check (unit_price >= 0),
  vat_rate numeric(7,4) not null default 0 check (vat_rate >= 0),
  is_primary boolean not null default false,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from)
);

-- ============================================================
-- Revenue, one-time work, payments, debt, partner settlement
-- ============================================================

create table recurring_revenue_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  period_start date not null,
  period_end date not null,
  status batch_status not null default 'draft',
  generated_at timestamptz,
  approved_by uuid references employees(id),
  approved_at timestamptz,
  locked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (period_end >= period_start)
);

create table one_time_tasks (
  id uuid primary key default gen_random_uuid(),
  task_code text not null unique,
  customer_id uuid not null references customers(id),
  service_id uuid references services(id),
  responsible_employee_id uuid references employees(id),
  commission_employee_id uuid references employees(id),
  status task_status not null default 'draft',
  task_date date not null,
  description text not null,
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit_price numeric(18,2) not null default 0 check (unit_price >= 0),
  subtotal_amount numeric(18,2) not null default 0 check (subtotal_amount >= 0),
  vat_rate numeric(7,4) not null default 0 check (vat_rate >= 0),
  vat_amount numeric(18,2) not null default 0 check (vat_amount >= 0),
  total_amount numeric(18,2) not null default 0 check (total_amount >= 0),
  revenue_source revenue_source not null default '3m',
  approved_by uuid references employees(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  order_type order_type not null,
  status order_status not null default 'draft',
  payment_status payment_status not null default 'unpaid',
  document_date date not null,
  due_date date,
  period_start date,
  period_end date,
  customer_id uuid not null references customers(id),
  contract_id uuid references contracts(id),
  contract_service_id uuid references contract_services(id),
  recurring_batch_id uuid references recurring_revenue_batches(id),
  one_time_task_id uuid references one_time_tasks(id),
  service_id uuid references services(id),
  legal_entity_id uuid references legal_entities(id),
  partner_id uuid references partners(id),
  responsible_employee_id uuid references employees(id),
  commission_employee_id uuid references employees(id),
  revenue_source revenue_source not null default '3m',
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit_price numeric(18,2) not null default 0 check (unit_price >= 0),
  subtotal_amount numeric(18,2) not null default 0 check (subtotal_amount >= 0),
  vat_rate numeric(7,4) not null default 0 check (vat_rate >= 0),
  vat_amount numeric(18,2) not null default 0 check (vat_amount >= 0),
  total_amount numeric(18,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(18,2) not null default 0 check (paid_amount >= 0),
  net_revenue_amount numeric(18,2) not null default 0 check (net_revenue_amount >= 0),
  shared_revenue_amount numeric(18,2) not null default 0 check (shared_revenue_amount >= 0),
  partner_payable_amount numeric(18,2) not null default 0 check (partner_payable_amount >= 0),
  notes text,
  issued_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (period_end is null or period_start is null or period_end >= period_start),
  check (paid_amount <= total_amount or payment_status = 'overpaid')
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  payment_no text not null unique,
  customer_id uuid not null references customers(id),
  payment_date date not null,
  method payment_method not null default 'bank_transfer',
  amount numeric(18,2) not null check (amount > 0),
  reference_no text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id)
);

create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  order_id uuid not null references orders(id),
  allocated_amount numeric(18,2) not null check (allocated_amount > 0),
  created_at timestamptz not null default now(),
  created_by uuid references app_users(id),
  unique (payment_id, order_id)
);

create table debt_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  order_id uuid references orders(id),
  payment_id uuid references payments(id),
  entry_date date not null,
  entry_type debt_entry_type not null,
  description text not null,
  debit_amount numeric(18,2) not null default 0 check (debit_amount >= 0),
  credit_amount numeric(18,2) not null default 0 check (credit_amount >= 0),
  balance_after_entry numeric(18,2),
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (debit_amount > 0 or credit_amount > 0)
);

create table debt_period_closings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  period_start date not null,
  period_end date not null,
  opening_balance numeric(18,2) not null default 0,
  debit_amount numeric(18,2) not null default 0,
  credit_amount numeric(18,2) not null default 0,
  closing_balance numeric(18,2) not null default 0,
  locked_at timestamptz,
  locked_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, period_start, period_end),
  check (period_end >= period_start)
);

create table partner_settlements (
  id uuid primary key default gen_random_uuid(),
  settlement_no text not null unique,
  partner_id uuid not null references partners(id),
  order_id uuid references orders(id),
  settlement_type partner_settlement_type not null,
  status settlement_status not null default 'draft',
  settlement_date date not null,
  due_date date,
  amount numeric(18,2) not null check (amount >= 0),
  paid_amount numeric(18,2) not null default 0 check (paid_amount >= 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (paid_amount <= amount)
);

create table partner_settlement_payments (
  id uuid primary key default gen_random_uuid(),
  partner_settlement_id uuid not null references partner_settlements(id) on delete cascade,
  payment_date date not null,
  method payment_method not null default 'bank_transfer',
  amount numeric(18,2) not null check (amount > 0),
  reference_no text,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references app_users(id)
);

-- ============================================================
-- Payroll policies, payroll periods, payroll results
-- ============================================================

create table payroll_policy_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status policy_status not null default 'draft',
  effective_from date not null,
  effective_to date,
  standard_workdays numeric(6,2) check (standard_workdays is null or standard_workdays > 0),
  gross_up_method text,
  config jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from)
);

create table tax_policy_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status policy_status not null default 'draft',
  effective_from date not null,
  effective_to date,
  personal_deduction_amount numeric(18,2) not null default 0 check (personal_deduction_amount >= 0),
  dependent_deduction_amount numeric(18,2) not null default 0 check (dependent_deduction_amount >= 0),
  tax_method text not null default 'progressive',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from)
);

create table tax_policy_brackets (
  id uuid primary key default gen_random_uuid(),
  tax_policy_version_id uuid not null references tax_policy_versions(id) on delete cascade,
  bracket_order integer not null check (bracket_order > 0),
  from_amount numeric(18,2) not null check (from_amount >= 0),
  to_amount numeric(18,2),
  tax_rate numeric(7,4) not null check (tax_rate >= 0),
  quick_deduction_amount numeric(18,2) not null default 0 check (quick_deduction_amount >= 0),
  created_at timestamptz not null default now(),
  unique (tax_policy_version_id, bracket_order),
  check (to_amount is null or to_amount > from_amount)
);

create table insurance_policy_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status policy_status not null default 'draft',
  effective_from date not null,
  effective_to date,
  employer_social_rate numeric(7,4) not null default 0 check (employer_social_rate >= 0),
  employer_health_rate numeric(7,4) not null default 0 check (employer_health_rate >= 0),
  employer_unemployment_rate numeric(7,4) not null default 0 check (employer_unemployment_rate >= 0),
  employer_union_rate numeric(7,4) not null default 0 check (employer_union_rate >= 0),
  employee_social_rate numeric(7,4) not null default 0 check (employee_social_rate >= 0),
  employee_health_rate numeric(7,4) not null default 0 check (employee_health_rate >= 0),
  employee_unemployment_rate numeric(7,4) not null default 0 check (employee_unemployment_rate >= 0),
  min_insurance_base numeric(18,2) check (min_insurance_base is null or min_insurance_base >= 0),
  max_insurance_base numeric(18,2) check (max_insurance_base is null or max_insurance_base >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from),
  check (max_insurance_base is null or min_insurance_base is null or max_insurance_base >= min_insurance_base)
);

create table income_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  taxability taxability_type not null,
  is_commission boolean not null default false,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table deduction_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table commission_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status policy_status not null default 'draft',
  commission_type text not null,
  department_id uuid references departments(id),
  job_level_id uuid references job_levels(id),
  contract_type employment_contract_type,
  salary_payment_type salary_payment_type,
  target_revenue_multiplier numeric(10,4) check (target_revenue_multiplier is null or target_revenue_multiplier >= 0),
  min_rate numeric(7,4) check (min_rate is null or min_rate >= 0),
  default_rate numeric(7,4) check (default_rate is null or default_rate >= 0),
  max_rate numeric(7,4) check (max_rate is null or max_rate >= 0),
  effective_from date not null,
  effective_to date,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from),
  check (max_rate is null or min_rate is null or max_rate >= min_rate)
);

create table allowance_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status policy_status not null default 'draft',
  income_type_id uuid references income_types(id),
  department_id uuid references departments(id),
  job_level_id uuid references job_levels(id),
  contract_type employment_contract_type,
  work_area text,
  amount numeric(18,2) not null default 0 check (amount >= 0),
  taxability taxability_type not null default 'taxable',
  effective_from date not null,
  effective_to date,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from)
);

create table employee_policy_overrides (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  override_type text not null,
  income_type_id uuid references income_types(id),
  deduction_type_id uuid references deduction_types(id),
  amount numeric(18,2),
  rate numeric(7,4),
  reason text not null,
  approved_by uuid references employees(id),
  approved_at timestamptz,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (effective_to is null or effective_to >= effective_from)
);

create table payroll_periods (
  id uuid primary key default gen_random_uuid(),
  period_code text not null unique,
  period_start date not null,
  period_end date not null,
  status payroll_period_status not null default 'draft',
  payroll_policy_version_id uuid references payroll_policy_versions(id),
  tax_policy_version_id uuid references tax_policy_versions(id),
  insurance_policy_version_id uuid references insurance_policy_versions(id),
  calculated_at timestamptz,
  approved_by uuid references employees(id),
  approved_at timestamptz,
  locked_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  check (period_end >= period_start)
);

create table payroll_inputs (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  employee_id uuid not null references employees(id),
  actual_workdays numeric(8,2) not null default 0 check (actual_workdays >= 0),
  unpaid_leave_days numeric(8,2) not null default 0 check (unpaid_leave_days >= 0),
  overtime_hours numeric(8,2) not null default 0 check (overtime_hours >= 0),
  revenue_amount numeric(18,2) not null default 0 check (revenue_amount >= 0),
  exceeded_revenue_amount numeric(18,2) not null default 0 check (exceeded_revenue_amount >= 0),
  one_time_job_revenue_amount numeric(18,2) not null default 0 check (one_time_job_revenue_amount >= 0),
  new_customer_revenue_amount numeric(18,2) not null default 0 check (new_customer_revenue_amount >= 0),
  advance_amount numeric(18,2) not null default 0 check (advance_amount >= 0),
  reimbursement_amount numeric(18,2) not null default 0,
  taxable_adjustment_amount numeric(18,2) not null default 0,
  non_taxable_adjustment_amount numeric(18,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  unique (payroll_period_id, employee_id)
);

create table payroll_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  employee_id uuid not null references employees(id),
  salary_payment_type salary_payment_type not null,
  contract_type employment_contract_type,
  base_salary numeric(18,2) not null default 0 check (base_salary >= 0),
  standard_workdays numeric(8,2),
  actual_workdays numeric(8,2) not null default 0 check (actual_workdays >= 0),
  time_salary_amount numeric(18,2) not null default 0 check (time_salary_amount >= 0),
  gross_up_salary_amount numeric(18,2) not null default 0 check (gross_up_salary_amount >= 0),
  non_taxable_income_amount numeric(18,2) not null default 0 check (non_taxable_income_amount >= 0),
  taxable_income_amount numeric(18,2) not null default 0 check (taxable_income_amount >= 0),
  allowance_bonus_amount numeric(18,2) not null default 0 check (allowance_bonus_amount >= 0),
  gross_salary_amount numeric(18,2) not null default 0 check (gross_salary_amount >= 0),
  personal_deduction_amount numeric(18,2) not null default 0 check (personal_deduction_amount >= 0),
  dependent_count integer not null default 0 check (dependent_count >= 0),
  dependent_deduction_amount numeric(18,2) not null default 0 check (dependent_deduction_amount >= 0),
  employee_insurance_amount numeric(18,2) not null default 0 check (employee_insurance_amount >= 0),
  total_deduction_amount numeric(18,2) not null default 0 check (total_deduction_amount >= 0),
  taxable_amount numeric(18,2) not null default 0 check (taxable_amount >= 0),
  personal_income_tax_amount numeric(18,2) not null default 0 check (personal_income_tax_amount >= 0),
  net_salary_amount numeric(18,2) not null default 0 check (net_salary_amount >= 0),
  advance_amount numeric(18,2) not null default 0 check (advance_amount >= 0),
  reimbursement_amount numeric(18,2) not null default 0,
  other_adjustment_amount numeric(18,2) not null default 0,
  bank_transfer_amount numeric(18,2) not null default 0,
  employer_insurance_amount numeric(18,2) not null default 0 check (employer_insurance_amount >= 0),
  total_insurance_amount numeric(18,2) not null default 0 check (total_insurance_amount >= 0),
  status payroll_period_status not null default 'draft',
  snapshot_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  unique (payroll_period_id, employee_id)
);

create table payroll_income_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_line_id uuid not null references payroll_lines(id) on delete cascade,
  income_type_id uuid not null references income_types(id),
  source_table text,
  source_id uuid,
  description text,
  taxability taxability_type not null,
  amount numeric(18,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references app_users(id)
);

create table payroll_deduction_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_line_id uuid not null references payroll_lines(id) on delete cascade,
  deduction_type_id uuid not null references deduction_types(id),
  source_table text,
  source_id uuid,
  description text,
  amount numeric(18,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references app_users(id)
);

create table payroll_insurance_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_line_id uuid not null references payroll_lines(id) on delete cascade,
  insurance_type text not null,
  paid_by insurance_paid_by not null,
  rate numeric(7,4) not null check (rate >= 0),
  base_amount numeric(18,2) not null check (base_amount >= 0),
  amount numeric(18,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references app_users(id)
);

create table payroll_tax_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_line_id uuid not null references payroll_lines(id) on delete cascade,
  bracket_order integer not null,
  from_amount numeric(18,2) not null check (from_amount >= 0),
  to_amount numeric(18,2),
  taxable_amount numeric(18,2) not null check (taxable_amount >= 0),
  tax_rate numeric(7,4) not null check (tax_rate >= 0),
  tax_amount numeric(18,2) not null check (tax_amount >= 0),
  created_at timestamptz not null default now(),
  check (to_amount is null or to_amount > from_amount)
);

create table payroll_snapshots (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  employee_id uuid references employees(id),
  snapshot_type text not null,
  snapshot_data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references app_users(id)
);

-- ============================================================
-- Import tracking for customer sheets
-- ============================================================

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_sheet text,
  original_file_name text,
  status import_status not null default 'uploaded',
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  invalid_rows integer not null default 0 check (invalid_rows >= 0),
  processed_rows integer not null default 0 check (processed_rows >= 0),
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references app_users(id)
);

create table import_rows (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references import_batches(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  status import_row_status not null default 'pending',
  raw_data jsonb not null,
  normalized_data jsonb not null default '{}'::jsonb,
  error_messages jsonb not null default '[]'::jsonb,
  target_table text,
  target_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_batch_id, row_number)
);

-- ============================================================
-- KPI snapshots and reporting views
-- ============================================================

create table kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  employee_id uuid references employees(id),
  department_id uuid references departments(id),
  total_revenue_amount numeric(18,2) not null default 0,
  recurring_revenue_amount numeric(18,2) not null default 0,
  one_time_revenue_amount numeric(18,2) not null default 0,
  payroll_cost_amount numeric(18,2) not null default 0,
  benefit_cost_amount numeric(18,2) not null default 0,
  commission_amount numeric(18,2) not null default 0,
  payroll_cost_revenue_ratio numeric(12,6),
  snapshot_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references app_users(id),
  check (period_end >= period_start),
  unique (period_start, period_end, employee_id, department_id)
);

create view v_customer_debt_summary as
select
  c.id as customer_id,
  c.customer_code,
  c.company_name,
  coalesce(sum(de.debit_amount), 0) as total_debit_amount,
  coalesce(sum(de.credit_amount), 0) as total_credit_amount,
  coalesce(sum(de.debit_amount - de.credit_amount), 0) as ending_balance_amount
from customers c
left join debt_entries de on de.customer_id = c.id and de.deleted_at is null
where c.deleted_at is null
group by c.id, c.customer_code, c.company_name;

create view v_employee_revenue_monthly as
select
  date_trunc('month', o.document_date)::date as revenue_month,
  o.commission_employee_id as employee_id,
  e.full_name as employee_name,
  sum(o.net_revenue_amount) as net_revenue_amount,
  sum(case when o.order_type = 'recurring' then o.net_revenue_amount else 0 end) as recurring_revenue_amount,
  sum(case when o.order_type = 'one_time' then o.net_revenue_amount else 0 end) as one_time_revenue_amount,
  count(*) as order_count
from orders o
left join employees e on e.id = o.commission_employee_id
where o.deleted_at is null
  and o.status <> 'cancelled'
group by date_trunc('month', o.document_date)::date, o.commission_employee_id, e.full_name;

create view v_partner_balance_summary as
select
  p.id as partner_id,
  p.code as partner_code,
  p.name as partner_name,
  sum(case when ps.settlement_type in ('payable', 'collection_on_behalf') then ps.amount - ps.paid_amount else 0 end) as payable_balance_amount,
  sum(case when ps.settlement_type = 'receivable' then ps.amount - ps.paid_amount else 0 end) as receivable_balance_amount,
  sum(case when ps.settlement_type = 'offset' then ps.amount else 0 end) as offset_amount
from partners p
left join partner_settlements ps on ps.partner_id = p.id and ps.deleted_at is null and ps.status <> 'cancelled'
where p.deleted_at is null
group by p.id, p.code, p.name;

create view v_payroll_kpi_monthly as
select
  pp.period_start,
  pp.period_end,
  pl.employee_id,
  e.department_id,
  pl.gross_salary_amount,
  pl.employer_insurance_amount,
  pl.total_insurance_amount,
  pl.bank_transfer_amount,
  (pl.gross_salary_amount + pl.employer_insurance_amount) as payroll_cost_amount
from payroll_lines pl
join payroll_periods pp on pp.id = pl.payroll_period_id
join employees e on e.id = pl.employee_id
where pl.deleted_at is null
  and pp.status in ('approved', 'locked', 'paid');

-- ============================================================
-- Indexes
-- ============================================================

create index app_users_employee_id_idx on app_users(employee_id);
create index employees_department_id_idx on employees(department_id);
create index employees_job_level_id_idx on employees(job_level_id);
create index employees_status_idx on employees(status);
create index employee_contracts_employee_effective_idx on employee_contracts(employee_id, effective_from, effective_to);
create index leave_requests_employee_status_idx on leave_requests(employee_id, status, start_date);

create index customers_assigned_employee_id_idx on customers(assigned_employee_id);
create index customers_company_name_idx on customers(company_name);
create index customer_contacts_customer_id_idx on customer_contacts(customer_id);
create index customer_employee_assignments_customer_idx on customer_employee_assignments(customer_id, effective_from, effective_to);
create index services_active_idx on services(is_active);
create index contracts_customer_id_idx on contracts(customer_id);
create index contracts_status_idx on contracts(status);
create index contracts_assigned_employee_id_idx on contracts(assigned_employee_id);
create index contract_services_contract_id_idx on contract_services(contract_id);
create index contract_services_service_id_idx on contract_services(service_id);

create index recurring_revenue_batches_period_idx on recurring_revenue_batches(period_start, period_end, status);
create index one_time_tasks_customer_id_idx on one_time_tasks(customer_id);
create index one_time_tasks_responsible_employee_id_idx on one_time_tasks(responsible_employee_id);
create index one_time_tasks_status_date_idx on one_time_tasks(status, task_date);
create index orders_customer_id_idx on orders(customer_id);
create index orders_contract_id_idx on orders(contract_id);
create index orders_document_date_idx on orders(document_date);
create index orders_status_payment_status_idx on orders(status, payment_status);
create index orders_responsible_employee_id_idx on orders(responsible_employee_id);
create index orders_commission_employee_id_idx on orders(commission_employee_id);
create index orders_partner_id_idx on orders(partner_id);
create index payments_customer_date_idx on payments(customer_id, payment_date);
create index payment_allocations_order_id_idx on payment_allocations(order_id);
create index debt_entries_customer_date_idx on debt_entries(customer_id, entry_date);
create index debt_entries_order_id_idx on debt_entries(order_id);
create index partner_settlements_partner_status_idx on partner_settlements(partner_id, status);

create index payroll_policy_versions_effective_idx on payroll_policy_versions(effective_from, effective_to, status);
create index tax_policy_versions_effective_idx on tax_policy_versions(effective_from, effective_to, status);
create index insurance_policy_versions_effective_idx on insurance_policy_versions(effective_from, effective_to, status);
create index commission_policies_effective_idx on commission_policies(effective_from, effective_to, status);
create index allowance_policies_effective_idx on allowance_policies(effective_from, effective_to, status);
create index payroll_periods_period_idx on payroll_periods(period_start, period_end, status);
create index payroll_inputs_period_employee_idx on payroll_inputs(payroll_period_id, employee_id);
create index payroll_lines_period_employee_idx on payroll_lines(payroll_period_id, employee_id);
create index payroll_income_lines_line_idx on payroll_income_lines(payroll_line_id);
create index payroll_deduction_lines_line_idx on payroll_deduction_lines(payroll_line_id);
create index payroll_insurance_lines_line_idx on payroll_insurance_lines(payroll_line_id);
create index payroll_tax_lines_line_idx on payroll_tax_lines(payroll_line_id);

create index import_rows_batch_status_idx on import_rows(import_batch_id, status);
create index kpi_snapshots_period_idx on kpi_snapshots(period_start, period_end);

-- ============================================================
-- updated_at triggers
-- ============================================================

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles',
    'permissions',
    'app_users',
    'departments',
    'job_levels',
    'employees',
    'employee_contracts',
    'employee_dependents',
    'employee_payroll_settings',
    'leave_types',
    'leave_requests',
    'leave_balances',
    'company_holidays',
    'legal_entities',
    'partners',
    'customers',
    'customer_contacts',
    'customer_employee_assignments',
    'services',
    'contracts',
    'contract_services',
    'recurring_revenue_batches',
    'one_time_tasks',
    'orders',
    'payments',
    'debt_entries',
    'debt_period_closings',
    'partner_settlements',
    'payroll_policy_versions',
    'tax_policy_versions',
    'insurance_policy_versions',
    'income_types',
    'deduction_types',
    'commission_policies',
    'allowance_policies',
    'employee_policy_overrides',
    'payroll_periods',
    'payroll_inputs',
    'payroll_lines',
    'import_batches',
    'import_rows',
    'kpi_snapshots'
  ]
  loop
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end;
$$;

-- ============================================================
-- Seed baseline roles, permissions, leave/payroll categories
-- ============================================================

insert into roles (code, name, description, is_system) values
  ('admin', 'Admin', 'Full system administration', true),
  ('manager', 'Quản lý', 'Company-wide management access', true),
  ('department_head', 'Trưởng phòng', 'Department/team management access', true),
  ('employee', 'Nhân viên', 'Employee self-service and assigned work access', true);

insert into permissions (code, name, module, action) values
  ('customers.view', 'View customers', 'customers', 'view'),
  ('customers.manage', 'Manage customers', 'customers', 'manage'),
  ('contracts.manage', 'Manage contracts', 'contracts', 'manage'),
  ('services.manage', 'Manage services', 'services', 'manage'),
  ('orders.manage', 'Manage revenue orders', 'orders', 'manage'),
  ('debts.view', 'View debts', 'debts', 'view'),
  ('debts.manage', 'Manage debts', 'debts', 'manage'),
  ('employees.view', 'View employees', 'employees', 'view'),
  ('employees.manage', 'Manage employees', 'employees', 'manage'),
  ('leave.self', 'Manage own leave', 'leave', 'self'),
  ('leave.team', 'Manage team leave', 'leave', 'team'),
  ('payroll.self', 'View own payroll', 'payroll', 'self'),
  ('payroll.manage', 'Manage payroll', 'payroll', 'manage'),
  ('reports.view', 'View reports', 'reports', 'view'),
  ('imports.manage', 'Manage imports', 'imports', 'manage'),
  ('settings.manage', 'Manage settings', 'settings', 'manage');

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.code = 'admin';

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.code in (
  'customers.view',
  'customers.manage',
  'contracts.manage',
  'services.manage',
  'orders.manage',
  'debts.view',
  'debts.manage',
  'employees.view',
  'leave.team',
  'payroll.manage',
  'reports.view',
  'imports.manage'
)
where r.code = 'manager';

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.code in (
  'customers.view',
  'orders.manage',
  'employees.view',
  'leave.team',
  'payroll.self',
  'reports.view'
)
where r.code = 'department_head';

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.code in (
  'customers.view',
  'leave.self',
  'payroll.self'
)
where r.code = 'employee';

insert into leave_types (code, name, is_paid, annual_quota_days) values
  ('annual', 'Phép năm', true, 12),
  ('unpaid', 'Nghỉ không lương', false, 0),
  ('sick', 'Nghỉ bệnh', true, 0);

insert into legal_entities (code, name, is_active) values
  ('3m', '3M', true),
  ('topa', 'TOPA', true);

insert into partners (code, name, is_active) values
  ('topa', 'TOPA', true);

insert into income_types (code, name, taxability, is_commission, is_system) values
  ('base_salary', 'Lương cơ bản', 'taxable', false, true),
  ('lunch', 'Ăn trưa', 'non_taxable', false, true),
  ('uniform', 'Trang phục', 'non_taxable', false, true),
  ('overtime_excess', 'Tăng ca vượt đơn giá tiền công', 'non_taxable', false, true),
  ('initiative_bonus', 'Thưởng sáng kiến / văn phòng xanh', 'non_taxable', false, true),
  ('exceeded_revenue_commission', 'Hoa hồng vượt doanh số', 'taxable', true, true),
  ('one_time_customer_commission', 'Hoa hồng khách 1 lần', 'taxable', true, true),
  ('new_customer_commission', 'Hoa hồng khách hàng mới', 'taxable', true, true),
  ('transport_allowance', 'Hỗ trợ đi lại', 'taxable', false, true),
  ('attendance_bonus', 'Chuyên cần', 'taxable', false, true),
  ('responsibility_bonus', 'Trách nhiệm', 'taxable', false, true),
  ('other_taxable', 'Khoản chịu thuế khác', 'taxable', false, true),
  ('other_non_taxable', 'Khoản miễn thuế khác', 'non_taxable', false, true);

insert into deduction_types (code, name, is_system) values
  ('personal_deduction', 'Giảm trừ bản thân', true),
  ('dependent_deduction', 'Giảm trừ người phụ thuộc', true),
  ('employee_insurance', 'Bảo hiểm người lao động đóng', true),
  ('personal_income_tax', 'Thuế TNCN', true),
  ('advance', 'Tạm ứng', true),
  ('other_deduction', 'Khấu trừ khác', true);

commit;
