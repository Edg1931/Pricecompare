"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="max-w-sm text-sm text-muted">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-brand"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
