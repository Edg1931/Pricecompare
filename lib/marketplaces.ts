// Public keyword-search endpoints for the major resale marketplaces. Used to
// build "look it up yourself" links from an item's search query.
export interface MarketLink {
  label: string;
  url: string;
  dot: string;
}

// A live search URL on a specific comp's source — used as a fallback when a
// comp has no reliable direct listing link, so it still lands somewhere
// relevant where the current going price can be verified.
export function searchUrlForSource(source: string, query: string): string {
  const q = encodeURIComponent(query.trim());
  switch (source) {
    case "ebay":
      return `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`;
    case "etsy":
      return `https://www.etsy.com/search?q=${q}`;
    case "mercari":
      return `https://www.mercari.com/search/?keyword=${q}`;
    case "poshmark":
      return `https://poshmark.com/search?query=${q}`;
    case "facebook":
      return `https://www.facebook.com/marketplace/search/?query=${q}`;
    case "stockx":
      return `https://stockx.com/search?s=${q}`;
    case "swappa":
      return `https://swappa.com/search?q=${q}`;
    default:
      return `https://www.google.com/search?tbm=shop&q=${q}`;
  }
}

export function marketplaceLinks(query: string): MarketLink[] {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  return [
    {
      label: "eBay sold",
      url: `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
      dot: "bg-blue-400",
    },
    {
      label: "eBay active",
      url: `https://www.ebay.com/sch/i.html?_nkw=${q}`,
      dot: "bg-blue-400",
    },
    {
      label: "Mercari",
      url: `https://www.mercari.com/search/?keyword=${q}`,
      dot: "bg-rose-400",
    },
    {
      label: "Poshmark",
      url: `https://poshmark.com/search?query=${q}`,
      dot: "bg-pink-400",
    },
    {
      label: "Etsy",
      url: `https://www.etsy.com/search?q=${q}`,
      dot: "bg-orange-400",
    },
    {
      label: "Facebook",
      url: `https://www.facebook.com/marketplace/search/?query=${q}`,
      dot: "bg-sky-400",
    },
    {
      label: "Google Shopping",
      url: `https://www.google.com/search?tbm=shop&q=${q}`,
      dot: "bg-violet-400",
    },
  ];
}
