"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function PhotoCarousel({ photos }: { photos: { url: string }[] }) {
  const [active, setActive] = useState(0);
  if (photos.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-2xl border border-border bg-surface-2 text-sm text-muted">
        No photo
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[active].url}
        alt={`Photo ${active + 1}`}
        className="aspect-square w-full rounded-2xl border border-border object-cover"
      />
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.url}
              onClick={() => setActive(i)}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition",
                i === active ? "border-brand" : "border-border opacity-60 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
