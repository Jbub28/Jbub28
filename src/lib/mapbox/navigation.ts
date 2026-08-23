import type { LatLng } from "@/lib/geo";
import { haversineMeters } from "@/lib/geo";
import type { NavigationRoute, RouteStep } from "@/lib/mapbox/client";

export interface NavigationProgress {
  stepIndex: number;
  routeIndex: number;
  distanceToStepMeters: number;
  distanceRemainingMeters: number;
  durationRemainingSeconds: number;
  offRouteMeters: number;
  arrived: boolean;
}

const ARRIVAL_THRESHOLD_M = 40;
const OFF_ROUTE_THRESHOLD_M = 80;

function stepRouteIndices(route: NavigationRoute): number[] {
  const indices: number[] = [];
  for (const step of route.steps) {
    let bestIndex = 0;
    let bestDist = Infinity;
    const [lng, lat] = step.location;
    route.coordinates.forEach((coord, i) => {
      const dist = haversineMeters({ lat, lng }, { lat: coord[1], lng: coord[0] });
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    });
    indices.push(bestIndex);
  }
  return indices;
}

export function computeNavigationProgress(
  route: NavigationRoute,
  position: LatLng
): NavigationProgress {
  const dest = route.destination;
  const distToDest = haversineMeters(position, dest);

  if (distToDest <= ARRIVAL_THRESHOLD_M) {
    return {
      stepIndex: route.steps.length - 1,
      routeIndex: route.coordinates.length - 1,
      distanceToStepMeters: 0,
      distanceRemainingMeters: 0,
      durationRemainingSeconds: 0,
      offRouteMeters: 0,
      arrived: true,
    };
  }

  let bestIndex = 0;
  let bestDist = Infinity;
  route.coordinates.forEach((coord, i) => {
    const dist = haversineMeters(position, { lat: coord[1], lng: coord[0] });
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  });

  const stepIndices = stepRouteIndices(route);
  let stepIndex = 0;
  for (let i = 0; i < stepIndices.length; i++) {
    if (stepIndices[i] <= bestIndex) stepIndex = i;
  }

  const currentStep = route.steps[stepIndex];
  const [stepLng, stepLat] = currentStep.location;
  const distanceToStepMeters = haversineMeters(position, { lat: stepLat, lng: stepLng });

  let distanceRemainingMeters = 0;
  for (let i = bestIndex; i < route.coordinates.length - 1; i++) {
    distanceRemainingMeters += haversineMeters(
      { lat: route.coordinates[i][1], lng: route.coordinates[i][0] },
      { lat: route.coordinates[i + 1][1], lng: route.coordinates[i + 1][0] }
    );
  }

  const totalMeters = (route.distanceMiles ?? 0) * 1609.34;
  const totalSeconds = (route.durationMinutes ?? 1) * 60;
  const ratio = totalMeters > 0 ? distanceRemainingMeters / totalMeters : 0;
  const durationRemainingSeconds = Math.max(0, Math.round(totalSeconds * ratio));

  return {
    stepIndex,
    routeIndex: bestIndex,
    distanceToStepMeters,
    distanceRemainingMeters,
    durationRemainingSeconds,
    offRouteMeters: bestDist,
    arrived: false,
  };
}

export function isOffRoute(progress: NavigationProgress): boolean {
  return progress.offRouteMeters > OFF_ROUTE_THRESHOLD_M;
}

export function maneuverIcon(maneuver: string): string {
  if (maneuver.includes("left")) return "↰";
  if (maneuver.includes("right")) return "↱";
  if (maneuver.includes("uturn")) return "↩";
  if (maneuver.includes("straight") || maneuver.includes("continue")) return "↑";
  if (maneuver.includes("arrive")) return "◎";
  if (maneuver.includes("merge")) return "⤴";
  if (maneuver.includes("roundabout")) return "⟳";
  return "→";
}

export function cleanInstruction(step: RouteStep): string {
  return step.instruction.replace(/<[^>]+>/g, "");
}
