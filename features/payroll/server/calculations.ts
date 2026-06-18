export type TaxBracket = {
  bracketOrder: number;
  fromAmount: number;
  toAmount: number | null;
  taxRate: number;
  quickDeductionAmount: number;
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clampInsuranceBase(baseAmount: number, minBase: number | null, maxBase: number | null) {
  let result = baseAmount;

  if (minBase !== null && result < minBase) {
    result = minBase;
  }

  if (maxBase !== null && result > maxBase) {
    result = maxBase;
  }

  return roundMoney(Math.max(result, 0));
}

export function calculateProgressiveTax(taxableAmount: number, brackets: TaxBracket[]) {
  const sortedBrackets = [...brackets].sort((a, b) => a.bracketOrder - b.bracketOrder);
  let totalTax = 0;
  const lines: Array<TaxBracket & { taxableAmount: number; taxAmount: number }> = [];

  for (const bracket of sortedBrackets) {
    if (taxableAmount <= bracket.fromAmount) {
      continue;
    }

    const upperAmount = bracket.toAmount ?? taxableAmount;
    const bracketTaxableAmount = Math.max(Math.min(taxableAmount, upperAmount) - bracket.fromAmount, 0);
    const taxAmount = roundMoney(bracketTaxableAmount * bracket.taxRate);

    if (bracketTaxableAmount > 0) {
      totalTax += taxAmount;
      lines.push({ ...bracket, taxableAmount: bracketTaxableAmount, taxAmount });
    }

    if (bracket.toAmount !== null && taxableAmount <= bracket.toAmount) {
      break;
    }
  }

  return { taxAmount: roundMoney(totalTax), lines };
}
