export function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

export function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("vi-VN").format(Number(value ?? 0));
}

