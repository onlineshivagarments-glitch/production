// Stores per-article work type rates in localStorage
// Since the backend doesn't have a rates field, we persist rates locally.

const RATES_KEY = "article_work_rates_v2";

export interface ArticleRates {
  tailorRate: number;
  overlockRate: number;
  foldingRate: number;
  pressRate: number;
  packingRate: number;
  threadCuttingRate: number;
  customRates: Record<string, number>; // workType -> rate
}

const DEFAULT_RATES: ArticleRates = {
  tailorRate: 0,
  overlockRate: 0,
  foldingRate: 0,
  pressRate: 0,
  packingRate: 0,
  threadCuttingRate: 0,
  customRates: {},
};

export function loadAllRates(): Record<string, ArticleRates> {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ArticleRates>;
  } catch {
    return {};
  }
}

export function loadArticleRates(articleNo: string): ArticleRates {
  const all = loadAllRates();
  return all[articleNo] ?? { ...DEFAULT_RATES, customRates: {} };
}

export function saveArticleRates(articleNo: string, rates: ArticleRates): void {
  try {
    const all = loadAllRates();
    all[articleNo] = rates;
    localStorage.setItem(RATES_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

/** Get rate for a specific work type (case-insensitive match for predefined) */
export function getRateForWorkType(
  articleNo: string,
  workType: string,
): number {
  const rates = loadArticleRates(articleNo);
  const wt = workType.toLowerCase();
  if (wt === "tailor" || wt === "tailor stitching" || wt === "stitching")
    return rates.tailorRate;
  if (wt === "overlock") return rates.overlockRate;
  if (wt === "folding") return rates.foldingRate;
  if (wt === "press") return rates.pressRate;
  if (wt === "packing") return rates.packingRate;
  if (wt === "thread cutting") return rates.threadCuttingRate;
  return rates.customRates[workType] ?? 0;
}
