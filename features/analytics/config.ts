import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { ModuleConfig } from "@/features/shared/components/management/types";

export const analyticsModules: ModuleConfig[] = [
  {
    key: "kpi-snapshots",
    title: "KPI snapshots",
    description: "Generate và lưu snapshot KPI theo kỳ từ doanh thu, bảng lương và chi phí phúc lợi.",
    primaryAction: "Generate KPI",
    apiPath: "/api/kpi-snapshots",
    searchPlaceholder: "Tìm nhân viên hoặc phòng ban...",
    defaultSortBy: "createdAt",
    canEdit: false,
    canDelete: false,
    columns: [
      { key: "periodStart", label: "Từ ngày", sortable: true, format: "date", width: "130px" },
      { key: "periodEnd", label: "Đến ngày", sortable: true, format: "date", width: "130px" },
      { key: "employeeName", label: "Nhân viên", sortable: true, width: "220px" },
      { key: "departmentName", label: "Phòng ban", sortable: true, width: "180px" },
      { key: "totalRevenueAmount", label: "Doanh thu", sortable: true, format: "money", width: "160px" },
      { key: "recurringRevenueAmount", label: "Định kỳ", format: "money", width: "150px" },
      { key: "oneTimeRevenueAmount", label: "Một lần", format: "money", width: "150px" },
      { key: "payrollCostAmount", label: "Chi phí lương", sortable: true, format: "money", width: "170px" },
      { key: "payrollCostRevenueRatio", label: "Tỷ lệ lương/DT", sortable: true, width: "150px" },
    ],
    filters: [
      { key: "employeeId", label: "Nhân viên", type: "select", lookupKey: "employees" },
      { key: "departmentId", label: "Phòng ban", type: "select", lookupKey: "departments" },
      { key: "periodStart", label: "Từ ngày", type: "date" },
      { key: "periodEnd", label: "Đến ngày", type: "date" },
    ],
    fields: [
      { key: "periodStart", label: "Từ ngày", type: "date", required: true, section: "Kỳ KPI" },
      { key: "periodEnd", label: "Đến ngày", type: "date", required: true, section: "Kỳ KPI" },
      { key: "employeeId", label: "Nhân viên", type: "select", section: "Phạm vi", lookupKey: "employees" },
      { key: "departmentId", label: "Phòng ban", type: "select", section: "Phạm vi", lookupKey: "departments" },
    ],
    detailFields: [
      { key: "periodStart", label: "Từ ngày", format: "date" },
      { key: "periodEnd", label: "Đến ngày", format: "date" },
      { key: "employeeName", label: "Nhân viên" },
      { key: "departmentName", label: "Phòng ban" },
      { key: "totalRevenueAmount", label: "Doanh thu", format: "money" },
      { key: "recurringRevenueAmount", label: "Doanh thu định kỳ", format: "money" },
      { key: "oneTimeRevenueAmount", label: "Doanh thu một lần", format: "money" },
      { key: "payrollCostAmount", label: "Chi phí lương", format: "money" },
      { key: "benefitCostAmount", label: "Phúc lợi", format: "money" },
      { key: "commissionAmount", label: "Hoa hồng", format: "money" },
      { key: "payrollCostRevenueRatio", label: "Tỷ lệ lương/doanh thu" },
    ],
    metrics: [
      { label: "Tổng snapshot", getValue: (_records, pagination) => formatNumber(pagination?.total ?? 0) },
      { label: "Doanh thu trên trang", getValue: (records) => formatCurrency(records.reduce((sum, item) => sum + Number(item.totalRevenueAmount ?? 0), 0)) },
      { label: "Chi phí lương trên trang", getValue: (records) => formatCurrency(records.reduce((sum, item) => sum + Number(item.payrollCostAmount ?? 0), 0)) },
    ],
  },
];
