export function calculateLineAmounts(quantity: unknown, unitPrice: unknown, vatRate: unknown) {
  const numericQuantity = Number(quantity ?? 0);
  const numericUnitPrice = Number(unitPrice ?? 0);
  const numericVatRate = Number(vatRate ?? 0);
  const subtotalAmount = roundMoney(numericQuantity * numericUnitPrice);
  const vatAmount = roundMoney(subtotalAmount * numericVatRate);
  const totalAmount = roundMoney(subtotalAmount + vatAmount);

  return { subtotalAmount, vatAmount, totalAmount };
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getPaymentStatus(totalAmount: unknown, paidAmount: unknown) {
  const total = Number(totalAmount ?? 0);
  const paid = Number(paidAmount ?? 0);

  if (paid <= 0) {
    return "unpaid";
  }

  if (paid > total) {
    return "overpaid";
  }

  if (paid === total) {
    return "paid";
  }

  return "partially_paid";
}
