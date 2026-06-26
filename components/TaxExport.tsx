"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

export function TaxExport({ currentYear }: { currentYear: number }) {
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const [year, setYear] = useState(currentYear);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <FileSpreadsheet className="h-4 w-4 text-muted" />
        <span className="font-medium">Schedule C export</span>
      </div>
      <div className="flex items-center gap-2 sm:ml-auto">
        <label className="text-xs text-muted" htmlFor="tax-year">
          Year
        </label>
        <select
          id="tax-year"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <a
          href={`/api/export/tax?year=${year}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white shadow shadow-brand/20 transition hover:opacity-90"
        >
          <Download className="h-4 w-4" /> Download CSV
        </a>
      </div>
    </div>
  );
}
