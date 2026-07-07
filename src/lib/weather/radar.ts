import type { RadarMetadata } from "@/lib/types/weather";
import { cacheRadar, getCachedRadar } from "@/lib/weather/cache";

interface RainViewerResponse {
  host: string;
  radar: { past: Array<{ time: number; path: string }> };
}

export async function fetchRadarMetadata(): Promise<RadarMetadata | null> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error("Radar unavailable");
    const data = (await res.json()) as RainViewerResponse;
    const frames = data.radar?.past?.slice(-3) ?? [];
    if (frames.length === 0) return null;

    const meta: RadarMetadata = {
      host: data.host,
      frames: frames.map((f) => ({ path: f.path, timestamp: f.time })),
      fetchedAt: new Date().toISOString(),
    };
    cacheRadar(meta);
    return meta;
  } catch {
    return getCachedRadar();
  }
}

export function radarTileUrl(host: string, path: string, z: number, x: number, y: number): string {
  return `${host}${path}/256/${z}/${x}/${y}/2/1_1.png`;
}

export function latestRadarFrame(meta: RadarMetadata | null): string | null {
  if (!meta?.frames.length) return null;
  return meta.frames[meta.frames.length - 1].path;
}
