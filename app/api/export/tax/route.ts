import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUserId, ownerWhere } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function money(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

// Schedule C reseller CSV export. Produces one CSV with three sections:
//   1) Schedule C line summary (where each total goes on the form)
//   2) Sold items detail (the lines that drive gross receipts + COGS)
//   3) Expenses detail (mileage, supplies, fees, shipping, other)
//
// "Items SOLD in the year" drives revenue + COGS, not "items bought" — under
// the cash-basis matching rule, an item's purchase only becomes COGS the year
// it's sold. Items purchased but not yet sold are inventory and don't appear.
export async function GET(req: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const soldItems = await prisma.item.findMany({
    where: {
      ...ownerWhere(userId),
      soldAt: { gte: yearStart, lt: yearEnd },
      soldPrice: { not: null },
    },
    orderBy: { soldAt: "asc" },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      ...ownerWhere(userId),
      date: { gte: yearStart, lt: yearEnd },
    },
    orderBy: { date: "asc" },
  });

  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalSaleFees = 0;
  let totalSaleShipping = 0;
  for (const it of soldItems) {
    totalRevenue += it.soldPrice ?? 0;
    totalCOGS += it.purchasePrice ?? 0;
    totalSaleFees += it.soldFees ?? 0;
    totalSaleShipping += it.shippingCost ?? 0;
  }

  let expMileage = 0;
  let expSupplies = 0;
  let expFees = 0;
  let expShipping = 0;
  let expOther = 0;
  for (const e of expenses) {
    switch (e.type) {
      case "mileage":
        expMileage += e.amount;
        break;
      case "supplies":
        expSupplies += e.amount;
        break;
      case "fees":
        expFees += e.amount;
        break;
      case "shipping":
        expShipping += e.amount;
        break;
      default:
        expOther += e.amount;
    }
  }

  const lines: string[] = [];
  const row = (...cells: Array<string | number | null | undefined>) =>
    lines.push(cells.map(csvEscape).join(","));

  row(`Schedule C — Resale Activity — Year ${year}`);
  row("Generated", new Date().toISOString().slice(0, 10));
  row("");

  row("Schedule C line summary");
  row("Section", "Line", "Category", "Amount (USD)");
  row("Income", "1", "Gross receipts (sold items)", money(totalRevenue));
  row("COGS", "4", "Cost of goods sold (sold-item purchase prices)", money(totalCOGS));
  row("Expenses", "9", "Car & truck (mileage)", money(expMileage));
  row("Expenses", "22", "Supplies", money(expSupplies));
  row("Expenses", "27a", "Platform fees (from sales)", money(totalSaleFees));
  row("Expenses", "27a", "Platform fees (logged)", money(expFees));
  row("Expenses", "27a", "Shipping (from sales)", money(totalSaleShipping));
  row("Expenses", "27a", "Shipping (logged)", money(expShipping));
  row("Expenses", "27a", "Other", money(expOther));

  const totalExpenses =
    expMileage +
    expSupplies +
    totalSaleFees +
    expFees +
    totalSaleShipping +
    expShipping +
    expOther;
  const netProfit = totalRevenue - totalCOGS - totalExpenses;
  row("", "", "Net profit before tax", money(netProfit));
  row("");

  row("Sold items (detail)");
  row(
    "Date sold",
    "Item",
    "Marketplace",
    "Sold price",
    "Fees",
    "Shipping",
    "Cost (purchase)",
    "Net"
  );
  for (const it of soldItems) {
    const fees = it.soldFees ?? 0;
    const ship = it.shippingCost ?? 0;
    const cost = it.purchasePrice ?? 0;
    const sold = it.soldPrice ?? 0;
    const net = sold - fees - ship - cost;
    row(
      it.soldAt?.toISOString().slice(0, 10) ?? "",
      it.name,
      it.soldMarketplace ?? "",
      money(sold),
      money(fees),
      money(ship),
      money(cost),
      money(net)
    );
  }
  row("");

  row("Expenses (detail)");
  row("Date", "Type", "Amount", "Miles", "Description");
  for (const e of expenses) {
    row(
      e.date.toISOString().slice(0, 10),
      e.type,
      money(e.amount),
      e.miles ?? "",
      e.description ?? ""
    );
  }

  // BOM so Excel opens it with UTF-8 by default.
  const csv = "﻿" + lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="schedule-c-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
