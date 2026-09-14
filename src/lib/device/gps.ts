export type DeviceCoords = { latitude: number; longitude: number };

export async function readDeviceGps(): Promise<DeviceCoords> {
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 8000,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    /* Capacitor plugin is unavailable in Safari; use the browser API. */
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("This device cannot share GPS.");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => reject(new Error("GPS was not used.")),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}
