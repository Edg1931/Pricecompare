"use client";

import { useEffect } from "react";

export default function ItemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[item page error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-lg font-semibold">Could not load this item</p>
      <p className="max-w-sm text-sm text-muted">
        {error.message || "An unexpected error occurred while loading the item page."}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted">Error ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
      >
        Try again
      </button>
    </div>
  );
}
