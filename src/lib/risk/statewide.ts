import type { DayOfWeekKey, Signal4StateReport } from "@/lib/types/signal4-report";
import { dateToDayKey, dayLabel } from "@/lib/types/signal4-report";

const REFERENCE_YEAR = 2025;

function getDayValue(stats: { [k in DayOfWeekKey]: number }, key: DayOfWeekKey): number {
  return stats[key];
}

export function getStatewideDayRisk(
  report: Signal4StateReport | null,
  plannedDate: string
): { riskBoost: number; detail: string } {
  if (!report) return { riskBoost: 0, detail: "" };

  const dayKey = dateToDayKey(new Date(`${plannedDate}T12:00:00`));
  const crashes = report.crashes_by_day.find((d) => d.year === REFERENCE_YEAR);
  const fatalities = report.fatalities_by_day.find((d) => d.year === REFERENCE_YEAR);

  if (!crashes || !fatalities) return { riskBoost: 0, detail: "" };

  const dayCrashes = getDayValue(crashes, dayKey);
  const dayFatalities = getDayValue(fatalities, dayKey);
  const avgCrashes = crashes.total / 7;
  const avgFatalities = fatalities.total / 7;
  const crashRatio = dayCrashes / avgCrashes;
  const fatalityRatio = dayFatalities / avgFatalities;

  let riskBoost = 0;
  if (crashRatio > 1.1) riskBoost += Math.round((crashRatio - 1) * 12);
  if (fatalityRatio > 1.1) riskBoost += Math.round((fatalityRatio - 1) * 15);

  const detail =
    riskBoost > 0
      ? `Florida Signal4 data (${REFERENCE_YEAR}): ${dayLabel(dayKey)} has ${Math.round(crashRatio * 100 - 100)}% more crashes and ${Math.round(fatalityRatio * 100 - 100)}% more fatalities than the weekly average.`
      : `${dayLabel(dayKey)} crash rates are near the Florida statewide average per Signal4 ${REFERENCE_YEAR} data.`;

  return { riskBoost, detail };
}

export function getEmphasisAreaRisk(
  report: Signal4StateReport | null,
  originAddress: string,
  destinationAddress: string
): { riskBoost: number; details: string[] } {
  if (!report) return { riskBoost: 0, details: [] };

  const text = `${originAddress} ${destinationAddress}`.toLowerCase();
  const details: string[] = [];
  let riskBoost = 0;

  const checks: { keywords: string[]; areaName: string }[] = [
    { keywords: ["intersection", " Blvd &", " Ave &", " St &", "&"], areaName: "Intersections" },
    { keywords: ["i-", "interstate", "us-", "sr-", "highway", "fwy"], areaName: "Lane Departures" },
    { keywords: ["airport", "memorial", "howard frankland", "bridge"], areaName: "Speeding and Aggressive Driving" },
  ];

  for (const check of checks) {
    if (check.keywords.some((k) => text.includes(k))) {
      const area = report.emphasis_areas.find((a) => a.name === check.areaName);
      if (area) {
        const fatals = area.fatalities[REFERENCE_YEAR] ?? 0;
        const injuries = area.seriousInjuries[REFERENCE_YEAR] ?? 0;
        if (fatals > 0) {
          riskBoost += Math.min(12, Math.round(fatals / 100));
          details.push(
            `${check.areaName}: ${fatals} fatalities and ${injuries.toLocaleString()} serious injuries statewide in ${REFERENCE_YEAR} (Signal4).`
          );
        }
      }
    }
  }

  return { riskBoost, details };
}

export function getStatewideSummaryInsight(report: Signal4StateReport): string {
  const latest = report.yearly_summary.find((y) => y.year === REFERENCE_YEAR);
  const prev = report.yearly_summary.find((y) => y.year === REFERENCE_YEAR - 1);
  if (!latest) return "Florida statewide crash data loaded from Signal4 Analytics.";

  const crashChange = prev
    ? (((latest.totalCrashes - prev.totalCrashes) / prev.totalCrashes) * 100).toFixed(1)
    : null;

  return `Florida ${REFERENCE_YEAR}: ${latest.totalCrashes.toLocaleString()} total crashes, ${latest.fatalities.toLocaleString()} fatalities, ${latest.seriousInjuries.toLocaleString()} serious injuries${crashChange ? ` (${crashChange}% vs ${REFERENCE_YEAR - 1})` : ""}. Data through ${report.data_through}.`;
}
