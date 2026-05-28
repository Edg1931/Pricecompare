// IRS standard mileage rate ($/mile). Update yearly.
export const MILEAGE_RATE = 0.7;

export const EXPENSE_TYPES = ["mileage", "supplies", "shipping", "fees", "other"] as const;
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const EXPENSE_LABEL: Record<string, string> = {
  mileage: "Mileage",
  supplies: "Supplies",
  shipping: "Shipping",
  fees: "Fees",
  other: "Other",
};

/** Mileage entries derive their dollar amount from miles × the rate. */
export function expenseAmount(
  type: string,
  amount: number | null,
  miles: number | null,
  rate: number = MILEAGE_RATE
): number {
  if (type === "mileage" && miles != null) {
    return Math.round(miles * rate * 100) / 100;
  }
  return amount ?? 0;
}
