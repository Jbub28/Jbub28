/** Signal4 public dashboard query (Florida Traffic Safety Dashboard). */
export interface Signal4PublicQuery {
  injurySeverity?: string[];
  geographyAreaCategory?: string | null;
  geographyAreaLookup?: string | null;
  reportingAgencyId?: number | null;
  reportingAgencyName?: string | null;
  emphasisArea?: string[];
  emphasisAreaName?: string | null;
}

export interface Signal4EventPoint {
  x: number;
  y: number;
  eventId: string | null;
  attributes: {
    hsmvReportNumber?: number;
    crashSevCd?: number;
    crashTypeCd?: number;
    crashSev?: string | null;
    crashType?: string | null;
    dayNight?: string | null;
    serInjuryCnt?: number;
    fatalityCnt?: number;
    isMultiPoint?: boolean;
    multipointCount?: number;
  };
}

export interface Signal4MapResponse {
  queryToken: string | null;
  eventType: string;
  featureCount: number;
  featureExtent: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    isValid: boolean;
  };
  isSample: boolean;
  sampleSize: number | null;
  sampleMultiplier: number | null;
  eventPoints: Signal4EventPoint[];
}

export interface Signal4TotalsResponse {
  categories: string[];
  series: Array<{ id: string; name: string; data: number[] }>;
  maxDate: string;
}

export interface Signal4LiveAnalytics {
  year: number;
  syncedAt: string;
  totals: {
    crashes: number;
    fatalities: number;
    seriousInjuries: number;
    participants: number;
  };
  mapPoints: number;
  crashes: import("@/lib/types/crash").CrashEvent[];
}
