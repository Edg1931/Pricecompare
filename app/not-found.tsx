import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <SearchX className="h-10 w-10 text-muted" />
      <p className="text-lg font-semibold">Page not found</p>
      <p className="max-w-sm text-sm text-muted">
        This page doesn&apos;t exist — the item may have been deleted, or the link is stale.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
      >
        Back to library
      </Link>
    </div>
  );
}
