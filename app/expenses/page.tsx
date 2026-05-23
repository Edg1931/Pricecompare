import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { realizedPnL } from "@/lib/analysis/deal";
import { EXPENSE_LABEL } from "@/lib/expenses";
import { Stat } from "@/components/ui";
import {
  AddExpenseForm,
  DeleteExpenseButton,
  TaxReportButton,
} from "@/components/ExpenseControls";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [expenses, soldItems] = await Promise.all([
    prisma.expense.findMany({ orderBy: { date: "desc" } }),
    prisma.item.findMany({ where: { NOT: { soldPrice: null } } }),
  ]);

  // Sales side
  let revenue = 0;
  let cogs = 0;
  let sellingFees = 0;
  let shippingSales = 0;
  for (const i of soldItems) {
    const pnl = realizedPnL({
      purchasePrice: i.purchasePrice ?? i.askingPrice ?? null,
      soldPrice: i.soldPrice,
      soldMarketplace: i.soldMarketplace,
      shippingCost: i.shippingCost,
      feesOverride: i.soldFees,
    })!;
    revenue += pnl.revenue;
    cogs += pnl.cost;
    sellingFees += pnl.fees;
    shippingSales += pnl.shipping;
  }

  // Expense side, grouped by type
  const byType = new Map<string, { amount: number; miles: number }>();
  let totalExpenses = 0;
  for (const e of expenses) {
    const cur = byType.get(e.type) ?? { amount: 0, miles: 0 };
    cur.amount += e.amount;
    cur.miles += e.miles ?? 0;
    byType.set(e.type, cur);
    totalExpenses += e.amount;
  }

  const net = revenue - cogs - sellingFees - shippingSales - totalExpenses;

  const lines = [
    { label: "Gross sales (revenue)", amount: revenue },
    { label: "Cost of goods sold", amount: -cogs },
    { label: "Selling/platform fees", amount: -sellingFees },
    { label: "Shipping on sales", amount: -shippingSales },
    ...[...byType.entries()].map(([type, v]) => ({
      label:
        type === "mileage"
          ? `Mileage (${Math.round(v.miles)} mi)`
          : EXPENSE_LABEL[type] ?? type,
      amount: -v.amount,
    })),
    { label: "Net profit", amount: net },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" /> Inventory
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Receipt className="h-6 w-6 text-brand" /> Expenses &amp; taxes
          </h1>
        </div>
        <TaxReportButton lines={lines} />
      </div>

      {/* Net summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Revenue" value={formatCurrency(revenue)} />
        <Stat label="COGS" value={formatCurrency(cogs)} />
        <Stat label="Expenses" value={formatCurrency(sellingFees + shippingSales + totalExpenses)} sub="fees, shipping, other" />
        <Stat
          label="Net profit"
          value={
            <span className={net >= 0 ? "text-steal" : "text-over"}>
              {formatCurrency(net)}
            </span>
          }
        />
      </div>

      <AddExpenseForm />

      {/* Expense list */}
      <section>
        <h2 className="mb-3 font-semibold">
          Logged expenses{" "}
          <span className="text-sm font-normal text-muted">({expenses.length})</span>
        </h2>
        {expenses.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface/70 p-8 text-center text-sm text-muted">
            No expenses yet. Add mileage and supplies to get a true net profit.
          </p>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface/70 p-3"
              >
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium capitalize text-muted">
                  {EXPENSE_LABEL[e.type] ?? e.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm">
                    {e.description ?? EXPENSE_LABEL[e.type] ?? e.type}
                    {e.type === "mileage" && e.miles ? ` · ${Math.round(e.miles)} mi` : ""}
                  </p>
                  <p className="text-xs text-muted">{e.date.toLocaleDateString()}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(e.amount)}
                </span>
                <DeleteExpenseButton id={e.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
