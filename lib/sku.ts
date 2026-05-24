// A short, human-friendly SKU derived from the item id. Stable and unique
// enough for labeling without storing a separate field.
export function skuFor(id: string): string {
  return "RS-" + id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
}
