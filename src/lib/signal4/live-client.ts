import type {
  Signal4MapResponse,
  Signal4PublicQuery,
  Signal4TotalsResponse,
} from "./types";

const SIGNAL4_BASE = "https://signal4analytics.com";

export function getSignal4CurrentYear(): number {
  return new Date().getFullYear();
}

export const DEFAULT_SIGNAL4_QUERY: Signal4PublicQuery = {
  injurySeverity: [],
  geographyAreaCategory: null,
  geographyAreaLookup: null,
  reportingAgencyId: null,
  emphasisArea: [],
};

async function postSignal4<T>(path: string, query: Signal4PublicQuery): Promise<T> {
  const res = await fetch(`${SIGNAL4_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Signal4 API error (${res.status}) on ${path}`);
  }

  return res.json() as Promise<T>;
}

/** Fetch statewide crash map points from the public Signal4 dashboard API. */
export function fetchSignal4Map(
  year = getSignal4CurrentYear(),
  query: Signal4PublicQuery = DEFAULT_SIGNAL4_QUERY
): Promise<Signal4MapResponse> {
  return postSignal4<Signal4MapResponse>(`/api/public/${year}/map`, query);
}

/** Fetch statewide crash totals from the public Signal4 dashboard API. */
export function fetchSignal4Totals(
  year = getSignal4CurrentYear(),
  query: Signal4PublicQuery = DEFAULT_SIGNAL4_QUERY
): Promise<Signal4TotalsResponse> {
  return postSignal4<Signal4TotalsResponse>(`/api/public/${year}/totals`, query);
}

/** Download the official Florida Traffic Safety Report PDF. */
export async function fetchSignal4SafetyReportPdf(): Promise<ArrayBuffer> {
  const res = await fetch(`${SIGNAL4_BASE}/api/download/fl-traffic-safty-report`);
  if (!res.ok) {
    throw new Error(`Failed to download Signal4 safety report (${res.status})`);
  }
  return res.arrayBuffer();
}

export function parseSignal4Totals(totals: Signal4TotalsResponse): {
  crashes: number;
  fatalities: number;
  seriousInjuries: number;
  participants: number;
} {
  const pick = (name: string) =>
    totals.series.find((s) => s.name.toLowerCase() === name.toLowerCase())?.data[0] ?? 0;

  return {
    crashes: pick("Crashes"),
    fatalities: pick("Fatalities"),
    seriousInjuries: pick("Serious Injuries"),
    participants: pick("Participants"),
  };
}
